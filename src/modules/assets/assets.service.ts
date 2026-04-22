import { eq, inArray } from 'drizzle-orm';
import { assets, users, assetActivities, assetLocations, departments, employees, assetLifecycleLogs } from '../../db/schema';
import { AssetLocationsService } from '../asset-locations/asset-locations.service';
import { supabase } from '../../utils/supabase';
import { CreateAssetInput } from './assets.schema';
import { sendEmail } from '../shared/zepto';

const assetLocationsService = new AssetLocationsService();


export class AssetsService {
    constructor(private db: any) { }

    private async logLifecycle(payload: {
        assetId: string;
        performedById?: string;
        actionType: string;
        previousAssigneeId?: string | null;
        newAssigneeId?: string | null;
        metadata?: any;
    }) {
        try {
            let actorId = payload.performedById;
            if (!actorId) {
                // Fallback to first user in the DB (usually the system admin)
                const sysUser = await this.db.query.users.findFirst();
                actorId = sysUser?.id;
            }

            if (actorId) {
                await this.db.insert(assetLifecycleLogs).values({
                    assetId: payload.assetId,
                    performedById: actorId,
                    actionType: payload.actionType,
                    previousAssigneeId: payload.previousAssigneeId || null,
                    newAssigneeId: payload.newAssigneeId || null,
                    metadata: payload.metadata || {}
                });
            }
        } catch (e) {
            console.error('Failed to log lifecycle event:', e);
        }
    }

    async createAsset(data: CreateAssetInput, fileBuffer?: Buffer, fileName?: string, fileType?: string, actorId?: string) {
        let fileUrl: string | null = null;

        // Upload to Supabase if a file was provided
        if (fileBuffer && fileName) {
            const uniqueName = `${Date.now()}-${fileName}`;
            const { data: uploadData, error } = await supabase.storage
                .from('AssetTracker')
                .upload(uniqueName, fileBuffer, {
                    contentType: fileType,
                });

            if (error) {
                console.error("Supabase Upload Error:", error);
                throw new Error("Failed to upload asset receipt/image");
            }

            const { data: publicUrlData } = supabase.storage
                .from('AssetTracker')
                .getPublicUrl(uniqueName);

            fileUrl = publicUrlData.publicUrl;
        }

        // Determine initial status based on assignment
        const status = data.assignedTo && data.assignedTo.trim() !== '' ? 'PENDING' : 'IDLE';

        // Sanitize nullable fields that might be passed as empty strings from frontend
        const cleanAssignedTo = data.assignedTo?.trim() || null;
        const cleanDescription = data.description?.trim() || 'n/a';
        const cleanSerialNumber = data.serialNumber?.trim() || null;

        // Generate ID - Always use a unique internal ID
        const assetId = `AST-${Math.floor(100000 + Math.random() * 900000)}`;

        // Save to Database
        const [newAsset] = await this.db.insert(assets).values({
            id: assetId,
            name: data.name,
            category: data.category,
            purchasePrice: data.purchasePrice?.toString() || "0",
            purchaseDate: data.purchaseDate,
            condition: data.condition,
            location: data.location || 'N/A',
            department: data.department,
            manager: data.manager,
            serialNumber: cleanSerialNumber,
            description: cleanDescription,
            assignedTo: cleanAssignedTo,
            status,
            fileUrl,
        }).returning();

        // Log Asset Creation
        await this.db.insert(assetActivities).values({
            type: 'system',
            title: 'New Hardware Provisioned',
            desc: `${newAsset.name} was added to the inventory.`,
            icon: 'inventory_2',
            color: 'blue',
            roles: ['SUPER_ADMIN', 'ADMIN_USER', 'AUDITOR'],
            assetId: newAsset.id
        });

        await this.logLifecycle({
            assetId: newAsset.id,
            performedById: actorId,
            actionType: 'CREATED',
            newAssigneeId: cleanAssignedTo,
            metadata: { newStatus: status, condition: data.condition }
        });

        if (status === 'PENDING' && cleanAssignedTo) {
            // Log Assignment Need
            await this.db.insert(assetActivities).values({
                type: 'system',
                title: 'Action Required',
                desc: `Please accept the assignment for ${newAsset.name}.`,
                icon: 'signature',
                color: 'amber',
                roles: ['USER', 'SUPER_ADMIN'],
                targetUserId: cleanAssignedTo,
                assetId: newAsset.id,
                hasCTA: true
            });

            // Fetch assignee email
            const assignee = await this.db.query.users.findFirst({
                where: eq(users.id, cleanAssignedTo),
            });

            if (assignee) {
                await sendEmail(
                    assignee.email,
                    'New Asset Assignment Pending Review',
                    `
                        <h2>Asset Assignment Review</h2>
                        <p>Hello,</p>
                        <p>You have been assigned a new asset: <strong>${data.name}</strong> (${assetId}).</p>
                        <p>Please log in to AssetTrackPro and accept or report this assignment from your dashboard.</p>
                        <div style="text-align: center;">
                            <a href="https://assets.noltfinance.com" class="btn">Open AssetTrackPro &rarr;</a>
                        </div>
                        ${fileUrl ? `<p><a href="${fileUrl}">View Attached Image/Receipt</a></p>` : ''}
                        <br/>
                        <p>Best regards,<br/>AssetTrackPro System</p>

                    `
                ).catch(e => console.error("Email send failed:", e));
            }
        }

        return newAsset;
    }

    async bulkCreateAssets(assetsData: any[]) {
        const results = [];
        for (const data of assetsData) {
            try {
                const status = data.assignedTo && data.assignedTo.trim() !== '' ? 'PENDING' : 'IDLE';
                const cleanAssignedTo = data.assignedTo?.trim() || null;
                const cleanSerialNumber = data.serialNumber?.trim() || null;
                // Generate a unique internal ID for each imported row
                const assetId = `AST-B-${Math.floor(Math.random() * 16777215).toString(16).toUpperCase()}`;

                const values = {
                    id: assetId,
                    name: data.name || 'Unnamed Asset',
                    category: data.category || 'General',
                    purchasePrice: data.purchasePrice?.toString() || "0",
                    purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
                    condition: data.condition || 'Good',
                    location: data.location || 'N/A',
                    department: data.department || 'N/A',
                    manager: data.manager || 'N/A',
                    serialNumber: cleanSerialNumber,
                    description: data.description || 'Batch Import',
                    assignedTo: cleanAssignedTo,
                    status,
                    fileUrl: null,
                };

                const [newAsset] = await this.db.insert(assets).values(values).returning();

                await this.db.insert(assetActivities).values({
                    type: 'system',
                    title: 'Hardware Provisioned (Batch)',
                    desc: `${newAsset.name} was added via bulk import.`,
                    icon: 'inventory_2',
                    color: 'indigo',
                    roles: ['SUPER_ADMIN', 'ADMIN_USER', 'AUDITOR'],
                    assetId: newAsset.id
                });

                results.push(newAsset);
            } catch (err) {
                console.error("Bulk Import Row Error:", err);
            }
        }
        return results;
    }

    async acceptAsset(assetId: string, consentSignature?: string) {
        const [updatedAsset] = await this.db.update(assets)
            .set({ 
                status: 'ACTIVE',
                ...(consentSignature && { consentSignature })
            })
            .where(eq(assets.id, assetId))
            .returning();

        if (!updatedAsset) {
            throw new Error('Asset not found');
        }

        await this.db.insert(assetActivities).values({
            type: 'system',
            title: 'Equipment Accepted',
            desc: `Assignment accepted for ${updatedAsset.name}.`,
            icon: 'check_circle',
            color: 'green',
            roles: ['SUPER_ADMIN', 'USER'],
            targetUserId: updatedAsset.assignedTo,
            assetId: assetId
        });

        // Mark previous "Action Required" for this user & asset as read
        await this.db.update(assetActivities)
            .set({ isRead: true })
            .where(eq(assetActivities.assetId, assetId));

        return updatedAsset;
    }

    async bulkAcceptAssets(assetIds: string[]) {
        // Use inArray from drizzle-orm if possible, or execute individually.
        // Assuming we can map over them and accept individually for simplicity if inArray is not imported or complex,
        // but it's better to import `inArray` if we can.
        // Let's implement it the simple way first to avoid missing imports.
        const updatedAssets = await Promise.all(
            assetIds.map(async (id) => {
                const [updated] = await this.db.update(assets)
                    .set({ status: 'ACTIVE' })
                    .where(eq(assets.id, id))
                    .returning();

                if (updated) {
                    await this.db.insert(assetActivities).values({
                        type: 'system',
                        title: 'Equipment Accepted',
                        desc: `Assignment accepted for ${updated.name}.`,
                        icon: 'check_circle',
                        color: 'green',
                        roles: ['SUPER_ADMIN', 'USER'],
                        targetUserId: updated.assignedTo,
                        assetId: id
                    });
                    await this.db.update(assetActivities)
                        .set({ isRead: true })
                        .where(eq(assetActivities.assetId, id));
                }

                return updated;
            })
        );
        return updatedAssets.filter(Boolean);
    }

    private async ensureLocationExists(locationName: string) {
        if (!locationName || locationName === 'Remote' || locationName === 'Unknown') return;
        const existing = await this.db.query.assetLocations.findFirst({
            where: eq(assetLocations.name, locationName)
        });
        if (!existing) {
            await assetLocationsService.create({ name: locationName })
        }
    }

    async assignAsset(id: string, data: { assignedTo: string; manager: string; department: string; location: string }, actorId?: string) {
        await this.ensureLocationExists(data.location);
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
        const [updatedAsset] = await this.db.update(assets)
            .set({
                assignedTo: data.assignedTo,
                manager: data.manager,
                department: data.department,
                location: data.location,
                status: 'PENDING',
                consentSignature: null,
                hrConsentSubmitted: false
            })
            .where(eq(assets.id, id))
            .returning();
            
        await this.logLifecycle({
            assetId: updatedAsset.id,
            performedById: actorId,
            actionType: 'ASSIGNED',
            previousAssigneeId: targetAsset?.assignedTo,
            newAssigneeId: updatedAsset.assignedTo,
            metadata: { oldStatus: targetAsset?.status, newStatus: updatedAsset.status }
        });

        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }

        await this.db.insert(assetActivities).values({
            type: 'system',
            title: 'Action Required',
            desc: `Please accept the assignment for ${updatedAsset.name}.`,
            icon: 'signature',
            color: 'amber',
            roles: ['USER', 'SUPER_ADMIN'],
            targetUserId: data.assignedTo,
            assetId: id,
            hasCTA: true
        });

        // Fetch assignee email
        const assignee = await this.db.query.users.findFirst({
            where: eq(users.id, data.assignedTo),
        });

        if (assignee) {
            await sendEmail(
                assignee.email,
                'New Asset Assignment Pending Review',
                `
                    <h2>Asset Assignment Review</h2>
                    <p>Hello,</p>
                    <p>You have been assigned an asset: <strong>${updatedAsset.name}</strong> (${updatedAsset.id}).</p>
                    <p>Please log in to AssetTrackPro and review this assignment from your dashboard.</p>
                    <div style="text-align: center;">
                        <a href="https://assets.noltfinance.com" class="btn">Open AssetTrackPro &rarr;</a>
                    </div>
                    <br/>
                    <p>Best regards,<br/>AssetTrackPro System</p>
                `
            ).catch(e => console.error("Email send failed for assignment:", e));
        }

        return updatedAsset;
    }

    async bulkAssignAssets(assetIds: string[], data: { assignedTo: string; manager: string; department: string; location: string }) {
        await this.ensureLocationExists(data.location);
        const updatedAssets = await Promise.all(
            assetIds.map(async (id) => {
                const [updated] = await this.db.update(assets)
                    .set({
                        assignedTo: data.assignedTo,
                        manager: data.manager,
                        department: data.department,
                        location: data.location,
                        status: 'PENDING'
                    })
                    .where(eq(assets.id, id))
                    .returning();

                if (updated) {
                    await this.db.insert(assetActivities).values({
                        type: 'system',
                        title: 'Action Required',
                        desc: `Please accept the assignment for ${updated.name}.`,
                        icon: 'signature',
                        color: 'amber',
                        roles: ['USER', 'SUPER_ADMIN'],
                        targetUserId: data.assignedTo,
                        assetId: id,
                        hasCTA: true
                    });

                    const assignee = await this.db.query.users.findFirst({
                        where: eq(users.id, data.assignedTo),
                    });

                    if (assignee) {
                        await sendEmail(
                            assignee.email,
                            'New Asset Assignment Pending Review',
                            `
                                <h2>Asset Assignment Review</h2>
                                <p>Hello,</p>
                                <p>You have been assigned an asset: <strong>${updated.name}</strong> (${updated.id}).</p>
                                <p>Please log in to AssetTrackPro and review this assignment from your dashboard.</p>
                                <div style="text-align: center;">
                                    <a href="https://assets.noltfinance.com" class="btn">Open AssetTrackPro &rarr;</a>
                                </div>
                                <br/>
                                <p>Best regards,<br/>AssetTrackPro System</p>
                            `
                        ).catch(e => console.error("Email send failed for bulk assignment:", e));
                    }
                }

                return updated;
            })
        );
        return updatedAssets.filter(Boolean);
    }

    async reassignAsset(id: string, data: { assignedTo: string; manager: string; department: string; location: string }, actorId?: string) {
        await this.ensureLocationExists(data.location);
        // const [updatedAsset] = await this.db.update(assets)
        //     .set({
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
        const [updatedAsset] = await this.db.update(assets)
            .set({
                assignedTo: data.assignedTo,
                manager: data.manager,
                department: data.department,
                location: data.location,
                status: 'PENDING',
                consentSignature: null,
                hrConsentSubmitted: false
            })
            .where(eq(assets.id, id))
            .returning();

        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }

        await this.logLifecycle({
            assetId: updatedAsset.id,
            performedById: actorId,
            actionType: 'REASSIGNED',
            previousAssigneeId: targetAsset?.assignedTo,
            newAssigneeId: updatedAsset.assignedTo,
            metadata: { oldStatus: targetAsset?.status, newStatus: updatedAsset.status }
        });

        await this.db.insert(assetActivities).values({
            type: 'system',
            title: 'Action Required',
            desc: `Please accept the reassignment for ${updatedAsset.name}.`,
            icon: 'signature',
            color: 'amber',
            roles: ['USER', 'SUPER_ADMIN'],
            targetUserId: data.assignedTo,
            assetId: id,
            hasCTA: true
        });

        // Fetch assignee email
        const assignee = await this.db.query.users.findFirst({
            where: eq(users.id, data.assignedTo),
        });

        if (assignee) {
            await sendEmail(
                assignee.email,
                'New Asset Reassignment Pending Review',
                `
                    <h2>Asset Reassignment Review</h2>
                    <p>Hello,</p>
                    <p>You have been reassigned an existing asset: <strong>${updatedAsset.name}</strong> (${updatedAsset.id}).</p>
                    <p>Please log in to AssetTrackPro and accept or report this assignment from your dashboard.</p>
                    <div style="text-align: center;">
                        <a href="https://assets.noltfinance.com" class="btn">Open AssetTrackPro &rarr;</a>
                    </div>
                    <br/>
                    <p>Best regards,<br/>AssetTrackPro System</p>

                `
            ).catch(e => console.error("Email send failed for reassignment:", e));
        }

        return updatedAsset;
    }

    async decommissionAsset(id: string) {
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
        const [updatedAsset] = await this.db.update(assets)
            .set({
                status: 'DECOMMISSIONED',
                assignedTo: null
            })
            .where(eq(assets.id, id))
            .returning();

        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }

        await this.logLifecycle({
            assetId: updatedAsset.id,
            actionType: 'DECOMMISSIONED',
            previousAssigneeId: targetAsset?.assignedTo,
            newAssigneeId: null,
            metadata: { oldStatus: targetAsset?.status, newStatus: updatedAsset.status }
        });

        await this.db.insert(assetActivities).values({
            type: 'system',
            title: 'Hardware Decommissioned',
            desc: `${updatedAsset.name} has been taken out of service.`,
            icon: 'delete',
            color: 'red',
            roles: ['SUPER_ADMIN', 'ADMIN_USER', 'AUDITOR'],
            assetId: id
        });

        return updatedAsset;
    }

    async unassignAsset(id: string, actorId?: string) {
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
        const [updatedAsset] = await this.db.update(assets)
            .set({
                assignedTo: null,
                location: 'Main Warehouse',
                status: 'IDLE',
                consentSignature: null,
                hrConsentSubmitted: false
            })
            .where(eq(assets.id, id))
            .returning();

        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }

        await this.logLifecycle({
            assetId: updatedAsset.id,
            performedById: actorId,
            actionType: 'UNASSIGNED',
            previousAssigneeId: targetAsset?.assignedTo,
            newAssigneeId: null,
            metadata: { oldStatus: targetAsset?.status, newStatus: updatedAsset.status }
        });

        await this.db.insert(assetActivities).values({
            type: 'system',
            title: 'Asset Unassigned',
            desc: `${updatedAsset.name} was returned to the inventory.`,
            icon: 'restart_alt',
            color: 'slate',
            roles: ['SUPER_ADMIN', 'ADMIN_USER', 'AUDITOR'],
            assetId: id
        });

        return updatedAsset;
    }

    async updateAsset(id: string, data: any, actorId?: string) {
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
        const updateData = {
            name: data.name,
            category: data.category,
            purchasePrice: data.purchasePrice?.toString(),
            purchaseDate: data.purchaseDate,
            condition: data.condition,
            location: data.location,
            department: data.department,
            manager: data.manager,
            serialNumber: data.serialNumber,
            description: data.description,
            status: data.status,
        };
        const [updatedAsset] = await this.db.update(assets)
            .set(updateData)
            .where(eq(assets.id, id))
            .returning();

        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }

        await this.logLifecycle({
            assetId: updatedAsset.id,
            performedById: actorId,
            actionType: 'UPDATED',
            previousAssigneeId: targetAsset?.assignedTo,
            newAssigneeId: updatedAsset.assignedTo,
            metadata: { changes: updateData, oldStatus: targetAsset?.status, newStatus: updatedAsset.status }
        });

        await this.db.insert(assetActivities).values({
            type: 'system',
            title: 'Hardware Profile Updated',
            desc: `The profile for ${updatedAsset.name} was modified by an administrator.`,
            icon: 'edit_square',
            color: 'blue',
            roles: ['SUPER_ADMIN', 'ADMIN_USER', 'AUDITOR'],
            assetId: id
        });

        return updatedAsset;
    }

    async sendHrConsent(id: string, base64Pdf?: string) {
        // Find asset
        const asset = await this.db.query.assets.findFirst({
            where: eq(assets.id, id)
        });
        if (!asset) throw new Error(`Asset with id ${id} not found`);

        const assignee = await this.db.query.users.findFirst({
            where: eq(users.id, asset.assignedTo)
        });
        
        const hrDept = await this.db.query.departments.findFirst({
            where: eq(departments.name, 'Operations & Human Resources')
        });

        let hrEmail = 'divinebuilds123@gmail.com';
        // if (hrDept && hrDept.headId) {
        //     const headEmp = await this.db.query.employees.findFirst({
        //         where: eq(employees.id, hrDept.headId)
        //     });
        //     if (headEmp && headEmp.workEmail) {
        //         hrEmail = headEmp.workEmail;
        //     } else {
        //         // Try treating headId as userId
        //         const headUser = await this.db.query.users.findFirst({
        //             where: eq(users.id, hrDept.headId)
        //         });
        //         if (headUser && headUser.email) {
        //             hrEmail = headUser.email;
        //         }
        //     }
        // }

        const custodianName = assignee ? (assignee as any).name || (assignee as any).firstName + ' ' + (assignee as any).lastName || assignee.email : 'Unknown Employee';

        const attachments = base64Pdf ? [{
            content: base64Pdf,
            mime_type: 'application/pdf',
            name: `Asset_Custody_Agreement_${asset.id}.pdf`
        }] : undefined;

        await sendEmail(
            hrEmail,
            'Asset Consent Signed: ' + asset.name,
            `
                <h2>Asset Consent Signed</h2>
                <p>Hello HR,</p>
                <p><strong>${custodianName}</strong> has signed the consent form for the assigned asset: <strong>${asset.name}</strong> (${asset.id}).</p>
                <p>You can view the signed document in the AssetTrackPro dashboard, or see the attached PDF generated directly from the frontend.</p>
                <div style="text-align: center;">
                    <a href="https://assets.noltfinance.com/consent/${asset.id}/document" class="btn">View Online Document &rarr;</a>
                </div>
                <br/>
                <p>Best regards,<br/>AssetTrackPro System</p>
            `,
            'Asset Consent Executed',
            'AssetTrackPro System',
            undefined,
            'AssetTrackPro',
            attachments
        ).catch(e => console.error("Email send failed for HR Consent:", e));

        const [updatedAsset] = await this.db.update(assets)
            .set({ hrConsentSubmitted: true })
            .where(eq(assets.id, id))
            .returning();

        return updatedAsset;
    }

    async getAllAssets() {
        return this.db.query.assets.findMany();
    }

    async getLifecycleLogs(assetId: string) {
        return await this.db.query.assetLifecycleLogs.findMany({
            where: eq(assetLifecycleLogs.assetId, assetId),
            with: {
                performedBy: { columns: { id: true, email: true } },
                previousAssignee: { columns: { id: true, email: true } },
                newAssignee: { columns: { id: true, email: true } },
            },
            orderBy: (logs: any, { desc }: any) => [desc(logs.createdAt)]
        });
    }
}
