"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const supabase_1 = require("../../utils/supabase");
const zepto_1 = require("../shared/zepto");
const schema_2 = require("../../db/schema");
class AssetsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async createAsset(data, fileBuffer, fileName, fileType) {
        let fileUrl = null;
        // Upload to Supabase if a file was provided
        if (fileBuffer && fileName) {
            const uniqueName = `${Date.now()}-${fileName}`;
            const { data: uploadData, error } = await supabase_1.supabase.storage
                .from('AssetTracker')
                .upload(uniqueName, fileBuffer, {
                contentType: fileType,
            });
            if (error) {
                console.error("Supabase Upload Error:", error);
                throw new Error("Failed to upload asset receipt/image");
            }
            const { data: publicUrlData } = supabase_1.supabase.storage
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
        const [newAsset] = await this.db.insert(schema_1.assets).values({
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
                where: (0, drizzle_orm_1.eq)(schema_2.users.id, cleanAssignedTo),
            });
            if (assignee) {
                await (0, zepto_1.sendEmail)(assignee.email, 'New Asset Assignment Pending Review', `
                        <h2>Asset Assignment Review</h2>
                        <p>Hello,</p>
                        <p>You have been assigned a new asset: <strong>${data.name}</strong> (${assetId}).</p>
                        <p>Please log in to AssetTrackPro and accept or report this assignment from your dashboard.</p>
                        ${fileUrl ? `<p><a href="${fileUrl}">View Attached Image/Receipt</a></p>` : ''}
                        <br/>
                        <p>Best regards,<br/>AssetTrackPro System</p>
                    `).catch(e => console.error("Email send failed:", e));
            }
        }
        return newAsset;
    }
    async acceptAsset(assetId) {
        const [updatedAsset] = await this.db.update(schema_1.assets)
            .set({ status: 'ACTIVE' })
            .where((0, drizzle_orm_1.eq)(schema_1.assets.id, assetId))
            .returning();
        if (!updatedAsset) {
            throw new Error('Asset not found');
        }
        return updatedAsset;
    }
    async bulkAcceptAssets(assetIds) {
        // Use inArray from drizzle-orm if possible, or execute individually.
        // Assuming we can map over them and accept individually for simplicity if inArray is not imported or complex,
        // but it's better to import `inArray` if we can.
        // Let's implement it the simple way first to avoid missing imports.
        const updatedAssets = await Promise.all(assetIds.map(async (id) => {
            const [updated] = await this.db.update(schema_1.assets)
                .set({ status: 'ACTIVE' })
                .where((0, drizzle_orm_1.eq)(schema_1.assets.id, id))
                .returning();
            return updated;
        }));
        return updatedAssets.filter(Boolean);
    }
    async assignAsset(id, data) {
        const [updatedAsset] = await this.db.update(schema_1.assets)
            .set({
            assignedTo: data.assignedTo,
            manager: data.manager,
            department: data.department,
            status: 'PENDING'
        })
            .where((0, drizzle_orm_1.eq)(schema_1.assets.id, id))
            .returning();
        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }
        // Logic to dispatch consent email can go here in the future
        return updatedAsset;
    }
    async bulkAssignAssets(assetIds, data) {
        const updatedAssets = await Promise.all(assetIds.map(async (id) => {
            const [updated] = await this.db.update(schema_1.assets)
                .set({
                assignedTo: data.assignedTo,
                manager: data.manager,
                department: data.department,
                status: 'PENDING'
            })
                .where((0, drizzle_orm_1.eq)(schema_1.assets.id, id))
                .returning();
            return updated;
        }));
        return updatedAssets.filter(Boolean);
    }
    async reassignAsset(id, data) {
        const [updatedAsset] = await this.db.update(schema_1.assets)
            .set({
            assignedTo: data.assignedTo,
            manager: data.manager,
            department: data.department,
            status: 'PENDING'
        })
            .where((0, drizzle_orm_1.eq)(schema_1.assets.id, id))
            .returning();
        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }
        // Fetch assignee email
        const assignee = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_2.users.id, data.assignedTo),
        });
        if (assignee) {
            await (0, zepto_1.sendEmail)(assignee.email, 'New Asset Reassignment Pending Review', `
                    <h2>Asset Reassignment Review</h2>
                    <p>Hello,</p>
                    <p>You have been reassigned an existing asset: <strong>${updatedAsset.name}</strong> (${updatedAsset.id}).</p>
                    <p>Please log in to AssetTrackPro and accept or report this assignment from your dashboard.</p>
                    <br/>
                    <p>Best regards,<br/>AssetTrackPro System</p>
                `).catch(e => console.error("Email send failed for reassignment:", e));
        }
        return updatedAsset;
    }
    async decommissionAsset(id) {
        const [updatedAsset] = await this.db.update(schema_1.assets)
            .set({
            status: 'DECOMMISSIONED',
            assignedTo: null
        })
            .where((0, drizzle_orm_1.eq)(schema_1.assets.id, id))
            .returning();
        if (!updatedAsset) {
            throw new Error(`Asset with id ${id} not found`);
        }
        return updatedAsset;
    }
    async getAllAssets() {
        return this.db.query.assets.findMany();
    }
}
exports.AssetsService = AssetsService;
