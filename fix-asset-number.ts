/**
 * One-shot script: rebuilds assetNumber for any asset where dept code is GEN
 * but the asset has an assigned user whose department has a mnemonic.
 * Run with: npx ts-node fix-asset-number.ts
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, like, or } from 'drizzle-orm';
import * as schema from './src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
    // 1. Find all assets with GEN in the dept slot of assetNumber
    const allAssets = await db.select().from(schema.assets)
        .where(like(schema.assets.assetNumber, 'NF / GEN /%'));

    console.log(`Found ${allAssets.length} asset(s) with GEN dept code`);

    for (const asset of allAssets) {
        if (!asset.department) {
            console.log(`  Skipping ${asset.id} — no department set`);
            continue;
        }

        // 2. Find dept by UUID or name — avoid casting a name as UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset.department);
        const dept = isUuid
            ? await db.query.departments.findFirst({ where: eq(schema.departments.id, asset.department) })
            : await db.query.departments.findFirst({ where: eq(schema.departments.name, asset.department) });


        if (!dept) {
            console.log(`  Skipping ${asset.id} — dept not found for: ${asset.department}`);
            continue;
        }

        const deptCode = (dept.mnemonic || dept.name.substring(0, 3)).toUpperCase();
        const parts = (asset.assetNumber || '').split('/').map(p => p.trim());

        if (parts.length !== 4) {
            console.log(`  Skipping ${asset.id} — unexpected assetNumber format: ${asset.assetNumber}`);
            continue;
        }

        parts[1] = ` ${deptCode} `;
        const newAssetNumber = parts.join('/');

        await db.update(schema.assets)
            .set({ assetNumber: newAssetNumber })
            .where(eq(schema.assets.id, asset.id));

        console.log(`  ✅ ${asset.id}: "${asset.assetNumber}" → "${newAssetNumber}"`);
    }

    console.log('\nDone.');
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
