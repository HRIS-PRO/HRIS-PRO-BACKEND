"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getSuperAdmins(request, reply) {
        try {
            const superAdmins = await this.usersService.getSuperAdmins();
            return reply.send(superAdmins);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch super admins' });
        }
    }
}
exports.UsersController = UsersController;
