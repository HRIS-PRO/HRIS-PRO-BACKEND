import { db } from '../../db';
import { locations } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class LocationsService {
    private db = db;

    async getLocations() {
        return this.db.query.locations.findMany({
            orderBy: (locations, { desc }) => [desc(locations.createdAt)]
        });
    }

    async getLocationById(id: string) {
        return this.db.query.locations.findFirst({
            where: eq(locations.id, id)
        });
    }

    async createLocation(data: { name: string; address?: string | null; status?: 'ACTIVE' | 'INACTIVE' }) {
        const [newLocation] = await this.db.insert(locations).values({
            name: data.name,
            address: data.address || null,
            status: data.status || 'ACTIVE'
        }).returning();
        return newLocation;
    }

    async updateLocation(id: string, data: { name?: string; address?: string | null; status?: 'ACTIVE' | 'INACTIVE' }) {
        const [updatedLocation] = await this.db.update(locations)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(locations.id, id))
            .returning();
        return updatedLocation;
    }

    async deleteLocation(id: string) {
        const [deletedLocation] = await this.db.delete(locations)
            .where(eq(locations.id, id))
            .returning();
        return deletedLocation;
    }
}
