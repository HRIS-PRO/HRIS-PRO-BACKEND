import { db } from '../../db';
import { assetCategories } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreateAssetCategoryInput } from './asset-categories.schema';

export class AssetCategoriesService {
    async getAll() {
        return await db.select().from(assetCategories).orderBy(assetCategories.name);
    }

    async create(data: CreateAssetCategoryInput) {
        const [category] = await db.insert(assetCategories).values(data).returning();
        return category;
    }

    async delete(id: string) {
        const [category] = await db.delete(assetCategories).where(eq(assetCategories.id, id)).returning();
        return category;
    }
}
