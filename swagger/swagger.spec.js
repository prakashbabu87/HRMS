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
        description: "Human Resource Management System API - Modular Architecture with Auth, Employees, Payroll, Attendance, Timesheets, and more"
    },
    servers: [{ url: process.env.BASE_URL || "http://localhost:3000", description: "Local server" }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT token from /api/auth/login"
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
                    Designation: { type: "string" }
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
        "/api/auth/login": {
            post: {
                summary: "User Login",
                description: "Authenticate user and receive JWT token",
                security: [],
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    username: { type: "string", example: "admin" },
                                    password: { type: "string", example: "admin123" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Login successful" }
                }
            }
        },
        "/api/employees": {
            get: {
                summary: "Get All Employees",
                tags: ["Employees"],
                responses: {
                    200: { description: "List of employees" }
                }
            },
            post: {
                summary: "Create Employee",
                tags: ["Employees"],
                responses: {
                    200: { description: "Employee created" }
                }
            }
        }
        // Add more endpoints as needed
    }
};

module.exports = swaggerSpec;
