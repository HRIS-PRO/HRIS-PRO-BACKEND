import { FastifyInstance } from 'fastify';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

export default async function usersRoutes(app: FastifyInstance) {
    const usersService = new UsersService();
    const usersController = new UsersController(usersService);

    app.get('/super-admins', {
        preHandler: [app.authenticate]
    }, usersController.getSuperAdmins.bind(usersController));

    app.get('/apps/asset-tracker', {
        preHandler: [app.authenticate]
    }, usersController.getAssetTrackerUsers.bind(usersController));
}
