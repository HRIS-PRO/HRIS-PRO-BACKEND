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
                        // Assuming the frontend sends metadata stringified under a "data" field
                        if (part.fieldname === 'data') {
                            parsedData = JSON.parse(part.value as string);
                        } else {
                            parsedData[part.fieldname] = part.value;
                        }
                    } catch (e) {
                        // Fallback for simple key-value FormData
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

    async acceptAsset(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const { id } = request.params;
            const updatedAsset = await this.assetsService.acceptAsset(id);
            return reply.send(updatedAsset);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to accept asset' });
        }
    }
}
