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

**🎯 Pre-Onboarding Workflow - Quick Test Guide:**

1. **Login**: POST /api/auth/login (username: admin, password: admin123)
2. **Create Candidate**: POST /api/candidates (after interview rounds)
3. **Start Pre-onboarding**: POST /api/candidates/{id}/start-preonboarding
4. **Create Offer**: POST /api/candidates/{id}/create-offer (4 workflows)
5. **Send Offer**: POST /api/candidates/{id}/preview-send-offer (email sent)
6. **Candidate Views**: GET /api/candidates/{id}/view-offer/{token} (no auth)
7. **Candidate Approves**: POST /api/candidates/{id}/approve-offer/{token} (no auth)
8. **Update Status**: POST /api/candidates/{id}/update-status
9. **Hire**: POST /api/candidates/{id}/hire-as-employee
10. **Convert**: POST /api/candidates/{id}/convert-to-employee

**Token = candidate_id from database (e.g., CAN1735000001)**`
    },
    servers: [
        { 
            url: process.env.API_BASE_URL || "http://localhost:3000", 
            description: process.env.NODE_ENV === 'production' ? "Production Server" : "Development Server"
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
                    role: { type: "string", enum: ["admin", "hr", "manager", "employee"] }
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
                    work_mode: { type: "string", enum: ["Office", "WFH", "Remote", "Hybrid"], example: "WFH" },
                    location: { type: "string", example: "Home - Mumbai" },
                    notes: { type: "string", example: "Working from home today" }
                }
            },
            WFHRequest: {
                type: "object",
                required: ["date", "work_mode", "reason"],
                properties: {
                    date: { type: "string", format: "date", example: "2025-12-25" },
                    work_mode: { type: "string", enum: ["WFH", "Remote"], example: "WFH" },
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
                    status: { type: "string", enum: ["pending", "approved", "rejected"], default: "pending" }
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
        
        // ============ ATTENDANCE (ENHANCED) ============
        "/api/attendance/checkin": {
            post: {
                summary: "✨ Check In (Enhanced with Work Mode)",
                description: "Check in with work mode support: Office, WFH, Remote, or Hybrid. Captures location, IP address, and device info.",
                tags: ["⏰ Attendance"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CheckInRequest" }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "Checked in successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        message: { type: "string", example: "Checked in successfully as WFH" },
                                        work_mode: { type: "string" },
                                        check_in_time: { type: "string", format: "date-time" },
                                        location: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    400: { description: "Already checked in or invalid work mode" }
                }
            }
        },
        "/api/attendance/checkout": {
            post: {
                summary: "✨ Check Out (Enhanced)",
                description: "Check out with automatic hours calculation. Returns work mode and total hours worked.",
                tags: ["⏰ Attendance"],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    notes: { type: "string", example: "Completed all tasks" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { 
                        description: "Checked out successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        message: { type: "string" },
                                        check_out_time: { type: "string", format: "date-time" },
                                        total_hours: { type: "number", format: "float" },
                                        work_mode: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    400: { description: "No active check-in found" }
                }
            }
        },
        "/api/attendance/me": {
            get: {
                summary: "Get My Attendance",
                description: "Get my attendance records with optional date filtering",
                tags: ["⏰ Attendance"],
                parameters: [
                    {
                        name: "start_date",
                        in: "query",
                        schema: { type: "string", format: "date" }
                    },
                    {
                        name: "end_date",
                        in: "query",
                        schema: { type: "string", format: "date" }
                    }
                ],
                responses: {
                    200: { description: "Attendance records" }
                }
            }
        },
        "/api/attendance/mark": {
            post: {
                summary: "Mark Attendance (HR)",
                description: "Manually mark attendance for an employee (HR only)",
                tags: ["⏰ Attendance"],
                responses: {
                    200: { description: "Attendance marked" }
                }
            }
        },
        "/api/attendance/employee/{empId}": {
            get: {
                summary: "Get Employee Attendance (HR)",
                tags: ["⏰ Attendance"],
                parameters: [{
                    name: "empId",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Employee attendance records" }
                }
            }
        },
        "/api/attendance/monthly": {
            get: {
                summary: "Monthly Attendance Summary (HR)",
                tags: ["⏰ Attendance"],
                responses: {
                    200: { description: "Monthly summary" }
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
        "/api/leaves/my": {
            get: {
                summary: "Get My Leaves",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: { description: "My leave applications" }
                }
            }
        },
        "/api/leaves/pending": {
            get: {
                summary: "Get Pending Leaves (HR)",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: { description: "Pending leave requests" }
                }
            }
        },
        "/api/leaves/approve/{leaveId}": {
            put: {
                summary: "Approve Leave/WFH (HR)",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "leaveId",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Approved successfully" }
                }
            }
        },
        "/api/leaves/reject/{leaveId}": {
            put: {
                summary: "Reject Leave/WFH (HR)",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "leaveId",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Rejected successfully" }
                }
            }
        },
        "/api/leaves/balance/{employee_id}": {
            get: {
                summary: "Get Leave Balance",
                tags: ["🏖️ Leave Management"],
                parameters: [{
                    name: "employee_id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Leave balance by type" }
                }
            }
        },
        "/api/leaves/types": {
            get: {
                summary: "Get Leave Types",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: { description: "List of leave types" }
                }
            },
            post: {
                summary: "Create Leave Type (Admin)",
                tags: ["🏖️ Leave Management"],
                responses: {
                    200: { description: "Leave type created" }
                }
            }
        },
        
        // ============ PAYROLL ============
        "/api/payroll/generate": {
            post: {
                summary: "Generate Payroll (Admin)",
                tags: ["💰 Payroll"],
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
                responses: {
                    200: { description: "Structure created" }
                }
            }
        },
        
        // ============ TIMESHEETS ============
        "/api/timesheets": {
            get: {
                summary: "Get All Timesheets",
                tags: ["📝 Timesheets"],
                responses: {
                    200: { description: "List of timesheets" }
                }
            },
            post: {
                summary: "Create Timesheet",
                tags: ["📝 Timesheets"],
                responses: {
                    200: { description: "Timesheet created" }
                }
            }
        },
        "/api/timesheets/me": {
            get: {
                summary: "Get My Timesheets",
                tags: ["📝 Timesheets"],
                responses: {
                    200: { description: "My timesheets" }
                }
            }
        },
        "/api/timesheets/{id}/approve": {
            put: {
                summary: "Approve Timesheet (Manager)",
                tags: ["📝 Timesheets"],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Approved" }
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
                responses: {
                    200: { description: "List of shift policies" }
                }
            },
            post: {
                summary: "Create Shift Policy (Admin)",
                tags: ["🏢 Master Data"],
                responses: {
                    200: { description: "Shift policy created" }
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
                responses: {
                    200: { description: "Ticket created" }
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
                responses: {
                    200: { description: "Wish sent" }
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
                    schema: { type: "integer" }
                }],
                responses: {
                    200: { description: "Marked as read" }
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
