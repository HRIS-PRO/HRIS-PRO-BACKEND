import { db } from './src/db';
import { assets } from './src/db/schema';
import { sql, isNull, asc } from 'drizzle-orm';

// Idempotent: adds the assetNumber column + unique constraint, then backfills AST-NF-##### for existing rows.
async function run() {
    console.log('1/3 Adding assetNumber column (if missing)...');
    await db.execute(sql`ALTER TABLE "ASSET" ADD COLUMN IF NOT EXISTS "assetNumber" text;`);

    console.log('2/3 Adding unique constraint (if missing)...');
    await db.execute(sql`
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ASSET_assetNumber_unique'
            ) THEN
                ALTER TABLE "ASSET" ADD CONSTRAINT "ASSET_assetNumber_unique" UNIQUE ("assetNumber");
            END IF;
        END $$;
    `);

    console.log('3/3 Backfilling sequential numbers...');
    const existing = await db.select({ n: assets.assetNumber }).from(assets);
    let max = 0;
    for (const r of existing) {
        const m = /^AST-NF-(\d+)$/.exec(r.n || '');
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    const missing = await db
        .select({ id: assets.id })
        .from(assets)
        .where(isNull(assets.assetNumber))
        .orderBy(asc(assets.createdAt));

    console.log(`   ${missing.length} asset(s) need a number. Continuing from ${max}.`);
    let counter = max;
    for (const row of missing) {
        counter++;
        const assetNumber = `AST-NF-${String(counter).padStart(5, '0')}`;
        await db.update(assets).set({ assetNumber }).where(sql`${assets.id} = ${row.id}`);
    }

    console.log(`Done. Numbered ${missing.length} asset(s), up to AST-NF-${String(counter).padStart(5, '0')}.`);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
