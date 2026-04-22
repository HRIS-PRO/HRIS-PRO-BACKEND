"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsController = void 0;
class AssetsController {
    assetsService;
    constructor(assetsService) {
        this.assetsService = assetsService;
    }
    async createAsset(request, reply) {
        try {
            const parts = request.parts();
            let fileBuffer;
            let fileName;
            let fileType;
            let parsedData = {};
            for await (const part of parts) {
                if (part.type === 'file') {
                    fileBuffer = await part.toBuffer();
                    fileName = part.filename;
                    fileType = part.mimetype;
                }
                else {
                    try {
                        if (part.fieldname === 'data') {
                            parsedData = JSON.parse(part.value);
                        }
                        else {
                            parsedData[part.fieldname] = part.value;
                        }
                    }
                    catch (e) {
                        parsedData[part.fieldname] = part.value;
                    }
                }
            }
            const newAsset = await this.assetsService.createAsset(parsedData, fileBuffer, fileName, fileType);
            return reply.status(201).send(newAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to create asset' });
        }
    }
    async bulkCreateAssets(request, reply) {
        try {
            const assetsData = request.body;
            if (!Array.isArray(assetsData)) {
                return reply.status(400).send({ message: 'Request body must be an array of assets' });
            }
            const newAssets = await this.assetsService.bulkCreateAssets(assetsData);
            return reply.status(201).send(newAssets);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to bulk create assets' });
        }
    }
    async getAllAssets(request, reply) {
        try {
            const assets = await this.assetsService.getAllAssets();
            return reply.send(assets);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch assets' });
        }
    }
    async getLifecycleLogs(request, reply) {
        try {
            const { id } = request.params;
            const logs = await this.assetsService.getLifecycleLogs(id);
            return reply.send(logs);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch lifecycle logs' });
        }
    }
    async acceptAsset(request, reply) {
        try {
            const { id } = request.params;
            const consentSignature = request.body?.consentSignature;
            const updatedAsset = await this.assetsService.acceptAsset(id, consentSignature);
            return reply.send(updatedAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to accept asset' });
        }
    }
    async sendHrConsent(request, reply) {
        try {
            const { id } = request.params;
            const pdfBase64 = request.body?.pdfBase64;
            const updatedAsset = await this.assetsService.sendHrConsent(id, pdfBase64);
            return reply.send(updatedAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to dispatch HR consent mail' });
        }
    }
    async bulkAcceptAssets(request, reply) {
        try {
            const { assetIds } = request.body;
            if (!assetIds || !Array.isArray(assetIds)) {
                return reply.status(400).send({ message: 'assetIds must be an array of strings' });
            }
            const updatedAssets = await this.assetsService.bulkAcceptAssets(assetIds);
            return reply.send(updatedAssets);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to bulk accept assets' });
        }
    }
    async assignAsset(request, reply) {
        try {
            const { id } = request.params;
            const data = request.body;
            if (!data.assignedTo || !data.manager || !data.department || !data.location) {
                return reply.status(400).send({ message: 'assignedTo, manager, department, and location are required for assignment' });
            }
            const updatedAsset = await this.assetsService.assignAsset(id, data);
            return reply.send(updatedAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to assign asset' });
        }
    }
    async bulkAssignAssets(request, reply) {
        try {
            const { assetIds, data } = request.body;
            if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
                return reply.status(400).send({ message: 'assetIds must be a non-empty array of strings' });
            }
            if (!data || !data.assignedTo || !data.manager || !data.department || !data.location) {
                return reply.status(400).send({ message: 'Assignment data (assignedTo, manager, department, location) is required' });
            }
            const updatedAssets = await this.assetsService.bulkAssignAssets(assetIds, data);
            return reply.send(updatedAssets);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to bulk assign assets' });
        }
    }
    async reassignAsset(request, reply) {
        try {
            const { id } = request.params;
            const data = request.body;
            // Should verify user is super-admin here or rely on route guard
            const updatedAsset = await this.assetsService.reassignAsset(id, data);
            return reply.send(updatedAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to reassign asset' });
        }
    }
    async decommissionAsset(request, reply) {
        try {
            const { id } = request.params;
            const updatedAsset = await this.assetsService.decommissionAsset(id);
            return reply.send(updatedAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to decommission asset' });
        }
    }
    async unassignAsset(request, reply) {
        try {
            const { id } = request.params;
            const updatedAsset = await this.assetsService.unassignAsset(id);
            return reply.send(updatedAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to unassign asset' });
        }
    }
    async updateAsset(request, reply) {
        try {
            const { id } = request.params;
            const data = request.body;
            const updatedAsset = await this.assetsService.updateAsset(id, data);
            return reply.send(updatedAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to update asset' });
        }
    }
}
exports.AssetsController = AssetsController;
