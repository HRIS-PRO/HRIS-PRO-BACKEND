"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignRecipients = exports.campaigns = exports.templatesRelations = exports.templates = exports.groupRulesRelations = exports.groupMembersRelations = exports.groupsRelations = exports.groupRules = exports.groupMembers = exports.groups = exports.ruleOperatorEnum = exports.groupTypeEnum = exports.bulkCustomersRelations = exports.bulkCustomers = exports.workspaceMembersRelations = exports.workspacesRelations = exports.workspaceMembers = exports.workspaces = exports.equipmentRequestsRelations = exports.equipmentRequests = exports.assetReportsRelations = exports.assetReports = exports.assetLocations = exports.assetCategories = exports.assetsRelations = exports.assets = exports.employeesRelations = exports.employees = exports.locations = exports.departmentsRelations = exports.departments = exports.userRolesRelations = exports.usersRelations = exports.userRoles = exports.users = exports.analyticsEventTypeEnum = exports.campaignCategoryEnum = exports.campaignStatusEnum = exports.campaignChannelEnum = exports.templateStatusEnum = exports.templateTypeEnum = exports.workspaceStatusEnum = exports.requestStatusEnum = exports.requestPriorityEnum = exports.reportStatusEnum = exports.assetStatusEnum = exports.locationStatusEnum = exports.departmentStatusEnum = exports.employeeStatusEnum = exports.appTypeEnum = void 0;
exports.campaignAnalyticsRelations = exports.campaignRecipientsRelations = exports.campaignsRelations = exports.campaignAnalytics = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// Enums
exports.appTypeEnum = (0, pg_core_1.pgEnum)("app_type", ["HRIS", "ASSET_TRACKER", "MSGSCALE_BULK"]);
exports.employeeStatusEnum = (0, pg_core_1.pgEnum)("employee_status", ["ACTIVE", "REMOTE", "ON_LEAVE", "TERMINATED"]);
exports.departmentStatusEnum = (0, pg_core_1.pgEnum)("department_status", ["ACTIVE", "INACTIVE"]);
exports.locationStatusEnum = (0, pg_core_1.pgEnum)("location_status", ["ACTIVE", "INACTIVE"]);
exports.assetStatusEnum = (0, pg_core_1.pgEnum)("asset_status", ["ACTIVE", "MAINTENANCE", "PENDING", "LOST", "DECOMMISSIONED", "IDLE"]);
exports.reportStatusEnum = (0, pg_core_1.pgEnum)("report_status", ["PENDING", "IN_REVIEW", "RESOLVED"]);
exports.requestPriorityEnum = (0, pg_core_1.pgEnum)("request_priority", ["STANDARD", "HIGH", "CRITICAL"]);
exports.requestStatusEnum = (0, pg_core_1.pgEnum)("request_status", ["PENDING_HOD", "PENDING_HOO", "PENDING_CATEGORY_ADMIN", "APPROVED", "REJECTED"]);
exports.workspaceStatusEnum = (0, pg_core_1.pgEnum)("workspace_status", ["ACTIVE", "MAINTENANCE", "SUSPENDED"]);
exports.templateTypeEnum = (0, pg_core_1.pgEnum)("template_type", ["Email", "SMS", "WhatsApp"]);
exports.templateStatusEnum = (0, pg_core_1.pgEnum)("template_status", ["Draft", "Published"]);
exports.campaignChannelEnum = (0, pg_core_1.pgEnum)("campaign_channel", ["EMAIL", "SMS", "WHATSAPP"]);
exports.campaignStatusEnum = (0, pg_core_1.pgEnum)("campaign_status", ["DRAFT", "PENDING", "APPROVED", "REJECTED", "SCHEDULED", "SENDING", "COMPLETED", "FAILED", "CANCELLED"]);
exports.campaignCategoryEnum = (0, pg_core_1.pgEnum)("campaign_category", ["PROMOTIONAL", "TRANSACTIONAL", "NEWSLETTER"]);
exports.analyticsEventTypeEnum = (0, pg_core_1.pgEnum)("analytics_event_type", ["SENT", "DELIVERED", "OPENED", "CLICKED", "BOUNCED", "FAILED"]);
// -----------------------------------------------------------------------------
// Auth & User Management
// -----------------------------------------------------------------------------
exports.users = (0, pg_core_1.pgTable)("HRIS_USER", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").unique().notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
    otpHash: (0, pg_core_1.text)("otpHash"),
    otpExpiresAt: (0, pg_core_1.timestamp)("otpExpiresAt"),
    passwordHash: (0, pg_core_1.text)("passwordHash"),
});
exports.userRoles = (0, pg_core_1.pgTable)("HRIS_USER_ROLE", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("userId").notNull().references(() => exports.users.id),
    app: (0, exports.appTypeEnum)("app").notNull(),
    role: (0, pg_core_1.text)("role").notNull(), // e.g., "SUPER_ADMIN", "EMPLOYEE"
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    employee: one(exports.employees),
    roles: many(exports.userRoles),
    templates: many(exports.templates),
    campaignsCreated: many(exports.campaigns, { relationName: "CampaignCreator" }),
    campaignsApproved: many(exports.campaigns, { relationName: "CampaignApprover" }),
}));
exports.userRolesRelations = (0, drizzle_orm_1.relations)(exports.userRoles, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.userRoles.userId],
        references: [exports.users.id],
    }),
}));
// -----------------------------------------------------------------------------
// HRIS Core Domain
// -----------------------------------------------------------------------------
exports.departments = (0, pg_core_1.pgTable)("HRIS_DEPARTMENT", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    parentId: (0, pg_core_1.uuid)("parentId"), // Self-reference
    headName: (0, pg_core_1.text)("headName"),
    headId: (0, pg_core_1.text)("headId"),
    staffCount: (0, pg_core_1.integer)("staffCount").default(0).notNull(),
    status: (0, exports.departmentStatusEnum)("status").default("ACTIVE").notNull(),
    icon: (0, pg_core_1.text)("icon"),
    color: (0, pg_core_1.text)("color"),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.departmentsRelations = (0, drizzle_orm_1.relations)(exports.departments, ({ one, many }) => ({
    parent: one(exports.departments, {
        fields: [exports.departments.parentId],
        references: [exports.departments.id],
        relationName: "DepartmentHierarchy",
    }),
    children: many(exports.departments, {
        relationName: "DepartmentHierarchy",
    }),
    employees: many(exports.employees),
}));
// -----------------------------------------------------------------------------
// Location Management
// -----------------------------------------------------------------------------
exports.locations = (0, pg_core_1.pgTable)("HRIS_LOCATION", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    address: (0, pg_core_1.text)("address"),
    status: (0, exports.locationStatusEnum)("status").default("ACTIVE").notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.employees = (0, pg_core_1.pgTable)("HRIS_EMPLOYEE", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("userId").unique().notNull().references(() => exports.users.id),
    firstName: (0, pg_core_1.text)("firstName").notNull(),
    surname: (0, pg_core_1.text)("surname").notNull(),
    middleName: (0, pg_core_1.text)("middleName"),
    workEmail: (0, pg_core_1.text)("workEmail").unique().notNull(),
    personalEmail: (0, pg_core_1.text)("personalEmail"),
    phoneNumber: (0, pg_core_1.text)("phoneNumber"),
    departmentId: (0, pg_core_1.uuid)("departmentId").notNull().references(() => exports.departments.id),
    roleId: (0, pg_core_1.text)("roleId").notNull(),
    location: (0, pg_core_1.text)("location").notNull(),
    hiringManagerId: (0, pg_core_1.text)("hiringManagerId").notNull(),
    status: (0, exports.employeeStatusEnum)("status").default("ACTIVE").notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.employeesRelations = (0, drizzle_orm_1.relations)(exports.employees, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.employees.userId],
        references: [exports.users.id],
    }),
    department: one(exports.departments, {
        fields: [exports.employees.departmentId],
        references: [exports.departments.id],
    }),
}));
// -----------------------------------------------------------------------------
// Asset Management
// -----------------------------------------------------------------------------
exports.assets = (0, pg_core_1.pgTable)("ASSET", {
    id: (0, pg_core_1.text)("id").primaryKey(), // Using custom ID logic (e.g. AST-XXXX)
    name: (0, pg_core_1.text)("name").notNull(),
    category: (0, pg_core_1.text)("category").notNull(),
    assignedTo: (0, pg_core_1.uuid)("assignedTo").references(() => exports.users.id), // Nullable for unassigned
    department: (0, pg_core_1.text)("department"),
    manager: (0, pg_core_1.text)("manager"),
    status: (0, exports.assetStatusEnum)("status").default("IDLE").notNull(),
    purchaseDate: (0, pg_core_1.text)("purchaseDate").notNull(), // Storing as ISO string to match frontend
    purchasePrice: (0, pg_core_1.integer)("purchasePrice").notNull(),
    condition: (0, pg_core_1.text)("condition").notNull(),
    location: (0, pg_core_1.text)("location").notNull(),
    serialNumber: (0, pg_core_1.text)("serialNumber"),
    description: (0, pg_core_1.text)("description"),
    fileUrl: (0, pg_core_1.text)("fileUrl"), // Supabase storage URL
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.assetsRelations = (0, drizzle_orm_1.relations)(exports.assets, ({ one }) => ({
    assignee: one(exports.users, {
        fields: [exports.assets.assignedTo],
        references: [exports.users.id],
    }),
}));
// -----------------------------------------------------------------------------
// Asset Tracker Metadata
// -----------------------------------------------------------------------------
exports.assetCategories = (0, pg_core_1.pgTable)("ASSET_CATEGORY", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull().unique(),
    managedById: (0, pg_core_1.uuid)("managedById").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.assetLocations = (0, pg_core_1.pgTable)("ASSET_LOCATION", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.assetReports = (0, pg_core_1.pgTable)("ASSET_REPORT", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    assetId: (0, pg_core_1.text)("assetId").notNull().references(() => exports.assets.id),
    userId: (0, pg_core_1.uuid)("userId").notNull().references(() => exports.users.id),
    comment: (0, pg_core_1.text)("comment").notNull(),
    status: (0, exports.reportStatusEnum)("status").default("PENDING").notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.assetReportsRelations = (0, drizzle_orm_1.relations)(exports.assetReports, ({ one }) => ({
    asset: one(exports.assets, {
        fields: [exports.assetReports.assetId],
        references: [exports.assets.id],
    }),
    user: one(exports.users, {
        fields: [exports.assetReports.userId],
        references: [exports.users.id],
    }),
}));
exports.equipmentRequests = (0, pg_core_1.pgTable)("EQUIPMENT_REQUEST", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("userId").notNull().references(() => exports.users.id),
    categoryId: (0, pg_core_1.uuid)("categoryId").notNull().references(() => exports.assetCategories.id),
    priority: (0, exports.requestPriorityEnum)("priority").default("STANDARD").notNull(),
    justification: (0, pg_core_1.text)("justification").notNull(),
    status: (0, exports.requestStatusEnum)("status").default("PENDING_HOD").notNull(),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.equipmentRequestsRelations = (0, drizzle_orm_1.relations)(exports.equipmentRequests, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.equipmentRequests.userId],
        references: [exports.users.id],
    }),
    category: one(exports.assetCategories, {
        fields: [exports.equipmentRequests.categoryId],
        references: [exports.assetCategories.id],
    }),
}));
// -----------------------------------------------------------------------------
// MsgScale Workspaces
// -----------------------------------------------------------------------------
exports.workspaces = (0, pg_core_1.pgTable)("WORKSPACE", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)("title").notNull(),
    status: (0, exports.workspaceStatusEnum)("status").default("ACTIVE").notNull(),
    ownerId: (0, pg_core_1.uuid)("ownerId").notNull().references(() => exports.users.id),
    logo_url: (0, pg_core_1.text)("logoUrl"),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.workspaceMembers = (0, pg_core_1.pgTable)("WORKSPACE_MEMBER", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    workspaceId: (0, pg_core_1.uuid)("workspaceId").notNull().references(() => exports.workspaces.id),
    userId: (0, pg_core_1.uuid)("userId").notNull().references(() => exports.users.id),
    joinedAt: (0, pg_core_1.timestamp)("joinedAt").defaultNow().notNull(),
});
exports.workspacesRelations = (0, drizzle_orm_1.relations)(exports.workspaces, ({ one, many }) => ({
    owner: one(exports.users, {
        fields: [exports.workspaces.ownerId],
        references: [exports.users.id],
    }),
    members: many(exports.workspaceMembers),
    groups: many(exports.groups),
    campaigns: many(exports.campaigns),
}));
exports.workspaceMembersRelations = (0, drizzle_orm_1.relations)(exports.workspaceMembers, ({ one }) => ({
    workspace: one(exports.workspaces, {
        fields: [exports.workspaceMembers.workspaceId],
        references: [exports.workspaces.id],
    }),
    user: one(exports.users, {
        fields: [exports.workspaceMembers.userId],
        references: [exports.users.id],
    }),
}));
// -----------------------------------------------------------------------------
// MsgScale Bulk Customers
// -----------------------------------------------------------------------------
exports.bulkCustomers = (0, pg_core_1.pgTable)("BULK_CUSTOMER", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    customerType: (0, pg_core_1.text)("customerType"),
    customerExternalId: (0, pg_core_1.text)("customerExternalId"),
    title: (0, pg_core_1.text)("title"),
    surname: (0, pg_core_1.text)("surname"),
    firstName: (0, pg_core_1.text)("firstName"),
    otherName: (0, pg_core_1.text)("otherName"),
    fullName: (0, pg_core_1.text)("fullName"),
    dob: (0, pg_core_1.text)("dob"),
    gender: (0, pg_core_1.text)("gender"),
    nationality: (0, pg_core_1.text)("nationality"),
    stateOfOrigin: (0, pg_core_1.text)("stateOfOrigin"),
    residentialState: (0, pg_core_1.text)("residentialState"),
    residentialTown: (0, pg_core_1.text)("residentialTown"),
    address: (0, pg_core_1.text)("address"),
    mobilePhone: (0, pg_core_1.text)("mobilePhone"),
    bvn: (0, pg_core_1.text)("bvn"),
    nin: (0, pg_core_1.text)("nin"),
    email: (0, pg_core_1.text)("email"),
    tin: (0, pg_core_1.text)("tin"),
    educationLevel: (0, pg_core_1.text)("educationLevel"),
    occupation: (0, pg_core_1.text)("occupation"),
    sector: (0, pg_core_1.text)("sector"),
    office: (0, pg_core_1.text)("office"),
    officePhone: (0, pg_core_1.text)("officePhone"),
    officeAddress: (0, pg_core_1.text)("officeAddress"),
    nextOfKin: (0, pg_core_1.text)("nextOfKin"),
    nextOfKinAddress: (0, pg_core_1.text)("nextOfKinAddress"),
    nextOfKinPhone: (0, pg_core_1.text)("nextOfKinPhone"),
    idCardType: (0, pg_core_1.text)("idCardType"),
    idCardNo: (0, pg_core_1.text)("idCardNo"),
    idIssueDate: (0, pg_core_1.text)("idIssueDate"),
    idExpiryDate: (0, pg_core_1.text)("idExpiryDate"),
    isPep: (0, pg_core_1.text)("isPep"),
    pepDetails: (0, pg_core_1.text)("pepDetails"),
    externalCreatedAt: (0, pg_core_1.text)("externalCreatedAt"),
    customFields: (0, pg_core_1.jsonb)("customFields").default({}),
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.bulkCustomersRelations = (0, drizzle_orm_1.relations)(exports.bulkCustomers, ({ many }) => ({
    groupMemberships: many(exports.groupMembers),
}));
exports.groupTypeEnum = (0, pg_core_1.pgEnum)('groupType', ['static', 'dynamic']);
exports.ruleOperatorEnum = (0, pg_core_1.pgEnum)('ruleOperator', ['equals', 'contains', 'starts_with', 'not_equals']);
exports.groups = (0, pg_core_1.pgTable)('CONTACT_GROUP', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    workspaceId: (0, pg_core_1.uuid)('workspaceId').notNull().references(() => exports.workspaces.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    type: (0, exports.groupTypeEnum)('type').notNull(),
    createdAt: (0, pg_core_1.timestamp)('createdAt').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updatedAt').defaultNow().notNull(),
});
exports.groupMembers = (0, pg_core_1.pgTable)('GROUP_MEMBER', {
    groupId: (0, pg_core_1.uuid)('groupId').notNull().references(() => exports.groups.id, { onDelete: 'cascade' }),
    customerId: (0, pg_core_1.uuid)('customerId').notNull().references(() => exports.bulkCustomers.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [t.groupId, t.customerId] }),
}));
exports.groupRules = (0, pg_core_1.pgTable)('GROUP_RULE', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    groupId: (0, pg_core_1.uuid)('groupId').notNull().references(() => exports.groups.id, { onDelete: 'cascade' }),
    field: (0, pg_core_1.text)('field').notNull(),
    operator: (0, exports.ruleOperatorEnum)('operator').notNull(),
    value: (0, pg_core_1.text)('value').notNull(),
});
// --- RELATIONS ---
exports.groupsRelations = (0, drizzle_orm_1.relations)(exports.groups, ({ many }) => ({
    members: many(exports.groupMembers),
    rules: many(exports.groupRules),
}));
exports.groupMembersRelations = (0, drizzle_orm_1.relations)(exports.groupMembers, ({ one }) => ({
    group: one(exports.groups, {
        fields: [exports.groupMembers.groupId],
        references: [exports.groups.id],
    }),
    customer: one(exports.bulkCustomers, {
        fields: [exports.groupMembers.customerId],
        references: [exports.bulkCustomers.id],
    }),
}));
exports.groupRulesRelations = (0, drizzle_orm_1.relations)(exports.groupRules, ({ one }) => ({
    group: one(exports.groups, {
        fields: [exports.groupRules.groupId],
        references: [exports.groups.id],
    }),
}));
// -----------------------------------------------------------------------------
// MsgScale Templates
// -----------------------------------------------------------------------------
exports.templates = (0, pg_core_1.pgTable)("TEMPLATE", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    ownerId: (0, pg_core_1.uuid)("ownerId").notNull().references(() => exports.users.id, { onDelete: "cascade" }),
    title: (0, pg_core_1.text)("title").notNull(),
    type: (0, exports.templateTypeEnum)("type").notNull(),
    status: (0, exports.templateStatusEnum)("status").default("Draft").notNull(),
    category: (0, pg_core_1.text)("category"),
    tags: (0, pg_core_1.text)("tags").array(),
    subject: (0, pg_core_1.text)("subject"), // Email only
    content: (0, pg_core_1.text)("content").notNull(), // HTML for email, plain text/placeholders for SMS/WhatsApp
    metadata: (0, pg_core_1.jsonb)("metadata"), // For WhatsApp components, buttons, etc.
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.templatesRelations = (0, drizzle_orm_1.relations)(exports.templates, ({ one }) => ({
    owner: one(exports.users, {
        fields: [exports.templates.ownerId],
        references: [exports.users.id],
    }),
}));
// -----------------------------------------------------------------------------
// MsgScale Campaigns
// -----------------------------------------------------------------------------
exports.campaigns = (0, pg_core_1.pgTable)("CAMPAIGN", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    workspaceId: (0, pg_core_1.uuid)("workspaceId").notNull().references(() => exports.workspaces.id, { onDelete: "cascade" }),
    creatorId: (0, pg_core_1.uuid)("creatorId").notNull().references(() => exports.users.id),
    approverId: (0, pg_core_1.uuid)("approverId").references(() => exports.users.id),
    name: (0, pg_core_1.text)("name").notNull(),
    channel: (0, exports.campaignChannelEnum)("channel").notNull(),
    status: (0, exports.campaignStatusEnum)("status").default("DRAFT").notNull(),
    category: (0, exports.campaignCategoryEnum)("category").notNull(),
    content: (0, pg_core_1.jsonb)("content").notNull(), // { subject?, preheader?, body, metadata? }
    scheduledAt: (0, pg_core_1.timestamp)("scheduledAt"),
    throttleRate: (0, pg_core_1.integer)("throttleRate"), // msg/hr
    createdAt: (0, pg_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
exports.campaignRecipients = (0, pg_core_1.pgTable)("CAMPAIGN_RECIPIENT", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    campaignId: (0, pg_core_1.uuid)("campaignId").notNull().references(() => exports.campaigns.id, { onDelete: "cascade" }),
    groupId: (0, pg_core_1.uuid)("groupId").notNull().references(() => exports.groups.id, { onDelete: "cascade" }),
    isExcluded: (0, pg_core_1.text)("isExcluded").default("false").notNull(), // Boolean stored as text for simplicity in some drivers, or we could use boolean if supported
});
exports.campaignAnalytics = (0, pg_core_1.pgTable)("CAMPAIGN_ANALYTICS", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    campaignId: (0, pg_core_1.uuid)("campaignId").notNull().references(() => exports.campaigns.id, { onDelete: "cascade" }),
    contactId: (0, pg_core_1.uuid)("contactId").references(() => exports.bulkCustomers.id, { onDelete: "set null" }),
    eventType: (0, exports.analyticsEventTypeEnum)("eventType").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata"), // IP, UA, error codes, click URLs
    occurredAt: (0, pg_core_1.timestamp)("occurredAt").defaultNow().notNull(),
});
// --- CAMPAIGN RELATIONS ---
exports.campaignsRelations = (0, drizzle_orm_1.relations)(exports.campaigns, ({ one, many }) => ({
    workspace: one(exports.workspaces, {
        fields: [exports.campaigns.workspaceId],
        references: [exports.workspaces.id],
    }),
    creator: one(exports.users, {
        fields: [exports.campaigns.creatorId],
        references: [exports.users.id],
        relationName: "CampaignCreator",
    }),
    approver: one(exports.users, {
        fields: [exports.campaigns.approverId],
        references: [exports.users.id],
        relationName: "CampaignApprover",
    }),
    recipients: many(exports.campaignRecipients),
    analytics: many(exports.campaignAnalytics),
}));
exports.campaignRecipientsRelations = (0, drizzle_orm_1.relations)(exports.campaignRecipients, ({ one }) => ({
    campaign: one(exports.campaigns, {
        fields: [exports.campaignRecipients.campaignId],
        references: [exports.campaigns.id],
    }),
    group: one(exports.groups, {
        fields: [exports.campaignRecipients.groupId],
        references: [exports.groups.id],
    }),
}));
exports.campaignAnalyticsRelations = (0, drizzle_orm_1.relations)(exports.campaignAnalytics, ({ one }) => ({
    campaign: one(exports.campaigns, {
        fields: [exports.campaignAnalytics.campaignId],
        references: [exports.campaigns.id],
    }),
    contact: one(exports.bulkCustomers, {
        fields: [exports.campaignAnalytics.contactId],
        references: [exports.bulkCustomers.id],
    }),
}));
