import { pgTable, text, timestamp, uuid, pgEnum, integer, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const appTypeEnum = pgEnum("app_type", ["HRIS", "ASSET_TRACKER", "MSGSCALE_BULK"]);
export const employeeStatusEnum = pgEnum("employee_status", ["ACTIVE", "REMOTE", "ON_LEAVE", "TERMINATED"]);
export const departmentStatusEnum = pgEnum("department_status", ["ACTIVE", "INACTIVE"]);
export const locationStatusEnum = pgEnum("location_status", ["ACTIVE", "INACTIVE"]);
export const assetStatusEnum = pgEnum("asset_status", ["ACTIVE", "MAINTENANCE", "PENDING", "LOST", "DECOMMISSIONED", "IDLE"]);
export const reportStatusEnum = pgEnum("report_status", ["PENDING", "IN_REVIEW", "RESOLVED"]);
export const requestPriorityEnum = pgEnum("request_priority", ["STANDARD", "HIGH", "CRITICAL"]);
export const requestStatusEnum = pgEnum("request_status", ["PENDING_HOD", "PENDING_HOO", "PENDING_CATEGORY_ADMIN", "APPROVED", "REJECTED"]);

export const workspaceStatusEnum = pgEnum("workspace_status", ["ACTIVE", "MAINTENANCE", "SUSPENDED"]);
export const templateTypeEnum = pgEnum("template_type", ["Email", "SMS", "WhatsApp"]);
export const templateStatusEnum = pgEnum("template_status", ["Draft", "Published"]);
export const campaignChannelEnum = pgEnum("campaign_channel", ["EMAIL", "SMS", "WHATSAPP"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["DRAFT", "PENDING", "APPROVED", "REJECTED", "SCHEDULED", "SENDING", "COMPLETED", "FAILED", "CANCELLED"]);
export const campaignCategoryEnum = pgEnum("campaign_category", ["PROMOTIONAL", "TRANSACTIONAL", "NEWSLETTER"]);
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", ["SENT", "DELIVERED", "OPENED", "CLICKED", "BOUNCED", "FAILED"]);

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
    templates: many(templates),
    campaignsCreated: many(campaigns, { relationName: "CampaignCreator" }),
    campaignsApproved: many(campaigns, { relationName: "CampaignApprover" }),
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

export const equipmentRequests = pgTable("EQUIPMENT_REQUEST", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId").notNull().references(() => users.id),
    categoryId: uuid("categoryId").notNull().references(() => assetCategories.id),
    priority: requestPriorityEnum("priority").default("STANDARD").notNull(),
    justification: text("justification").notNull(),
    status: requestStatusEnum("status").default("PENDING_HOD").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const equipmentRequestsRelations = relations(equipmentRequests, ({ one }) => ({
    user: one(users, {
        fields: [equipmentRequests.userId],
        references: [users.id],
    }),
    category: one(assetCategories, {
        fields: [equipmentRequests.categoryId],
        references: [assetCategories.id],
    }),
}));

// -----------------------------------------------------------------------------
// MsgScale Workspaces
// -----------------------------------------------------------------------------

export const workspaces = pgTable("WORKSPACE", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    status: workspaceStatusEnum("status").default("ACTIVE").notNull(),
    ownerId: uuid("ownerId").notNull().references(() => users.id),
    logo_url: text("logoUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const workspaceMembers = pgTable("WORKSPACE_MEMBER", {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspaceId").notNull().references(() => workspaces.id),
    userId: uuid("userId").notNull().references(() => users.id),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    owner: one(users, {
        fields: [workspaces.ownerId],
        references: [users.id],
    }),
    members: many(workspaceMembers),
    groups: many(groups),
    campaigns: many(campaigns),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [workspaceMembers.workspaceId],
        references: [workspaces.id],
    }),
    user: one(users, {
        fields: [workspaceMembers.userId],
        references: [users.id],
    }),
}));

// -----------------------------------------------------------------------------
// MsgScale Bulk Customers
// -----------------------------------------------------------------------------

export const bulkCustomers = pgTable("BULK_CUSTOMER", {
    id: uuid("id").primaryKey().defaultRandom(),
    customerType: text("customerType"),
    customerExternalId: text("customerExternalId"),
    title: text("title"),
    surname: text("surname"),
    firstName: text("firstName"),
    otherName: text("otherName"),
    fullName: text("fullName"),
    dob: text("dob"),
    gender: text("gender"),
    nationality: text("nationality"),
    stateOfOrigin: text("stateOfOrigin"),
    residentialState: text("residentialState"),
    residentialTown: text("residentialTown"),
    address: text("address"),
    mobilePhone: text("mobilePhone"),
    bvn: text("bvn"),
    nin: text("nin"),
    email: text("email"),
    tin: text("tin"),
    educationLevel: text("educationLevel"),
    occupation: text("occupation"),
    sector: text("sector"),
    office: text("office"),
    officePhone: text("officePhone"),
    officeAddress: text("officeAddress"),
    nextOfKin: text("nextOfKin"),
    nextOfKinAddress: text("nextOfKinAddress"),
    nextOfKinPhone: text("nextOfKinPhone"),
    idCardType: text("idCardType"),
    idCardNo: text("idCardNo"),
    idIssueDate: text("idIssueDate"),
    idExpiryDate: text("idExpiryDate"),
    isPep: text("isPep"),
    pepDetails: text("pepDetails"),
    externalCreatedAt: text("externalCreatedAt"),
    customFields: jsonb("customFields").default({}),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const bulkCustomersRelations = relations(bulkCustomers, ({ many }) => ({
    groupMemberships: many(groupMembers),
}));

export const groupTypeEnum = pgEnum('groupType', ['static', 'dynamic']);
export const ruleOperatorEnum = pgEnum('ruleOperator', ['equals', 'contains', 'starts_with', 'not_equals']);

export const groups = pgTable('CONTACT_GROUP', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: groupTypeEnum('type').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const groupMembers = pgTable('GROUP_MEMBER', {
    groupId: uuid('groupId').notNull().references(() => groups.id, { onDelete: 'cascade' }),
    customerId: uuid('customerId').notNull().references(() => bulkCustomers.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.groupId, t.customerId] }),
}));

export const groupRules = pgTable('GROUP_RULE', {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('groupId').notNull().references(() => groups.id, { onDelete: 'cascade' }),
    field: text('field').notNull(),
    operator: ruleOperatorEnum('operator').notNull(),
    value: text('value').notNull(),
});

// --- RELATIONS ---
export const groupsRelations = relations(groups, ({ many }) => ({
    members: many(groupMembers),
    rules: many(groupRules),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
    group: one(groups, {
        fields: [groupMembers.groupId],
        references: [groups.id],
    }),
    customer: one(bulkCustomers, {
        fields: [groupMembers.customerId],
        references: [bulkCustomers.id],
    }),
}));

export const groupRulesRelations = relations(groupRules, ({ one }) => ({
    group: one(groups, {
        fields: [groupRules.groupId],
        references: [groups.id],
    }),
}));

// -----------------------------------------------------------------------------
// MsgScale Templates
// -----------------------------------------------------------------------------

export const templates = pgTable("TEMPLATE", {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: templateTypeEnum("type").notNull(),
    status: templateStatusEnum("status").default("Draft").notNull(),
    category: text("category"),
    tags: text("tags").array(),
    subject: text("subject"), // Email only
    content: text("content").notNull(), // HTML for email, plain text/placeholders for SMS/WhatsApp
    metadata: jsonb("metadata"), // For WhatsApp components, buttons, etc.
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const templatesRelations = relations(templates, ({ one }) => ({
    owner: one(users, {
        fields: [templates.ownerId],
        references: [users.id],
    }),
}));

// -----------------------------------------------------------------------------
// MsgScale Campaigns
// -----------------------------------------------------------------------------

export const campaigns = pgTable("CAMPAIGN", {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    creatorId: uuid("creatorId").notNull().references(() => users.id),
    approverId: uuid("approverId").references(() => users.id),
    name: text("name").notNull(),
    channel: campaignChannelEnum("channel").notNull(),
    status: campaignStatusEnum("status").default("DRAFT").notNull(),
    category: campaignCategoryEnum("category").notNull(),
    content: jsonb("content").notNull(), // { subject?, preheader?, body, metadata? }
    scheduledAt: timestamp("scheduledAt"),
    throttleRate: integer("throttleRate"), // msg/hr
    cycleConfig: jsonb("cycleConfig"),
    anniversaryConfig: jsonb("anniversaryConfig"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const campaignRecipients = pgTable("CAMPAIGN_RECIPIENT", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    groupId: uuid("groupId").notNull().references(() => groups.id, { onDelete: "cascade" }),
    isExcluded: text("isExcluded").default("false").notNull(), // Boolean stored as text for simplicity in some drivers, or we could use boolean if supported
});

export const campaignAnalytics = pgTable("CAMPAIGN_ANALYTICS", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contactId").references(() => bulkCustomers.id, { onDelete: "set null" }),
    eventType: analyticsEventTypeEnum("eventType").notNull(),
    metadata: jsonb("metadata"), // IP, UA, error codes, click URLs
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});

// --- CAMPAIGN RELATIONS ---

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [campaigns.workspaceId],
        references: [workspaces.id],
    }),
    creator: one(users, {
        fields: [campaigns.creatorId],
        references: [users.id],
        relationName: "CampaignCreator",
    }),
    approver: one(users, {
        fields: [campaigns.approverId],
        references: [users.id],
        relationName: "CampaignApprover",
    }),
    recipients: many(campaignRecipients),
    analytics: many(campaignAnalytics),
}));

export const campaignRecipientsRelations = relations(campaignRecipients, ({ one }) => ({
    campaign: one(campaigns, {
        fields: [campaignRecipients.campaignId],
        references: [campaigns.id],
    }),
    group: one(groups, {
        fields: [campaignRecipients.groupId],
        references: [groups.id],
    }),
}));

export const campaignAnalyticsRelations = relations(campaignAnalytics, ({ one }) => ({
    campaign: one(campaigns, {
        fields: [campaignAnalytics.campaignId],
        references: [campaigns.id],
    }),
    contact: one(bulkCustomers, {
        fields: [campaignAnalytics.contactId],
        references: [bulkCustomers.id],
    }),
}));

