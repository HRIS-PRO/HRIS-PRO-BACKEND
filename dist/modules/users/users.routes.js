"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = usersRoutes;
const users_controller_1 = require("./users.controller");
const users_service_1 = require("./users.service");
async function usersRoutes(app) {
    const usersService = new users_service_1.UsersService();
    const usersController = new users_controller_1.UsersController(usersService);
    app.get('/super-admins', {
        preHandler: [app.authenticate]
    }, usersController.getSuperAdmins.bind(usersController));
}
