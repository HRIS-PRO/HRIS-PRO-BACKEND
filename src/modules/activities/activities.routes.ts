import { FastifyInstance } from 'fastify';
import { ActivitiesService } from './activities.service';

export default async function activitiesRoutes(app: FastifyInstance) {
    const activitiesService = new ActivitiesService();

    app.addHook('onRequest', app.authenticate);

    app.get('/', async (request, reply) => {
        try {
            const activities = await activitiesService.getActivities();
            return reply.send(activities);
        } catch (err: any) {
            request.log.error(err);
            return reply.status(500).send({ message: 'Failed to fetch activities' });
        }
    });
}
