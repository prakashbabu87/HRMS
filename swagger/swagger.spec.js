/**
 * SWAGGER API DOCUMENTATION
 * Complete OpenAPI 3.0 specification for HRMS API
 */

const ACCESS_MATRIX = {
    description: "Role access (allowed = true). Roles: admin, hr, manager, employee",
    matrix: {
        "/api/login": { admin: true, hr: true, manager: true, employee: true, method: "POST", note: "public auth" },
        "/api/onboarding/set-password": { admin: true, hr: true, manager: true, employee: true, method: "POST" },
        "/api/employees": { "GET": { admin: true, hr: true, manager: true, employee: false }, "POST": { admin: true, hr: true, manager: false, employee: false } },
        "/api/profile": { "GET": { admin: true, hr: true, manager: true, employee: true }, "PUT": { admin: true, hr: true, manager: true, employee: true } }
    }
};

const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "HRMS API - Modular Version",
        version: "2.0.0",
        description: `Human Resource Management System API - Modular Architecture with Auth, Employees, Payroll, Attendance, Timesheets, and more. Features hybrid work support (Office/WFH/Remote), leave management, and comprehensive reporting.

**🎯 Pre-Onboarding Workflow:**
1. Login → 2. Create Candidate → 3. Start Pre-onboarding → 4. Create Offer → 5. Send Offer → 6. Candidate Views (no auth) → 7. Candidate Approves → 8. Update Status → 9. Hire → 10. Convert to Employee

---

**📝 Timesheet Workflow:**
**Employee:** Check Assignment Status → Submit Regular/Project Timesheet (hourly breakdown) → View My Timesheets  
**End of Month:** Upload Client Timesheet (PDF/Excel)  
**Admin:** Get Pending Validations → Compare Internal vs Client Data → Validate/Reject → View Statistics

---

**🏖️ Leave Management Workflow:**

**STEP 1: Admin Setup (One-time)**
→ POST /api/leaves/plans - Create leave plan with allocations
   - Define leave types (CL, PL, SL, etc.)
   - Set days_allocated per type
   - Enable/disable proration for mid-year joiners

**STEP 2: Employee Leave Application**
1. **Check Balance**: GET /api/leaves/balance
   - View available leave balance by type
   - See allocated, used, available counts
2. **Apply Leave**: POST /api/leaves/apply
   - Select: leave_type_id, start_date, end_date
   - System auto-calculates total_days
   - Add reason (required)
   - Status: pending (awaiting approval)
3. **View My Leaves**: GET /api/leaves/my-leaves
   - Filter by: leave_year
   - Shows: status, dates, approver, balance impact

**STEP 3: Manager/HR Approval**
1. **View Pending Requests**: GET /api/leaves/pending
   - Shows employee details + leave balance
2. **Approve**: POST /api/leaves/approve/{id}
   - Deducts from employee balance automatically
   - Sends notification to employee
3. **Reject**: POST /api/leaves/reject/{id}
   - Add rejection reason
   - Balance remains unchanged

**WFH/Remote Work:**
- **Request**: POST /api/leaves/wfh-request (date, work_mode, reason)
- **View Requests**: GET /api/leaves/wfh-requests
- **Pending Approvals**: GET /api/leaves/wfh-requests/pending (HR only)

**Key Features:** ✅ Auto balance calculation ✅ Proration support ✅ Multi-level approval ✅ Balance tracking ✅ WFH/Remote requests

---

**💰 Payroll Workflow:**

**STEP 1: Employee Salary Structure Setup (Admin)**
→ POST /api/payroll/salary/structure/{empId}
   - Define: basic, hra, conveyance, special_allowance
   - Set deductions: pf, esi, professional_tax
   - Saved to salary_structures table

**STEP 2: Generate Monthly Payroll (Admin)**
→ POST /api/payroll/generate
   - Required: month (1-12), year (2025)
   - System auto-calculates:
     • Gross salary (basic + hra + allowances)
     • Total deductions (pf + esi + tax)
     • Net salary (gross - deductions)
   - Creates payroll_run + payroll_slips for all employees

**STEP 3: View Payroll Data**
1. **Admin View**: GET /api/payroll/runs
   - All payroll runs with employee counts
2. **Employee View**: GET /api/payroll/slips/employee/{employee_id}
   - Own salary slips only
   - Shows: month, gross, deductions, net_salary

**STEP 4: Bulk Upload (Optional)**
→ POST /api/upload/payroll (multipart/form-data)
   - Upload Excel with employee payroll data
   - Fields: EmployeeNumber, basic, hra, pf, esi, etc.
   - Params: month, year
   - Creates slips for multiple employees at once

**Key Features:** ✅ Salary structure templates ✅ Auto-calculation (gross/net) ✅ Bulk Excel upload ✅ Employee self-service view ✅ Monthly payroll runs`
    },
    servers: [
        { 
            // url: process.env.API_BASE_URL || "http://localhost:3000", 
            // description: process.env.NODE_ENV === 'production' ? "Production Server" : "Development Server"
            url: '/',
            description: ''
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT token from /api/auth/login (username: admin, password: admin123)"
            }
        },
        schemas: {
            User: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    username: { type: "string" },
                    role: { 
                        type: "string", 
                        enum: ["admin", "hr", "manager", "employee"],
                        description: "User role - admin (full access), hr (HR operations), manager (team management), employee (self-service)"
                    }
                }
            },
            Employee: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    EmployeeNumber: { type: "string" },
                    FullName: { type: "string" },
                    WorkEmail: { type: "string" },
                    Department: { type: "string" },
                    Designation: { type: "string" },
                    Location: { type: "string" }
                }
            },
            CheckInRequest: {
                type: "object",
                required: ["work_mode"],
                properties: {
                    work_mode: { 
                        type: "string", 
                        enum: ["Office", "WFH", "Remote", "Hybrid"],
                        description: "Work mode - Office (on-site), WFH (Work From Home), Remote (any remote location), Hybrid (mixed mode)",
                        example: "WFH" 
                    },
                    location: { type: "string", example: "Home - Mumbai" },
                    notes: { type: "string", example: "Working from home today" }
                }
            },
            WFHRequest: {
                type: "object",
                required: ["date", "work_mode", "reason"],
                properties: {
                    date: { type: "string", format: "date", example: "2025-12-25" },
                    work_mode: { 
                        type: "string", 
                        enum: ["WFH", "Remote"],
                        description: "Work mode - WFH (Work From Home) or Remote (any remote location)",
                        example: "WFH" 
                    },
                    reason: { type: "string", example: "Personal commitment" }
                }
            },
            LeaveApplication: {
                type: "object",
                required: ["employee_id", "leave_type_id", "start_date", "end_date", "reason"],
                properties: {
                    employee_id: { type: "integer" },
                    leave_type_id: { type: "integer" },
                    start_date: { type: "string", format: "date" },
                    end_date: { type: "string", format: "date" },
                    reason: { type: "string" },
                    status: { 
                        type: "string", 
                        enum: ["pending", "approved", "rejected", "cancelled"],
                        description: "Leave status - pending (awaiting approval), approved (approved by manager), rejected (denied), cancelled (withdrawn by employee)",
                        default: "pending" 
                    }
                }
            },
            ErrorResponse: {
                type: "object",
                properties: {
                    error: { type: "string" },
                    message: { type: "string" }
                }
            }
        }
    },
    security: [{ bearerAuth: [] }],
    paths: {
        "/api/health": {
            get: {
                summary: "Health Check",
                description: "Check if server is running",
                security: [],
                tags: ["System"],
                responses: {
                    200: { description: "Server is healthy" }
                }
            }
        },
        
        // ============ AUTHENTICATION ============
        "/api/auth/login": {
            post: {
                summary: "User Login",
                description: "Authenticate user and receive JWT token. Default: username='admin', password='admin123'",
                security: [],
                tags: ["🔐 Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["username", "password"],
                                properties: {
                                    username: { type: "string", example: "admin" },
                                    password: { type: "string", example: "admin123" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "Login successful",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        token: { type: "string" },
                                        user: { $ref: "#/components/schemas/User" }
                                    }
                                }
                            }
                        }
                    },
                    401: { description: "Invalid credentials" }
                }
            }
        },
        "/api/auth/logout": {
            post: {
                summary: "Logout User",
                tags: ["🔐 Authentication"],
                responses: {
                    200: { description: "Logged out successfully" }
                }
            }
        },
        "/api/auth/employee/check": {
            get: {
                summary: "🆕 Check Employee by Email",
                description: "Check if employee exists by email and whether they have a user account created",
                security: [],
                tags: ["🔐 Authentication"],
                parameters: [{
                    name: "email",
                    in: "query",
                    required: true,
                    schema: { type: "string", example: "john.doe@company.com" },
                    description: "Employee work email"
                }],
                responses: {
                    200: {
                        description: "Employee check successful",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        found: { type: "boolean", example: true },
                                        employee: {
                                            type: "object",
                                            properties: {
                                                id: { type: "integer" },
                                                EmployeeNumber: { type: "string" },
                                                FullName: { type: "string" },
                                                WorkEmail: { type: "string" },
                                                JobTitle: { type: "string" },
                                                Department: { type: "string" },
                                                Location: { type: "string" },
                                                Status: { type: "string" }
                                            }
                                        },
                                        hasUserAccount: { type: "boolean", example: false },
                                        userInfo: { 
                                            type: "object",
                                            nullable: true,
                                            properties: {
                                                id: { type: "integer" },
                                                username: { type: "string" },
                                                role: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    404: { description: "Employee not found" },
                    400: { description: "Email parameter required" }
                }
            }
        },
        "/api/auth/user/create": {
            post: {
                summary: "🆕 Create User Account for Employee",
                description: "Create user account with password for an existing employee. Email must match an employee's WorkEmail.",
                security: [],
                tags: ["🔐 Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: { type: "string", example: "john.doe@company.com", description: "Must match employee WorkEmail" },
                                    password: { type: "string", example: "SecurePass123!", description: "User login password" },
                                    role: { type: "string", enum: ["employee", "hr", "manager", "admin"], default: "employee", description: "User role (default: employee)" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "User account created successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        employee: {
                                            type: "object",
                                            properties: {
                                                id: { type: "integer" },
                                                employeeNumber: { type: "string" },
                                                fullName: { type: "string" },
                                                email: { type: "string" }
                                            }
                                        },
                                        user: {
                                            type: "object",
                                            properties: {
                                                username: { type: "string" },
                                                role: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    404: { description: "Employee not found" },
                    409: { description: "User account already exists" },
                    400: { description: "Email and password required" }
                }
            }
        },
        "/api/auth/users": {
            get: {
                summary: "🆕 Get All Users",
                description: "Get list of all user accounts with employee linkage (Admin/HR only)",
                tags: ["🔐 Authentication"],
                responses: {
                    200: {
                        description: "List of users",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        users: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "integer" },
                                                    username: { type: "string" },
                                                    role: { type: "string" },
                                                    full_name: { type: "string" },
                                                    created_at: { type: "string", format: "date-time" },
                                                    employee_id: { type: "integer", nullable: true },
                                                    EmployeeNumber: { type: "string", nullable: true },
                                                    Status: { type: "string", nullable: true }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    403: { description: "Access denied" }
                }
            }
        },
        "/api/auth/users/{id}": {
            get: {
                summary: "🆕 Get User by ID",
                description: "Get specific user details (Admin/HR or own account)",
                tags: ["🔐 Authentication"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: {
                        description: "User details",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        user: {
                                            type: "object",
                                            properties: {
                                                id: { type: "integer" },
                                                username: { type: "string" },
                                                role: { type: "string" },
                                                full_name: { type: "string" },
                                                created_at: { type: "string" },
                                                updated_at: { type: "string" },
                                                employee_id: { type: "integer" },
                                                EmployeeNumber: { type: "string" },
                                                emp_full_name: { type: "string" },
                                                Status: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    404: { description: "User not found" },
                    403: { description: "Access denied" }
                }
            },
            delete: {
                summary: "🆕 Delete User",
                description: "Delete user account (Admin only)",
                tags: ["🔐 Authentication"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "User deleted successfully" },
                    403: { description: "Access denied" }
                }
            }
        },
        "/api/auth/users/{id}/role": {
            put: {
                summary: "🆕 Update User Role",
                description: "Change user role (Admin only)",
                tags: ["🔐 Authentication"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["role"],
                                properties: {
                                    role: { type: "string", enum: ["admin", "hr", "manager", "employee"], example: "hr" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "User role updated successfully" },
                    400: { description: "Valid role required" },
                    403: { description: "Access denied" }
                }
            }
        },
        "/api/auth/users/{id}/make-hr": {
            post: {
                summary: "🆕 Make User HR",
                description: "Promote user to HR role (Admin only). Quick action alternative to PUT /users/:id/role",
                tags: ["🔐 Authentication"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" },
                    description: "User ID to promote"
                }],
                responses: {
                    200: {
                        description: "User promoted to HR successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string", example: "User promoted to HR successfully" },
                                        user: {
                                            type: "object",
                                            properties: {
                                                id: { type: "integer" },
                                                username: { type: "string" },
                                                previousRole: { type: "string" },
                                                newRole: { type: "string", example: "hr" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    404: { description: "User not found" },
                    403: { description: "Access denied. Admin role required" }
                }
            }
        },
        "/api/auth/users/{id}/make-manager": {
            post: {
                summary: "🆕 Make User Manager",
                description: "Promote user to Manager role (Admin only). Quick action alternative to PUT /users/:id/role",
                tags: ["🔐 Authentication"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" },
                    description: "User ID to promote"
                }],
                responses: {
                    200: {
                        description: "User promoted to Manager successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string", example: "User promoted to Manager successfully" },
                                        user: {
                                            type: "object",
                                            properties: {
                                                id: { type: "integer" },
                                                username: { type: "string" },
                                                previousRole: { type: "string" },
                                                newRole: { type: "string", example: "manager" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    404: { description: "User not found" },
                    403: { description: "Access denied. Admin role required" }
                }
            }
        },
        "/api/auth/users/{id}/make-admin": {
            post: {
                summary: "🆕 Make User Admin",
                description: "Promote user to Admin role (Admin only). Quick action alternative to PUT /users/:id/role",
                tags: ["🔐 Authentication"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" },
                    description: "User ID to promote"
                }],
                responses: {
                    200: {
                        description: "User promoted to Admin successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string", example: "User promoted to Admin successfully" },
                                        user: {
                                            type: "object",
                                            properties: {
                                                id: { type: "integer" },
                                                username: { type: "string" },
                                                previousRole: { type: "string" },
                                                newRole: { type: "string", example: "admin" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    404: { description: "User not found" },
                    403: { description: "Access denied. Admin role required" }
                }
            }
        },
        "/api/auth/users/{id}/make-employee": {
            post: {
                summary: "🆕 Demote User to Employee",
                description: "Change user role back to Employee (Admin only). Quick action alternative to PUT /users/:id/role",
                tags: ["🔐 Authentication"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" },
                    description: "User ID to demote"
                }],
                responses: {
                    200: {
                        description: "User role changed to Employee",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string", example: "User role changed to Employee" },
                                        user: {
                                            type: "object",
                                            properties: {
                                                id: { type: "integer" },
                                                username: { type: "string" },
                                                previousRole: { type: "string" },
                                                newRole: { type: "string", example: "employee" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    404: { description: "User not found" },
                    403: { description: "Access denied. Admin role required" }
                }
            }
        },
        "/api/auth/users/bulk-role-update": {
            post: {
                summary: "🆕 Bulk Update User Roles",
                description: "Update multiple user roles in one request (Admin only). Useful for batch promotions/demotions",
                tags: ["🔐 Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["updates"],
                                properties: {
                                    updates: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            required: ["userId", "role"],
                                            properties: {
                                                userId: { type: "integer", example: 2 },
                                                role: { type: "string", enum: ["admin", "hr", "manager", "employee"], example: "hr" }
                                            }
                                        },
                                        example: [
                                            { userId: 2, role: "hr" },
                                            { userId: 3, role: "manager" },
                                            { userId: 4, role: "employee" }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Bulk update completed",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string", example: "3 of 3 users updated successfully" },
                                        results: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    userId: { type: "integer" },
                                                    success: { type: "boolean" },
                                                    role: { type: "string" },
                                                    error: { type: "string" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: { description: "Invalid request format" },
                    403: { description: "Access denied. Admin role required" }
                }
            }
        },
        "/api/auth/password/create": {
            post: {
                summary: "Create Password (Legacy)",
                description: "Legacy endpoint - Use /api/auth/user/create instead",
                tags: ["🔐 Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    employee_id: { type: "string" },
                                    password: { type: "string" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Password set successfully" }
                }
            }
        },
        
        // ============ EMPLOYEES ============
        "/api/employees": {
            get: {
                summary: "Get All Employees",
                description: "Retrieve list of all employees",
                tags: ["👥 Employees"],
                responses: {
                    200: { 
                        description: "List of employees",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Employee" }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Employee",
                description: "Create new employee (Admin/HR only)",
                tags: ["👥 Employees"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Employee" }
                        }
                    }
                },
                responses: {
                    200: { description: "Employee created successfully" }
                }
            }
        },
        "/api/employees/{id}": {
            get: {
                summary: "Get Employee by ID",
                tags: ["👥 Employees"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Employee details" },
                    404: { description: "Employee not found" }
                }
            },
            put: {
                summary: "Update Employee",
                description: "Update employee details (HR only)",
                tags: ["👥 Employees"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Employee updated" }
                }
            }
        },
        "/api/employees/{id}/details": {
            get: {
                summary: "🆕 Get Detailed Employee Information",
                description: "Get comprehensive employee details including attendance summary, leave balance, and pending requests",
                tags: ["👥 Employees"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { 
                        description: "Detailed employee information",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        employee: { 
                                            type: "object",
                                            description: "Employee data with all master relationships" 
                                        },
                                        attendance_summary: {
                                            type: "object",
                                            properties: {
                                                recent_records: { type: "array" },
                                                total_present_days: { type: "integer" },
                                                wfh_days: { type: "integer" },
                                                remote_days: { type: "integer" }
                                            }
                                        },
                                        leave_summary: { type: "array" },
                                        pending_requests: { type: "array" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/employees/profile/me": {
            get: {
                summary: "Get My Profile",
                tags: ["👥 Employees"],
                responses: {
                    200: { description: "User profile" }
                }
            },
            put: {
                summary: "Update My Profile",
                tags: ["👥 Employees"],
                responses: {
                    200: { description: "Profile updated" }
                }
            }
        },
        "/api/employees/search/query": {
            get: {
                summary: "Search Employees",
                tags: ["👥 Employees"],
                parameters: [{
                    name: "q",
                    in: "query",
                    required: true,
                    schema: { type: "string" },
                    example: "John"
                }],
                responses: {
                    200: { description: "Search results" }
                }
            }
        },
        
        // ============ ATTENDANCE (MULTIPLE PUNCHES SYSTEM) ============
        "/api/attendance/punch-in": {
            post: {
                summary: "✨ Punch In (Multiple Times per Day)",
                description: "Punch in - can be done multiple times per day (e.g., morning, after lunch). System validates against active punch-in.",
                tags: ["⏰ Attendance"],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    work_mode: { 
                                        type: "string", 
                                        enum: ["Office", "WFH", "Remote", "Hybrid"], 
                                        description: "Work mode - Office, WFH (Work From Home), Remote, or Hybrid",
                                        example: "Office" 
                                    },
                                    location: { type: "string", example: "Mumbai Office" },
                                    notes: { type: "string", example: "Starting work" }
                                }
                            },
                            example: {
                                work_mode: "Office",
                                location: "Mumbai Office",
                                notes: "Morning shift"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Punched in successfully",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Punched in successfully",
                                    punch_time: "2025-12-23T09:00:00.000Z",
                                    work_mode: "Office",
                                    attendance_id: 15
                                }
                            }
                        }
                    },
                    400: { description: "Already punched in - punch out first" }
                }
            }
        },
        "/api/attendance/punch-out": {
            post: {
                summary: "✨ Punch Out (Multiple Times per Day)",
                description: "Punch out - can be done multiple times per day (e.g., lunch break, end of day). Automatically calculates and updates gross hours.",
                tags: ["⏰ Attendance"],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    notes: { type: "string", example: "Lunch break" }
                                }
                            },
                            example: {
                                notes: "Going for lunch"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Punched out successfully with updated hours",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Punched out successfully",
                                    punch_time: "2025-12-23T13:00:00.000Z",
                                    attendance_id: 15,
                                    hours_calculated: {
                                        total_work_hours: 4.0,
                                        total_break_hours: 0.0,
                                        gross_hours: 4.0
                                    }
                                }
                            }
                        }
                    },
                    400: { description: "Already punched out or no attendance record" }
                }
            }
        },
        "/api/attendance/today": {
            get: {
                summary: "✨ Get Today's Attendance Status",
                description: "Get complete attendance status for today including all punches, total hours, and can_punch_in/can_punch_out status",
                tags: ["⏰ Attendance"],
                responses: {
                    200: {
                        description: "Today's attendance with all punches",
                        content: {
                            "application/json": {
                                example: {
                                    has_attendance: true,
                                    attendance: {
                                        id: 15,
                                        attendance_date: "2025-12-23",
                                        first_check_in: "2025-12-23T09:00:00",
                                        last_check_out: "2025-12-23T18:00:00",
                                        total_work_hours: 8.5,
                                        total_break_hours: 1.0,
                                        gross_hours: 8.5,
                                        work_mode: "Office",
                                        status: "present"
                                    },
                                    punches: [
                                        { id: 1, punch_type: "in", punch_time: "2025-12-23T09:00:00", location: "Office" },
                                        { id: 2, punch_type: "out", punch_time: "2025-12-23T13:00:00", location: "Office" },
                                        { id: 3, punch_type: "in", punch_time: "2025-12-23T14:00:00", location: "Office" },
                                        { id: 4, punch_type: "out", punch_time: "2025-12-23T18:00:00", location: "Office" }
                                    ],
                                    punch_count: 4,
                                    last_punch_type: "out",
                                    can_punch_in: true,
                                    can_punch_out: false
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/attendance/my-report": {
            get: {
                summary: "✨ My Attendance Report",
                description: "Get attendance report with summary statistics (total days, present, hours worked, etc.)",
                tags: ["⏰ Attendance"],
                parameters: [
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" }, example: "2025-12-01" },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" }, example: "2025-12-31" },
                    { name: "month", in: "query", schema: { type: "integer" }, example: 12 },
                    { name: "year", in: "query", schema: { type: "integer" }, example: 2025 }
                ],
                responses: {
                    200: {
                        description: "Attendance report with summary",
                        content: {
                            "application/json": {
                                example: {
                                    summary: {
                                        total_days: 20,
                                        present_days: 18,
                                        absent_days: 0,
                                        half_days: 2,
                                        total_work_hours: 162.5,
                                        avg_work_hours: 8.13
                                    },
                                    attendance: [
                                        {
                                            id: 15,
                                            attendance_date: "2025-12-23",
                                            gross_hours: 8.5,
                                            punch_in_count: 2,
                                            punch_out_count: 2,
                                            status: "present"
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/attendance/details/{date}": {
            get: {
                summary: "✨ Get Attendance Details for Date",
                description: "Get detailed punch history and calculated punch pairs for specific date",
                tags: ["⏰ Attendance"],
                parameters: [{
                    name: "date",
                    in: "path",
                    required: true,
                    schema: { type: "string", format: "date" },
                    example: "2025-12-23"
                }],
                responses: {
                    200: {
                        description: "Detailed attendance with punch pairs",
                        content: {
                            "application/json": {
                                example: {
                                    attendance: {
                                        id: 15,
                                        attendance_date: "2025-12-23",
                                        total_work_hours: 8.5,
                                        total_break_hours: 1.0,
                                        gross_hours: 8.5
                                    },
                                    punches: [
                                        { id: 1, punch_type: "in", punch_time: "2025-12-23T09:00:00" },
                                        { id: 2, punch_type: "out", punch_time: "2025-12-23T13:00:00" },
                                        { id: 3, punch_type: "in", punch_time: "2025-12-23T14:00:00" },
                                        { id: 4, punch_type: "out", punch_time: "2025-12-23T18:00:00" }
                                    ],
                                    punch_pairs: [
                                        {
                                            punch_in: "2025-12-23T09:00:00",
                                            punch_out: "2025-12-23T13:00:00",
                                            hours_worked: 4.0,
                                            punch_in_location: "Office",
                                            punch_out_location: "Office"
                                        },
                                        {
                                            punch_in: "2025-12-23T14:00:00",
                                            punch_out: "2025-12-23T18:00:00",
                                            hours_worked: 4.5
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/attendance/report/employee/{employeeId}": {
            get: {
                summary: "✨ Employee Attendance Report (Manager)",
                description: "Get comprehensive attendance report for specific employee (Manager/Admin only)",
                tags: ["⏰ Attendance"],
                parameters: [
                    { name: "employeeId", in: "path", required: true, schema: { type: "integer" }, example: 5 },
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "month", in: "query", schema: { type: "integer" } },
                    { name: "year", in: "query", schema: { type: "integer" } }
                ],
                responses: {
                    200: {
                        description: "Employee attendance report",
                        content: {
                            "application/json": {
                                example: {
                                    employee: {
                                        id: 5,
                                        employee_number: "EMP005",
                                        name: "John Doe",
                                        email: "john@company.com"
                                    },
                                    summary: {
                                        total_days: 20,
                                        present_days: 18,
                                        total_work_hours: 162.5,
                                        avg_work_hours: 8.13
                                    },
                                    attendance: []
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/attendance/report/details/{employeeId}/{date}": {
            get: {
                summary: "✨ Employee Attendance Details (Manager)",
                description: "Get detailed punch breakdown for employee on specific date (Manager/Admin only)",
                tags: ["⏰ Attendance"],
                parameters: [
                    { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
                    { name: "date", in: "path", required: true, schema: { type: "string", format: "date" } }
                ],
                responses: {
                    200: { description: "Detailed punch history with pairs" }
                }
            }
        },
        "/api/attendance/report/team": {
            get: {
                summary: "✨ Team Attendance Report (Manager)",
                description: "Get attendance for all team members reporting to logged-in manager",
                tags: ["⏰ Attendance"],
                parameters: [{
                    name: "date",
                    in: "query",
                    schema: { type: "string", format: "date" },
                    example: "2025-12-23"
                }],
                responses: {
                    200: {
                        description: "Team attendance summary",
                        content: {
                            "application/json": {
                                example: {
                                    team_members: [
                                        { id: 5, EmployeeNumber: "EMP005", FirstName: "John", LastName: "Doe" }
                                    ],
                                    date: "2025-12-23",
                                    attendance: [
                                        {
                                            employee_id: 5,
                                            EmployeeNumber: "EMP005",
                                            FirstName: "John",
                                            gross_hours: 8.5,
                                            status: "present",
                                            total_punches: 4
                                        }
                                    ],
                                    summary: {
                                        total_team: 10,
                                        present: 8,
                                        absent: 1,
                                        on_leave: 1
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/attendance/report/all": {
            get: {
                summary: "✨ All Attendance Report (Admin)",
                description: "Get company-wide attendance report (Admin/HR only)",
                tags: ["⏰ Attendance"],
                parameters: [
                    { name: "date", in: "query", schema: { type: "string", format: "date" } },
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" } }
                ],
                responses: {
                    200: {
                        description: "Company-wide attendance",
                        content: {
                            "application/json": {
                                example: {
                                    attendance: [],
                                    summary: {
                                        total_records: 50,
                                        present: 45,
                                        absent: 2,
                                        half_day: 1,
                                        on_leave: 2
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        
        // ============ LEAVES & WFH REQUESTS ============
        "/api/leaves/apply": {
            post: {
                summary: "Apply for Leave",
                tags: ["🏖️ Leave Management"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LeaveApplication" }
                        }
                    }
                },
                responses: {
                    200: { description: "Leave applied successfully" }
                }
            }
        },
        "/api/leaves/wfh-request": {
            post: {
                summary: "🆕 Request WFH/Remote Work",
                description: "Submit a request to work from home or remotely for a specific date",
                tags: ["🏖️ Leave Management"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/WFHRequest" }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "WFH request submitted",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        id: { type: "integer" },
                                        success: { type: "boolean" },
                                        message: { type: "string" },
                                        status: { type: "string", example: "pending" }
                                    }
                                }
                            }
                        }
                    },
                    400: { description: "Invalid request or duplicate" }
                }
            }
        },
        "/api/leaves/wfh-requests": {
            get: {
                summary: "🆕 Get My WFH/Remote Requests",
                description: "Get all my WFH and Remote work requests",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: { 
                        description: "List of WFH/Remote requests",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "integer" },
                                            leave_type: { type: "string" },
                                            start_date: { type: "string", format: "date" },
                                            end_date: { type: "string", format: "date" },
                                            reason: { type: "string" },
                                            status: { type: "string" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/wfh-requests/pending": {
            get: {
                summary: "🆕 Get Pending WFH Requests (HR)",
                description: "Get all pending WFH/Remote requests for approval (HR only)",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: { 
                        description: "Pending WFH/Remote requests with employee details"
                    }
                }
            }
        },
        
        // ============ ENHANCED LEAVE MANAGEMENT SYSTEM ============
        "/api/leaves/plans": {
            post: {
                summary: "✨ Create Leave Plan (Admin)",
                description: "Create comprehensive leave plan with multiple leave types and allocations. Supports auto-proration for mid-year joiners.",
                tags: ["🏖️ Leave Management"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string", example: "Standard Plan 2025" },
                                    leave_year_start_month: { type: "integer", example: 1 },
                                    leave_year_start_day: { type: "integer", example: 1 },
                                    description: { type: "string", example: "Standard leave plan for all permanent employees" },
                                    allocations: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                leave_type_id: { type: "integer" },
                                                days_allocated: { type: "number" },
                                                prorate_on_joining: { type: "boolean" }
                                            }
                                        }
                                    }
                                },
                                required: ["name", "allocations"]
                            },
                            example: {
                                name: "Standard Plan 2025",
                                leave_year_start_month: 1,
                                leave_year_start_day: 1,
                                description: "Standard leave allocation for all permanent employees",
                                allocations: [
                                    {
                                        leave_type_id: 1,
                                        days_allocated: 12,
                                        prorate_on_joining: true
                                    },
                                    {
                                        leave_type_id: 2,
                                        days_allocated: 7,
                                        prorate_on_joining: false
                                    }
                                ]
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Leave plan created successfully",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Leave plan created successfully",
                                    planId: 1
                                }
                            }
                        }
                    }
                }
            },
            get: {
                summary: "✨ Get All Leave Plans (Admin)",
                description: "Get list of all leave plans with allocation details and employee counts",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: {
                        description: "List of leave plans",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        id: 1,
                                        plan_name: "Standard Plan 2025",
                                        leave_year_start: "Jan 1",
                                        description: "Standard leave plan",
                                        is_active: true,
                                        total_allocations: 2,
                                        employees_count: 45
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/plans/{id}": {
            get: {
                summary: "✨ Get Leave Plan Details (Admin)",
                description: "Get detailed information about specific leave plan including all allocations",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" },
                    example: 1
                }],
                responses: {
                    200: {
                        description: "Leave plan with allocations",
                        content: {
                            "application/json": {
                                example: {
                                    id: 1,
                                    plan_name: "Standard Plan 2025",
                                    leave_year_start_month: 1,
                                    leave_year_start_day: 1,
                                    description: "Standard plan",
                                    is_active: true,
                                    allocations: [
                                        {
                                            leave_type_id: 1,
                                            leave_type_name: "Casual Leave",
                                            type_code: "CL",
                                            allocated_days: 12,
                                            prorate_on_joining: true
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            put: {
                summary: "✨ Update Leave Plan (Admin)",
                description: "Update leave plan details and allocations",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    allocations: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                leave_type_id: { type: "integer" },
                                                days_allocated: { type: "number" },
                                                prorate_on_joining: { type: "boolean" }
                                            }
                                        }
                                    }
                                }
                            },
                            example: {
                                name: "Updated Standard Plan 2025",
                                description: "Updated description",
                                allocations: [
                                    {
                                        leave_type_id: 1,
                                        days_allocated: 15,
                                        prorate_on_joining: true
                                    }
                                ]
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Plan updated successfully" }
                }
            }
        },
        "/api/leaves/types": {
            post: {
                summary: "✨ Create Leave Type (Admin)",
                description: "Create new leave type with carry forward configuration",
                tags: ["🏖️ Leave Management"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    type_name: { type: "string" },
                                    type_code: { type: "string" },
                                    is_paid: { type: "boolean" },
                                    requires_approval: { type: "boolean" },
                                    can_carry_forward: { type: "boolean" },
                                    max_carry_forward_days: { type: "integer" },
                                    description: { type: "string" }
                                },
                                required: ["type_name", "type_code"]
                            },
                            example: {
                                type_name: "Privilege Leave",
                                type_code: "PL",
                                is_paid: true,
                                requires_approval: true,
                                can_carry_forward: true,
                                max_carry_forward_days: 5,
                                description: "Annual privilege leave with carry forward"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Leave type created",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    id: 5
                                }
                            }
                        }
                    }
                }
            },
            get: {
                summary: "✨ Get All Leave Types",
                description: "Get list of all active leave types with configuration",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: {
                        description: "List of leave types",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        id: 1,
                                        type_name: "Casual Leave",
                                        type_code: "CL",
                                        is_paid: 1,
                                        requires_approval: 1,
                                        can_carry_forward: 0,
                                        max_carry_forward_days: 0
                                    },
                                    {
                                        id: 2,
                                        type_name: "Sick Leave",
                                        type_code: "SL",
                                        is_paid: 1,
                                        requires_approval: 0,
                                        can_carry_forward: 1,
                                        max_carry_forward_days: 3
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/types/{id}": {
            put: {
                summary: "✨ Update Leave Type (Admin)",
                description: "Update leave type configuration",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    type_name: { type: "string" },
                                    type_code: { type: "string" },
                                    description: { type: "string" },
                                    is_paid: { type: "boolean" },
                                    requires_approval: { type: "boolean" },
                                    can_carry_forward: { type: "boolean" },
                                    max_carry_forward_days: { type: "integer" }
                                }
                            },
                            example: {
                                type_name: "Updated Casual Leave",
                                can_carry_forward: true,
                                max_carry_forward_days: 2
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Leave type updated",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Leave type updated successfully"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/initialize-balance/{employeeId}": {
            post: {
                summary: "✨ Initialize Employee Leave Balance (Admin)",
                description: "Initialize leave balances for employee based on their leave plan. Auto-prorates for mid-year joiners based on joining date.",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "employeeId",
                    in: "path",
                    required: true,
                    schema: { type: "integer" },
                    example: 5
                }],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    leave_plan_id: { type: "integer" },
                                    leave_year: { type: "integer" }
                                }
                            },
                            example: {
                                leave_plan_id: 1,
                                leave_year: 2025
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Leave balances initialized with auto-proration",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Leave balances initialized successfully",
                                    balances: [
                                        {
                                            leave_type: "Casual Leave",
                                            allocated_days: 9,
                                            note: "Prorated based on joining date (July 1)"
                                        },
                                        {
                                            leave_type: "Sick Leave",
                                            allocated_days: 7,
                                            note: "Full allocation (no proration)"
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/balance": {
            get: {
                summary: "✨ Get My Leave Balance",
                description: "Get current leave balance for logged-in employee with breakdown: allocated + carry_forward - used = available",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "leave_year",
                    in: "query",
                    schema: { type: "integer" },
                    example: 2025
                }],
                responses: {
                    200: {
                        description: "Leave balance by type",
                        content: {
                            "application/json": {
                                example: {
                                    employee_id: 5,
                                    leave_year: 2025,
                                    balances: [
                                        {
                                            leave_type_id: 1,
                                            leave_type_name: "Casual Leave",
                                            type_code: "CL",
                                            allocated_days: 12,
                                            carry_forward_days: 2,
                                            used_days: 5,
                                            available_days: 9
                                        },
                                        {
                                            leave_type_id: 2,
                                            leave_type_name: "Sick Leave",
                                            type_code: "SL",
                                            allocated_days: 7,
                                            carry_forward_days: 0,
                                            used_days: 3,
                                            available_days: 4
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/balance/{employeeId}": {
            get: {
                summary: "✨ Get Employee Leave Balance (Manager/Admin)",
                description: "Get leave balance for specific employee (Manager/Admin only)",
                tags: ["🏖️ Leave Management"],
                parameters: [
                    {
                        name: "employeeId",
                        in: "path",
                        required: true,
                        schema: { type: "integer" }
                    },
                    {
                        name: "leave_year",
                        in: "query",
                        schema: { type: "integer" }
                    }
                ],
                responses: {
                    200: { description: "Employee leave balance" }
                }
            }
        },
        "/api/leaves/apply": {
            post: {
                summary: "✨ Apply for Leave (Enhanced with Balance Check)",
                description: "Apply for leave with automatic balance validation. System checks available days before submission.",
                tags: ["🏖️ Leave Management"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    leave_type_id: { type: "integer" },
                                    start_date: { type: "string", format: "date" },
                                    end_date: { type: "string", format: "date" },
                                    total_days: { type: "number" },
                                    reason: { type: "string" }
                                },
                                required: ["leave_type_id", "start_date", "end_date", "total_days", "reason"]
                            },
                            example: {
                                leave_type_id: 1,
                                start_date: "2025-12-25",
                                end_date: "2025-12-27",
                                total_days: 3,
                                reason: "Family function"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Leave applied successfully",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    leaveId: 15,
                                    message: "Leave application submitted successfully"
                                }
                            }
                        }
                    },
                    400: {
                        description: "Insufficient leave balance",
                        content: {
                            "application/json": {
                                example: {
                                    success: false,
                                    message: "Insufficient leave balance. Available: 2 days, Requested: 3 days"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/approve/{leaveId}": {
            put: {
                summary: "✨ Approve Leave (Auto-deduct from Balance)",
                description: "Approve leave and automatically deduct days from employee balance",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "leaveId",
                    in: "path",
                    required: true,
                    schema: { type: "integer" },
                    example: 15
                }],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    remarks: { type: "string" }
                                }
                            },
                            example: {
                                remarks: "Approved by manager"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Leave approved and balance updated",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Leave approved successfully. 3 days deducted from balance.",
                                    remaining_balance: 6
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/reject/{leaveId}": {
            put: {
                summary: "✨ Reject Leave (With Reason)",
                description: "Reject leave application with mandatory rejection reason",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "leaveId",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    rejection_reason: { type: "string" }
                                },
                                required: ["rejection_reason"]
                            },
                            example: {
                                rejection_reason: "Team capacity insufficient during this period"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Leave rejected",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Leave rejected successfully"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/pending": {
            get: {
                summary: "✨ Get Pending Leave Approvals (Manager/Admin)",
                description: "Get all pending leave requests with employee details and balance information",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: {
                        description: "Pending leave requests",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        leave_id: 15,
                                        employee_id: 5,
                                        employee_name: "John Doe",
                                        leave_type_name: "Casual Leave",
                                        type_code: "CL",
                                        start_date: "2025-12-25",
                                        end_date: "2025-12-27",
                                        total_days: 3,
                                        reason: "Family function",
                                        available_balance: 9,
                                        applied_date: "2025-12-20"
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        "/api/leaves/my-leaves": {
            get: {
                summary: "✨ Get My Leave History",
                description: "Get my complete leave history with status and balance impact",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "leave_year",
                    in: "query",
                    schema: { type: "integer" }
                }],
                responses: {
                    200: {
                        description: "Leave history",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        id: 15,
                                        leave_type_name: "Casual Leave",
                                        start_date: "2025-12-25",
                                        end_date: "2025-12-27",
                                        total_days: 3,
                                        status: "approved",
                                        applied_date: "2025-12-20",
                                        approved_date: "2025-12-21"
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        
        // ============ PAYROLL ============
        "/api/payroll/generate": {
            post: {
                summary: "Generate Payroll (Admin)",
                tags: ["💰 Payroll"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["month", "year"],
                                properties: {
                                    month: { type: "integer", example: 12, description: "Month (1-12)" },
                                    year: { type: "integer", example: 2025, description: "Year" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Payroll generated" }
                }
            }
        },
        "/api/payroll/runs": {
            get: {
                summary: "Get Payroll Runs (HR)",
                tags: ["💰 Payroll"],
                responses: {
                    200: { description: "List of payroll runs" }
                }
            }
        },
        "/api/payroll/slips/employee/{employee_id}": {
            get: {
                summary: "Get My Salary Slips",
                tags: ["💰 Payroll"],
                parameters: [{
                    name: "employee_id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Salary slips" }
                }
            }
        },
        "/api/payroll/salary/structure/{empId}": {
            get: {
                summary: "Get Salary Structure",
                tags: ["💰 Payroll"],
                parameters: [{
                    name: "empId",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Salary structure" }
                }
            },
            post: {
                summary: "Create Salary Structure (Admin)",
                tags: ["💰 Payroll"],
                parameters: [{
                    name: "empId",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["basic", "hra"],
                                properties: {
                                    basic: { type: "number", example: 25000, description: "Basic salary" },
                                    hra: { type: "number", example: 10000, description: "House Rent Allowance" },
                                    conveyance: { type: "number", example: 1600, description: "Conveyance allowance" },
                                    special_allowance: { type: "number", example: 15000, description: "Special allowance" },
                                    pf: { type: "number", example: 1800, description: "Provident Fund deduction" },
                                    esi: { type: "number", example: 750, description: "ESI deduction" },
                                    professional_tax: { type: "number", example: 200, description: "Professional tax" },
                                    other_deductions: { type: "number", example: 0, description: "Other deductions" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Structure created" }
                }
            }
        },
        
        // ============ ENHANCED TIMESHEETS ============
        "/api/timesheets/assignment-status": {
            get: {
                summary: "✨ Check Project Assignment Status",
                description: "Check if employee is assigned to projects (determines timesheet type: regular or project-based)",
                tags: ["📝 Timesheets"],
                responses: {
                    200: {
                        description: "Assignment status",
                        content: {
                            "application/json": {
                                example: {
                                    has_project: true,
                                    timesheet_type: "project_based",
                                    assignments: [
                                        {
                                            project_id: 1,
                                            project_name: "Client Portal",
                                            client_name: "ABC Corp",
                                            shift_name: "General Shift",
                                            daily_hours: 8
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/timesheets/regular/submit": {
            post: {
                summary: "✨ Submit Regular Timesheet (Non-Project Employees)",
                description: "Submit hourly timesheet based on shift timings for employees not assigned to projects",
                tags: ["📝 Timesheets"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    date: { type: "string", format: "date" },
                                    hours_breakdown: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                hour: { type: "string", example: "09:00-10:00" },
                                                task: { type: "string", example: "Development" },
                                                hours: { type: "number", example: 1 }
                                            }
                                        }
                                    },
                                    total_hours: { type: "number" },
                                    notes: { type: "string" }
                                },
                                required: ["date", "hours_breakdown", "total_hours"]
                            },
                            example: {
                                date: "2025-12-23",
                                hours_breakdown: [
                                    { hour: "09:00-10:00", task: "Development", hours: 1 },
                                    { hour: "10:00-12:00", task: "Testing", hours: 2 },
                                    { hour: "13:00-17:00", task: "Code Review", hours: 4 }
                                ],
                                total_hours: 7,
                                notes: "Regular work day"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Timesheet submitted",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Regular timesheet submitted successfully",
                                    timesheet_id: 15
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/timesheets/regular/my-timesheets": {
            get: {
                summary: "✨ Get My Regular Timesheets",
                description: "Get regular timesheets with filters",
                tags: ["📝 Timesheets"],
                parameters: [
                    { name: "start_date", in: "query", schema: { type: "string", format: "date" } },
                    { name: "end_date", in: "query", schema: { type: "string", format: "date" } },
                    { name: "month", in: "query", schema: { type: "integer" } },
                    { name: "year", in: "query", schema: { type: "integer" } }
                ],
                responses: {
                    200: { description: "Regular timesheets list" }
                }
            }
        },
        "/api/timesheets/project/submit": {
            post: {
                summary: "✨ Submit Project Timesheet",
                description: "Submit hourly timesheet for project work based on project shift timings",
                tags: ["📝 Timesheets"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    date: { type: "string", format: "date" },
                                    project_id: { type: "integer" },
                                    hours_breakdown: { type: "array" },
                                    total_hours: { type: "number" },
                                    work_description: { type: "string" },
                                    notes: { type: "string" }
                                },
                                required: ["date", "project_id", "hours_breakdown", "total_hours", "work_description"]
                            },
                            example: {
                                date: "2025-12-23",
                                project_id: 1,
                                hours_breakdown: [
                                    { hour: "09:00-12:00", task: "Feature Development", hours: 3 },
                                    { hour: "13:00-17:00", task: "Bug Fixes", hours: 4 }
                                ],
                                total_hours: 7,
                                work_description: "Implemented user authentication module",
                                notes: "Completed ahead of schedule"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Project timesheet submitted",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Project timesheet submitted successfully",
                                    timesheet_id: 20
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/timesheets/project/my-timesheets": {
            get: {
                summary: "✨ Get My Project Timesheets",
                description: "Get project timesheets with filters",
                tags: ["📝 Timesheets"],
                parameters: [
                    { name: "project_id", in: "query", schema: { type: "integer" } },
                    { name: "start_date", in: "query", schema: { type: "string", format: "date" } },
                    { name: "end_date", in: "query", schema: { type: "string", format: "date" } },
                    { name: "month", in: "query", schema: { type: "integer" } },
                    { name: "year", in: "query", schema: { type: "integer" } }
                ],
                responses: {
                    200: { description: "Project timesheets list" }
                }
            }
        },
        "/api/timesheets/client-timesheet/upload": {
            post: {
                summary: "✨ Upload Client Timesheet (End of Month)",
                description: "Upload client-provided timesheet for validation against internal timesheets",
                tags: ["📝 Timesheets"],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    file: { type: "string", format: "binary" },
                                    month: { type: "integer" },
                                    year: { type: "integer" },
                                    project_id: { type: "integer" }
                                },
                                required: ["file", "month", "year", "project_id"]
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Client timesheet uploaded",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Client timesheet uploaded successfully",
                                    file_path: "uploads/client_timesheets/...",
                                    timesheets_updated: 22
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/timesheets/client-timesheet/status": {
            get: {
                summary: "✨ Get Client Timesheet Status",
                description: "Check client timesheet upload and validation status",
                tags: ["📝 Timesheets"],
                parameters: [
                    { name: "month", in: "query", required: true, schema: { type: "integer" } },
                    { name: "year", in: "query", required: true, schema: { type: "integer" } }
                ],
                responses: {
                    200: {
                        description: "Client timesheet status",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        project_id: 1,
                                        project_name: "Client Portal",
                                        client_name: "ABC Corp",
                                        total_days: 22,
                                        total_hours: 176,
                                        client_file: "uploads/...",
                                        upload_date: "2025-12-31",
                                        validation_status: "validated"
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        "/api/timesheets/admin/pending-validation": {
            get: {
                summary: "✨ Get Timesheets Pending Validation (Admin)",
                description: "Get all timesheets with client timesheets uploaded but pending validation",
                tags: ["📝 Timesheets"],
                parameters: [
                    { name: "month", in: "query", schema: { type: "integer" } },
                    { name: "year", in: "query", schema: { type: "integer" } },
                    { name: "project_id", in: "query", schema: { type: "integer" } }
                ],
                responses: {
                    200: {
                        description: "Pending validations list",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        employee_id: 5,
                                        EmployeeNumber: "EMP005",
                                        FirstName: "John",
                                        project_name: "Client Portal",
                                        total_days: 22,
                                        internal_total_hours: 176,
                                        client_file: "uploads/...",
                                        validation_status: "pending_validation"
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        "/api/timesheets/admin/validation-details/{employeeId}/{projectId}/{month}/{year}": {
            get: {
                summary: "✨ Get Validation Details (Admin)",
                description: "Get detailed comparison between internal and client timesheets for validation",
                tags: ["📝 Timesheets"],
                parameters: [
                    { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
                    { name: "projectId", in: "path", required: true, schema: { type: "integer" } },
                    { name: "month", in: "path", required: true, schema: { type: "integer" } },
                    { name: "year", in: "path", required: true, schema: { type: "integer" } }
                ],
                responses: {
                    200: {
                        description: "Validation details with comparison"
                    }
                }
            }
        },
        "/api/timesheets/admin/validate": {
            post: {
                summary: "✨ Validate Timesheets (Admin)",
                description: "Validate or reject timesheets after comparing internal vs client data",
                tags: ["📝 Timesheets"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    employee_id: { type: "integer" },
                                    project_id: { type: "integer" },
                                    month: { type: "integer" },
                                    year: { type: "integer" },
                                    validation_status: { 
                                        type: "string", 
                                        enum: ["validated", "rejected", "mismatch"],
                                        description: "Validation status - validated (approved), rejected (discrepancies found), mismatch (hours don't match)"
                                    },
                                    remarks: { type: "string" },
                                    client_hours: { type: "number" }
                                },
                                required: ["employee_id", "project_id", "month", "year", "validation_status"]
                            },
                            example: {
                                employee_id: 5,
                                project_id: 1,
                                month: 12,
                                year: 2025,
                                validation_status: "validated",
                                remarks: "Hours match perfectly",
                                client_hours: 176
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Validation completed",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Timesheets validated successfully"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/timesheets/admin/validation-stats": {
            get: {
                summary: "✨ Get Validation Statistics (Admin)",
                description: "Get overview statistics of timesheet validations",
                tags: ["📝 Timesheets"],
                parameters: [
                    { name: "month", in: "query", schema: { type: "integer" } },
                    { name: "year", in: "query", schema: { type: "integer" } }
                ],
                responses: {
                    200: {
                        description: "Validation statistics",
                        content: {
                            "application/json": {
                                example: {
                                    total_submissions: 45,
                                    pending: 12,
                                    validated: 30,
                                    rejected: 3
                                }
                            }
                        }
                    }
                }
            }
        },
        
        // ============ REPORTS ============
        "/api/reports/attendance": {
            get: {
                summary: "Attendance Report (HR)",
                tags: ["📊 Reports"],
                responses: {
                    200: { description: "Attendance report" }
                }
            }
        },
        "/api/reports/leave": {
            get: {
                summary: "Leave Report (HR)",
                tags: ["📊 Reports"],
                responses: {
                    200: { description: "Leave report" }
                }
            }
        },
        "/api/reports/payroll": {
            get: {
                summary: "Payroll Report (HR)",
                tags: ["📊 Reports"],
                responses: {
                    200: { description: "Payroll report" }
                }
            }
        },
        "/api/reports/headcount": {
            get: {
                summary: "Headcount Report (HR)",
                tags: ["📊 Reports"],
                responses: {
                    200: { description: "Headcount analysis" }
                }
            }
        },
        
        // ============ MASTER DATA ============
        "/api/locations": {
            get: {
                summary: "Get All Locations",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { 
                        description: "List of locations",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "integer" },
                                            name: { type: "string" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Location (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Mumbai Office" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Location created" }
                }
            }
        },
        "/api/departments": {
            get: {
                summary: "Get All Departments",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of departments" }
                }
            },
            post: {
                summary: "Create Department (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Engineering" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Department created" }
                }
            }
        },
        "/api/designations": {
            get: {
                summary: "Get All Designations",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of designations" }
                }
            },
            post: {
                summary: "Create Designation (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Senior Developer" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Designation created" }
                }
            }
        },
        "/api/business-units": {
            get: {
                summary: "Get All Business Units",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of business units" }
                }
            },
            post: {
                summary: "Create Business Unit (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "IT Services" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Business unit created" }
                }
            }
        },
        "/api/legal-entities": {
            get: {
                summary: "Get All Legal Entities",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of legal entities" }
                }
            },
            post: {
                summary: "Create Legal Entity (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "ABC Technologies Pvt Ltd" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Legal entity created" }
                }
            }
        },
        "/api/cost-centers": {
            get: {
                summary: "Get All Cost Centers",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of cost centers" }
                }
            },
            post: {
                summary: "Create Cost Center (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["code"],
                                properties: {
                                    code: { type: "string", example: "CC001" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Cost center created" }
                }
            }
        },
        "/api/sub-departments": {
            get: {
                summary: "Get All Sub-Departments",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of sub-departments" }
                }
            },
            post: {
                summary: "Create Sub-Department (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Backend Development" },
                                    department_id: { type: "integer", example: 1, description: "Parent department ID" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Sub-department created" }
                }
            }
        },
        "/api/bands": {
            get: {
                summary: "Get All Bands",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of bands" }
                }
            },
            post: {
                summary: "Create Band (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Band A" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Band created" }
                }
            }
        },
        "/api/pay-grades": {
            get: {
                summary: "Get All Pay Grades",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of pay grades" }
                }
            },
            post: {
                summary: "Create Pay Grade (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Grade 1" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Pay grade created" }
                }
            }
        },
        "/api/leave-plans": {
            get: {
                summary: "Get All Leave Plans",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of leave plans" }
                }
            },
            post: {
                summary: "Create Leave Plan (Admin)",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "Leave plan created" }
                }
            }
        },
        "/api/shift-policies": {
            get: {
                summary: "Get All Shift Policies",
                tags: ["🏢 Master Data"],
                description: "Retrieve all shift policies with timing details for regular timesheet creation",
                responses: {
                    200: {
                        description: "List of shift policies",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "integer", example: 1 },
                                            name: { type: "string", example: "Day Shift" },
                                            shift_type: { type: "string", enum: ["general", "night", "rotating", "flexible"], example: "general" },
                                            start_time: { type: "string", format: "time", example: "09:00:00" },
                                            end_time: { type: "string", format: "time", example: "18:00:00" },
                                            break_duration_minutes: { type: "integer", example: 60 },
                                            timezone: { type: "string", example: "UTC" },
                                            description: { type: "string", example: "Standard 9-6 office hours" },
                                            is_active: { type: "integer", example: 1 },
                                            created_at: { type: "string", format: "date-time" },
                                            updated_at: { type: "string", format: "date-time" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Shift Policy (Admin)",
                tags: ["🏢 Master Data"],
                description: "Create a new shift policy with timing details. Used for regular timesheet hourly breakdowns.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "start_time", "end_time"],
                                properties: {
                                    name: { type: "string", example: "Day Shift" },
                                    shift_type: { type: "string", enum: ["general", "night", "rotating", "flexible"], example: "general" },
                                    start_time: { type: "string", format: "time", example: "09:00:00" },
                                    end_time: { type: "string", format: "time", example: "18:00:00" },
                                    break_duration_minutes: { type: "integer", example: 60, description: "Break duration in minutes (default: 60)" },
                                    timezone: { type: "string", example: "Asia/Kolkata", description: "Timezone (default: UTC)" },
                                    description: { type: "string", example: "Standard 9-6 office hours with 1 hour break" },
                                    is_active: { type: "integer", example: 1, description: "1 for active, 0 for inactive" }
                                }
                            },
                            examples: {
                                dayShift: {
                                    summary: "Day Shift Example",
                                    value: {
                                        name: "Day Shift",
                                        shift_type: "general",
                                        start_time: "09:00:00",
                                        end_time: "18:00:00",
                                        break_duration_minutes: 60,
                                        timezone: "Asia/Kolkata",
                                        description: "Standard 9-6 office hours",
                                        is_active: 1
                                    }
                                },
                                nightShift: {
                                    summary: "Night Shift Example",
                                    value: {
                                        name: "Night Shift",
                                        shift_type: "night",
                                        start_time: "21:00:00",
                                        end_time: "06:00:00",
                                        break_duration_minutes: 60,
                                        timezone: "UTC",
                                        description: "Night shift for 24/7 operations",
                                        is_active: 1
                                    }
                                },
                                flexibleShift: {
                                    summary: "Flexible Shift Example",
                                    value: {
                                        name: "Flexible Hours",
                                        shift_type: "flexible",
                                        start_time: "10:00:00",
                                        end_time: "19:00:00",
                                        break_duration_minutes: 60,
                                        timezone: "Asia/Kolkata",
                                        description: "Flexible working hours",
                                        is_active: 1
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Shift policy created", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, id: { type: "integer" } } } } } },
                    400: { description: "Invalid input - missing required fields" },
                    500: { description: "Server error" }
                }
            }
        },
        "/api/shift-policies/{id}": {
            put: {
                summary: "Update Shift Policy (Admin)",
                tags: ["🏢 Master Data"],
                description: "Update an existing shift policy. All fields are optional.",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer" },
                        description: "Shift Policy ID"
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    shift_type: { type: "string", enum: ["general", "night", "rotating", "flexible"] },
                                    start_time: { type: "string", format: "time" },
                                    end_time: { type: "string", format: "time" },
                                    break_duration_minutes: { type: "integer" },
                                    timezone: { type: "string" },
                                    description: { type: "string" },
                                    is_active: { type: "integer" }
                                }
                            },
                            example: {
                                start_time: "09:30:00",
                                end_time: "18:30:00",
                                description: "Updated timing"
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Shift policy updated" },
                    400: { description: "No fields to update" },
                    500: { description: "Server error" }
                }
            }
        },
        "/api/weekly-off-policies": {
            get: {
                summary: "Get All Weekly Off Policies",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of weekly off policies" }
                }
            },
            post: {
                summary: "Create Weekly Off Policy (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "5 Day Week (Sat-Sun Off)" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Weekly off policy created" }
                }
            }
        },
        "/api/attendance-policies": {
            get: {
                summary: "Get All Attendance Policies",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of attendance policies" }
                }
            },
            post: {
                summary: "Create Attendance Policy (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Standard Attendance Policy" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Attendance policy created" }
                }
            }
        },
        "/api/attendance-capture-schemes": {
            get: {
                summary: "Get All Attendance Capture Schemes",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of attendance capture schemes" }
                }
            },
            post: {
                summary: "Create Attendance Capture Scheme (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Biometric + Web Punch" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Attendance capture scheme created" }
                }
            }
        },
        "/api/holiday-lists": {
            get: {
                summary: "Get All Holiday Lists",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of holiday lists" }
                }
            },
            post: {
                summary: "Create Holiday List (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "India Holidays 2025" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Holiday list created" }
                }
            }
        },
        "/api/expense-policies": {
            get: {
                summary: "Get All Expense Policies",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "List of expense policies" }
                }
            },
            post: {
                summary: "Create Expense Policy (Admin)",
                tags: ["🏢 Master Data"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", example: "Travel & Expense Policy 2025" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Expense policy created" }
                }
            }
        },
        
        // ============ UPLOADS ============
        "/api/upload/employees": {
            post: {
                summary: "Bulk Upload Employees (Admin)",
                description: "Upload Excel file with employee data. Supports both insert and update operations.",
                tags: ["📤 Upload"],
                requestBody: {
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["file"],
                                properties: {
                                    file: { 
                                        type: "string", 
                                        format: "binary",
                                        description: "Excel file (.xlsx or .xls) with employee data"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "Employees uploaded successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        processed: { type: "integer" },
                                        inserted: { type: "integer" },
                                        updated: { type: "integer" },
                                        skipped: { type: "integer" },
                                        errors: { type: "array", items: { type: "string" } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/upload/holidays": {
            post: {
                summary: "Bulk Upload Holidays (Admin)",
                description: "Upload Excel file with holiday data",
                tags: ["📤 Upload"],
                requestBody: {
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["file"],
                                properties: {
                                    file: { 
                                        type: "string", 
                                        format: "binary",
                                        description: "Excel file with holiday data"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "Holidays uploaded successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        processed: { type: "integer" },
                                        inserted: { type: "integer" },
                                        updated: { type: "integer" },
                                        skipped: { type: "integer" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/upload/payroll": {
            post: {
                summary: "Bulk Upload Payroll (Admin)",
                description: "Upload Excel file with payroll data to generate salary slips for multiple employees at once",
                tags: ["📤 Upload"],
                requestBody: {
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["file"],
                                properties: {
                                    file: { 
                                        type: "string", 
                                        format: "binary",
                                        description: "Excel file with payroll data (EmployeeNumber, basic, hra, conveyance, special_allowance, pf, esi, etc.)"
                                    },
                                    month: { 
                                        type: "integer", 
                                        example: 12,
                                        description: "Payroll month (1-12)"
                                    },
                                    year: { 
                                        type: "integer", 
                                        example: 2025,
                                        description: "Payroll year"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "Payroll uploaded and processed successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        run_id: { type: "integer", description: "Created payroll run ID" },
                                        processed: { type: "integer" },
                                        inserted: { type: "integer" },
                                        skipped: { type: "integer" },
                                        errors: { type: "array", items: { type: "string" } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        
        // ============ HOLIDAYS ============
        "/api/holidays": {
            get: {
                summary: "Get All Holidays",
                tags: ["🎉 Holidays"],
                responses: {
                    200: { description: "List of holidays" }
                }
            }
        },
        "/api/holidays/upcoming": {
            get: {
                summary: "Get Upcoming Holidays",
                tags: ["🎉 Holidays"],
                responses: {
                    200: { description: "Upcoming holidays" }
                }
            }
        },
        
        // ============ ANNOUNCEMENTS ============
        "/api/announcements": {
            get: {
                summary: "Get Announcements",
                tags: ["📢 Announcements"],
                responses: {
                    200: { description: "List of announcements" }
                }
            },
            post: {
                summary: "Create Announcement (Admin)",
                tags: ["📢 Announcements"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["title", "body"],
                                properties: {
                                    title: { type: "string", example: "Company Holiday Notice" },
                                    body: { type: "string", example: "Office will be closed on Dec 25th for Christmas" },
                                    starts_at: { type: "string", format: "date-time", example: "2025-12-23T00:00:00Z" },
                                    ends_at: { type: "string", format: "date-time", example: "2025-12-26T23:59:59Z" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Announcement created" }
                }
            }
        },
        
        // ============ SUPPORT ============
        "/api/support": {
            get: {
                summary: "Get All Tickets",
                tags: ["🎫 Support"],
                responses: {
                    200: { description: "Support tickets" }
                }
            },
            post: {
                summary: "Create Support Ticket",
                tags: ["🎫 Support"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["subject", "message"],
                                properties: {
                                    subject: { type: "string", example: "Unable to access payroll" },
                                    message: { type: "string", example: "I am getting an error when trying to view my payslip for December 2025" },
                                    priority: { 
                                        type: "string", 
                                        enum: ["Low", "Medium", "High", "Critical"],
                                        default: "Medium",
                                        example: "High" 
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Ticket created", content: { "application/json": { example: { success: true, ticket_id: 15 } } } }
                }
            }
        },
        "/api/support/my": {
            get: {
                summary: "Get My Tickets",
                tags: ["🎫 Support"],
                responses: {
                    200: { description: "My tickets" }
                }
            }
        },
        
        // ============ BIRTHDAYS ============
        "/api/birthdays": {
            get: {
                summary: "Get Today's Birthdays",
                tags: ["🎂 Birthdays"],
                responses: {
                    200: { description: "Today's birthdays" }
                }
            }
        },
        "/api/birthdays/wishes": {
            post: {
                summary: "Send Birthday Wish",
                tags: ["🎂 Birthdays"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["employee_id", "message"],
                                properties: {
                                    employee_id: { type: "integer", example: 5 },
                                    message: { type: "string", example: "Happy Birthday! Wishing you a wonderful year ahead!" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Wish sent", content: { "application/json": { example: { success: true, message: "Birthday wish sent successfully" } } } }
                }
            }
        },
        
        // ============ NOTIFICATIONS ============
        "/api/notifications": {
            get: {
                summary: "Get My Notifications",
                tags: ["🔔 Notifications"],
                responses: {
                    200: { description: "Notifications" }
                }
            }
        },
        "/api/notifications/mark-read/{id}": {
            post: {
                summary: "Mark Notification as Read",
                tags: ["🔔 Notifications"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" },
                    description: "Notification ID"
                }],
                responses: {
                    200: { description: "Notification marked as read" }
                }
            }
        },
        "/api/notifications/unread/count": {
            get: {
                summary: "Get Unread Count",
                tags: ["🔔 Notifications"],
                responses: {
                    200: { description: "Unread notification count" }
                }
            }
        },
        
        // ============ CANDIDATES & PRE-ONBOARDING ============
        "/api/candidates": {
            get: {
                summary: "Get All Candidates",
                description: "Retrieve list of all candidates with optional filters (status, joining date, department)",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [
                    { name: "status", in: "query", schema: { type: "string", enum: ["offered", "offer_accepted", "offer_declined", "documents_pending", "bgv_initiated", "bgv_completed", "ready_to_join", "joined", "dropped_out"] }, description: "Filter by candidate status" },
                    { name: "joining_date_from", in: "query", schema: { type: "string", format: "date" }, description: "Filter by joining date from" },
                    { name: "joining_date_to", in: "query", schema: { type: "string", format: "date" }, description: "Filter by joining date to" },
                    { name: "department_id", in: "query", schema: { type: "integer" }, description: "Filter by department" }
                ],
                responses: {
                    200: {
                        description: "List of candidates with department, designation, and location details",
                        content: {
                            "application/json": {
                                example: [
                                    { 
                                        id: 1, 
                                        candidate_id: "CAN001", 
                                        full_name: "Alice Johnson", 
                                        email: "alice@example.com", 
                                        position: "Software Engineer", 
                                        status: "offer_accepted", 
                                        joining_date: "2024-03-01",
                                        department_name: "Engineering",
                                        designation_name: "Senior Developer"
                                    }
                                ]
                            }
                        }
                    },
                    401: { description: "Unauthorized - HR access required" }
                }
            },
            post: {
                summary: "Create Candidate",
                description: "Add new candidate to the pre-onboarding pipeline (HR only)",
                tags: ["🎯 Candidates & Pre-onboarding"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["first_name", "last_name", "email", "position"],
                                properties: {
                                    first_name: { type: "string", example: "Alice" },
                                    middle_name: { type: "string", example: "" },
                                    last_name: { type: "string", example: "Johnson" },
                                    full_name: { type: "string", example: "Alice Johnson", description: "Auto-generated if not provided" },
                                    email: { type: "string", format: "email", example: "alice@example.com" },
                                    phone: { type: "string", example: "1234567890" },
                                    alternate_phone: { type: "string", example: "0987654321" },
                                    date_of_birth: { type: "string", format: "date", example: "1995-05-15" },
                                    gender: { type: "string", enum: ["Male", "Female", "Other"], example: "Female" },
                                    position: { type: "string", example: "Software Engineer" },
                                    designation_id: { type: "integer", example: 5 },
                                    department_id: { type: "integer", example: 2 },
                                    location_id: { type: "integer", example: 1 },
                                    offered_ctc: { type: "number", example: 800000 },
                                    joining_date: { type: "string", format: "date", example: "2024-03-01" },
                                    reporting_manager_id: { type: "integer", example: 10 },
                                    recruiter_name: { type: "string", example: "John HR" },
                                    recruitment_source: { type: "string", example: "LinkedIn" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Candidate created successfully",
                        content: { 
                            "application/json": { 
                                example: { 
                                    success: true, 
                                    candidate_id: 1, 
                                    message: "Candidate created successfully" 
                                } 
                            } 
                        }
                    },
                    401: { description: "Unauthorized - HR access required" }
                }
            }
        },
        "/api/candidates/{id}": {
            get: {
                summary: "Get Candidate Details",
                description: "Retrieve comprehensive candidate details including documents, task progress, and completion percentage",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Candidate ID" }],
                responses: {
                    200: {
                        description: "Complete candidate information",
                        content: {
                            "application/json": {
                                example: {
                                    candidate: { 
                                        id: 1, 
                                        candidate_id: "CAN001",
                                        full_name: "Alice Johnson", 
                                        email: "alice@example.com",
                                        status: "offer_accepted",
                                        joining_date: "2024-03-01",
                                        offered_ctc: 800000,
                                        bgv_status: "not_started",
                                        documents_submitted: 1,
                                        documents_verified: 0
                                    },
                                    documents: [
                                        { id: 1, document_type: "resume", document_name: "resume.pdf", verified: 0, uploaded_date: "2024-01-15" }
                                    ],
                                    tasks: [
                                        { id: 1, task_name: "Upload Photo", status: "completed", completed_date: "2024-01-16" },
                                        { id: 2, task_name: "Upload Resume", status: "in_progress" }
                                    ],
                                    completion_percentage: "50.00"
                                }
                            }
                        }
                    },
                    404: { description: "Candidate not found" }
                }
            },
            put: {
                summary: "Update Candidate",
                description: "Update candidate information (HR only)",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { 
                        "application/json": { 
                            example: { 
                                phone: "9876543210", 
                                joining_date: "2024-03-15",
                                status: "ready_to_join"
                            } 
                        } 
                    }
                },
                responses: {
                    200: { 
                        description: "Candidate updated", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Candidate updated successfully" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/{id}/send-offer": {
            post: {
                summary: "Send Offer Letter",
                description: "Mark offer letter as sent to candidate (HR only)",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { 
                        description: "Offer sent", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Offer letter sent" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/{id}/accept-offer": {
            post: {
                summary: "Accept Offer (Candidate Action)",
                description: "Candidate accepts the offer. Auto-assigns all pre-onboarding tasks with auto_assign=1. No authentication required - can be called from candidate portal.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                security: [],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { 
                        description: "Offer accepted and tasks assigned", 
                        content: { 
                            "application/json": { 
                                example: { 
                                    success: true, 
                                    message: "Offer accepted, pre-onboarding tasks assigned" 
                                } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/{id}/decline-offer": {
            post: {
                summary: "Decline Offer (Candidate Action)",
                description: "Candidate declines the offer. No authentication required.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                security: [],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { 
                        "application/json": { 
                            schema: {
                                type: "object",
                                required: ["reason"],
                                properties: {
                                    reason: { type: "string", example: "Accepted another offer" }
                                }
                            }
                        } 
                    }
                },
                responses: {
                    200: { 
                        description: "Offer declined", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Offer declined" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/{id}/documents": {
            post: {
                summary: "Upload Candidate Document",
                description: "Upload document for candidate verification (photo, resume, id_proof, address_proof, education_certificate, etc.)",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["file", "document_type"],
                                properties: {
                                    file: { type: "string", format: "binary", description: "Document file" },
                                    document_type: { 
                                        type: "string", 
                                        enum: ["photo", "resume", "offer_letter", "id_proof", "address_proof", "pan_card", "aadhar_card", "education_certificate", "experience_certificate", "relieving_letter", "salary_slip", "bank_passbook", "cancelled_cheque", "other"],
                                        example: "resume"
                                    },
                                    required: { type: "integer", enum: [0, 1], example: 1, description: "Is this document mandatory?" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "Document uploaded", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Document uploaded successfully" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/documents/{docId}/verify": {
            put: {
                summary: "Verify Document (HR)",
                description: "HR verifies submitted candidate document",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "docId", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { 
                        "application/json": { 
                            schema: {
                                type: "object",
                                properties: {
                                    remarks: { type: "string", example: "Document verified successfully" }
                                }
                            }
                        } 
                    }
                },
                responses: {
                    200: { 
                        description: "Document verified", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Document verified" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/{id}/bgv/initiate": {
            post: {
                summary: "Initiate Background Verification (HR)",
                description: "Start BGV process for candidate",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { 
                        description: "BGV initiated", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "BGV initiated" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/{id}/bgv/status": {
            put: {
                summary: "Update BGV Status (HR)",
                description: "Update background verification status (not_started, initiated, in_progress, completed, failed)",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { 
                        "application/json": { 
                            schema: {
                                type: "object",
                                required: ["bgv_status"],
                                properties: {
                                    bgv_status: { 
                                        type: "string", 
                                        enum: ["not_started", "initiated", "in_progress", "completed", "failed"],
                                        example: "completed" 
                                    },
                                    remarks: { type: "string", example: "All checks passed successfully" }
                                }
                            }
                        } 
                    }
                },
                responses: {
                    200: { 
                        description: "BGV status updated", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "BGV status updated" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/{id}/convert-to-employee": {
            post: {
                summary: "Convert Candidate to Employee (HR)",
                description: "Convert candidate to employee after completing pre-onboarding. Auto-creates employee record, user account (password: welcome123), and assigns onboarding steps.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    content: { 
                        "application/json": { 
                            schema: {
                                type: "object",
                                properties: {
                                    employee_number: { type: "string", example: "EMP12345", description: "Optional - auto-generated if not provided" }
                                }
                            }
                        } 
                    }
                },
                responses: {
                    200: { 
                        description: "Candidate converted successfully", 
                        content: { 
                            "application/json": { 
                                example: { 
                                    success: true, 
                                    employee_id: 100, 
                                    message: "Candidate converted to employee successfully" 
                                } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/stats/dashboard": {
            get: {
                summary: "Candidate Dashboard Statistics (HR)",
                description: "Get statistics for candidate pipeline (last 6 months)",
                tags: ["🎯 Candidates & Pre-onboarding"],
                responses: {
                    200: {
                        description: "Dashboard statistics",
                        content: {
                            "application/json": {
                                example: {
                                    total_candidates: 50,
                                    offered: 15,
                                    offer_accepted: 20,
                                    in_bgv: 10,
                                    ready_to_join: 3,
                                    joined: 2,
                                    declined_dropped: 0
                                }
                            }
                        }
                    }
                }
            }
        },
        
        // ============ PRE-ONBOARDING TASKS ============
        "/api/preonboarding/tasks": {
            get: {
                summary: "Get Pre-onboarding Task Templates",
                description: "Retrieve all pre-onboarding task templates ordered by task_order",
                tags: ["🎯 Candidates & Pre-onboarding"],
                responses: {
                    200: {
                        description: "List of task templates",
                        content: {
                            "application/json": {
                                example: [
                                    { 
                                        id: 1, 
                                        task_name: "Upload Photo", 
                                        description: "Upload passport size photograph",
                                        task_category: "document_submission", 
                                        is_mandatory: 1, 
                                        task_order: 1,
                                        auto_assign: 1,
                                        assigned_to_role: "candidate"
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Pre-onboarding Task Template (HR)",
                description: "Create new pre-onboarding task template",
                tags: ["🎯 Candidates & Pre-onboarding"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["task_name", "task_category"],
                                properties: {
                                    task_name: { type: "string", example: "Upload Passport" },
                                    description: { type: "string", example: "Upload passport copy for international travel" },
                                    task_category: { 
                                        type: "string", 
                                        enum: ["document_submission", "form_filling", "verification", "system_setup", "other"],
                                        example: "document_submission" 
                                    },
                                    is_mandatory: { type: "integer", enum: [0, 1], example: 0 },
                                    task_order: { type: "integer", example: 20 },
                                    auto_assign: { type: "integer", enum: [0, 1], example: 1, description: "Auto-assign when offer is accepted?" },
                                    assigned_to_role: { 
                                        type: "string", 
                                        enum: ["candidate", "hr", "manager", "admin"],
                                        example: "candidate" 
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "Task created", 
                        content: { 
                            "application/json": { 
                                example: { 
                                    success: true, 
                                    task_id: 10, 
                                    message: "Pre-onboarding task created" 
                                } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/preonboarding/tasks/{id}": {
            put: {
                summary: "Update Task Template (HR)",
                description: "Update pre-onboarding task template",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { 
                        "application/json": { 
                            example: { 
                                task_name: "Upload Passport (Updated)", 
                                is_mandatory: 1 
                            } 
                        } 
                    }
                },
                responses: {
                    200: { 
                        description: "Task updated", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Task template updated" } 
                            } 
                        } 
                    }
                }
            },
            delete: {
                summary: "Delete Task Template (Admin)",
                description: "Delete pre-onboarding task template",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { 
                        description: "Task deleted", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Task template deleted" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/preonboarding/assign/{candidateId}": {
            post: {
                summary: "Assign Tasks to Candidate (HR)",
                description: "Assign specific pre-onboarding tasks to a candidate. If task_ids is empty, assigns all auto-assign tasks.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "candidateId", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    content: { 
                        "application/json": { 
                            schema: {
                                type: "object",
                                properties: {
                                    task_ids: { 
                                        type: "array", 
                                        items: { type: "integer" },
                                        example: [1, 2, 3],
                                        description: "Array of task IDs to assign. Leave empty to assign all auto-assign tasks."
                                    }
                                }
                            }
                        } 
                    }
                },
                responses: {
                    200: { 
                        description: "Tasks assigned", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Tasks assigned to candidate" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/preonboarding/progress/{candidateId}": {
            get: {
                summary: "Get Candidate Task Progress",
                description: "Retrieve candidate's pre-onboarding task progress with completion statistics",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "candidateId", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: {
                        description: "Task progress with statistics",
                        content: {
                            "application/json": {
                                example: {
                                    tasks: [
                                        { 
                                            id: 1, 
                                            task_name: "Upload Photo", 
                                            description: "Upload passport size photograph",
                                            task_category: "document_submission",
                                            is_mandatory: 1,
                                            status: "completed",
                                            assigned_date: "2024-01-15",
                                            completed_date: "2024-01-16"
                                        },
                                        {
                                            id: 2,
                                            task_name: "Upload Resume",
                                            status: "in_progress"
                                        }
                                    ],
                                    stats: { 
                                        total: 10, 
                                        completed: 6, 
                                        pending: 4, 
                                        completion_percentage: "60.00" 
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/preonboarding/progress/{progressId}": {
            put: {
                summary: "Update Task Progress",
                description: "Update specific task progress status (not_started, in_progress, completed, blocked, skipped)",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "progressId", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { 
                        "application/json": { 
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: { 
                                        type: "string", 
                                        enum: ["not_started", "in_progress", "completed", "blocked", "skipped"],
                                        example: "completed" 
                                    },
                                    remarks: { type: "string", example: "Document uploaded successfully" }
                                }
                            }
                        } 
                    }
                },
                responses: {
                    200: { 
                        description: "Progress updated", 
                        content: { 
                            "application/json": { 
                                example: { success: true, message: "Task progress updated" } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/preonboarding/tasks/setup-defaults": {
            post: {
                summary: "🔥 Setup Default Pre-onboarding Tasks (Admin - Run Once)",
                description: "One-time setup to create 15 default pre-onboarding tasks including document submissions, form filling, and verification steps. Run this first before creating candidates!",
                tags: ["🎯 Candidates & Pre-onboarding"],
                responses: {
                    200: { 
                        description: "Default tasks created", 
                        content: { 
                            "application/json": { 
                                example: { 
                                    success: true, 
                                    message: "15 default pre-onboarding tasks created" 
                                } 
                            } 
                        } 
                    }
                }
            }
        },
        "/api/candidates/{id}/start-preonboarding": {
            post: {
                summary: "▶️ Start Pre-onboarding for Candidate",
                description: "HR/Executive starts pre-onboarding process. Displays candidate details with email and mobile. Status changes to 'documents_pending'.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Candidate ID" }],
                responses: {
                    200: {
                        description: "Pre-onboarding started",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Pre-onboarding started",
                                    candidate: {
                                        id: 1,
                                        candidate_id: "CAN1735000001",
                                        first_name: "John",
                                        last_name: "Doe",
                                        email: "john.doe@example.com",
                                        phone: "9876543210",
                                        status: "documents_pending"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/candidates/{id}/create-offer": {
            post: {
                summary: "📝 Create Offer (4 Workflows: Job → Compensation → Offer → Preview)",
                description: "Create/update offer details with 4-step workflow: Job Details, Compensation, Offer Details, Preview",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    position: { type: "string", example: "Software Engineer" },
                                    designation_id: { type: "integer", example: 1 },
                                    department_id: { type: "integer", example: 2 },
                                    location_id: { type: "integer", example: 1 },
                                    reporting_manager_id: { type: "integer", example: 5 },
                                    joining_date: { type: "string", format: "date", example: "2025-02-01" },
                                    offered_ctc: { type: "number", example: 800000 },
                                    annual_salary: { type: "number", example: 800000 },
                                    salary_breakup: { type: "object", example: { basic: 400000, hra: 200000, special: 200000 } },
                                    offer_validity_date: { type: "string", format: "date", example: "2025-01-15" },
                                    probation_period: { type: "integer", example: 3, description: "Months" },
                                    notice_period: { type: "integer", example: 2, description: "Months" },
                                    work_mode: { type: "string", enum: ["Office", "WFH", "Hybrid", "Remote"], example: "Hybrid" },
                                    special_terms: { type: "string", example: "Relocation assistance provided" },
                                    benefits: { type: "string", example: "Health insurance, meal coupons" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Offer details saved",
                        content: {
                            "application/json": {
                                example: { success: true, message: "Offer details saved. Ready to preview and send." }
                            }
                        }
                    }
                }
            }
        },
        "/api/candidates/{id}/preview-send-offer": {
            post: {
                summary: "📧 Preview and Send Offer Letter",
                description: "Send offer letter to candidate via email with unique token link for approval/rejection",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: {
                        description: "Offer letter sent",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Offer letter sent to candidate email",
                                    preview: {
                                        candidate: {
                                            id: 1,
                                            full_name: "John Doe",
                                            email: "john.doe@example.com",
                                            position: "Software Engineer",
                                            offered_ctc: 800000,
                                            joining_date: "2025-02-01"
                                        },
                                        offer_details: {
                                            annual_salary: 800000,
                                            offer_validity_date: "2025-01-15",
                                            work_mode: "Hybrid"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/candidates/{id}/view-offer/{token}": {
            get: {
                summary: "👁️ View Offer (Candidate Portal - No Auth)",
                description: "Candidate views offer letter using token link from email. Public access - no authentication required.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                security: [],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "integer" } },
                    { name: "token", in: "path", required: true, schema: { type: "string" }, description: "Candidate ID token from email" }
                ],
                responses: {
                    200: {
                        description: "Offer details",
                        content: {
                            "application/json": {
                                example: {
                                    candidate: {
                                        id: 1,
                                        full_name: "John Doe",
                                        email: "john.doe@example.com",
                                        phone: "9876543210",
                                        position: "Software Engineer",
                                        department_name: "Engineering",
                                        location_name: "Mumbai",
                                        offered_ctc: 800000,
                                        joining_date: "2025-02-01",
                                        status: "offered"
                                    },
                                    offer_details: {
                                        annual_salary: 800000,
                                        offer_validity_date: "2025-01-15",
                                        probation_period: 3,
                                        work_mode: "Hybrid"
                                    },
                                    status: "offered"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/candidates/{id}/approve-offer/{token}": {
            post: {
                summary: "✅ Approve Offer (Candidate Action - No Auth)",
                description: "Candidate approves/accepts offer. Auto-assigns pre-onboarding tasks. Status changes to 'offer_accepted'.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                security: [],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "integer" } },
                    { name: "token", in: "path", required: true, schema: { type: "string" } }
                ],
                responses: {
                    200: {
                        description: "Offer approved",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Offer approved successfully! Pre-onboarding tasks assigned.",
                                    status: "Approved"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/candidates/{id}/reject-offer/{token}": {
            post: {
                summary: "❌ Reject Offer (Candidate Action - No Auth)",
                description: "Candidate rejects/declines offer. Status changes to 'offer_declined'.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                security: [],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "integer" } },
                    { name: "token", in: "path", required: true, schema: { type: "string" } }
                ],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    reason: { type: "string", example: "Found another opportunity" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Offer rejected",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Offer rejected. Thank you for your time.",
                                    status: "Rejected"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/candidates/{id}/update-status": {
            post: {
                summary: "🔄 Update Candidate Status",
                description: "Update candidate status: offered, offer_accepted, offer_declined, documents_pending, bgv_initiated, bgv_completed, ready_to_join, joined, dropped_out",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: { 
                                        type: "string", 
                                        enum: ["offered", "offer_accepted", "offer_declined", "documents_pending", "bgv_initiated", "bgv_completed", "ready_to_join", "joined", "dropped_out"],
                                        example: "bgv_completed" 
                                    },
                                    remarks: { type: "string", example: "Background verification cleared" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Status updated",
                        content: {
                            "application/json": {
                                example: { success: true, message: "Candidate status updated to bgv_completed", status: "bgv_completed" }
                            }
                        }
                    }
                }
            }
        },
        "/api/candidates/{id}/hire-as-employee": {
            post: {
                summary: "🎉 Hire as Employee (Ready to Join)",
                description: "Mark candidate as 'Ready to Join' after document verification. Prepares for onboarding on joining date.",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: {
                        description: "Candidate ready to join",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Candidate marked as 'Ready to Join'. Onboarding can now be initiated.",
                                    next_step: "Convert to employee on joining date"
                                }
                            }
                        }
                    },
                    400: {
                        description: "Pending document verification",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Cannot hire: Pending document verification",
                                    pending_documents: 3
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/candidates/{id}/put-on-hold": {
            post: {
                summary: "⏸️ Put Candidate on Hold",
                description: "Temporarily pause candidate process with reason",
                tags: ["🎯 Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    reason: { type: "string", example: "Delayed joining date - will resume next month" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Candidate on hold",
                        content: {
                            "application/json": {
                                example: {
                                    success: true,
                                    message: "Candidate put on hold",
                                    action: "Manual follow-up required"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

module.exports = swaggerSpec;
