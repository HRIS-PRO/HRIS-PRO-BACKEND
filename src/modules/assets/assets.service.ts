import { eq, inArray, and, or, isNull } from 'drizzle-orm';
import { assets, users, assetActivities, assetLocations, departments, employees, assetLifecycleLogs, assetCategories, orgSettings } from '../../db/schema';
import { AssetLocationsService } from '../asset-locations/asset-locations.service';
import { supabase } from '../../utils/supabase';
import { CreateAssetInput } from './assets.schema';
import { sendEmail } from '../shared/zepto';
import { buildAssetAppInviteEmail, buildConsentRequestEmail, buildAssetReallocationEmail, buildConsentSignedEmail } from '../shared/asset-email-templates';

const assetLocationsService = new AssetLocationsService();

function formatAssetSpecs(asset: { description?: string | null; category?: string | null; condition?: string | null; name?: string | null }): string {
    const desc = asset.description?.trim();
    if (desc && !/^(batch import|import|n\/a)$/i.test(desc) && desc.length > 2) {
        return desc;
    }
    const cat = asset.category || 'Workstation Equipment';
    const cond = asset.condition || 'Good';
    return `${cat} • ${cond} Condition`;
}

function resolveStaffFirstName(assigneeUser?: any, assignedToVal?: string | null, empRecord?: any): string {
    if (empRecord && empRecord.firstName && empRecord.firstName.trim().length > 0) {
        return empRecord.firstName.trim();
    }
    if (assigneeUser && assigneeUser.employee && assigneeUser.employee.firstName && assigneeUser.employee.firstName.trim().length > 0) {
        return assigneeUser.employee.firstName.trim();
    }
    const rawEmail = assigneeUser?.email || (assignedToVal && assignedToVal.includes('@') ? assignedToVal : null);
    if (rawEmail) {
        const prefix = rawEmail.split('@')[0].replace(/[._-]/g, ' ');
        const words = prefix.split(' ').filter(Boolean);
        if (words.length > 0) {
            const cleanWord = words.find((w: string) => w.length > 1) || words[0];
            return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
        }
    }
    return 'Team Member';
}


export class AssetsService {
    constructor(private db: any) { }

    // Generates sequential asset number following: Company / Department / Asset Category / number (e.g. NF / FIN / LAP / 001).
    private async generateAssetNumber(offset = 0, categoryName?: string, departmentName?: string): Promise<string> {
        let companyCode = 'NF';
        try {
            const orgSetting = await this.db.query.orgSettings.findFirst({
                where: eq(orgSettings.id, 'singleton')
            });
            if (orgSetting?.orgMnemonic) {
                companyCode = orgSetting.orgMnemonic.toUpperCase();
            }
        } catch (e) { /* fallback to default NF */ }

        let catCode = 'GEN';
        if (categoryName) {
            try {
                const catRow = await this.db.query.assetCategories.findFirst({
                    where: eq(assetCategories.name, categoryName)
                });
                if (catRow?.mnemonic) {
                    catCode = catRow.mnemonic.toUpperCase();
                } else {
                    catCode = categoryName.substring(0, 3).toUpperCase();
                }
            } catch (e) {
                catCode = categoryName.substring(0, 3).toUpperCase();
            }
        }

        let deptCode = 'GEN';
        if (departmentName) {
            try {
                const deptRow = await this.db.query.departments.findFirst({
                    where: eq(departments.name, departmentName)
                });
                if (deptRow?.mnemonic) {
                    deptCode = deptRow.mnemonic.toUpperCase();
                } else {
                    deptCode = departmentName.substring(0, 3).toUpperCase();
                }
            } catch (e) {
                deptCode = departmentName.substring(0, 3).toUpperCase();
            }
        }

        const rows = await this.db.select({ n: assets.assetNumber }).from(assets);
        let max = 0;
        for (const r of rows) {
            const m = /(\d+)$/.exec((r.n || '').trim());
            if (m) {
                const val = parseInt(m[1], 10);
                if (val > max) max = val;
            }
        }
        const seq = String(max + 1 + offset).padStart(3, '0');
        return `${companyCode} / ${deptCode} / ${catCode} / ${seq}`;
    }

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

    // Uploads an asset image/receipt to Supabase storage and returns its public URL.
    private async uploadAssetFile(fileBuffer: Buffer, fileName: string, fileType?: string): Promise<string> {
        const uniqueName = `${Date.now()}-${fileName}`;
        const { error } = await supabase.storage
            .from('AssetTracker')
            .upload(uniqueName, fileBuffer, {
                contentType: fileType,
            });

        if (error) {
            console.error("Supabase Upload Error:", error);
            throw new Error(`Failed to upload asset image to storage: ${error.message || 'storage service unreachable'}`);
        }

        const { data: publicUrlData } = supabase.storage
            .from('AssetTracker')
            .getPublicUrl(uniqueName);

        return publicUrlData.publicUrl;
    }

    async createAsset(data: CreateAssetInput, fileBuffer?: Buffer, fileName?: string, fileType?: string, actorId?: string) {
        let fileUrl: string | null = null;

        if (fileBuffer && fileName) {
            fileUrl = await this.uploadAssetFile(fileBuffer, fileName, fileType);
        }

        // Determine initial status based on assignment
        const status = data.assignedTo && data.assignedTo.trim() !== '' ? 'PENDING' : 'IDLE';

        // Sanitize nullable fields that might be passed as empty strings from frontend
        const cleanAssignedTo = data.assignedTo?.trim() || null;
        const cleanDescription = data.description?.trim() || 'n/a';
        const cleanSerialNumber = data.serialNumber?.trim() || null;

        // Generate ID - Always use a unique internal ID
        const assetId = `AST-${Math.floor(100000 + Math.random() * 900000)}`;
        // Generate the human-facing sequential display number (e.g. NF / FIN / LAP / 001)
        const assetNumber = await this.generateAssetNumber(0, data.category, data.department);

        // Save to Database
        const [newAsset] = await this.db.insert(assets).values({
            id: assetId,
            assetNumber,
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
                with: { employee: true }
            });

            if (assignee) {
                const assigneeEmp = (assignee as any).employee;
                const assigneeFirst = resolveStaffFirstName(assignee, cleanAssignedTo, assigneeEmp);
                await sendEmail(
                    assignee.email,
                    'Action Required — Your Consent Is Needed',
                    buildConsentRequestEmail({
                        firstName: assigneeFirst,
                        serialNumber: newAsset.serialNumber || newAsset.id,
                        laptopModel: newAsset.name,
                        laptopSpecs: formatAssetSpecs(newAsset),
                        consentUrl: `https://assets.noltfinance.com/#/consent/${newAsset.id}`
                    })
                ).catch(e => console.error("Email send failed:", e));
            }
        }

        return newAsset;
    }

    // Blank means the field carries no real data yet (unset, empty or a placeholder default)
    private isBlankField(v: any): boolean {
        if (v === null || v === undefined) return true;
        const s = `${v}`.trim();
        return s === '' || s === 'N/A' || s === '0';
    }

    async bulkCreateAssets(assetsData: any[]) {
        const results = [];
        let offset = 0;
        for (const data of assetsData) {
            try {
                const status = data.assignedTo && data.assignedTo.trim() !== '' ? 'PENDING' : 'IDLE';
                const cleanAssignedTo = data.assignedTo?.trim() || null;
                const cleanSerialNumber = data.serialNumber?.trim() || null;
                const cleanName = data.name?.trim() || null;

                // Upsert: match an existing asset by serial number first, then by
                // exact name among assets that have no serial yet
                let existing = null;
                if (cleanSerialNumber) {
                    [existing] = await this.db.select().from(assets)
                        .where(eq(assets.serialNumber, cleanSerialNumber)).limit(1);
                }
                if (!existing && cleanName) {
                    [existing] = await this.db.select().from(assets)
                        .where(and(
                            eq(assets.name, cleanName),
                            or(isNull(assets.serialNumber), eq(assets.serialNumber, ''))
                        )).limit(1);
                }

                if (existing) {
                    // Only fill blanks — never overwrite live data with spreadsheet values
                    const updates: any = {};
                    if (this.isBlankField(existing.serialNumber) && cleanSerialNumber) updates.serialNumber = cleanSerialNumber;
                    if (this.isBlankField(existing.purchasePrice) && data.purchasePrice) updates.purchasePrice = data.purchasePrice.toString();
                    if (this.isBlankField(existing.condition) && data.condition) updates.condition = data.condition;
                    if (this.isBlankField(existing.location) && data.location) updates.location = data.location;
                    if (this.isBlankField(existing.department) && data.department) updates.department = data.department;
                    if (this.isBlankField(existing.manager) && data.manager) updates.manager = data.manager;
                    if (this.isBlankField(existing.description) && data.description) updates.description = data.description;

                    if (Object.keys(updates).length > 0) {
                        const [updated] = await this.db.update(assets)
                            .set(updates)
                            .where(eq(assets.id, existing.id))
                            .returning();

                        await this.db.insert(assetActivities).values({
                            type: 'system',
                            title: 'Asset Enriched (Batch)',
                            desc: `${updated.name} was updated via bulk import (${Object.keys(updates).join(', ')}).`,
                            icon: 'sync',
                            color: 'indigo',
                            roles: ['SUPER_ADMIN', 'ADMIN_USER', 'AUDITOR'],
                            assetId: updated.id
                        });

                        results.push(updated);
                    } else {
                        results.push(existing);
                    }
                    continue;
                }

                // Generate a unique internal ID for each imported row
                const assetId = `AST-B-${Math.floor(Math.random() * 16777215).toString(16).toUpperCase()}`;
                // Allocate the next sequential display number for this batch row (e.g. NF / FIN / LAP / 001)
                const assetNumber = await this.generateAssetNumber(offset, data.category, data.department);
                offset++;

                const values = {
                    id: assetId,
                    assetNumber,
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

    async assignAsset(id: string, data: { assignedTo: string; manager: string; department: string; location: string }, actorId?: string, sendConsentMail: boolean = true) {
        await this.ensureLocationExists(data.location);
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });

        // Rebuild the assetNumber with the correct department mnemonic on first real assignment.
        // Format is: orgCode / deptCode / catCode / seq  (e.g. NF / GEN / TEST / 001)
        let updatedAssetNumber = targetAsset?.assetNumber;
        if (updatedAssetNumber && data.department) {
            try {
                // asset.department stores the dept NAME (not UUID). Query by name only.
                // If it looks like a UUID (rare edge case), also try by id.
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.department);
                const deptRow = await this.db.query.departments.findFirst({
                    where: isUuid
                        ? eq(departments.id, data.department)
                        : eq(departments.name, data.department)
                });
                if (deptRow) {
                    const newDeptCode = (deptRow.mnemonic || deptRow.name.substring(0, 3)).toUpperCase();
                    const parts = updatedAssetNumber.split('/').map((p: string) => p.trim());
                    if (parts.length === 4) {
                        parts[1] = newDeptCode;
                        updatedAssetNumber = parts.join(' / ');
                    }
                }
            } catch (e) { console.error('[assignAsset] dept lookup failed:', e); }
        }


        const [updatedAsset] = await this.db.update(assets)
            .set({
                assignedTo: data.assignedTo,
                manager: data.manager,
                department: data.department,
                location: data.location,
                status: sendConsentMail ? 'PENDING' : 'ACTIVE',
                consentSignature: null,
                hrConsentSubmitted: !sendConsentMail,
                ...(updatedAssetNumber ? { assetNumber: updatedAssetNumber } : {})
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

        if (sendConsentMail) {
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
                with: { employee: true }
            });

            if (assignee) {
                const assigneeEmp = (assignee as any).employee;
                const assigneeFirst = resolveStaffFirstName(assignee, data.assignedTo, assigneeEmp);
                await sendEmail(
                    assignee.email,
                    'Action Required — Your Consent Is Needed',
                    buildConsentRequestEmail({
                        firstName: assigneeFirst,
                        serialNumber: updatedAsset.serialNumber || updatedAsset.id,
                        laptopModel: updatedAsset.name,
                        laptopSpecs: formatAssetSpecs(updatedAsset),
                        consentUrl: `https://assets.noltfinance.com/#/consent/${updatedAsset.id}`
                    })
                ).catch(e => console.error("Email send failed for assignment:", e));
            }
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
                        with: { employee: true }
                    });

                    if (assignee) {
                        const assigneeEmp = (assignee as any).employee;
                        const assigneeFirst = resolveStaffFirstName(assignee, data.assignedTo, assigneeEmp);
                        await sendEmail(
                            assignee.email,
                            'Action Required — Your Consent Is Needed',
                            buildConsentRequestEmail({
                                firstName: assigneeFirst,
                                serialNumber: updated.serialNumber || updated.id,
                                laptopModel: updated.name,
                                laptopSpecs: formatAssetSpecs(updated),
                                consentUrl: `https://assets.noltfinance.com/#/consent/${updated.id}`
                            })
                        ).catch(e => console.error("Email send failed for bulk assignment:", e));
                    }
                }

                return updated;
            })
        );
        return updatedAssets.filter(Boolean);
    }

    async reassignAsset(id: string, data: { assignedTo: string; manager: string; department: string; location: string }, actorId?: string, sendConsentMail: boolean = true) {
        await this.ensureLocationExists(data.location);
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });

        // Rebuild the assetNumber with the new department's mnemonic
        let updatedAssetNumber = targetAsset?.assetNumber;
        if (updatedAssetNumber && data.department) {
            try {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.department);
                const deptRow = await this.db.query.departments.findFirst({
                    where: isUuid
                        ? eq(departments.id, data.department)
                        : eq(departments.name, data.department)
                });
                if (deptRow) {
                    const newDeptCode = (deptRow.mnemonic || deptRow.name.substring(0, 3)).toUpperCase();
                    const parts = updatedAssetNumber.split('/').map((p: string) => p.trim());
                    if (parts.length === 4) {
                        parts[1] = newDeptCode;
                        updatedAssetNumber = parts.join(' / ');
                    }
                }
            } catch (e) { console.error('[reassignAsset] dept lookup failed:', e); }
        }

        const [updatedAsset] = await this.db.update(assets)
            .set({
                assignedTo: data.assignedTo,
                manager: data.manager,
                department: data.department,
                location: data.location,
                status: sendConsentMail ? 'PENDING' : 'ACTIVE',
                consentSignature: null,
                hrConsentSubmitted: !sendConsentMail,
                ...(updatedAssetNumber ? { assetNumber: updatedAssetNumber } : {})
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

        if (sendConsentMail) {
            await this.db.insert(assetActivities).values({
                type: 'system',
                title: 'Action Required',
                desc: `Please accept the assignment of ${updatedAsset.name}.`,
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
                with: { employee: true }
            });

            if (assignee) {
                const assigneeEmp = (assignee as any).employee;
                const assigneeFirst = resolveStaffFirstName(assignee, data.assignedTo, assigneeEmp);
                const assigneeName = assigneeEmp ? `${assigneeEmp.firstName} ${assigneeEmp.surname}`.trim() : assignee.email;

                // Branded consent email to the staff member
                await sendEmail(
                    assignee.email,
                    'Action Required — Your Consent Is Needed',
                    buildConsentRequestEmail({
                        firstName: assigneeFirst,
                        serialNumber: updatedAsset.serialNumber || updatedAsset.id,
                        laptopModel: updatedAsset.name,
                        laptopSpecs: formatAssetSpecs(updatedAsset),
                        consentUrl: `https://assets.noltfinance.com/#/consent/${updatedAsset.id}`
                    })
                ).catch(e => console.error("Email send failed for reassignment:", e));

                // Branded reallocation notification to assets@noltfinance.com
                const approvalDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                await sendEmail(
                    'assets@noltfinance.com',
                    `Asset Reallocation Notification – ${assigneeName}`,
                    buildAssetReallocationEmail({
                        staffName: assigneeName,
                        oldSerialNumber: targetAsset?.serialNumber || 'N/A',
                        newSerialNumber: updatedAsset.serialNumber || updatedAsset.id,
                        laptopModel: updatedAsset.modelNumber || updatedAsset.name,
                        laptopSpecs: updatedAsset.description || updatedAsset.condition || 'N/A',
                        reason: 'Asset reallocation via AssetTrackPro',
                        approvedBy: actorId ? 'Administrator' : 'System',
                        approvalDate
                    })
                ).catch(e => console.error("Email send failed for reallocation notification:", e));
            }
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

    async markAssetMaintenance(id: string) {
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
        if (!targetAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }

        const [updatedAsset] = await this.db.update(assets)
            .set({
                status: 'MAINTENANCE'
            })
            .where(eq(assets.id, id))
            .returning();

        await this.logLifecycle({
            assetId: updatedAsset.id,
            actionType: 'STATUS_CHANGE',
            previousAssigneeId: targetAsset.assignedTo,
            newAssigneeId: targetAsset.assignedTo,
            metadata: { oldStatus: targetAsset.status, newStatus: 'MAINTENANCE', reason: 'Flagged for maintenance' }
        });

        await this.db.insert(assetActivities).values({
            type: 'system',
            title: 'Maintenance Required',
            desc: `${updatedAsset.name} was marked for maintenance/repair.`,
            icon: 'build',
            color: 'amber',
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

    async updateAsset(id: string, data: any, actorId?: string, fileBuffer?: Buffer, fileName?: string, fileType?: string) {
        const targetAsset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
        const updateData: any = {
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

        if (fileBuffer && fileName) {
            updateData.fileUrl = await this.uploadAssetFile(fileBuffer, fileName, fileType);
        }

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

        const isUuidStr = (val?: string | null) => !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        let assignee = asset.assignedTo ? await this.db.query.users.findFirst({
            where: isUuidStr(asset.assignedTo) ? eq(users.id, asset.assignedTo) : eq(users.email, asset.assignedTo),
            with: { employee: true }
        }) : null;

        if (!assignee && asset.assignedTo) {
            const emp = await this.db.query.employees.findFirst({
                where: isUuidStr(asset.assignedTo) ? eq(employees.id, asset.assignedTo) : eq(employees.workEmail, asset.assignedTo)
            });
            if (emp && emp.userId) {
                assignee = await this.db.query.users.findFirst({
                    where: eq(users.id, emp.userId),
                    with: { employee: true }
                }) || null;
            }
        }

        const orgSetting = await this.db.query.orgSettings.findFirst({
            where: eq(orgSettings.id, 'singleton')
        });
        const hrEmails: string[] = Array.isArray(orgSetting?.hrEmails) && orgSetting.hrEmails.length > 0 
            ? orgSetting.hrEmails 
            : ['divinebuilds123@gmail.com'];

        const assigneeEmp = (assignee as any)?.employee;
        let custodianName = 'Staff Member';
        if (assigneeEmp && (assigneeEmp.firstName || assigneeEmp.surname)) {
            custodianName = `${assigneeEmp.firstName || ''} ${assigneeEmp.surname || ''}`.trim();
        } else if (assignee?.email) {
            const raw = assignee.email.split('@')[0].replace(/[._-]/g, ' ');
            custodianName = raw.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        } else if (asset.assignedTo) {
            const raw = asset.assignedTo.split('@')[0].replace(/[._-]/g, ' ');
            custodianName = raw.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        const attachments = base64Pdf ? [{
            content: base64Pdf,
            mime_type: 'application/pdf',
            name: `Asset_Custody_Agreement_${asset.id}.pdf`
        }] : undefined;

        await Promise.all(hrEmails.map(email => 
            sendEmail(
                email,
                'Asset Consent Signed: ' + asset.name,
                buildConsentSignedEmail(custodianName, asset.name, asset.id),
                'Asset Consent Executed',
                'AssetTrackPro System',
                undefined,
                'AssetTrackPro',
                attachments
            ).catch(e => console.error("Email send failed for HR Consent to " + email + ":", e))
        ));

        const [updatedAsset] = await this.db.update(assets)
            .set({ hrConsentSubmitted: true })
            .where(eq(assets.id, id))
            .returning();

        return updatedAsset;
    }

    async getAllAssets() {
        return this.db.query.assets.findMany();
    }

    // Public, read-only snapshot for the QR scan page. No auth required.
    // Exposes only basic, non-sensitive fields plus the resolved custodian name.
    async getPublicAssetInfo(id: string) {
        const asset = await this.db.query.assets.findFirst({
            where: eq(assets.id, id)
        });
        if (!asset) return null;

        let custodianName: string | null = null;
        if (asset.assignedTo) {
            const employee = await this.db.query.employees.findFirst({
                where: eq(employees.userId, asset.assignedTo)
            });
            if (employee) {
                custodianName = `${employee.firstName} ${employee.surname}`.trim();
            } else {
                const user = await this.db.query.users.findFirst({
                    where: eq(users.id, asset.assignedTo)
                });
                custodianName = user?.email || null;
            }
        }

        return {
            id: asset.id,
            assetNumber: asset.assetNumber,
            name: asset.name,
            category: asset.category,
            serialNumber: asset.serialNumber,
            status: asset.status,
            location: asset.location,
            department: asset.department,
            condition: asset.condition,
            purchaseDate: asset.purchaseDate,
            custodianName,
            fileUrl: asset.fileUrl,
        };
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

    // Records a free-text audit-log entry added manually by an admin/auditor.
    async addManualLog(assetId: string, actorId: string | undefined, note: string) {
        const asset = await this.db.query.assets.findFirst({ where: eq(assets.id, assetId) });
        if (!asset) throw new Error('Asset not found');

        await this.logLifecycle({
            assetId,
            performedById: actorId,
            actionType: 'NOTE',
            metadata: { note }
        });

        return this.getLifecycleLogs(assetId);
    }

    async resendUserConsent(targetUserId: string) {
        const targetAssets = await this.db.query.assets.findMany({
            where: eq(assets.assignedTo, targetUserId)
        });

        const assignee = await this.db.query.users.findFirst({
            where: eq(users.id, targetUserId),
            with: { employee: true }
        });

        if (!assignee) {
            throw new Error('Assignee user not found');
        }

        if (targetAssets.length === 0) {
            return { message: 'No assets currently assigned to this user', count: 0 };
        }

        for (const asset of targetAssets) {
            await this.db.update(assets)
                .set({ status: 'PENDING', hrConsentSubmitted: false })
                .where(eq(assets.id, asset.id));

            await this.db.insert(assetActivities).values({
                type: 'system',
                title: 'Action Required',
                desc: `Please accept the custody consent for ${asset.name}.`,
                icon: 'signature',
                color: 'amber',
                roles: ['USER', 'SUPER_ADMIN'],
                targetUserId: targetUserId,
                assetId: asset.id,
                hasCTA: true
            });

            const assigneeEmp = (assignee as any).employee;
            const staffFirst = resolveStaffFirstName(assignee, targetUserId, assigneeEmp);
            await sendEmail(
                assignee.email,
                'Action Required — Your Consent Is Needed',
                buildConsentRequestEmail({
                    firstName: staffFirst,
                    serialNumber: asset.serialNumber || asset.id,
                    laptopModel: asset.name,
                    laptopSpecs: formatAssetSpecs(asset),
                    consentUrl: `https://assets.noltfinance.com/#/consent/${asset.id}`
                })
            ).catch(e => console.error("Email send failed for consent request:", e));
        }

        return { message: `Consent sign-off request sent for ${targetAssets.length} asset(s)`, count: targetAssets.length };
    }
}
