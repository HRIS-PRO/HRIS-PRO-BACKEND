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
                        // Assuming the frontend sends metadata stringified under a "data" field
                        if (part.fieldname === 'data') {
                            parsedData = JSON.parse(part.value);
                        }
                        else {
                            parsedData[part.fieldname] = part.value;
                        }
                    }
                    catch (e) {
                        // Fallback for simple key-value FormData
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
    async acceptAsset(request, reply) {
        try {
            const { id } = request.params;
            const updatedAsset = await this.assetsService.acceptAsset(id);
            return reply.send(updatedAsset);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to accept asset' });
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
            if (!data.assignedTo || !data.manager || !data.department) {
                return reply.status(400).send({ message: 'assignedTo, manager, and department are tightly required for assignment' });
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
            if (!data || !data.assignedTo || !data.manager || !data.department) {
                return reply.status(400).send({ message: 'Assignment data (assignedTo, manager, department) is required' });
            }
            const updatedAssets = await this.assetsService.bulkAssignAssets(assetIds, data);
            return reply.send(updatedAssets);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to bulk assign assets' });
        }
    }
}
exports.AssetsController = AssetsController;
