import { eq, inArray } from 'drizzle-orm';
import { assets, users, assetActivities } from '../../db/schema';
import { supabase } from '../../utils/supabase';
import { CreateAssetInput } from './assets.schema';
import { sendEmail } from '../shared/zepto';

export class AssetsService {
    constructor(private db: any) { }

    async createAsset(data: CreateAssetInput, fileBuffer?: Buffer, fileName?: string, fileType?: string) {
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

    async acceptAsset(assetId: string) {
        const [updatedAsset] = await this.db.update(assets)
            .set({ status: 'ACTIVE' })
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

    async assignAsset(id: string, data: { assignedTo: string; manager: string; department: string }) {
        const [updatedAsset] = await this.db.update(assets)
            .set({
                assignedTo: data.assignedTo,
                manager: data.manager,
                department: data.department,
                status: 'PENDING'
            })
            .where(eq(assets.id, id))
            .returning();

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

        // Logic to dispatch consent email can go here in the future

        return updatedAsset;
    }

    async bulkAssignAssets(assetIds: string[], data: { assignedTo: string; manager: string; department: string }) {
        const updatedAssets = await Promise.all(
            assetIds.map(async (id) => {
                const [updated] = await this.db.update(assets)
                    .set({
                        assignedTo: data.assignedTo,
                        manager: data.manager,
                        department: data.department,
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
                }
                
                return updated;
            })
        );
        return updatedAssets.filter(Boolean);
    }

    async reassignAsset(id: string, data: { assignedTo: string; manager: string; department: string }) {
        const [updatedAsset] = await this.db.update(assets)
            .set({
                assignedTo: data.assignedTo,
                manager: data.manager,
                department: data.department,
                status: 'PENDING'
            })
            .where(eq(assets.id, id))
            .returning();

        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }

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
                    <br/>
                    <p>Best regards,<br/>AssetTrackPro System</p>
                `
            ).catch(e => console.error("Email send failed for reassignment:", e));
        }

        return updatedAsset;
    }

    async decommissionAsset(id: string) {
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

    async getAllAssets() {
        return this.db.query.assets.findMany();
    }
}
