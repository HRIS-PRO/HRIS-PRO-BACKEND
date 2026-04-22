"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacesService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const phone_utils_1 = require("../../utils/phone-utils");
const zepto_1 = require("../shared/zepto");
class WorkspacesService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getUserWorkspaces(userId) {
        // Fetch workspaces joined with a raw SQL count of total members to avoid Connection Pool starvation
        // from doing Promise.all(.map(...findMany)) on every workspace.
        const userMemberships = await this.db.select({
            workspace: schema_1.workspaces,
            memberCount: (0, drizzle_orm_1.sql) `CAST(COUNT(${schema_1.workspaceMembers.userId}) OVER (PARTITION BY ${schema_1.workspaces.id}) AS INTEGER)`
        })
            .from(schema_1.workspaceMembers)
            .innerJoin(schema_1.workspaces, (0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, schema_1.workspaces.id))
            .where((0, drizzle_orm_1.eq)(schema_1.workspaceMembers.userId, userId));
        if (userMemberships.length === 0)
            return [];
        // Deduplicate the results and extract the count
        const uniqueWorkspaces = new Map();
        for (const row of userMemberships) {
            if (!uniqueWorkspaces.has(row.workspace.id)) {
                uniqueWorkspaces.set(row.workspace.id, {
                    ...row.workspace,
                    memberCount: row.memberCount
                });
            }
        }
        return Array.from(uniqueWorkspaces.values());
    }
    async createWorkspace(userId, data) {
        return await this.db.transaction(async (tx) => {
            // 1. Create the workspace
            const [newWorkspace] = await tx.insert(schema_1.workspaces).values({
                title: data.title,
                status: data.status,
                logo_url: data.logo_url,
                ownerId: userId,
            }).returning();
            // 2. Add the owner as the first member
            const memberSet = new Set();
            memberSet.add(userId);
            // 3. Add additional members if provided
            if (data.members && data.members.length > 0) {
                for (const m of data.members) {
                    memberSet.add(m);
                }
            }
            // 4. Automatically add all MSGSCALE_BULK Admins
            const adminUsers = await tx.select({ userId: schema_1.userRoles.userId })
                .from(schema_1.userRoles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userRoles.app, 'MSGSCALE_BULK'), (0, drizzle_orm_1.eq)(schema_1.userRoles.role, 'Admin')));
            for (const admin of adminUsers) {
                memberSet.add(admin.userId);
            }
            // 5. Insert all gathered members
            const memberInserts = Array.from(memberSet).map(memberId => ({
                workspaceId: newWorkspace.id,
                userId: memberId,
            }));
            await tx.insert(schema_1.workspaceMembers).values(memberInserts);
            return newWorkspace;
        });
    }
    async addWorkspaceMember(workspaceId, userId) {
        // Check if already a member
        const existing = await this.db.query.workspaceMembers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.workspaceMembers.userId, userId)),
        });
        if (existing) {
            return existing;
        }
        const [newMember] = await this.db.insert(schema_1.workspaceMembers).values({
            workspaceId,
            userId,
        }).returning();
        return newMember;
    }
    async removeWorkspaceMember(workspaceId, userId) {
        // Don't allow removing the owner? Or at least check if it's the owner
        const workspace = await this.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.workspaces.id, workspaceId),
        });
        if (workspace?.ownerId === userId) {
            throw new Error("Cannot remove the owner of the workspace from membership.");
        }
        await this.db.delete(schema_1.workspaceMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.workspaceMembers.userId, userId)));
        return { success: true };
    }
    async getWorkspaceMembers(workspaceId) {
        const members = await this.db.query.workspaceMembers.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, workspaceId),
            with: {
                user: {
                    with: {
                        employee: true,
                        roles: true
                    }
                }
            },
        });
        return members.map(m => ({
            ...m,
            createdAt: m.joinedAt
        }));
    }
    async updateWorkspace(workspaceId, userId, data) {
        // Check if user is owner or has permission (for now, only owner can update)
        const workspace = await this.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.workspaces.id, workspaceId),
        });
        if (!workspace)
            throw new Error("Workspace not found");
        if (workspace.ownerId !== userId) {
            throw new Error("Only the owner can update workspace settings");
        }
        const [updated] = await this.db.update(schema_1.workspaces)
            .set({
            ...data,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.workspaces.id, workspaceId))
            .returning();
        return updated;
    }
    async deleteWorkspace(workspaceId, userId) {
        const workspace = await this.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.workspaces.id, workspaceId),
        });
        if (!workspace)
            throw new Error("Workspace not found");
        if (workspace.ownerId !== userId) {
            throw new Error("Only the owner can delete the workspace");
        }
        return await this.db.transaction(async (tx) => {
            // Delete members first
            await tx.delete(schema_1.workspaceMembers).where((0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, workspaceId));
            // Delete workspace
            await tx.delete(schema_1.workspaces).where((0, drizzle_orm_1.eq)(schema_1.workspaces.id, workspaceId));
            return { success: true };
        });
    }
    async getEligibleUsers(workspaceId) {
        const currentMembers = await this.db.query.workspaceMembers.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, workspaceId),
        });
        const memberUserIds = currentMembers.map(m => m.userId);
        const allMsgScaleUsers = await this.db.query.userRoles.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.userRoles.app, 'MSGSCALE_BULK'),
            with: {
                user: {
                    with: { employee: true },
                },
            },
        });
        const seen = new Set();
        const eligible = [];
        for (const ur of allMsgScaleUsers) {
            if (!ur.user)
                continue;
            if (seen.has(ur.user.id))
                continue;
            if (memberUserIds.includes(ur.user.id))
                continue;
            seen.add(ur.user.id);
            eligible.push({
                id: ur.user.id,
                email: ur.user.email,
                name: ur.user.employee
                    ? `${ur.user.employee.firstName} ${ur.user.employee.surname}`
                    : ur.user.email,
                role: ur.role,
            });
        }
        return eligible;
    }
    async bulkAddMembers(workspaceId, inviterUserId, userIds) {
        const workspace = await this.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.workspaces.id, workspaceId),
        });
        if (!workspace)
            throw new Error('Workspace not found');
        const inviter = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, inviterUserId),
            with: { employee: true },
        });
        const inviterName = inviter?.employee
            ? `${inviter.employee.firstName} ${inviter.employee.surname}`
            : inviter?.email || 'A teammate';
        const results = [];
        const errors = [];
        for (const userId of userIds) {
            try {
                const existing = await this.db.query.workspaceMembers.findFirst({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.workspaceMembers.userId, userId)),
                });
                if (existing)
                    continue;
                await this.db.insert(schema_1.workspaceMembers).values({ workspaceId, userId });
                const user = await this.db.query.users.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
                    with: { employee: true },
                });
                if (user) {
                    const recipientName = user?.employee
                        ? `${user.employee.firstName} ${user.employee.surname}`
                        : user.email;
                    const emailHtml = `
                        <div style="line-height:1.8;color:#1a1a2e">
                            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 32px;border-radius:12px 12px 0 0;text-align:center">
                                <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900">You're Invited! 🎉</h1>
                                <p style="color:rgba(255,255,255,0.85);margin-top:8px;font-size:14px">You've been added to a MsgScale workspace</p>
                            </div>
                            <div style="padding:40px 32px">
                                <p style="font-size:16px">Hi <strong>${recipientName}</strong>,</p>
                                <p><strong>${inviterName}</strong> has invited you to join the <strong style="color:#667eea">"${workspace.title}"</strong> workspace on MsgScale.</p>
                                <div style="background:#f5f3ff;border-left:4px solid #667eea;padding:16px 20px;border-radius:8px;margin:24px 0">
                                    <p style="margin:0;font-size:12px;color:#6d28d9;font-weight:700;text-transform:uppercase;letter-spacing:1px">Workspace Details</p>
                                    <p style="margin:8px 0 0;font-size:14px"><strong>Name:</strong> ${workspace.title}</p>
                                    <p style="margin:4px 0 0;font-size:14px"><strong>Invited by:</strong> ${inviterName}</p>
                                </div>
                                <p style="font-size:14px;color:#555">Log in and select <strong style="color:#667eea">${workspace.title}</strong> from your workspace list to get started.</p>
                                <div style="text-align:center;margin-top:32px">
                                    <a href="https://msg.noltfinance.com" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:900;font-size:14px">Open MsgScale →</a>
                                </div>
                            </div>
                        </div>
                    `;
                    (0, zepto_1.sendEmail)(user.email, `You've been invited to "${workspace.title}"`, emailHtml).catch(console.error);
                    results.push({ userId, email: user.email, status: 'added' });
                }
            }
            catch (err) {
                errors.push({ userId, error: err.message });
            }
        }
        return { added: results, errors };
    }
    async bulkAddCustomers(customersData) {
        if (!customersData || customersData.length === 0)
            return { added: 0, skipped: 0 };
        const mappedCustomers = customersData.map(data => {
            const customerType = data.customerType || data['Customer Type'] || (data['Registration No'] ? 'Corporate' : 'Individual');
            const mobilePhone = (0, phone_utils_1.normalizePhoneNumber)(data.mobilePhone || data['Mobile Phone'] || data['Phone No'] || '');
            return {
                customerType,
                customerExternalId: String(data.customerExternalId || data['Customer External ID'] || data['Customer Id'] || ''),
                title: data.title || data['Title'] || '',
                surname: data.surname || data['Surname'] || '',
                firstName: data.firstName || data['First Name'] || '',
                otherName: data.otherName || data['Other Name'] || '',
                fullName: data.fullName || data['Full Name'] || data['Name'] || `${data.firstName || data['First Name'] || ''} ${data.surname || data['Surname'] || ''}`.trim(),
                dob: data.dob || data['Date of Birth'] || data['DOB'] || '',
                gender: data.gender || data['Gender'] || '',
                nationality: data.nationality || data['Nationality'] || '',
                stateOfOrigin: data.stateOfOrigin || data['State of Origin'] || '',
                residentialState: data.residentialState || data['Residential State'] || '',
                residentialTown: data.residentialTown || data['Residential Town'] || '',
                address: data.address || data['Address'] || '',
                mobilePhone,
                bvn: data.bvn || data['BVN'] || '',
                nin: data.nin || data['NIN'] || '',
                email: (data.email || data['Email'] || data['Email Address'] || '').trim().toLowerCase(),
                tin: data.tin || data['TIN'] || data['Tax Identification No'] || '',
                educationLevel: data.educationLevel || data['Education Level'] || '',
                occupation: data.occupation || data['Occupation'] || '',
                sector: data.sector || data['Sector'] || '',
                office: data.office || data['Office'] || '',
                officePhone: (0, phone_utils_1.normalizePhoneNumber)(data.officePhone || data['Office Phone'] || data['Office No'] || ''),
                officeAddress: data.officeAddress || data['Office Address'] || '',
                nextOfKin: data.nextOfKin || data['Next of Kin'] || '',
                nextOfKinAddress: data.nextOfKinAddress || data['Next of Kin Address'] || '',
                nextOfKinPhone: (0, phone_utils_1.normalizePhoneNumber)(data.nextOfKinPhone || data['Next of Kin Phone'] || ''),
                idCardType: data.idCardType || data['ID Card Type'] || '',
                idCardNo: data.idCardNo || data['ID Card No'] || '',
                idIssueDate: data.idIssueDate || data['ID Issue Date'] || '',
                idExpiryDate: data.idExpiryDate || data['ID Expiry Date'] || '',
                isPep: data.isPep || data['Is PEP'] || 'No',
                pepDetails: data.pepDetails || data['PEP Details'] || '',
                registrationNo: data.registrationNo || data['Registration No'] || '',
                dateOfIncorporation: data.dateOfIncorporation || data['Date Of Incorporation'] || '',
                countryOfIncorporation: data.countryOfIncorporation || data['Country Of Incorporation'] || '',
                stateOfIncorporation: data.stateOfIncorporation || data['State Of Incorporation'] || '',
                contactPerson: data.contactPerson || data['Contact Person'] || '',
                accountOfficer: data.accountOfficer || data['Account Officer'] || '',
                externalCreatedAt: data.externalCreatedAt || data['External Created At'] || new Date().toISOString(),
                customFields: JSON.stringify(data.customFields || {}),
            };
        });
        const phones = mappedCustomers.map(c => String(c.mobilePhone || '')).filter(Boolean);
        const emails = mappedCustomers.map(c => String(c.email || '')).filter(Boolean);
        const externalIds = mappedCustomers.map(c => String(c.customerExternalId || '')).filter(Boolean);
        const conditions = [];
        if (phones.length > 0)
            conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.mobilePhone, phones));
        if (emails.length > 0)
            conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.email, emails));
        if (externalIds.length > 0)
            conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.customerExternalId, externalIds));
        let existingRecords = [];
        if (conditions.length > 0) {
            existingRecords = await this.db.query.bulkCustomers.findMany({
                where: (0, drizzle_orm_1.or)(...conditions),
                columns: { mobilePhone: true, email: true, customerExternalId: true }
            });
        }
        const existingPhones = new Set(existingRecords.map(r => r.mobilePhone).filter(Boolean));
        const existingEmails = new Set(existingRecords.map(r => r.email).filter(Boolean));
        const existingIds = new Set(existingRecords.map(r => r.customerExternalId).filter(Boolean));
        const validCustomers = [];
        let skipped = 0;
        for (const c of mappedCustomers) {
            const isDuplicate = (c.mobilePhone && existingPhones.has(c.mobilePhone)) ||
                (c.email && existingEmails.has(c.email)) ||
                (c.customerExternalId && existingIds.has(c.customerExternalId));
            if (isDuplicate) {
                skipped++;
            }
            else {
                validCustomers.push(c); // Push the already mapped customer
                if (c.mobilePhone)
                    existingPhones.add(c.mobilePhone);
                if (c.email)
                    existingEmails.add(c.email);
                if (c.customerExternalId)
                    existingIds.add(c.customerExternalId);
            }
        }
        if (validCustomers.length > 0) {
            await this.db.insert(schema_1.bulkCustomers).values(validCustomers);
        }
        return { added: validCustomers.length, skipped };
    }
    async updateBulkCustomer(id, data) {
        // Prevent accidental updates to these sensitive or system fields
        const { bvn, nin, id: _id, createdAt, updatedAt, externalCreatedAt, ...safeData } = data;
        const [updated] = await this.db.update(schema_1.bulkCustomers)
            .set({
            ...safeData,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.bulkCustomers.id, id))
            .returning();
        return updated;
    }
    async getBulkCustomers(page = 1, limit = 20, search = '', type = '') {
        const cleanSearch = search ? search.trim().replace(/\s+/g, ' ') : '';
        const searchPattern = cleanSearch ? `%${cleanSearch}%` : null;
        const normalizedSearch = (0, phone_utils_1.normalizeIdentifier)(cleanSearch);
        const baseQueryConditions = (0, drizzle_orm_1.and)(searchPattern
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.bulkCustomers.firstName, searchPattern), (0, drizzle_orm_1.ilike)(schema_1.bulkCustomers.surname, searchPattern), (0, drizzle_orm_1.ilike)(schema_1.bulkCustomers.fullName, searchPattern), (0, drizzle_orm_1.sql) `CONCAT(${schema_1.bulkCustomers.firstName}, ' ', ${schema_1.bulkCustomers.surname}) ILIKE ${searchPattern}`, (0, drizzle_orm_1.sql) `CONCAT(${schema_1.bulkCustomers.surname}, ' ', ${schema_1.bulkCustomers.firstName}) ILIKE ${searchPattern}`, (0, drizzle_orm_1.ilike)(schema_1.bulkCustomers.email, searchPattern), (0, drizzle_orm_1.ilike)(schema_1.bulkCustomers.mobilePhone, searchPattern), normalizedSearch ? (0, drizzle_orm_1.eq)(schema_1.bulkCustomers.mobilePhone, normalizedSearch) : undefined, (0, drizzle_orm_1.ilike)(schema_1.bulkCustomers.otherName, searchPattern), (0, drizzle_orm_1.ilike)(schema_1.bulkCustomers.customerType, searchPattern), (0, drizzle_orm_1.ilike)(schema_1.bulkCustomers.occupation, searchPattern))
            : undefined, (type && type !== 'All') ? (0, drizzle_orm_1.eq)(schema_1.bulkCustomers.customerType, type) : undefined);
        const [totalCountResult] = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)`.mapWith(Number) })
            .from(schema_1.bulkCustomers)
            .where(baseQueryConditions);
        const total = totalCountResult?.count || 0;
        let offset = (page - 1) * limit;
        if (offset >= total && total > 0) {
            page = 1;
            offset = 0;
        }
        const customers = await this.db.query.bulkCustomers.findMany({
            where: baseQueryConditions,
            orderBy: (bulkCustomers, { desc }) => [desc(bulkCustomers.createdAt)],
            limit,
            offset,
        });
        return {
            data: customers,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async findCustomersByIdentifiers(identifiers) {
        if (!identifiers || identifiers.length === 0)
            return [];
        const validIdentifiers = identifiers.filter(id => id && String(id).trim() !== '' && String(id) !== 'undefined');
        if (validIdentifiers.length === 0)
            return [];
        const normalizedInputs = validIdentifiers.map(id => (0, phone_utils_1.normalizeIdentifier)(id)).filter(id => id.length > 0);
        const cleanDigitsOnly = validIdentifiers.map(id => String(id).replace(/\D/g, '')).filter(id => id.length > 0);
        const conditions = [];
        conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.email, validIdentifiers));
        conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.mobilePhone, validIdentifiers));
        if (cleanDigitsOnly.length > 0) {
            conditions.push((0, drizzle_orm_1.inArray)((0, drizzle_orm_1.sql) `regexp_replace(${schema_1.bulkCustomers.mobilePhone}, '[^0-9]', '', 'g')`, cleanDigitsOnly));
        }
        if (normalizedInputs.length > 0) {
            conditions.push((0, drizzle_orm_1.inArray)((0, drizzle_orm_1.sql) `CASE 
                WHEN regexp_replace(${schema_1.bulkCustomers.mobilePhone}, '[^0-9]', '', 'g') ~ '^0[789][01][0-9]{8}$' 
                THEN '234' || substr(regexp_replace(${schema_1.bulkCustomers.mobilePhone}, '[^0-9]', '', 'g'), 2)
                ELSE regexp_replace(${schema_1.bulkCustomers.mobilePhone}, '[^0-9]', '', 'g')
            END`, normalizedInputs));
        }
        return await this.db.query.bulkCustomers.findMany({
            where: (0, drizzle_orm_1.or)(...conditions),
        });
    }
    async deleteBulkCustomers(customerIds) {
        if (!customerIds || customerIds.length === 0)
            return { deleted: 0 };
        const result = await this.db.delete(schema_1.bulkCustomers)
            .where((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.id, customerIds))
            .returning({ id: schema_1.bulkCustomers.id });
        return { deleted: result.length };
    }
    // --- CONTACT GROUPS ---
    async createGroup(workspaceId, data) {
        return await this.db.transaction(async (tx) => {
            // 1. Create the base group
            const [newGroup] = await tx.insert(schema_1.groups).values({
                workspaceId,
                name: data.name,
                type: data.type,
            }).returning();
            // 2. Handle Static Group Members & Contextual Data
            if (data.type === 'static') {
                const finalCustomerIds = new Set(data.customerIds || []);
                const contextualInserts = [];
                if (data.contextualData && data.contextualData.length > 0) {
                    const originalIdentifiers = data.contextualData.map(d => String(d.identifier || '')).filter(id => id.trim() !== '' && id !== 'undefined');
                    const normalizedIdentifiers = originalIdentifiers.map(id => (0, phone_utils_1.normalizeIdentifier)(id)).filter(id => id.length > 0);
                    const conditions = [];
                    if (originalIdentifiers.length > 0) {
                        conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.email, originalIdentifiers));
                        conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.mobilePhone, originalIdentifiers));
                    }
                    if (normalizedIdentifiers.length > 0) {
                        conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.email, normalizedIdentifiers));
                        conditions.push((0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.mobilePhone, normalizedIdentifiers));
                    }
                    // Lookup customers by identifier (email or phone)
                    const matchedCustomers = conditions.length > 0 ? await tx.query.bulkCustomers.findMany({
                        where: (0, drizzle_orm_1.or)(...conditions)
                    }) : [];
                    // Create a lookup map for efficiency. 
                    // Map both the exact value in DB AND its normalized version (though they should be same).
                    const customerMap = new Map(); // normalizedIdentifier -> customerId
                    matchedCustomers.forEach(c => {
                        if (c.email) {
                            customerMap.set(c.email.toLowerCase(), c.id);
                            customerMap.set((0, phone_utils_1.normalizeIdentifier)(c.email), c.id);
                        }
                        if (c.mobilePhone) {
                            customerMap.set(c.mobilePhone, c.id);
                            customerMap.set((0, phone_utils_1.normalizeIdentifier)(c.mobilePhone), c.id);
                        }
                    });
                    for (const row of data.contextualData) {
                        const normId = (0, phone_utils_1.normalizeIdentifier)(row.identifier);
                        const customerId = customerMap.get(normId) || customerMap.get(row.identifier.toLowerCase().trim());
                        if (customerId) {
                            finalCustomerIds.add(customerId);
                            contextualInserts.push({
                                groupId: newGroup.id,
                                customerId,
                                data: row.data
                            });
                        }
                    }
                }
                if (finalCustomerIds.size > 0) {
                    const memberInserts = Array.from(finalCustomerIds).map(customerId => ({
                        groupId: newGroup.id,
                        customerId,
                    }));
                    const BATCH_SIZE = 1000;
                    for (let i = 0; i < memberInserts.length; i += BATCH_SIZE) {
                        await tx.insert(schema_1.groupMembers).values(memberInserts.slice(i, i + BATCH_SIZE));
                    }
                }
                if (contextualInserts.length > 0) {
                    const BATCH_SIZE = 1000;
                    for (let i = 0; i < contextualInserts.length; i += BATCH_SIZE) {
                        await tx.insert(schema_1.groupContextualData).values(contextualInserts.slice(i, i + BATCH_SIZE));
                    }
                }
            }
            // 3. Handle Dynamic Group Rules
            if (data.type === 'dynamic' && data.rules && data.rules.length > 0) {
                const ruleInserts = data.rules.map(rule => ({
                    groupId: newGroup.id,
                    field: rule.field,
                    operator: rule.operator,
                    value: rule.value,
                    logicGate: rule.logicGate || 'AND',
                }));
                await tx.insert(schema_1.groupRules).values(ruleInserts);
            }
            return newGroup;
        });
    }
    async getGroups(workspaceId) {
        // Fetch all groups for the workspace
        const workspaceGroups = await this.db.query.groups.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.groups.workspaceId, workspaceId),
            with: {
                rules: true, // we need rules to evaluate dynamic groups
            },
            orderBy: (groups, { desc }) => [desc(groups.createdAt)],
        });
        // Resolve estimated counts.
        // For static, we count GROUP_MEMBER rows.
        // For dynamic, we evaluate the rule live (simplified evaluation mapped here or in actual sending).
        const enrichedGroups = await Promise.all(workspaceGroups.map(async (g) => {
            let estimatedCount = 0;
            if (g.type === 'static') {
                const result = await this.db
                    .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                    .from(schema_1.groupMembers)
                    .where((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, g.id));
                estimatedCount = Number(result[0]?.count || 0);
            }
            else if (g.type === 'dynamic' && g.rules && g.rules.length > 0) {
                // Dynamic rule live evaluation estimation
                const rulesArr = g.rules;
                let querySql = (0, drizzle_orm_1.sql) `1=1`;
                for (let i = 0; i < rulesArr.length; i++) {
                    const r = rulesArr[i];
                    const column = schema_1.bulkCustomers[r.field];
                    let condition = (0, drizzle_orm_1.sql) `1=1`;
                    if (column) {
                        switch (r.operator) {
                            case 'equals':
                                condition = (0, drizzle_orm_1.sql) `${column} = ${r.value}`;
                                break;
                            case 'not_equals':
                                condition = (0, drizzle_orm_1.sql) `${column} != ${r.value}`;
                                break;
                            case 'contains':
                                condition = (0, drizzle_orm_1.sql) `${column} ILIKE ${'%' + r.value + '%'}`;
                                break;
                            case 'starts_with':
                                condition = (0, drizzle_orm_1.sql) `${column} ILIKE ${r.value + '%'}`;
                                break;
                        }
                    }
                    else {
                        // Support for Custom Fields (JSONB)
                        const jsonColumn = (0, drizzle_orm_1.sql) `${schema_1.bulkCustomers.customFields}->>${r.field}`;
                        switch (r.operator) {
                            case 'equals':
                                condition = (0, drizzle_orm_1.sql) `${jsonColumn} = ${r.value}`;
                                break;
                            case 'not_equals':
                                condition = (0, drizzle_orm_1.sql) `${jsonColumn} != ${r.value}`;
                                break;
                            case 'contains':
                                condition = (0, drizzle_orm_1.sql) `${jsonColumn} ILIKE ${'%' + r.value + '%'}`;
                                break;
                            case 'starts_with':
                                condition = (0, drizzle_orm_1.sql) `${jsonColumn} ILIKE ${r.value + '%'}`;
                                break;
                        }
                    }
                    if (i === 0) {
                        querySql = condition;
                    }
                    else {
                        if (r.logicGate === 'OR') {
                            querySql = (0, drizzle_orm_1.sql) `${querySql} OR ${condition}`;
                        }
                        else {
                            querySql = (0, drizzle_orm_1.sql) `${querySql} AND ${condition}`;
                        }
                    }
                }
                const countResult = await this.db
                    .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                    .from(schema_1.bulkCustomers)
                    .where((0, drizzle_orm_1.sql) `(${querySql})`);
                estimatedCount = Number(countResult[0]?.count || 0);
            }
            return {
                id: g.id,
                name: g.name,
                type: g.type,
                estimatedCount,
                createdAt: g.createdAt
            };
        }));
        return enrichedGroups;
    }
    async getGroup(workspaceId, groupId) {
        const group = await this.db.query.groups.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId), (0, drizzle_orm_1.eq)(schema_1.groups.workspaceId, workspaceId)),
            with: {
                rules: true,
                members: {
                    with: {
                        customer: true
                    }
                },
            },
        });
        if (!group)
            throw new Error('Group not found');
        return {
            ...group,
            customerIds: group.members?.map((m) => m.customerId) || [],
            customers: group.members?.map((m) => m.customer) || []
        };
    }
    async updateGroup(workspaceId, groupId, data) {
        return await this.db.transaction(async (tx) => {
            // 1. Verify existence
            const existingGroup = await tx.query.groups.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId), (0, drizzle_orm_1.eq)(schema_1.groups.workspaceId, workspaceId)),
            });
            if (!existingGroup)
                throw new Error('Group not found');
            // 2. Update base info
            await tx.update(schema_1.groups)
                .set({
                name: data.name ?? existingGroup.name,
                type: data.type ?? existingGroup.type,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId));
            // 3. If type changed or data provided, update members/rules
            if (data.type || data.customerIds || data.rules) {
                const finalType = data.type ?? existingGroup.type;
                if (finalType === 'static') {
                    // Clear rules if any
                    await tx.delete(schema_1.groupRules).where((0, drizzle_orm_1.eq)(schema_1.groupRules.groupId, groupId));
                    // Update members if provided
                    if (data.customerIds) {
                        await tx.delete(schema_1.groupMembers).where((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, groupId));
                        if (data.customerIds.length > 0) {
                            const memberInserts = data.customerIds.map(customerId => ({
                                groupId,
                                customerId,
                            }));
                            const BATCH_SIZE = 1000;
                            for (let i = 0; i < memberInserts.length; i += BATCH_SIZE) {
                                await tx.insert(schema_1.groupMembers).values(memberInserts.slice(i, i + BATCH_SIZE));
                            }
                        }
                    }
                }
                else {
                    // Clear members if any
                    await tx.delete(schema_1.groupMembers).where((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, groupId));
                    // Update rules if provided
                    if (data.rules) {
                        await tx.delete(schema_1.groupRules).where((0, drizzle_orm_1.eq)(schema_1.groupRules.groupId, groupId));
                        if (data.rules.length > 0) {
                            const ruleInserts = data.rules.map(rule => ({
                                groupId,
                                field: rule.field,
                                operator: rule.operator,
                                value: rule.value,
                                logicGate: rule.logicGate || 'AND',
                            }));
                            await tx.insert(schema_1.groupRules).values(ruleInserts);
                        }
                    }
                }
            }
            return { success: true };
        });
    }
    async deleteGroup(workspaceId, groupId) {
        return await this.db.transaction(async (tx) => {
            // 1. Verify
            const group = await tx.query.groups.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId), (0, drizzle_orm_1.eq)(schema_1.groups.workspaceId, workspaceId)),
            });
            if (!group)
                throw new Error('Group not found');
            // 2. Delete related data
            await tx.delete(schema_1.groupMembers).where((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, groupId));
            await tx.delete(schema_1.groupRules).where((0, drizzle_orm_1.eq)(schema_1.groupRules.groupId, groupId));
            // 3. Delete group
            await tx.delete(schema_1.groups).where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId));
            return { success: true };
        });
    }
    async addGroupMembers(workspaceId, groupId, customerIds) {
        if (!customerIds || customerIds.length === 0)
            return { added: 0 };
        // 1. Verify group exists and belongs to this workspace and is STATIC
        const group = await this.db.query.groups.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId), (0, drizzle_orm_1.eq)(schema_1.groups.workspaceId, workspaceId)),
        });
        if (!group)
            throw new Error('Group not found');
        if (group.type !== 'static')
            throw new Error('Cannot manually add members to a dynamic group');
        // 2. Perform bulk insert with ON CONFLICT DO NOTHING
        const memberInserts = customerIds.map(customerId => ({
            groupId,
            customerId,
        }));
        // Use standard insert with onConflictDoNothing to skip existing records
        const BATCH_SIZE = 1000;
        let totalAdded = 0;
        for (let i = 0; i < memberInserts.length; i += BATCH_SIZE) {
            const batch = memberInserts.slice(i, i + BATCH_SIZE);
            const result = await this.db.insert(schema_1.groupMembers).values(batch).onConflictDoNothing().returning();
            totalAdded += result.length;
        }
        return { added: totalAdded };
    }
    async getDashboardStats(workspaceId) {
        // Fetch raw analytics for the workspace from the last 30 days
        const rawAnalytics = await this.db.select({
            eventType: schema_1.campaignAnalytics.eventType,
            occurredAt: schema_1.campaignAnalytics.occurredAt,
            channel: schema_1.campaigns.channel
        })
            .from(schema_1.campaignAnalytics)
            .innerJoin(schema_1.campaigns, (0, drizzle_orm_1.eq)(schema_1.campaigns.id, schema_1.campaignAnalytics.campaignId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId), (0, drizzle_orm_1.sql) `${schema_1.campaignAnalytics.occurredAt} >= NOW() - INTERVAL '31 days'`));
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        let sentTodayEmail = 0;
        let sentTodaySms = 0;
        let sentToday = 0;
        let sentYesterday = 0;
        let sent30d = 0;
        let delivered30d = 0;
        let failed30d = 0;
        let sentPrev30d = 0; // Simple trend proxy: if we wanted real prev 30d we'd query 60d, but we'll approximate
        const channelStats = {
            EMAIL: { sent: 0, failed: 0 },
            SMS: { sent: 0, failed: 0 },
            WHATSAPP: { sent: 0, failed: 0 }
        };
        // Initialize last 30 days for the chart
        const chartMap = new Map();
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            chartMap.set(key, 0);
        }
        rawAnalytics.forEach(row => {
            const date = new Date(row.occurredAt);
            const dateKey = date.toISOString().split('T')[0];
            const ch = row.channel;
            if (row.eventType === 'SENT') {
                sent30d++;
                channelStats[ch].sent++;
                if (date >= todayStart) {
                    sentToday++;
                    if (ch === 'EMAIL')
                        sentTodayEmail++;
                    if (ch === 'SMS')
                        sentTodaySms++;
                }
                else if (date >= yesterdayStart && date < todayStart) {
                    sentYesterday++;
                }
                if (chartMap.has(dateKey)) {
                    chartMap.set(dateKey, chartMap.get(dateKey) + 1);
                }
            }
            else if (row.eventType === 'DELIVERED') {
                delivered30d++;
            }
            else if (row.eventType === 'FAILED' || row.eventType === 'BOUNCED') {
                failed30d++;
                channelStats[ch].failed++;
            }
        });
        const getChannelHealth = (stats) => {
            if (stats.sent === 0)
                return { status: 'Operational', color: 'green' }; // Default if no data
            const failRate = stats.failed / stats.sent;
            if (failRate > 0.15)
                return { status: 'Major Outage', color: 'red' };
            if (failRate > 0.05)
                return { status: 'Degraded Performance', color: 'yellow' };
            return { status: 'Operational', color: 'green' };
        };
        const channelHealth = [
            { name: 'SMS Gateway', icon: 'sms', ...getChannelHealth(channelStats.SMS) },
            // { name: 'WhatsApp API', icon: 'chat', ...getChannelHealth(channelStats.WHATSAPP) },
            { name: 'Email Server', icon: 'mail', ...getChannelHealth(channelStats.EMAIL) },
        ];
        const formatPercent = (val) => val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
        const sentTrend = sentYesterday > 0 ? ((sentToday - sentYesterday) / sentYesterday) * 100 : (sentToday > 0 ? 10 : 0);
        const deliveryRate = sent30d > 0 ? (delivered30d / sent30d) * 100 : 0;
        const failedRate = sent30d > 0 ? (failed30d / sent30d) * 100 : 0;
        // In a real app we'd compare these rates to the prior 30 days, but we'll use a standard slight positive slope for the demo empty states
        const deliveryTrend = sent30d > 0 ? 0.5 : 0;
        const failedTrend = sent30d > 0 ? -0.2 : 0;
        const chartData = Array.from(chartMap.entries()).map(([dateStr, value]) => {
            const date = new Date(dateStr);
            const isToday = date.toDateString() === new Date().toDateString();
            return {
                name: isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
                value
            };
        });
        return {
            totalSentToday: {
                value: sentToday.toLocaleString(),
                emailVal: sentTodayEmail.toLocaleString(),
                smsVal: sentTodaySms.toLocaleString(),
                trend: formatPercent(Math.abs(sentTrend)) + '%',
                up: sentTrend >= 0
            },
            deliveryRate: {
                value: formatPercent(deliveryRate) + '%',
                trend: formatPercent(Math.abs(deliveryTrend)) + '%',
                up: deliveryTrend >= 0
            },
            failedRate: {
                value: formatPercent(failedRate) + '%',
                trend: formatPercent(Math.abs(failedTrend)) + '%',
                up: failedTrend >= 0 // We usually want failed going down, but the trend arrow logic uses `up` to determine whether it's green or red in Dashboard currently? Wait, red usually has down. Let's pass the raw boolean.
            },
            walletBalance: '₦450.00',
            chartData,
            channelHealth
        };
    }
    async getWorkspaceAnniversaries(workspaceId) {
        // Since getBulkCustomers returns all customers in the database (global pool),
        // we follow the same pattern here to ensure all contacts are scanned for anniversaries.
        const customers = await this.db.select({
            id: schema_1.bulkCustomers.id,
            firstName: schema_1.bulkCustomers.firstName,
            surname: schema_1.bulkCustomers.surname,
            fullName: schema_1.bulkCustomers.fullName,
            dob: schema_1.bulkCustomers.dob,
            dateOfIncorporation: schema_1.bulkCustomers.dateOfIncorporation,
            mobilePhone: schema_1.bulkCustomers.mobilePhone,
            email: schema_1.bulkCustomers.email
        }).from(schema_1.bulkCustomers);
        console.log(`[Anniversaries] Found ${customers.length} total customers to scan.`);
        const today = new Date();
        // Zero out time for accurate day difference
        today.setHours(0, 0, 0, 0);
        const results = {
            inThreeDays: [],
            upcoming: []
        };
        for (const customer of customers) {
            const anniversaries = [
                { type: 'Birthday', dateStr: customer.dob },
                { type: 'Anniversary', dateStr: customer.dateOfIncorporation }
            ];
            for (const ann of anniversaries) {
                if (!ann.dateStr)
                    continue;
                console.log(`[Anniversaries] Checking ${ann.type} for ${customer.fullName || customer.id}: ${ann.dateStr}`);
                // Simple parser for YYYY-MM-DD or DD-MM-YYYY
                let dateParts = [];
                if (ann.dateStr.includes('-'))
                    dateParts = ann.dateStr.split('-');
                else if (ann.dateStr.includes('/'))
                    dateParts = ann.dateStr.split('/');
                if (dateParts.length < 2)
                    continue;
                let day, month;
                // Try to guess format
                if (dateParts[0].length === 4) { // YYYY-MM-DD
                    month = parseInt(dateParts[1]);
                    day = parseInt(dateParts[2]);
                }
                else if (dateParts[2]?.length === 4) { // DD-MM-YYYY
                    day = parseInt(dateParts[0]);
                    month = parseInt(dateParts[1]);
                }
                else {
                    // Fallback
                    day = parseInt(dateParts[0]);
                    month = parseInt(dateParts[1]);
                }
                if (isNaN(day) || isNaN(month))
                    continue;
                if (month < 1 || month > 12 || day < 1 || day > 31)
                    continue;
                const eventThisYear = new Date(today.getFullYear(), month - 1, day);
                eventThisYear.setHours(0, 0, 0, 0);
                let diffTime = eventThisYear.getTime() - today.getTime();
                let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // If event already passed this year, check next year
                if (diffDays < 0) {
                    const eventNextYear = new Date(today.getFullYear() + 1, month - 1, day);
                    eventNextYear.setHours(0, 0, 0, 0);
                    diffTime = eventNextYear.getTime() - today.getTime();
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
                const item = {
                    id: customer.id,
                    name: customer.fullName || `${customer.firstName} ${customer.surname}`.trim() || customer.email || 'Unknown Contact',
                    type: ann.type,
                    daysUntil: diffDays,
                    date: `${day}/${month}`,
                    originalDate: ann.dateStr
                };
                if (diffDays === 3) {
                    results.inThreeDays.push(item);
                }
                else if (diffDays >= 0 && diffDays <= 7) {
                    results.upcoming.push(item);
                }
            }
        }
        return results;
    }
    async clearAllBulkCustomers() {
        const result = await this.db.delete(schema_1.bulkCustomers).returning({ id: schema_1.bulkCustomers.id });
        return { deleted: result.length };
    }
}
exports.WorkspacesService = WorkspacesService;
