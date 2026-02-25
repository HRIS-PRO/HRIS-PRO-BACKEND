import { eq } from 'drizzle-orm';
import { assets } from '../../db/schema';
import { supabase } from '../../utils/supabase';
import { CreateAssetInput } from './assets.schema';
import { sendEmail } from '../shared/zepto';
import { users } from '../../db/schema';

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

        // Generate ID
        const assetId = cleanSerialNumber ? cleanSerialNumber : `AST-${Math.floor(Math.random() * 10000)}`;

        // Save to Database
        const [newAsset] = await this.db.insert(assets).values({
            id: assetId,
            name: data.name,
            category: data.category,
            purchasePrice: Number(data.purchasePrice) || 0,
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

        // Send Email if assigned
        if (status === 'PENDING' && cleanAssignedTo) {
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

    async acceptAsset(assetId: string) {
        const [updatedAsset] = await this.db.update(assets)
            .set({ status: 'ACTIVE' })
            .where(eq(assets.id, assetId))
            .returning();

        if (!updatedAsset) {
            throw new Error('Asset not found');
        }

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
                return updated;
            })
        );
        return updatedAssets.filter(Boolean);
    }

    async getAllAssets() {
        return this.db.query.assets.findMany();
    }
}
