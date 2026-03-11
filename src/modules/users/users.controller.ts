import { FastifyReply, FastifyRequest } from 'fastify';
import { UsersService } from './users.service';

export class UsersController {
    constructor(private usersService: UsersService) { }

    async getSuperAdmins(request: FastifyRequest, reply: FastifyReply) {
        try {
            const superAdmins = await this.usersService.getSuperAdmins();
            return reply.send(superAdmins);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch super admins' });
        }
    }

    async getAssetTrackerUsers(request: FastifyRequest, reply: FastifyReply) {
        try {
            const users = await this.usersService.getAssetTrackerUsers();
            return reply.send(users);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch asset tracker users' });
        }
    }
}
