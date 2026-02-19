import { pgTable, text, timestamp, uuid, pgEnum, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const appTypeEnum = pgEnum("app_type", ["HRIS", "ASSET_TRACKER"]);
export const employeeStatusEnum = pgEnum("employee_status", ["ACTIVE", "REMOTE", "ON_LEAVE", "TERMINATED"]);
export const departmentStatusEnum = pgEnum("department_status", ["ACTIVE", "INACTIVE"]);

// -----------------------------------------------------------------------------
// Auth & User Management
// -----------------------------------------------------------------------------

export const users = pgTable("User", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
    otpHash: text("otpHash"),
    otpExpiresAt: timestamp("otpExpiresAt"),
    passwordHash: text("passwordHash"),
});

export const userRoles = pgTable("UserRole", {
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

export const departments = pgTable("Department", {
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

export const employees = pgTable("Employee", {
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
