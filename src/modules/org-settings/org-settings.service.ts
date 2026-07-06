import { db } from '../../db';
import { orgSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { UpdateOrgSettingsInput } from './org-settings.schema';

const SINGLETON_ID = 'singleton';

export class OrgSettingsService {
    async get() {
        const [existing] = await db.select().from(orgSettings).where(eq(orgSettings.id, SINGLETON_ID));
        if (existing) return existing;

        // First read on a fresh database: create the singleton row with defaults
        const [created] = await db.insert(orgSettings)
            .values({ id: SINGLETON_ID })
            .onConflictDoNothing()
            .returning();
        if (created) return created;

        // Lost the insert race — the row exists now
        const [row] = await db.select().from(orgSettings).where(eq(orgSettings.id, SINGLETON_ID));
        return row;
    }

    async update(data: UpdateOrgSettingsInput, updatedById?: string) {
        const [updated] = await db.insert(orgSettings)
            .values({ id: SINGLETON_ID, ...data, updatedById })
            .onConflictDoUpdate({
                target: orgSettings.id,
                set: { ...data, updatedById, updatedAt: new Date() },
            })
            .returning();
        return updated;
    }
}
