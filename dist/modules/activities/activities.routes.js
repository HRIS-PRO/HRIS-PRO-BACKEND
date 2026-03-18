"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = activitiesRoutes;
const activities_service_1 = require("./activities.service");
async function activitiesRoutes(app) {
    const activitiesService = new activities_service_1.ActivitiesService();
    app.addHook('onRequest', app.authenticate);
    app.get('/', async (request, reply) => {
        try {
            const activities = await activitiesService.getActivities();
            return reply.send(activities);
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({ message: 'Failed to fetch activities' });
        }
    });
}
