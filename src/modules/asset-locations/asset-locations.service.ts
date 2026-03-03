import { db } from '../../db';
import { assetLocations } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreateAssetLocationInput } from './asset-locations.schema';

export class AssetLocationsService {
    async getAll() {
        return await db.select().from(assetLocations).orderBy(assetLocations.name);
    }

    async create(data: CreateAssetLocationInput) {
        const [location] = await db.insert(assetLocations).values(data).returning();
        return location;
    }

    async delete(id: string) {
        const [location] = await db.delete(assetLocations).where(eq(assetLocations.id, id)).returning();
        return location;
    }
}
