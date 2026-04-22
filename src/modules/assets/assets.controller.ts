import { FastifyReply, FastifyRequest } from 'fastify';
import { AssetsService } from './assets.service';

export class AssetsController {
    constructor(private assetsService: AssetsService) { }

    async createAsset(request: FastifyRequest, reply: FastifyReply) {
        try {
            const parts = request.parts();
            let fileBuffer: Buffer | undefined;
            let fileName: string | undefined;
            let fileType: string | undefined;
            let parsedData: any = {};

            for await (const part of parts) {
                if (part.type === 'file') {
                    fileBuffer = await part.toBuffer();
                    fileName = part.filename;
                    fileType = part.mimetype;
                } else {
                    try {
                        if (part.fieldname === 'data') {
                            parsedData = JSON.parse(part.value as string);
                        } else {
                            parsedData[part.fieldname] = part.value;
                        }
                    } catch (e) {
                        parsedData[part.fieldname] = part.value;
                    }
                }
            }

            const newAsset = await this.assetsService.createAsset(parsedData, fileBuffer, fileName, fileType);
            return reply.status(201).send(newAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to create asset' });
        }
    }

    async bulkCreateAssets(request: FastifyRequest<{ Body: any[] }>, reply: FastifyReply) {
        try {
            const assetsData = request.body;
            if (!Array.isArray(assetsData)) {
                return reply.status(400).send({ message: 'Request body must be an array of assets' });
            }
            const newAssets = await this.assetsService.bulkCreateAssets(assetsData);
            return reply.status(201).send(newAssets);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to bulk create assets' });
        }
    }

    async getAllAssets(request: FastifyRequest, reply: FastifyReply) {
        try {
            const assets = await this.assetsService.getAllAssets();
            return reply.send(assets);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch assets' });
        }
    }

    async getLifecycleLogs(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const logs = await this.assetsService.getLifecycleLogs(id);
            return reply.send(logs);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch lifecycle logs' });
        }
    }

    async acceptAsset(request: FastifyRequest<{ Params: { id: string }, Body?: { consentSignature?: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const consentSignature = request.body?.consentSignature;
            const updatedAsset = await this.assetsService.acceptAsset(id, consentSignature);
            return reply.send(updatedAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to accept asset' });
        }
    }

    async sendHrConsent(request: FastifyRequest<{ Params: { id: string }, Body?: { pdfBase64?: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const pdfBase64 = request.body?.pdfBase64;
            const updatedAsset = await this.assetsService.sendHrConsent(id, pdfBase64);
            return reply.send(updatedAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to dispatch HR consent mail' });
        }
    }

    async bulkAcceptAssets(request: FastifyRequest<{ Body: { assetIds: string[] } }>, reply: FastifyReply) {
        try {
            const { assetIds } = request.body;
            if (!assetIds || !Array.isArray(assetIds)) {
                return reply.status(400).send({ message: 'assetIds must be an array of strings' });
            }
            const updatedAssets = await this.assetsService.bulkAcceptAssets(assetIds);
            return reply.send(updatedAssets);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to bulk accept assets' });
        }
    }

    async assignAsset(request: FastifyRequest<{ Params: { id: string }, Body: { assignedTo: string; manager: string; department: string; location: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const data = request.body;

            if (!data.assignedTo || !data.manager || !data.department || !data.location) {
                return reply.status(400).send({ message: 'assignedTo, manager, department, and location are required for assignment' });
            }

            const updatedAsset = await this.assetsService.assignAsset(id, data);
            return reply.send(updatedAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to assign asset' });
        }
    }

    async bulkAssignAssets(request: FastifyRequest<{ Body: { assetIds: string[], data: { assignedTo: string; manager: string; department: string; location: string } } }>, reply: FastifyReply) {
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
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to bulk assign assets' });
        }
    }

    async reassignAsset(request: FastifyRequest<{ Params: { id: string }, Body: { assignedTo: string; manager: string; department: string; location: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const data = request.body;

            // Should verify user is super-admin here or rely on route guard
            const updatedAsset = await this.assetsService.reassignAsset(id, data);
            return reply.send(updatedAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to reassign asset' });
        }
    }

    async decommissionAsset(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const updatedAsset = await this.assetsService.decommissionAsset(id);
            return reply.send(updatedAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to decommission asset' });
        }
    }
    async unassignAsset(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const updatedAsset = await this.assetsService.unassignAsset(id);
            return reply.send(updatedAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to unassign asset' });
        }
    }

    async updateAsset(request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const data = request.body;
            const updatedAsset = await this.assetsService.updateAsset(id, data);
            return reply.send(updatedAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to update asset' });
        }
    }
}
