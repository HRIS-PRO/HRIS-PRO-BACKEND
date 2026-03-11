"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsService = void 0;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class LocationsService {
    db = db_1.db;
    async getLocations() {
        return this.db.query.locations.findMany({
            orderBy: (locations, { desc }) => [desc(locations.createdAt)]
        });
    }
    async getLocationById(id) {
        return this.db.query.locations.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.locations.id, id)
        });
    }
    async createLocation(data) {
        const [newLocation] = await this.db.insert(schema_1.locations).values({
            name: data.name,
            address: data.address || null,
            status: data.status || 'ACTIVE'
        }).returning();
        return newLocation;
    }
    async updateLocation(id, data) {
        const [updatedLocation] = await this.db.update(schema_1.locations)
            .set({
            ...data,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.locations.id, id))
            .returning();
        return updatedLocation;
    }
    async deleteLocation(id) {
        const [deletedLocation] = await this.db.delete(schema_1.locations)
            .where((0, drizzle_orm_1.eq)(schema_1.locations.id, id))
            .returning();
        return deletedLocation;
    }
}
exports.LocationsService = LocationsService;
