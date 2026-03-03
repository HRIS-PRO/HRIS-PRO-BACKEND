import { pgTable, text, timestamp, uuid, pgEnum, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const appTypeEnum = pgEnum("app_type", ["HRIS", "ASSET_TRACKER"]);
export const employeeStatusEnum = pgEnum("employee_status", ["ACTIVE", "REMOTE", "ON_LEAVE", "TERMINATED"]);
export const departmentStatusEnum = pgEnum("department_status", ["ACTIVE", "INACTIVE"]);
export const locationStatusEnum = pgEnum("location_status", ["ACTIVE", "INACTIVE"]);
export const assetStatusEnum = pgEnum("asset_status", ["ACTIVE", "MAINTENANCE", "PENDING", "LOST", "DECOMMISSIONED", "IDLE"]);
export const reportStatusEnum = pgEnum("report_status", ["PENDING", "IN_REVIEW", "RESOLVED"]);

// -----------------------------------------------------------------------------
// Auth & User Management
// -----------------------------------------------------------------------------

export const users = pgTable("HRIS_USER", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
    otpHash: text("otpHash"),
    otpExpiresAt: timestamp("otpExpiresAt"),
    passwordHash: text("passwordHash"),
});

export const userRoles = pgTable("HRIS_USER_ROLE", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId").notNull().references(() => users.id),
    app: appTypeEnum("app").notNull(),
    role: text("role").notNull(), // e.g., "SUPER_ADMIN", "EMPLOYEE"
});

export const usersRelations = relations(users, ({ one, many }) => ({
    employee: one(employees),
    roles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
    user: one(users, {
        fields: [userRoles.userId],
        references: [users.id],
    }),
}));

// -----------------------------------------------------------------------------
// HRIS Core Domain
// -----------------------------------------------------------------------------

export const departments = pgTable("HRIS_DEPARTMENT", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    parentId: uuid("parentId"), // Self-reference
    headName: text("headName"),
    headId: text("headId"),
    staffCount: integer("staffCount").default(0).notNull(),
    status: departmentStatusEnum("status").default("ACTIVE").notNull(),
    icon: text("icon"),
    color: text("color"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const departmentsRelations = relations(departments, ({ one, many }) => ({
    parent: one(departments, {
        fields: [departments.parentId],
        references: [departments.id],
        relationName: "DepartmentHierarchy",
    }),
    children: many(departments, {
        relationName: "DepartmentHierarchy",
    }),
    employees: many(employees),
}));

// -----------------------------------------------------------------------------
// Location Management
// -----------------------------------------------------------------------------

export const locations = pgTable("HRIS_LOCATION", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    status: locationStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const employees = pgTable("HRIS_EMPLOYEE", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId").unique().notNull().references(() => users.id),
    firstName: text("firstName").notNull(),
    surname: text("surname").notNull(),
    middleName: text("middleName"),
    workEmail: text("workEmail").unique().notNull(),
    personalEmail: text("personalEmail"),
    phoneNumber: text("phoneNumber"),
    departmentId: uuid("departmentId").notNull().references(() => departments.id),
    roleId: text("roleId").notNull(),
    location: text("location").notNull(),
    hiringManagerId: text("hiringManagerId").notNull(),
    status: employeeStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const employeesRelations = relations(employees, ({ one }) => ({
    user: one(users, {
        fields: [employees.userId],
        references: [users.id],
    }),
    department: one(departments, {
        fields: [employees.departmentId],
        references: [departments.id],
    }),
}));

// -----------------------------------------------------------------------------
// Asset Management
// -----------------------------------------------------------------------------

export const assets = pgTable("ASSET", {
    id: text("id").primaryKey(), // Using custom ID logic (e.g. AST-XXXX)
    name: text("name").notNull(),
    category: text("category").notNull(),
    assignedTo: uuid("assignedTo").references(() => users.id), // Nullable for unassigned
    department: text("department"),
    manager: text("manager"),
    status: assetStatusEnum("status").default("IDLE").notNull(),
    purchaseDate: text("purchaseDate").notNull(), // Storing as ISO string to match frontend
    purchasePrice: integer("purchasePrice").notNull(),
    condition: text("condition").notNull(),
    location: text("location").notNull(),
    serialNumber: text("serialNumber"),
    description: text("description"),
    fileUrl: text("fileUrl"), // Supabase storage URL
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const assetsRelations = relations(assets, ({ one }) => ({
    assignee: one(users, {
        fields: [assets.assignedTo],
        references: [users.id],
    }),
}));

// -----------------------------------------------------------------------------
// Asset Tracker Metadata
// -----------------------------------------------------------------------------

export const assetCategories = pgTable("ASSET_CATEGORY", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    managedById: uuid("managedById").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const assetLocations = pgTable("ASSET_LOCATION", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const assetReports = pgTable("ASSET_REPORT", {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: text("assetId").notNull().references(() => assets.id),
    userId: uuid("userId").notNull().references(() => users.id),
    comment: text("comment").notNull(),
    status: reportStatusEnum("status").default("PENDING").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const assetReportsRelations = relations(assetReports, ({ one }) => ({
    asset: one(assets, {
        fields: [assetReports.assetId],
        references: [assets.id],
    }),
    user: one(users, {
        fields: [assetReports.userId],
        references: [users.id],
    }),
}));
