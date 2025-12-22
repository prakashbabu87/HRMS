/**
 * HRMS COMPLETE SINGLE FILE SERVER
 * --------------------------------
 * Modules
 * ✅ Auth & JWT
 * ✅ Admin bootstrap
 * ✅ HR masters API
 * ✅ Employees
 * ✅ Payroll & Payslips
 * ✅ Holidays
 * ✅ Attendance
 * ✅ Timesheets
 * ✅ Announcements
 * ✅ Onboarding + password setup
 * ✅ Forgot password
 * ✅ Support tickets
 * ✅ Bulk uploads (Employees, Payroll, Holidays)
 * ✅ Swagger UI with sample responses
 */
const path = require('path');

require('dotenv').config({
  path: path.resolve(process.cwd(), '.env.production')
});

const API_BASE_URL = process.env.API_BASE_URL;
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const XLSX = require("xlsx");
const swaggerUi = require("swagger-ui-express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require('cors');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

console.log('Allowed origins:', allowedOrigins);


app.use(cors({
  origin: function (origin, callback) {
    // Allow Postman, curl, Android WebView (null origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS blocked: ' + origin));
  },
  credentials: true
}));

const app = express();
app.use(bodyParser.json());
const upload = multer({ dest: "uploads/" });
const cors = require('cors');
app.use(cors());
 
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 4201;

console.log('API_BASE_URL:', API_BASE_URL);
 

// Ensure default admin user exists for testing
async function ensureAdminUser() {
    const conn = await mysql.createConnection({
        host: DB.host,
        user: DB.user,
        password: DB.password,
        database: DB.database
    });
    try {
        const [rows] = await conn.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['admin']);
        if (rows.length) {
            console.log('✅ Default admin already exists');
            return;
        }
        const hashed = await bcrypt.hash('admin123', 10);
        await conn.execute(
            'INSERT INTO users (username, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, NOW())',
            ['admin', hashed, 'admin', 'Default Admin']
        );
        console.log('✅ Default admin created: username="admin" password="admin123"');
    } catch (err) {
        console.error('Failed to create default admin:', err.message);
        throw err;
    } finally {
        await conn.end();
    }
}


/* ============ DATABASE INITIALIZATION ============ */

// Create database if not exists
async function initializeDatabase() {
    const pool = mysql.createPool({
        host: "localhost",
        user: "root",
        password: "root",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    const conn = await pool.getConnection();

    try {
        // Read SQL schema from external file
        const schemaPath = path.join(__dirname, 'schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            console.warn('⚠️ schema.sql not found, skipping file-based initialization');
            await conn.query(`CREATE DATABASE IF NOT EXISTS hrms_db_new`);
            await conn.query(`USE hrms_db_new`);
            console.log("✅ Database created/verified (minimal setup)");
        } else {
            console.log('📄 Reading schema from schema.sql...');
            const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
            
            // First, create the database and use it
            await conn.query(`CREATE DATABASE IF NOT EXISTS hrms_db_new`);
            console.log("✅ Database hrms_db_new created/verified");
            await conn.query(`USE hrms_db_new`);
            console.log("✅ Using database hrms_db_new");
            
            // Remove single-line comments from SQL
            const sqlWithoutComments = schemaSQL
                .split('\n')
                .map(line => {
                    // Remove -- comments
                    const commentIndex = line.indexOf('--');
                    if (commentIndex >= 0) {
                        return line.substring(0, commentIndex);
                    }
                    return line;
                })
                .join('\n');
            
            // Split SQL statements by semicolon
            const statements = sqlWithoutComments
                .split(';')
                .map(s => s.trim())
                .filter(s => {
                    if (s.length === 0) return false;
                    // Skip CREATE DATABASE and USE statements (we handle them separately)
                    const upper = s.toUpperCase();
                    if (upper.includes('CREATE DATABASE')) return false;
                    if (upper.startsWith('USE ')) return false;
                    return true;
                });
            
            console.log(`📊 Executing ${statements.length} SQL statements...`);
            
            let successCount = 0;
            let skipCount = 0;
            
            // Execute each statement
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                try {
                    await conn.query(statement);
                    successCount++;
                    // Log table creation
                    if (statement.toUpperCase().includes('CREATE TABLE')) {
                        const match = statement.match(/CREATE TABLE.*?`?(\w+)`?\s*\(/i);
                        if (match) {
                            console.log(`  ✓ Created table: ${match[1]}`);
                        }
                    }
                } catch (err) {
                    // Ignore errors for statements like ALTER TABLE if already exists
                    if (err.message.includes('Duplicate') || 
                        err.message.includes('already exists') ||
                        err.message.includes('Multiple primary key')) {
                        skipCount++;
                    } else {
                        console.error(`❌ Error on statement ${i + 1}:`);
                        console.error(`   SQL: ${statement.substring(0, 100)}...`);
                        console.error(`   Error: ${err.message}`);
                        throw err; // Re-throw critical errors
                    }
                }
            }
            
            console.log(`✅ Database initialization complete: ${successCount} executed, ${skipCount} skipped`);
        }

    } catch (error) {
        console.error("❌ Database initialization error:", error.message);
        throw error;
    } finally {
        await conn.release();
        await pool.end();
    }
}

/* ============ END DATABASE INITIALIZATION ============ */

/* ---------------- CONFIG ---------------- */

const DB = {
    host: "localhost",
    user: "root",
    password: "root",
    database: "hrms_db_new",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const JWT_SECRET = "abc123xyz456";

/* ---------------- HELPERS ---------------- */

let __pool = null;
async function db() {
    if (!__pool) __pool = mysql.createPool(DB);
    const conn = await __pool.getConnection();
    // If this is a pooled connection, make c.end() behave like release()
    try {
        if (conn && typeof conn.release === 'function') {
            conn.end = async () => {
                try { conn.release(); } catch (e) { /* ignore */ }
            };
        }
    } catch (e) { }
    return conn;
}

// Helper: find employee record for a given user id by matching username to WorkEmail or EmployeeNumber
async function findEmployeeByUserId(userId) {
    const c = await db();
    try {
        const [u] = await c.query("SELECT username FROM users WHERE id = ?", [userId]);
        if (!u || !u.length) return null;
        const username = u[0].username;
        const [emp] = await c.query("SELECT * FROM employees WHERE WorkEmail = ? OR EmployeeNumber = ? LIMIT 1", [username, username]);
        if (!emp || !emp.length) return null;
        return emp[0];
    } finally {
        c.end();
    }
}

function toMySQLDateTime(val) {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

const auth = (req, res, next) => {
    try {
        const t = req.headers.authorization?.split(" ")[1];
        if (!t) return res.status(401).json({ error: "Missing token" });
        req.user = jwt.verify(t, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
};

const admin = (req, res, next) => {
    if (req.user.role !== "admin")
        return res.status(403).json({ error: "Admin only" });
    next();
};

// Role-based access control middleware
const roleAuth = (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }
    next();
};

const hr = (req, res, next) => {
    if (!['admin', 'hr'].includes(req.user.role))
        return res.status(403).json({ error: "HR/Admin only" });
    next();
};

const manager = (req, res, next) => {
    if (!['admin', 'hr', 'manager'].includes(req.user.role))
        return res.status(403).json({ error: "Manager/HR/Admin only" });
    next();
};

/// Role-wise API access matrix
const ACCESS_MATRIX = {
    description: "Role access (allowed = true). Roles: admin, hr, manager, employee",
    matrix: {
        "/api/login": { admin: true, hr: true, manager: true, employee: true, method: "POST", note: "public auth" },
        "/api/onboarding/set-password": { admin: true, hr: true, manager: true, employee: true, method: "POST" },
        "/api/employees": { "GET": { admin: true, hr: true, manager: true, employee: false }, "POST": { admin: true, hr: true, manager: false, employee: false } },
        "/api/employees/search": { admin: true, hr: true, manager: true, employee: true, method: "GET" },
        "/api/profile": { "GET": { admin: true, hr: true, manager: true, employee: true }, "PUT": { admin: true, hr: true, manager: true, employee: true } },
        "/api/payslips/{employee_id}": { admin: true, hr: true, manager: true, employee: true, note: "employee can view own only" },
        "/api/payslips/{employee_id}/{slip_id}": { admin: true, hr: true, manager: true, employee: true, note: "employee can view own only" },
        "/api/upload/employees": { admin: true, hr: true, manager: false, employee: false, method: "POST" },
        "/api/upload/payroll": { admin: true, hr: true, manager: false, employee: false, method: "POST" },
        "/api/upload/holidays": { admin: true, hr: true, manager: false, employee: false, method: "POST" },
        "/api/attendance": { "POST": { admin: true, hr: true, manager: true, employee: true }, "GET /api/attendance/{date}": { admin: true, hr: true, manager: true, employee: false } },
        "/api/attendance-report": { admin: true, hr: true, manager: true, employee: false, method: "GET" },
        "/api/timesheets": { "POST": { admin: true, hr: true, manager: true, employee: true }, "GET": { admin: true, hr: true, manager: true, employee: true } },
        "/api/leaves": { "GET": { admin: true, hr: true, manager: true, employee: true }, "POST": { admin: true, hr: true, manager: true, employee: true } },
        "/api/leaves/{id}": { "PUT": { admin: true, hr: true, manager: true, employee: false } },
        "/api/announcements": { "GET": { admin: true, hr: true, manager: true, employee: true }, "POST": { admin: true, hr: true, manager: false, employee: false } },
        "/api/support": { "GET": { admin: true, hr: true, manager: true, employee: true }, "POST": { admin: true, hr: true, manager: true, employee: true } },
        "/api/holidays": { admin: true, hr: true, manager: true, employee: true, method: "GET" },
        "/api/birthdays": { admin: true, hr: true, manager: true, employee: true, method: "GET" },
        "/api/birthday-wishes": { "POST": { admin: true, hr: true, manager: true, employee: true }, "GET /api/birthday-wishes/{employee_id}": { admin: true, hr: true, manager: true, employee: true } },
        "/api/support": { admin: true, hr: true, manager: true, employee: true },
        "/api/access-matrix": { admin: true, hr: true, manager: true, employee: true, method: "GET", note: "Returns this matrix" }
    }
};

// role-matrix endpoint (authenticated)
app.get("/api/access-matrix", auth, async (req, res) => {
    // optionally tailor to requester role, but return full matrix for frontend use
    res.json(ACCESS_MATRIX);
});

/* ---------------- AUTH -----------------------------------*/

// LOGIN
app.post("/api/login", async (req, res) => {
    const c = await db();
    const [u] = await c.query("SELECT * FROM users WHERE username=?", [req.body.username]);
    c.end();
    if (!u.length) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(req.body.password, u[0].password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
        { id: u[0].id, role: u[0].role },
        JWT_SECRET,
        { expiresIn: "8h" }
    );

    res.json({
        token,
        user: { id: u[0].id, username: u[0].username, role: u[0].role }
    });
});


/* ---------------- ONBOARDING -----------------------------------*/

// SET PASSWORD
app.post("/api/onboarding/set-password", async (req, res) => {
    const { username, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const c = await db();
    await c.query(
        "UPDATE users SET password_hash=? WHERE username=?",
        [hash, username]
    );
    c.end();

    res.json({ message: "Password set successfully" });
});


/* ---------------- FORGOT PASSWORD -----------------------------------*/

app.post("/api/auth/forgot-password", async (req, res) => {
    res.json({
        message: "Password reset link sent (email mock)",
        token: "RESET-TOKEN-MOCK"
    })
})


/* ---------------- HR MASTER APIs -----------------------------------*/

const createMaster = (route, table, col) => {
    app.get(`/api/${route}`, auth, async (req, res) => {
        const c = await db();
        const [r] = await c.query(`SELECT * FROM ${table}`);
        c.end();
        res.json(r);
    });
    app.post(`/api/${route}`, auth, admin, async (req, res) => {
        const c = await db();
        await c.query(`INSERT INTO ${table}(${col}) VALUES(?)`,
            [req.body[col]]);
        c.end();
        res.json({ message: `${route} created` });
    });
};

createMaster("locations", "locations", "name");
createMaster("departments", "departments", "name");
createMaster("designations", "designations", "name");
createMaster("business-units", "business_units", "name");
createMaster("legal-entities", "legal_entities", "name");
createMaster("cost-centers", "cost_centers", "code");

// New Master Tables
createMaster("sub-departments", "sub_departments", "name");
createMaster("bands", "bands", "name");
createMaster("pay-grades", "pay_grades", "name");
createMaster("leave-plans", "leave_plans", "name");
createMaster("shift-policies", "shift_policies", "name");
createMaster("weekly-off-policies", "weekly_off_policies", "name");
createMaster("attendance-policies", "attendance_policies", "name");
createMaster("attendance-capture-schemes", "attendance_capture_schemes", "name");
createMaster("holiday-lists", "holiday_lists", "name");
createMaster("expense-policies", "expense_policies", "name");


/* ============ CANDIDATES & PRE-ONBOARDING ============ */

// Create new candidate
app.post("/api/candidates", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const candidateData = {
            candidate_id: req.body.candidate_id || `CAN${Date.now()}`,
            first_name: req.body.first_name,
            middle_name: req.body.middle_name,
            last_name: req.body.last_name,
            full_name: req.body.full_name || `${req.body.first_name} ${req.body.last_name || ''}`.trim(),
            email: req.body.email,
            phone: req.body.phone,
            position: req.body.position,
            designation_id: req.body.designation_id,
            department_id: req.body.department_id,
            location_id: req.body.location_id,
            offered_ctc: req.body.offered_ctc,
            joining_date: req.body.joining_date,
            reporting_manager_id: req.body.reporting_manager_id,
            hr_coordinator_id: req.body.hr_coordinator_id || req.user.employee_id,
            recruiter_name: req.body.recruiter_name,
            recruitment_source: req.body.recruitment_source,
            created_by: req.user.id,
            status: 'offered'
        };

        const [result] = await c.query("INSERT INTO candidates SET ?", candidateData);
        c.end();
        
        res.json({ 
            success: true,
            candidate_id: result.insertId, 
            message: "Candidate created successfully" 
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Get all candidates with filters
app.get("/api/candidates", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const { status, joining_date_from, joining_date_to, department_id } = req.query;
        
        let query = `
            SELECT c.*, 
                   d.name as department_name, 
                   des.name as designation_name,
                   l.name as location_name,
                   CONCAT(m.FirstName, ' ', m.LastName) as manager_name
            FROM candidates c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN designations des ON c.designation_id = des.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN employees m ON c.reporting_manager_id = m.id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            query += " AND c.status = ?";
            params.push(status);
        }
        if (joining_date_from) {
            query += " AND c.joining_date >= ?";
            params.push(joining_date_from);
        }
        if (joining_date_to) {
            query += " AND c.joining_date <= ?";
            params.push(joining_date_to);
        }
        if (department_id) {
            query += " AND c.department_id = ?";
            params.push(department_id);
        }
        
        query += " ORDER BY c.created_at DESC";
        
        const [candidates] = await c.query(query, params);
        c.end();
        
        res.json(candidates);
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Get candidate by ID
app.get("/api/candidates/:id", auth, async (req, res) => {
    const c = await db();
    try {
        const [candidates] = await c.query(`
            SELECT c.*, 
                   d.name as department_name, 
                   des.name as designation_name,
                   l.name as location_name,
                   CONCAT(m.FirstName, ' ', m.LastName) as manager_name,
                   CONCAT(hr.FirstName, ' ', hr.LastName) as hr_coordinator_name
            FROM candidates c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN designations des ON c.designation_id = des.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN employees m ON c.reporting_manager_id = m.id
            LEFT JOIN employees hr ON c.hr_coordinator_id = hr.id
            WHERE c.id = ?
        `, [req.params.id]);
        
        if (candidates.length === 0) {
            c.end();
            return res.status(404).json({ error: "Candidate not found" });
        }
        
        // Get documents
        const [documents] = await c.query(
            "SELECT * FROM candidate_documents WHERE candidate_id = ?",
            [req.params.id]
        );
        
        // Get task progress
        const [tasks] = await c.query(`
            SELECT ctp.*, pt.task_name, pt.description, pt.task_category, pt.is_mandatory
            FROM candidate_task_progress ctp
            JOIN preonboarding_tasks pt ON ctp.task_id = pt.id
            WHERE ctp.candidate_id = ?
            ORDER BY pt.task_order
        `, [req.params.id]);
        
        c.end();
        
        res.json({
            candidate: candidates[0],
            documents,
            tasks,
            completion_percentage: tasks.length > 0 
                ? (tasks.filter(t => t.status === 'completed').length / tasks.length * 100).toFixed(2)
                : 0
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Update candidate
app.put("/api/candidates/:id", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;
        delete updates.created_by;
        
        await c.query("UPDATE candidates SET ? WHERE id = ?", [updates, req.params.id]);
        c.end();
        
        res.json({ success: true, message: "Candidate updated successfully" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Send offer letter
app.post("/api/candidates/:id/send-offer", auth, hr, async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidates SET 
                offer_letter_sent = 1,
                offer_letter_sent_date = CURDATE(),
                status = 'offered'
            WHERE id = ?
        `, [req.params.id]);
        
        c.end();
        res.json({ success: true, message: "Offer letter sent" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Accept offer
app.post("/api/candidates/:id/accept-offer", async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidates SET 
                offer_accepted = 1,
                offer_accepted_date = CURDATE(),
                status = 'offer_accepted'
            WHERE id = ?
        `, [req.params.id]);
        
        // Auto-assign pre-onboarding tasks
        const [tasks] = await c.query(
            "SELECT id FROM preonboarding_tasks WHERE auto_assign = 1 ORDER BY task_order"
        );
        
        for (const task of tasks) {
            await c.query(`
                INSERT INTO candidate_task_progress (candidate_id, task_id, status, assigned_date)
                VALUES (?, ?, 'not_started', CURDATE())
            `, [req.params.id, task.id]);
        }
        
        c.end();
        res.json({ success: true, message: "Offer accepted, pre-onboarding tasks assigned" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Decline offer
app.post("/api/candidates/:id/decline-offer", async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidates SET 
                offer_declined = 1,
                offer_declined_date = CURDATE(),
                decline_reason = ?,
                status = 'offer_declined'
            WHERE id = ?
        `, [req.body.reason, req.params.id]);
        
        c.end();
        res.json({ success: true, message: "Offer declined" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Upload candidate document
app.post("/api/candidates/:id/documents", upload.single("file"), async (req, res) => {
    const c = await db();
    try {
        const docData = {
            candidate_id: req.params.id,
            document_type: req.body.document_type,
            document_name: req.file.originalname,
            file_path: req.file.path,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            required: req.body.required || 1
        };
        
        await c.query("INSERT INTO candidate_documents SET ?", docData);
        
        // Update candidate documents status
        await c.query(`
            UPDATE candidates SET 
                documents_submitted = 1,
                status = CASE 
                    WHEN status = 'offer_accepted' THEN 'documents_pending'
                    ELSE status
                END
            WHERE id = ?
        `, [req.params.id]);
        
        c.end();
        res.json({ success: true, message: "Document uploaded successfully" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Verify document
app.put("/api/candidates/documents/:docId/verify", auth, hr, async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidate_documents SET 
                verified = 1,
                verified_by = ?,
                verified_date = CURDATE(),
                verification_remarks = ?
            WHERE id = ?
        `, [req.user.id, req.body.remarks, req.params.docId]);
        
        c.end();
        res.json({ success: true, message: "Document verified" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Initiate BGV
app.post("/api/candidates/:id/bgv/initiate", auth, hr, async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidates SET 
                bgv_status = 'initiated',
                bgv_initiated_date = CURDATE(),
                status = 'bgv_initiated'
            WHERE id = ?
        `, [req.params.id]);
        
        c.end();
        res.json({ success: true, message: "BGV initiated" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Update BGV status
app.put("/api/candidates/:id/bgv/status", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const updates = {
            bgv_status: req.body.bgv_status,
            bgv_remarks: req.body.remarks
        };
        
        if (req.body.bgv_status === 'completed') {
            updates.bgv_completed_date = new Date();
            updates.status = 'bgv_completed';
        }
        
        await c.query("UPDATE candidates SET ? WHERE id = ?", [updates, req.params.id]);
        c.end();
        
        res.json({ success: true, message: "BGV status updated" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Convert candidate to employee
app.post("/api/candidates/:id/convert-to-employee", auth, hr, async (req, res) => {
    const c = await db();
    try {
        // Get candidate details
        const [candidates] = await c.query("SELECT * FROM candidates WHERE id = ?", [req.params.id]);
        
        if (candidates.length === 0) {
            c.end();
            return res.status(404).json({ error: "Candidate not found" });
        }
        
        const candidate = candidates[0];
        
        // Create employee
        const empData = {
            EmployeeNumber: req.body.employee_number || `EMP${Date.now()}`,
            FirstName: candidate.first_name,
            MiddleName: candidate.middle_name,
            LastName: candidate.last_name,
            FullName: candidate.full_name,
            WorkEmail: candidate.email,
            PersonalEmail: candidate.email,
            Gender: candidate.gender,
            DateOfBirth: candidate.date_of_birth,
            DateJoined: candidate.joining_date || new Date(),
            LocationId: candidate.location_id,
            DepartmentId: candidate.department_id,
            DesignationId: candidate.designation_id,
            reporting_manager_id: candidate.reporting_manager_id,
            EmploymentStatus: 'Active',
            lpa: candidate.offered_ctc
        };
        
        const [empResult] = await c.query("INSERT INTO employees SET ?", empData);
        
        // Update candidate
        await c.query(`
            UPDATE candidates SET 
                converted_to_employee = 1,
                employee_id = ?,
                conversion_date = CURDATE(),
                status = 'joined'
            WHERE id = ?
        `, [empResult.insertId, req.params.id]);
        
        // Create user account
        const userData = {
            username: candidate.email.split('@')[0],
            password_hash: await bcrypt.hash('welcome123', 10),
            role: 'employee',
            full_name: candidate.full_name,
            employee_id: empResult.insertId
        };
        
        await c.query("INSERT INTO users SET ?", userData);
        
        // Auto-assign onboarding steps
        const [steps] = await c.query("SELECT id FROM onboarding_steps ORDER BY step_order");
        for (const step of steps) {
            await c.query(`
                INSERT INTO onboarding_progress (employee_id, step_id, status)
                VALUES (?, ?, 'not_started')
            `, [empResult.insertId, step.id]);
        }
        
        c.end();
        
        res.json({ 
            success: true, 
            employee_id: empResult.insertId,
            message: "Candidate converted to employee successfully" 
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Candidate dashboard stats
app.get("/api/candidates/stats/dashboard", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const [stats] = await c.query(`
            SELECT 
                COUNT(*) as total_candidates,
                SUM(CASE WHEN status = 'offered' THEN 1 ELSE 0 END) as offered,
                SUM(CASE WHEN status = 'offer_accepted' THEN 1 ELSE 0 END) as offer_accepted,
                SUM(CASE WHEN status = 'bgv_initiated' OR status = 'bgv_completed' THEN 1 ELSE 0 END) as in_bgv,
                SUM(CASE WHEN status = 'ready_to_join' THEN 1 ELSE 0 END) as ready_to_join,
                SUM(CASE WHEN status = 'joined' THEN 1 ELSE 0 END) as joined,
                SUM(CASE WHEN status = 'offer_declined' OR status = 'dropped_out' THEN 1 ELSE 0 END) as declined_dropped
            FROM candidates
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `);
        
        c.end();
        res.json(stats[0]);
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ PRE-ONBOARDING TASKS ============ */

// Create pre-onboarding task template
app.post("/api/preonboarding/tasks", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const taskData = {
            task_name: req.body.task_name,
            description: req.body.description,
            task_category: req.body.task_category,
            is_mandatory: req.body.is_mandatory !== undefined ? req.body.is_mandatory : 1,
            task_order: req.body.task_order,
            auto_assign: req.body.auto_assign !== undefined ? req.body.auto_assign : 1,
            assigned_to_role: req.body.assigned_to_role || 'candidate'
        };
        
        const [result] = await c.query("INSERT INTO preonboarding_tasks SET ?", taskData);
        c.end();
        
        res.json({ 
            success: true, 
            task_id: result.insertId,
            message: "Pre-onboarding task created" 
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Get all task templates
app.get("/api/preonboarding/tasks", auth, async (req, res) => {
    const c = await db();
    try {
        const [tasks] = await c.query(`
            SELECT * FROM preonboarding_tasks 
            ORDER BY task_order ASC, id ASC
        `);
        c.end();
        
        res.json(tasks);
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Update task template
app.put("/api/preonboarding/tasks/:id", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;
        
        await c.query("UPDATE preonboarding_tasks SET ? WHERE id = ?", [updates, req.params.id]);
        c.end();
        
        res.json({ success: true, message: "Task template updated" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Delete task template
app.delete("/api/preonboarding/tasks/:id", auth, admin, async (req, res) => {
    const c = await db();
    try {
        await c.query("DELETE FROM preonboarding_tasks WHERE id = ?", [req.params.id]);
        c.end();
        
        res.json({ success: true, message: "Task template deleted" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Assign tasks to candidate
app.post("/api/preonboarding/assign/:candidateId", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const taskIds = req.body.task_ids; // Array of task IDs
        
        if (!taskIds || taskIds.length === 0) {
            // Assign all auto-assign tasks
            const [tasks] = await c.query(
                "SELECT id FROM preonboarding_tasks WHERE auto_assign = 1"
            );
            
            for (const task of tasks) {
                await c.query(`
                    INSERT INTO candidate_task_progress (candidate_id, task_id, status, assigned_date)
                    VALUES (?, ?, 'not_started', CURDATE())
                    ON DUPLICATE KEY UPDATE assigned_date = CURDATE()
                `, [req.params.candidateId, task.id]);
            }
        } else {
            // Assign specific tasks
            for (const taskId of taskIds) {
                await c.query(`
                    INSERT INTO candidate_task_progress (candidate_id, task_id, status, assigned_date)
                    VALUES (?, ?, 'not_started', CURDATE())
                    ON DUPLICATE KEY UPDATE assigned_date = CURDATE()
                `, [req.params.candidateId, taskId]);
            }
        }
        
        c.end();
        res.json({ success: true, message: "Tasks assigned to candidate" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Get candidate task progress
app.get("/api/preonboarding/progress/:candidateId", async (req, res) => {
    const c = await db();
    try {
        const [progress] = await c.query(`
            SELECT 
                ctp.*,
                pt.task_name,
                pt.description,
                pt.task_category,
                pt.is_mandatory,
                pt.assigned_to_role
            FROM candidate_task_progress ctp
            JOIN preonboarding_tasks pt ON ctp.task_id = pt.id
            WHERE ctp.candidate_id = ?
            ORDER BY pt.task_order ASC
        `, [req.params.candidateId]);
        
        const total = progress.length;
        const completed = progress.filter(t => t.status === 'completed').length;
        const pending = total - completed;
        const completionPercentage = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;
        
        c.end();
        
        res.json({
            tasks: progress,
            stats: {
                total,
                completed,
                pending,
                completion_percentage: completionPercentage
            }
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Update task progress
app.put("/api/preonboarding/progress/:progressId", async (req, res) => {
    const c = await db();
    try {
        const updates = {
            status: req.body.status,
            remarks: req.body.remarks
        };
        
        if (req.body.status === 'in_progress' && !req.body.started_date) {
            updates.started_date = new Date();
        }
        
        if (req.body.status === 'completed') {
            updates.completed_date = new Date();
        }
        
        await c.query("UPDATE candidate_task_progress SET ? WHERE id = ?", 
            [updates, req.params.progressId]);
        
        c.end();
        res.json({ success: true, message: "Task progress updated" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Create default pre-onboarding tasks (one-time setup)
app.post("/api/preonboarding/tasks/setup-defaults", auth, admin, async (req, res) => {
    const c = await db();
    try {
        const defaultTasks = [
            { task_name: "Accept Offer Letter", description: "Review and accept the offer letter", task_category: "form_filling", is_mandatory: 1, task_order: 1, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload Photo", description: "Upload passport size photograph", task_category: "document_submission", is_mandatory: 1, task_order: 2, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload Resume", description: "Upload updated resume", task_category: "document_submission", is_mandatory: 1, task_order: 3, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload ID Proof (PAN Card)", description: "Upload PAN Card copy", task_category: "document_submission", is_mandatory: 1, task_order: 4, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload Address Proof (Aadhar)", description: "Upload Aadhar Card copy", task_category: "document_submission", is_mandatory: 1, task_order: 5, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload Education Certificates", description: "Upload highest education degree", task_category: "document_submission", is_mandatory: 1, task_order: 6, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload Experience Certificates", description: "Upload previous employment certificates", task_category: "document_submission", is_mandatory: 0, task_order: 7, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload Relieving Letter", description: "Upload relieving letter from last employer", task_category: "document_submission", is_mandatory: 0, task_order: 8, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload Last 3 Months Salary Slips", description: "Upload salary slips", task_category: "document_submission", is_mandatory: 0, task_order: 9, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Upload Bank Details", description: "Upload bank passbook/cancelled cheque", task_category: "document_submission", is_mandatory: 1, task_order: 10, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Fill Personal Information Form", description: "Complete personal and family details", task_category: "form_filling", is_mandatory: 1, task_order: 11, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Emergency Contact Details", description: "Provide emergency contact information", task_category: "form_filling", is_mandatory: 1, task_order: 12, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Background Verification Consent", description: "Provide BGV consent", task_category: "verification", is_mandatory: 1, task_order: 13, auto_assign: 1, assigned_to_role: "candidate" },
            { task_name: "Verify Documents", description: "HR to verify all submitted documents", task_category: "verification", is_mandatory: 1, task_order: 14, auto_assign: 1, assigned_to_role: "hr" },
            { task_name: "Initiate Background Verification", description: "Initiate BGV process", task_category: "verification", is_mandatory: 1, task_order: 15, auto_assign: 1, assigned_to_role: "hr" }
        ];
        
        for (const task of defaultTasks) {
            await c.query("INSERT INTO preonboarding_tasks SET ?", task);
        }
        
        c.end();
        res.json({ success: true, message: `${defaultTasks.length} default pre-onboarding tasks created` });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});


/* ---------------- EMPLOYEES -----------------------------------*/

app.get("/api/employees", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM employees");
    c.end();
    res.json(r);
});

app.post("/api/employees", auth, admin, async (req, res) => {
    const c = await db();
    try {
        // Whitelist allowed employee fields to avoid accidental/unsafe columns
        const allowed = [
            'EmployeeNumber','FirstName','MiddleName','LastName','FullName','WorkEmail','PersonalEmail',
            'PANNumber','AadhaarNumber','Gender','MaritalStatus','BloodGroup','PhysicallyHandicapped','Nationality',
            'DateOfBirth','DateJoined','LocationId','DepartmentId','DesignationId','BusinessUnitId','LegalEntityId',
            'CostCenterId','SubDepartment','EmploymentStatus','WorkerType','Band','PayGrade',
            // salary related fields
            'lpa','basic_pct','hra_pct','medical_allowance','transport_allowance','special_allowance',
            'paid_basic_monthly','working_days','loss_of_days'
        ];

        const toInsert = {};
        for (const k of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, k)) toInsert[k] = req.body[k];
        }

        // Fallback: if no whitelisted fields present, still allow minimal create using EmployeeNumber/FullName
        if (Object.keys(toInsert).length === 0) {
            toInsert.EmployeeNumber = req.body.EmployeeNumber || ('EMP-' + Date.now());
            toInsert.FullName = req.body.FullName || req.body.FirstName || 'New Employee';
        }

        const [r] = await c.query("INSERT INTO employees SET ?", [toInsert]);
        const insertedId = r.insertId;
        const [rows] = await c.query("SELECT * FROM employees WHERE id = ?", [insertedId]);
        c.end();
        res.json({ message: "Employee created", employee: (rows && rows[0]) || null });
    } catch (err) {
        c.end();
        console.error('create employee error', err);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});


/* ---------------- ATTENDANCE -----------------------------------*/

// Punch In / Out
app.post("/api/attendance", auth, async (req, res) => {
    const c = await db();
    await c.query("INSERT INTO attendance SET ?", req.body);
    c.end();
    res.json({ message: "Punch recorded" });
});

// View Daily Attendance (explicit path to avoid collision with /api/attendance/me)
app.get("/api/attendance/date/:date", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM attendance WHERE punch_date=?",
        [req.params.date]
    );
    c.end();
    res.json(r);
});


/* ---------------- TIMESHEETS -----------------------------------*/

app.post("/api/timesheets", auth, async (req, res) => {
    const c = await db();
    await c.query("INSERT INTO timesheets SET ?", req.body);
    c.end();
    res.json({ message: "Timesheet submitted" });
});

app.get("/api/timesheets", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM timesheets");
    c.end();
    res.json(r);
});


/* ---------------- PAYROLL -----------------------------------*/

app.get("/api/payroll/:run", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM payroll_slips WHERE payroll_run_id=?",
        [req.params.run]
    );
    c.end();
    res.json(r);
});


/* ---------------- HOLIDAYS -----------------------------------*/

app.get("/api/holidays", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM holidays");
    c.end();
    res.json(r);
});


/* ---------------- SUPPORT TICKETS ------------------------------*/

app.post("/api/support", auth, async (req, res) => {
    const c = await db();
    await c.query(`
  INSERT INTO support_tickets
   (employee_id,subject,message,status)
   VALUES (?,?,?, 'Open')
 `,
        [
            req.user.id,
            req.body.subject,
            req.body.message
        ]);
    c.end();

    res.json({ message: "Ticket created" });
});


app.get("/api/support", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM support_tickets");
    c.end();
    res.json(r);
});


/* ---------------- BULK UPLOADS --------------------------------*/
/// Improved excel reader: normalize column names, parse dates/decimals, skip empty rows
function excel(file) {
    const wb = XLSX.readFile(file, { cellDates: true });
    let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: false });

    const parseTextDate = (str) => {
        if (!str || typeof str !== 'string') return null;
        const trimmed = str.trim();
        let d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        const match = trimmed.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (match) {
            const [, day, month, year] = match;
            d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
        return null;
    };

    const parseDecimal = (str) => {
        if (!str || typeof str !== 'string') return null;
        const normalized = str.trim().replace(/,/g, '');
        const num = parseFloat(normalized);
        return isNaN(num) ? null : num;
    };

    // Normalize column names: trim spaces, convert to lowercase for matching
    rows = rows.map(row => {
        const normalized = {};
        for (const k of Object.keys(row)) {
            const trimmedKey = k.trim();
            normalized[trimmedKey] = row[k];
        }
        return normalized;
    });

    // Filter out rows where all values are null/empty (skip header duplication)
    rows = rows.filter(row => Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== ''));

    return rows.map(row => {
        const r = {};
        for (const k of Object.keys(row)) {
            const v = row[k];
            if (v instanceof Date) {
                r[k] = v.toISOString().slice(0, 10);
            } else if (typeof v === 'string') {
                const lower = String(k).toLowerCase();
                if (lower.includes('date') || lower.includes('_at') || lower.includes('joining') || lower.includes('birth')) {
                    const parsed = parseTextDate(v);
                    r[k] = parsed || v.trim();
                }
                else if (lower.includes('amount') || lower.includes('basic') || lower.includes('hra') ||
                    lower.includes('allowance') || lower.includes('deduction') || lower.includes('salary') ||
                    lower.includes('pay') || lower.includes('pf') || lower.includes('esi') || lower.includes('tax') ||
                    lower.includes('coupon') || lower.includes('advance') || lower.includes('days') || lower.includes('units') ||
                    lower.includes('gross') || lower.includes('total') || lower.includes('incentive') || lower.includes('bonus') || lower.includes('reimbursement')) {
                    const parsed = parseDecimal(v);
                    r[k] = parsed !== null ? parsed : v.trim();
                } else {
                    r[k] = v.trim();
                }
            } else if (typeof v === 'number' && String(k).toLowerCase().includes('date')) {
                const d = new Date(Math.round((v - 25569) * 86400 * 1000));
                r[k] = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
            } else {
                r[k] = v;
            }
        }
        return r;
    });
}

// Helper: get or create master record and return id
async function getOrCreateMaster(conn, table, column, value) {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const val = String(value).trim();
    // Use parameterized queries to avoid injection
    const [rows] = await conn.query(`SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [val]);
    if (rows.length) return rows[0].id;
    const [res] = await conn.query(`INSERT INTO \`${table}\` (\`${column}\`) VALUES (?)`, [val]);
    return res.insertId;
}

// Replace employee bulk upload to populate master data
app.post("/api/upload/employees", auth, admin, upload.single("file"), async (req, res) => {
    const rows = excel(req.file.path);
    const c = await db();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = [];

    for (const r of rows) {
        try {
            const empNo = r.EmployeeNumber || r['Employee Number'] || null;
            if (!empNo) {
                skipped++;
                errors.push("Missing EmployeeNumber");
                continue;
            }

            // ---- Master Data Lookups ----
            const locationName = r.Location || r.LocationName || null;
            const departmentName = r.Department || null;
            const subDepartmentName = r.SubDepartment || r['Sub Department'] || null;
            const designationName = r.Designation || r.JobTitle || null;
            const secondaryDesignationName = r.SecondaryDesignation || r['Secondary Designation'] || null;
            const buName = r.BusinessUnit || null;
            const legalName = r.LegalEntity || null;
            const costCenterCode = r.CostCenter || r.CostCenterCode || null;
            const bandName = r.Band || null;
            const payGradeName = r.PayGrade || r['Pay Grade'] || null;
            
            // Policy lookups
            const leavePlanName = r.LeavePlan || r['Leave Plan'] || null;
            const shiftPolicyName = r.ShiftPolicy || r['Shift Policy'] || null;
            const weeklyOffPolicyName = r.WeeklyOffPolicy || r['Weekly Off Policy'] || null;
            const attendancePolicyName = r.AttendancePolicy || r['Attendance Policy'] || null;
            const attendanceCaptureSchemeName = r.AttendanceCaptureScheme || r['Attendance Capture Scheme'] || null;
            const holidayListName = r.HolidayList || r['Holiday List'] || null;
            const expensePolicyName = r.ExpensePolicy || r['Expense Policy'] || null;

            // ---- Ensure master data exists and get IDs ----
            const locationId = await getOrCreateMaster(c, 'locations', 'name', locationName);
            const deptId = await getOrCreateMaster(c, 'departments', 'name', departmentName);
            const subDeptId = await getOrCreateMaster(c, 'sub_departments', 'name', subDepartmentName);
            const desgId = await getOrCreateMaster(c, 'designations', 'name', designationName);
            const secondaryDesgId = await getOrCreateMaster(c, 'designations', 'name', secondaryDesignationName);
            const buId = await getOrCreateMaster(c, 'business_units', 'name', buName);
            const legalId = await getOrCreateMaster(c, 'legal_entities', 'name', legalName);
            const costId = await getOrCreateMaster(c, 'cost_centers', 'code', costCenterCode);
            const bandId = await getOrCreateMaster(c, 'bands', 'name', bandName);
            const payGradeId = await getOrCreateMaster(c, 'pay_grades', 'name', payGradeName);
            
            // Policy IDs
            const leavePlanId = await getOrCreateMaster(c, 'leave_plans', 'name', leavePlanName);
            const shiftPolicyId = await getOrCreateMaster(c, 'shift_policies', 'name', shiftPolicyName);
            const weeklyOffPolicyId = await getOrCreateMaster(c, 'weekly_off_policies', 'name', weeklyOffPolicyName);
            const attendancePolicyId = await getOrCreateMaster(c, 'attendance_policies', 'name', attendancePolicyName);
            const attendanceCaptureSchemeId = await getOrCreateMaster(c, 'attendance_capture_schemes', 'name', attendanceCaptureSchemeName);
            const holidayListId = await getOrCreateMaster(c, 'holiday_lists', 'name', holidayListName);
            const expensePolicyId = await getOrCreateMaster(c, 'expense_policies', 'name', expensePolicyName);

            // Reporting Manager lookup (by EmployeeNumber)
            let reportingManagerId = null;
            if (r.ReportingManager || r['Reporting Manager']) {
                const [mgr] = await c.query(
                    `SELECT id FROM employees WHERE EmployeeNumber = ? LIMIT 1`,
                    [r.ReportingManager || r['Reporting Manager']]
                );
                if (mgr.length > 0) reportingManagerId = mgr[0].id;
            }

            // ---- Check employee exists ----
            const [existing] = await c.query(
                `SELECT id FROM employees WHERE EmployeeNumber = ?`,
                [empNo]
            );

            if (existing.length > 0) {
                // ---------- UPDATE ----------
                await c.query(
                    `UPDATE employees SET
                        attendance_number = ?,
                        FirstName = ?,
                        MiddleName = ?,
                        LastName = ?,
                        FullName = ?,
                        WorkEmail = ?,
                        PersonalEmail = ?,
                        Gender = ?,
                        MaritalStatus = ?,
                        BloodGroup = ?,
                        PhysicallyHandicapped = ?,
                        Nationality = ?,
                        DateOfBirth = ?,
                        current_address_line1 = ?,
                        current_address_line2 = ?,
                        current_city = ?,
                        current_state = ?,
                        current_zip = ?,
                        current_country = ?,
                        permanent_address_line1 = ?,
                        permanent_address_line2 = ?,
                        permanent_city = ?,
                        permanent_state = ?,
                        permanent_zip = ?,
                        permanent_country = ?,
                        father_name = ?,
                        mother_name = ?,
                        spouse_name = ?,
                        children_names = ?,
                        DateJoined = ?,
                        time_type = ?,
                        worker_type = ?,
                        EmploymentStatus = ?,
                        notice_period = ?,
                        LocationId = ?,
                        DepartmentId = ?,
                        SubDepartmentId = ?,
                        DesignationId = ?,
                        SecondaryDesignationId = ?,
                        BusinessUnitId = ?,
                        LegalEntityId = ?,
                        BandId = ?,
                        PayGradeId = ?,
                        CostCenterId = ?,
                        reporting_manager_id = ?,
                        leave_plan_id = ?,
                        shift_policy_id = ?,
                        weekly_off_policy_id = ?,
                        attendance_policy_id = ?,
                        attendance_capture_scheme_id = ?,
                        holiday_list_id = ?,
                        expense_policy_id = ?,
                        PANNumber = ?,
                        AadhaarNumber = ?,
                        pf_number = ?,
                        uan_number = ?,
                        lpa = ?,
                        basic_pct = ?,
                        hra_pct = ?,
                        medical_allowance = ?,
                        transport_allowance = ?,
                        special_allowance = ?,
                        paid_basic_monthly = ?,
                        working_days = ?,
                        loss_of_days = ?,
                        exit_date = ?,
                        exit_status = ?,
                        termination_type = ?,
                        termination_reason = ?,
                        resignation_note = ?,
                        comments = ?
                     WHERE EmployeeNumber = ?`,
                    [
                        r.attendance_number || r.AttendanceNumber || null,
                        r.FirstName || null,
                        r.MiddleName || null,
                        r.LastName || null,
                        r.FullName || r.Name || null,
                        r.WorkEmail || null,
                        r.PersonalEmail || r['Personal Email'] || null,
                        r.Gender || null,
                        r.MaritalStatus || null,
                        r.BloodGroup || null,
                        r.PhysicallyHandicapped || 0,
                        r.Nationality || null,
                        r.DateOfBirth || null,
                        r.current_address_line1 || r.CurrentAddressLine1 || null,
                        r.current_address_line2 || r.CurrentAddressLine2 || null,
                        r.current_city || r.CurrentCity || null,
                        r.current_state || r.CurrentState || null,
                        r.current_zip || r.CurrentZip || null,
                        r.current_country || r.CurrentCountry || null,
                        r.permanent_address_line1 || r.PermanentAddressLine1 || null,
                        r.permanent_address_line2 || r.PermanentAddressLine2 || null,
                        r.permanent_city || r.PermanentCity || null,
                        r.permanent_state || r.PermanentState || null,
                        r.permanent_zip || r.PermanentZip || null,
                        r.permanent_country || r.PermanentCountry || null,
                        r.father_name || r.FatherName || null,
                        r.mother_name || r.MotherName || null,
                        r.spouse_name || r.SpouseName || null,
                        r.children_names || r.ChildrenNames || null,
                        r.DateJoined || r.DateOfJoining || null,
                        r.time_type || r.TimeType || null,
                        r.worker_type || r.WorkerType || null,
                        r.EmploymentStatus || r.Status || null,
                        r.notice_period || r.NoticePeriod || null,
                        locationId,
                        deptId,
                        subDeptId,
                        desgId,
                        secondaryDesgId,
                        buId,
                        legalId,
                        bandId,
                        payGradeId,
                        costId,
                        reportingManagerId,
                        leavePlanId,
                        shiftPolicyId,
                        weeklyOffPolicyId,
                        attendancePolicyId,
                        attendanceCaptureSchemeId,
                        holidayListId,
                        expensePolicyId,
                        r.PANNumber || null,
                        r.AadhaarNumber || null,
                        r.pf_number || r.PFNumber || null,
                        r.uan_number || r.UANNumber || null,
                        r.lpa || r.LPA || null,
                        r.basic_pct || r.BasicPct || null,
                        r.hra_pct || r.HRAPct || null,
                        r.medical_allowance || r.MedicalAllowance || null,
                        r.transport_allowance || r.TransportAllowance || null,
                        r.special_allowance || r.SpecialAllowance || null,
                        r.paid_basic_monthly || r.PaidBasicMonthly || null,
                        r.working_days || r.WorkingDays || null,
                        r.loss_of_days || r.LossOfDays || null,
                        r.exit_date || r.ExitDate || null,
                        r.exit_status || r.ExitStatus || null,
                        r.termination_type || r.TerminationType || null,
                        r.termination_reason || r.TerminationReason || null,
                        r.resignation_note || r.ResignationNote || null,
                        r.comments || r.Comments || null,
                        empNo
                    ]
                );
                updated++;
            } else {
                // ---------- INSERT ----------
                await c.query(
                    `INSERT INTO employees
                     (EmployeeNumber, attendance_number, FirstName, MiddleName, LastName, FullName, 
                      WorkEmail, PersonalEmail, Gender, MaritalStatus, BloodGroup, PhysicallyHandicapped, 
                      Nationality, DateOfBirth,
                      current_address_line1, current_address_line2, current_city, current_state, current_zip, current_country,
                      permanent_address_line1, permanent_address_line2, permanent_city, permanent_state, permanent_zip, permanent_country,
                      father_name, mother_name, spouse_name, children_names,
                      DateJoined, time_type, worker_type, EmploymentStatus, notice_period,
                      LocationId, DepartmentId, SubDepartmentId, DesignationId, SecondaryDesignationId,
                      BusinessUnitId, LegalEntityId, BandId, PayGradeId, CostCenterId, reporting_manager_id,
                      leave_plan_id, shift_policy_id, weekly_off_policy_id, attendance_policy_id, 
                      attendance_capture_scheme_id, holiday_list_id, expense_policy_id,
                      PANNumber, AadhaarNumber, pf_number, uan_number,
                      lpa, basic_pct, hra_pct, medical_allowance, transport_allowance, special_allowance,
                      paid_basic_monthly, working_days, loss_of_days,
                      exit_date, exit_status, termination_type, termination_reason, resignation_note, comments)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [
                        empNo,
                        r.attendance_number || r.AttendanceNumber || null,
                        r.FirstName || null,
                        r.MiddleName || null,
                        r.LastName || null,
                        r.FullName || r.Name || null,
                        r.WorkEmail || null,
                        r.PersonalEmail || r['Personal Email'] || null,
                        r.Gender || null,
                        r.MaritalStatus || null,
                        r.BloodGroup || null,
                        r.PhysicallyHandicapped || 0,
                        r.Nationality || null,
                        r.DateOfBirth || null,
                        r.current_address_line1 || r.CurrentAddressLine1 || null,
                        r.current_address_line2 || r.CurrentAddressLine2 || null,
                        r.current_city || r.CurrentCity || null,
                        r.current_state || r.CurrentState || null,
                        r.current_zip || r.CurrentZip || null,
                        r.current_country || r.CurrentCountry || null,
                        r.permanent_address_line1 || r.PermanentAddressLine1 || null,
                        r.permanent_address_line2 || r.PermanentAddressLine2 || null,
                        r.permanent_city || r.PermanentCity || null,
                        r.permanent_state || r.PermanentState || null,
                        r.permanent_zip || r.PermanentZip || null,
                        r.permanent_country || r.PermanentCountry || null,
                        r.father_name || r.FatherName || null,
                        r.mother_name || r.MotherName || null,
                        r.spouse_name || r.SpouseName || null,
                        r.children_names || r.ChildrenNames || null,
                        r.DateJoined || r.DateOfJoining || null,
                        r.time_type || r.TimeType || null,
                        r.worker_type || r.WorkerType || null,
                        r.EmploymentStatus || r.Status || null,
                        r.notice_period || r.NoticePeriod || null,
                        locationId,
                        deptId,
                        subDeptId,
                        desgId,
                        secondaryDesgId,
                        buId,
                        legalId,
                        bandId,
                        payGradeId,
                        costId,
                        reportingManagerId,
                        leavePlanId,
                        shiftPolicyId,
                        weeklyOffPolicyId,
                        attendancePolicyId,
                        attendanceCaptureSchemeId,
                        holidayListId,
                        expensePolicyId,
                        r.PANNumber || null,
                        r.AadhaarNumber || null,
                        r.pf_number || r.PFNumber || null,
                        r.uan_number || r.UANNumber || null,
                        r.lpa || r.LPA || null,
                        r.basic_pct || r.BasicPct || null,
                        r.hra_pct || r.HRAPct || null,
                        r.medical_allowance || r.MedicalAllowance || null,
                        r.transport_allowance || r.TransportAllowance || null,
                        r.special_allowance || r.SpecialAllowance || null,
                        r.paid_basic_monthly || r.PaidBasicMonthly || null,
                        r.working_days || r.WorkingDays || null,
                        r.loss_of_days || r.LossOfDays || null,
                        r.exit_date || r.ExitDate || null,
                        r.exit_status || r.ExitStatus || null,
                        r.termination_type || r.TerminationType || null,
                        r.termination_reason || r.TerminationReason || null,
                        r.resignation_note || r.ResignationNote || null,
                        r.comments || r.Comments || null
                    ]
                );
                inserted++;
            }

        } catch (err) {
            skipped++;
            errors.push(err.message);
        }
    }

    c.end();

    res.json({
        processed: rows.length,
        inserted,
        updated,
        skipped,
        errors: errors.slice(0, 10)
    });
});

// app.post("/api/upload/holidays",auth,admin,upload.single("file"),async(req,res)=>{

//  const rows = excel(req.file.path);
//  const c=await db();

//  for(const r of rows){
//   await c.query("INSERT IGNORE INTO holidays SET ?",{
//     holiday_date:r.holiday_date,
//     holiday_name:r.holiday_name
//   });
//  }

//  c.end();
//  res.json({inserted:rows.length});
// });

app.post("/api/upload/holidays", auth, admin, upload.single("file"), async (req, res) => {
    const rows = excel(req.file.path);
    const c = await db();

    let inserted = 0, skipped = 0, errors = [];

    for (const [idx, r] of rows.entries()) {
        try {
            // Accept common column name variants
            const dateVal = r.holiday_date || r['Holiday Date'] || r.Date || r.date || r.HolidayDate || null;
            const nameVal = r.holiday_name || r['Holiday Name'] || r.Name || r.name || null;

            if (!dateVal) {
                skipped++;
                errors.push(`Row ${idx + 1}: Missing holiday_date`);
                continue;
            }

            // Ensure date is YYYY-MM-DD format
            let finalDate = dateVal;
            if (dateVal instanceof Date) {
                finalDate = dateVal.toISOString().slice(0, 10);
            } else if (typeof dateVal === 'string') {
                // Already parsed by excel() function, should be YYYY-MM-DD
                finalDate = dateVal.trim();
            }

            const [res] = await c.query(
                `INSERT INTO holidays (holiday_date, holiday_name, day_name, description) VALUES (?, ?, ?, ?)`,
                [finalDate, nameVal || null, r.day_name || null, r.description || null]
            );

            if (res.affectedRows) {
                inserted++;
            } else {
                skipped++;
            }
        } catch (err) {
            skipped++;
            errors.push(`Row ${idx + 1}: ${err.message}`);
        }
    }

    c.end();
    res.json({ inserted, skipped, processed: rows.length, errors: errors.slice(0, 20) });
});

// Add payroll bulk upload endpoint (creates payroll_run and payroll_slips, links employees)
app.post("/api/upload/payroll", auth, admin, upload.single("file"), async (req, res) => {
    const rows = excel(req.file.path);
    const c = await db();

    let inserted = 0, skipped = 0, errors = [];

    const normStr = v => v === null || v === undefined ? null : String(v).trim();
    const safeNumeric = v => (v === null || v === undefined || isNaN(v)) ? null : Number(v);
    for (const [idx, r] of rows.entries()) {
        try {
            // Accept your exact column names
            const empNo = normStr(r.employee_number || r.EmployeeNumber || r['Employee Number'] || null);
            const payrollMonth = normStr(r.payroll_month || r['Payroll Month'] || r.PayrollMonth || null);
            const payrollType = normStr(r.payroll_type || r['Payroll Type'] || r.PayrollType || null);

            if (!empNo || !payrollMonth || !payrollType) {
                skipped++;
                errors.push(`Row ${idx + 1}: missing employee_number/EmployeeNumber, payroll_month, or payroll_type. Found: empNo='${empNo}', month='${payrollMonth}', type='${payrollType}'`);
                continue;
            }

            // find employee by EmployeeNumber
            const [empRows] = await c.query("SELECT id FROM employees WHERE EmployeeNumber = ? LIMIT 1", [empNo]);
            if (!empRows.length) { skipped++; errors.push(`Row ${idx + 1}: Employee ${empNo} not found in database`); continue; }
            const empId = empRows[0].id;

            // ------------------------------------------------------------------
            // --- START: UPDATED EMPLOYEE PAY DETAILS LOGIC (UPSERT)
            // ------------------------------------------------------------------
            
            // 1. Prepare the data for the emp_pay_details table
            const payDetailsData = {
                employee_id: empId,
                basic: safeNumeric(r.basic),
                hra: safeNumeric(r.hra),
                medical_allowance: safeNumeric(r.medical_allowance),
                transport_allowance: safeNumeric(r.transport_allowance),
                special_allowance: safeNumeric(r.special_allowance),
                meal_coupons: safeNumeric(r.meal_coupons),
                // Add any other pay detail fields from your Excel here
            };

            // 2. Build the INSERT ... ON DUPLICATE KEY UPDATE query
            // This query attempts to INSERT. If the unique employee_id already exists, 
            // it executes the UPDATE part instead.
            const query = `
                INSERT INTO emp_pay_details SET ?
                ON DUPLICATE KEY UPDATE
                    basic = VALUES(basic),
                    hra = VALUES(hra),
                    medical_allowance = VALUES(medical_allowance),
                    transport_allowance = VALUES(transport_allowance),
                    special_allowance = VALUES(special_allowance),
                    meal_coupons = VALUES(meal_coupons)
            `;

            // 3. Execute the upsert query
            await c.query(query, payDetailsData);
            
            // ------------------------------------------------------------------
            // --- END: UPDATED EMPLOYEE PAY DETAILS LOGIC
            // ------------------------------------------------------------------

            // get or create payroll_run
            const [runRows] = await c.query("SELECT id FROM payroll_runs WHERE payroll_month = ? AND payroll_type = ? LIMIT 1", [payrollMonth, payrollType]);
            let runId;
            if (runRows.length) runId = runRows[0].id;
            else {
                const [rres] = await c.query("INSERT INTO payroll_runs (payroll_month, payroll_type) VALUES (?,?)", [payrollMonth, payrollType]);
                runId = rres.insertId;
            }

            // Map all payroll columns from Excel to database
            const slip = {
                payroll_run_id: runId,
                employee_id: empId,
                employment_status: normStr(r.employment_status),
                date_of_joining: r.date_of_joining,
                date_of_birth: r.date_of_birth,
                location_name: normStr(r.location),
                department_name: normStr(r.department),
                job_title: normStr(r.job_title),
                payroll_status: normStr(r.status),
                status_description: normStr(r.status_description),
                warnings: normStr(r.warnings),
                actual_payable_days: r.actual_payable_days || null,
                working_days: r.working_days || null,
                loss_of_pay_days: r.loss_of_pay_days || null,
                days_payable: r.days_payable || null,
                payable_units: r.payable_units || null,
                remuneration_amount: r.remuneration_amount || null,
                basic: r.basic || null,
                hra: r.hra || null,
                medical_allowance: r.medical_allowance || null,
                transport_allowance: r.transport_allowance || null,
                special_allowance: r.special_allowance || null,
                meal_coupons: r.meal_coupons || null,
                mobile_internet_allowance: r.mobile_internet_allowance || null,
                newspaper_journal_allowance: r.newspaper_journal_allowance || null,
                child_education_allowance: r.child_education_allowance || null,
                incentives: r.incentives || null,
                other_reimbursement: r.other_reimbursement || null,
                relocation_bonus: r.relocation_bonus || null,
                gross_amount: r.gross_a || null,
                pf_employer: r.pf_employer || null,
                esi_employer: r.esi_employer || null,
                pf_employee: r.pf_employee || null,
                esi_employee: r.esi_employee || null,
                total_contributions: r.total_contributions_b || null,
                professional_tax: r.professional_tax || null,
                total_income_tax: r.total_income_tax || null,
                loan_deduction: r.loan_deduction || null,
                meal_coupon_service_charge: r.meal_coupon_service_charge || null,
                other_deduction: r.other_deduction || null,
                meal_coupon_deduction: r.meal_coupon || null,
                total_deductions: r.total_deductions_c || null,
                net_pay: r.net_pay || null,
                cash_advance: r.cash_advance_d || null,
                settlement_against_advance: r.settlement_against_advance_e || null,
                social_media_login_invoice: r.socialmedia_login_invoice || null,
                total_reimbursements: r.total_reimbursements_f || null,
                total_net_pay: r.total_net_pay || null
            };

            // Insert payroll slip
            await c.query(`INSERT INTO payroll_slips SET ?`, slip);
            inserted++;
        } catch (err) {
            skipped++;
            errors.push(`Row ${idx + 1}: ${err.message}`);
        }
    }

    c.end();
    res.json({ inserted, skipped, processed: rows.length, errors: errors.slice(0, 50) });
});

/* ---------------- LEAVES -----------------------------------*/

app.get("/api/leaves", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM leaves");
    c.end();
    res.json(r);
});

app.post("/api/leaves", auth, async (req, res) => {
    const c = await db();
    await c.query(
        "INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status) VALUES (?,?,?,?,?,?)",
        [req.user.id, req.body.leave_type, req.body.start_date, req.body.end_date, req.body.reason, 'Pending']
    );
    c.end();
    res.json({ message: "Leave request submitted" });
});

app.put("/api/leaves/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query(
        "UPDATE leaves SET status=?, approval_date=NOW() WHERE id=?",
        [req.body.status, req.params.id]
    );
    c.end();
    res.json({ message: "Leave request updated" });
});


/* ---------------- ANNOUNCEMENTS -----------------------------------*/

app.get("/api/announcements", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM announcements WHERE starts_at <= NOW() AND ends_at >= NOW()");
    c.end();
    res.json(r);
});

app.post("/api/announcements", auth, admin, async (req, res) => {
    const c = await db();
    // normalize incoming ISO datetimes to MySQL DATETIME (no trailing Z)
    const starts = toMySQLDateTime(req.body.starts_at) || null;
    const ends = toMySQLDateTime(req.body.ends_at) || null;
    await c.query(
        "INSERT INTO announcements (title, body, created_by, starts_at, ends_at) VALUES (?,?,?,?,?)",
        [req.body.title, req.body.body, req.user.id, starts, ends]
    );
    c.end();
    res.json({ message: "Announcement created" });
});


/* ---------------- EMPLOYEE PROFILE -----------------------------------*/

app.get("/api/profile", auth, async (req, res) => {
    // return profile for the employee mapped to current user
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({});
    const c = await db();
    const [r] = await c.query(
        `SELECT e.*, l.name as location, d.name as department, dg.name as designation
   FROM employees e
   LEFT JOIN locations l ON e.LocationId = l.id
   LEFT JOIN departments d ON e.DepartmentId = d.id
   LEFT JOIN designations dg ON e.DesignationId = dg.id
   WHERE e.id = ? LIMIT 1`,
        [emp.id]
    );
    c.end();
    res.json(r[0] || {});
});

app.put("/api/profile", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    const c = await db();
    await c.query(
        "UPDATE employees SET PersonalEmail=?, PhysicallyHandicapped=?, DateOfBirth=? WHERE id = ?",
        [req.body.personal_email, req.body.physically_handicapped || 0, req.body.date_of_birth || null, emp.id]
    );
    c.end();
    res.json({ message: "Profile updated" });
});


/* ---------------- SALARY SLIP -----------------------------------*/

app.get("/api/payslips/:employee_id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM payroll_slips WHERE employee_id=? ORDER BY created_at DESC LIMIT 12",
        [req.params.employee_id]
    );
    c.end();
    res.json(r);
});

app.get("/api/payslips/:employee_id/:slip_id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM payroll_slips WHERE id=? AND employee_id=?",
        [req.params.slip_id, req.params.employee_id]
    );
    c.end();
    res.json(r[0] || {});
});


/* ---------------- ATTENDANCE REPORT -----------------------------------*/

app.get("/api/attendance-report", auth, admin, async (req, res) => {
    const c = await db();
    const { start_date, end_date, employee_id } = req.query;
    let query = "SELECT a.*, e.EmployeeNumber, e.FullName FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE 1=1";
    let params = [];

    if (start_date) { query += " AND a.punch_date >= ?"; params.push(start_date); }
    if (end_date) { query += " AND a.punch_date <= ?"; params.push(end_date); }
    if (employee_id) { query += " AND a.employee_id = ?"; params.push(employee_id); }

    query += " ORDER BY a.punch_date DESC";
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});


/* ---------------- EMPLOYEE SEARCH -----------------------------------*/

app.get("/api/employees/search", auth, async (req, res) => {
    const c = await db();
    const { keyword } = req.query;
    const searchTerm = `%${keyword}%`;
    const [r] = await c.query(
        "SELECT * FROM employees WHERE EmployeeNumber LIKE ? OR FullName LIKE ? OR WorkEmail LIKE ? LIMIT 50",
        [searchTerm, searchTerm, searchTerm]
    );
    c.end();
    res.json(r);
});


/* ---------------- LEAVE BALANCE -----------------------------------*/

app.get("/api/leave-balance/:employee_id", auth, async (req, res) => {
    const c = await db();
    const currentYear = new Date().getFullYear();
    const [r] = await c.query(
        `SELECT leave_type, COUNT(*) as count FROM leaves 
   WHERE employee_id=? AND status='Approved' AND YEAR(start_date)=? 
   GROUP BY leave_type`,
        [req.params.employee_id, currentYear]
    );
    c.end();

    const leaveTypes = ['Casual', 'Sick', 'Earned', 'Unpaid'];
    const balance = {};
    leaveTypes.forEach(lt => { balance[lt] = 0; });
    r.forEach(row => { balance[row.leave_type] = row.count; });

    res.json({ employee_id: req.params.employee_id, year: currentYear, balance });
});

// Insert new endpoints for birthday list and wishes
app.get("/api/birthdays", auth, async (req, res) => {
    const daysWindow = parseInt(req.query.days, 10) || 30;
    const c = await db();
    try {
        const [rows] = await c.query("SELECT id, EmployeeNumber, FullName, DateOfBirth, WorkEmail FROM employees WHERE DateOfBirth IS NOT NULL");
        const today = new Date();
        const results = rows.map(emp => {
            const dob = emp.DateOfBirth instanceof Date ? emp.DateOfBirth : new Date(emp.DateOfBirth);
            if (isNaN(dob.getTime())) return null;
            const thisYear = today.getFullYear();
            let next = new Date(thisYear, dob.getMonth(), dob.getDate());
            if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
                next.setFullYear(thisYear + 1);
            }
            const diffDays = Math.ceil((next - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / (1000 * 60 * 60 * 24));
            const ageTurning = next.getFullYear() - dob.getFullYear();
            return {
                id: emp.id,
                EmployeeNumber: emp.EmployeeNumber,
                FullName: emp.FullName,
                DateOfBirth: dob.toISOString().slice(0, 10),
                next_birthday: next.toISOString().slice(0, 10),
                days_until: diffDays,
                turning_age: ageTurning,
                WorkEmail: emp.WorkEmail
            };
        }).filter(Boolean).filter(e => e.days_until <= daysWindow).sort((a, b) => a.days_until - b.days_until);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch birthdays", message: err.message });
    } finally {
        c.end();
    }
});

app.post("/api/birthday-wishes", auth, async (req, res) => {
    const { employee_id, message } = req.body;
    if (!employee_id || !message) return res.status(400).json({ error: "employee_id and message required" });
    const c = await db();
    try {
        await c.query("INSERT INTO birthday_wishes (sender_id, employee_id, message) VALUES (?,?,?)", [req.user.id, employee_id, message]);
        // optional: could create an announcement / notification here
        res.json({ message: "Wish recorded" });
    } catch (err) {
        res.status(500).json({ error: "Failed to save wish", message: err.message });
    } finally {
        c.end();
    }
});

app.get("/api/birthday-wishes/:employee_id", auth, async (req, res) => {
    const employeeId = req.params.employee_id;
    const c = await db();
    try {
        const [r] = await c.query(
            `SELECT bw.id, bw.message, bw.created_at, u.id as sender_user_id, u.username as sender_username, u.full_name as sender_name
       FROM birthday_wishes bw
       LEFT JOIN users u ON bw.sender_id = u.id
       WHERE bw.employee_id = ?
       ORDER BY bw.created_at DESC`,
            [employeeId]
        );
        c.end();
        res.json(r);
    } catch (err) {
        c.end();
        res.status(500).json({ error: "Failed to fetch wishes", message: err.message });
    }
});

// Logout (token invalidation - client-side implementation)
app.post("/api/auth/logout", auth, (req, res) => {
    res.json({ message: "Logged out successfully. Please discard token client-side." });
});

// Refresh token
app.post("/api/auth/refresh-token", auth, (req, res) => {
    const newToken = jwt.sign(
        { id: req.user.id, role: req.user.role },
        JWT_SECRET,
        { expiresIn: "8h" }
    );
    res.json({ token: newToken });
});

// Send password setup link
app.post("/api/auth/password/setup/send/:empId", auth, admin, async (req, res) => {
    const c = await db();
    const [emp] = await c.query("SELECT id, WorkEmail FROM employees WHERE id = ?", [req.params.empId]);
    c.end();
    if (!emp.length) return res.status(404).json({ error: "Employee not found" });
    // Mock email send
    const token = jwt.sign({ empId: req.params.empId, type: "setup" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ message: "Setup link sent to email (mock)", token });
});

// Validate password setup token
app.get("/api/auth/password/setup/validate", async (req, res) => {
    try {
        const decoded = jwt.verify(req.query.token, JWT_SECRET);
        res.json({ valid: true, empId: decoded.empId });
    } catch {
        res.status(400).json({ error: "Invalid or expired token" });
    }
});

// Create password for new employee
app.post("/api/auth/password/create", async (req, res) => {
    const { employee_id, password } = req.body;
    if (!employee_id || !password) return res.status(400).json({ error: "Employee ID and password required" });

    const c = await db();
    try {
        // support passing either employee id (numeric) or work-email
        let emp;
        if (/^\d+$/.test(String(employee_id))) {
            const [rows] = await c.query("SELECT WorkEmail, FullName FROM employees WHERE id = ?", [employee_id]);
            emp = rows;
        } else {
            const [rows] = await c.query("SELECT WorkEmail, FullName FROM employees WHERE WorkEmail = ?", [employee_id]);
            emp = rows;
        }
        if (!emp || !emp.length) { c.end(); return res.status(404).json({ error: "Employee not found" }); }

        const hash = await bcrypt.hash(password, 10);
        const username = emp[0].WorkEmail;
        const fullName = emp[0].FullName || 'Employee';

        // normalize role to allowed set
        const role = 'employee';

        // if user exists, update password and fullname; else insert
        // Use atomic upsert to avoid race conditions leading to duplicate username errors
        await c.query(
            "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), full_name = VALUES(full_name)",
            [username, hash, role, fullName]
        );

        c.end();
        res.json({ message: "Password set successfully" });
    } catch (err) {
        c.end();
        console.error('password create error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Request password reset
app.post("/api/auth/password/reset/request", async (req, res) => {
    const { username } = req.body;
    const c = await db();
    const [u] = await c.query("SELECT id FROM users WHERE username = ?", [username]);
    c.end();
    if (!u.length) return res.status(404).json({ error: "User not found" });
    const token = jwt.sign({ userId: u[0].id, type: "reset" }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Reset link sent (mock email)", token });
});

// Confirm password reset
app.post("/api/auth/password/reset/confirm", async (req, res) => {
    const { token, password } = req.body;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const hash = await bcrypt.hash(password, 10);
        const c = await db();
        await c.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, decoded.userId]);
        c.end();
        res.json({ message: "Password reset successfully" });
    } catch {
        res.status(400).json({ error: "Invalid or expired token" });
    }
});

/* ============ 2. EMPLOYEE MASTER ============ */

// Update existing employee GET to include pagination & filters
app.get("/api/employees", auth, async (req, res) => {
    const c = await db();
    const { status, dept, limit = 50, offset = 0 } = req.query;
    let query = "SELECT * FROM employees WHERE 1=1";
    let params = [];
    if (status) { query += " AND EmploymentStatus = ?"; params.push(status); }
    if (dept) { query += " AND DepartmentId = ?"; params.push(dept); }
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

// Get single employee
app.get("/api/employees/:id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM employees WHERE id = ?", [req.params.id]);
    c.end();
    res.json(r[0] || {});
});

// Update employee
app.put("/api/employees/:id", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE employees SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ message: "Employee updated" });
});

// Delete employee
app.delete("/api/employees/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM employees WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ message: "Employee deleted" });
});

// Deactivate employee
app.put("/api/employees/:id/deactivate", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE employees SET EmploymentStatus = 'Inactive' WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ message: "Employee deactivated" });
});

// Get reporting manager's team
app.get("/api/employees/reporting/:managerId", auth, manager, async (req, res) => {
    const c = await db();
    // Assumes employees table has manager_id foreign key (add if needed)
    const [r] = await c.query("SELECT * FROM employees WHERE manager_id = ?", [req.params.managerId]);
    c.end();
    res.json(r);
});

/* ============ 3. ONBOARDING WORKFLOW ============ */

// Onboarding steps master (if not exists, create table)
// CREATE TABLE onboarding_steps (id INT PK, step_name VARCHAR, order INT, required TINYINT)
// CREATE TABLE onboarding_progress (id INT PK, employee_id INT, step_id INT, status VARCHAR, completed_date TIMESTAMP)

app.post("/api/onboarding/step", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("INSERT INTO onboarding_steps (step_name, `order`, required) VALUES (?, ?, ?)",
        [req.body.step_name, req.body.order, req.body.required || 1]);
    c.end();
    res.json({ message: "Onboarding step created" });
});

app.get("/api/onboarding/steps", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM onboarding_steps ORDER BY `order`");
    c.end();
    res.json(r);
});

app.put("/api/onboarding/step/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE onboarding_steps SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ message: "Step updated" });
});

app.delete("/api/onboarding/step/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM onboarding_steps WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ message: "Step deleted" });
});

app.post("/api/onboarding/assign/:empId", auth, hr, async (req, res) => {
    const c = await db();
    const [steps] = await c.query("SELECT id FROM onboarding_steps");
    for (const step of steps) {
        await c.query("INSERT INTO onboarding_progress (employee_id, step_id, status) VALUES (?, ?, ?)",
            [req.params.empId, step.id, 'Pending']);
    }
    c.end();
    res.json({ message: "Onboarding assigned" });
});

app.put("/api/onboarding/complete/:stepId", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE onboarding_progress SET status = ?, completed_date = NOW() WHERE id = ?",
        ['Completed', req.params.stepId]);
    c.end();
    res.json({ message: "Step completed" });
});

app.get("/api/onboarding/status/:empId", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        `SELECT op.*, os.step_name FROM onboarding_progress op 
     JOIN onboarding_steps os ON op.step_id = os.id 
     WHERE op.employee_id = ? ORDER BY os.order`,
        [req.params.empId]
    );
    c.end();
    res.json(r);
});

/* ============ 4. ATTENDANCE MANAGEMENT ============ */

// Check-in
app.post("/api/attendance/checkin", auth, async (req, res) => {
    const c = await db();
    let empRec = null;
    if (req.body.employee_id) {
        const [e] = await c.query("SELECT id FROM employees WHERE id = ?", [req.body.employee_id]);
        if (e && e.length) empRec = e[0];
    }
    if (!empRec) {
        // try to map current user to employee
        empRec = await findEmployeeByUserId(req.user.id);
    }
    if (!empRec) { c.end(); return res.status(404).json({ error: "Employee not found" }); }
    // Use upsert to avoid duplicate key errors when check-in is repeated for same day
    await c.query(
        "INSERT INTO attendance (employee_id, punch_date, punch_in_time, source) VALUES (?, CURDATE(), CURTIME(), ?) ON DUPLICATE KEY UPDATE punch_in_time = VALUES(punch_in_time), source = VALUES(source)",
        [empRec.id, req.body.source || 'mobile']
    );
    c.end();
    res.json({ message: "Check-in recorded" });
});

// Check-out
app.post("/api/attendance/checkout", auth, async (req, res) => {
    const c = await db();
    let empId = req.body.employee_id || null;
    if (!empId) {
        const emp = await findEmployeeByUserId(req.user.id);
        if (emp) empId = emp.id;
    }
    if (!empId) { c.end(); return res.status(404).json({ error: 'Employee not found' }); }
    // Ensure checkout is applied even if no checkin row exists for today
    await c.query(
        "INSERT INTO attendance (employee_id, punch_date, punch_in_time, punch_out_time, source) VALUES (?, CURDATE(), NULL, CURTIME(), ?) ON DUPLICATE KEY UPDATE punch_out_time = VALUES(punch_out_time)",
        [empId, req.body.source || 'mobile']
    );
    c.end();
    res.json({ message: "Check-out recorded" });
});

// My attendance
app.get("/api/attendance/me", auth, async (req, res) => {
    const c = await db();
    const { from, to } = req.query;
    // resolve employee id for current user
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) { c.end(); return res.status(404).json({ error: 'Employee not found' }); }
    let query = "SELECT * FROM attendance WHERE employee_id = ?";
    let params = [emp.id];
    if (from) { query += " AND punch_date >= ?"; params.push(from); }
    if (to) { query += " AND punch_date <= ?"; params.push(to); }
    query += " ORDER BY punch_date DESC";
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

// Mark attendance (admin)
app.post("/api/attendance/mark", auth, hr, async (req, res) => {
    const c = await db();
    await c.query(
        "INSERT INTO attendance (employee_id, punch_date, punch_in_time, punch_out_time) VALUES (?, ?, ?, ?)",
        [req.body.employee_id, req.body.punch_date, req.body.punch_in_time, req.body.punch_out_time]
    );
    c.end();
    res.json({ message: "Attendance marked" });
});

// Update attendance
app.put("/api/attendance/:id", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE attendance SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ message: "Attendance updated" });
});

// Delete attendance
app.delete("/api/attendance/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM attendance WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ message: "Attendance deleted" });
});

// Employee attendance report
app.get("/api/attendance/employee/:empId", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM attendance WHERE employee_id = ? ORDER BY punch_date DESC LIMIT 100",
        [req.params.empId]);
    c.end();
    res.json(r);
});

// Monthly attendance summary
app.get("/api/attendance/monthly", auth, hr, async (req, res) => {
    const c = await db();
    const { month, year } = req.query;
    const [r] = await c.query(
        `SELECT employee_id, COUNT(*) as days_present, 
     SUM(TIME_TO_SEC(TIMEDIFF(punch_out_time, punch_in_time))/3600) as total_hours
     FROM attendance 
     WHERE MONTH(punch_date) = ? AND YEAR(punch_date) = ?
     GROUP BY employee_id`,
        [month, year]
    );
    c.end();
    res.json(r);
});

// Attendance summary per employee
app.get("/api/attendance/summary/:empId", auth, async (req, res) => {
    const c = await db();
    const currentYear = new Date().getFullYear();
    const [r] = await c.query(
        `SELECT MONTH(punch_date) as month, COUNT(*) as days_present 
     FROM attendance WHERE employee_id = ? AND YEAR(punch_date) = ?
     GROUP BY MONTH(punch_date)`,
        [req.params.empId, currentYear]
    );
    c.end();
    res.json(r);
});

/* ============ 5. TIMESHEETS ============ */

// Already exist, add approval endpoints

app.put("/api/timesheet/:id/approve", auth, manager, async (req, res) => {
    const c = await db();
    await c.query("UPDATE timesheets SET status = ? WHERE id = ?", ['Approved', req.params.id]);
    c.end();
    res.json({ message: "Timesheet approved" });
});

app.put("/api/timesheet/:id/reject", auth, manager, async (req, res) => {
    const c = await db();
    await c.query("UPDATE timesheets SET status = ? WHERE id = ?", ['Rejected', req.params.id]);
    c.end();
    res.json({ message: "Timesheet rejected" });
});

app.get("/api/timesheet/me", auth, async (req, res) => {
    const c = await db();
    const { from, to } = req.query;
    let query = "SELECT * FROM timesheets WHERE employee_id = ?";
    let params = [req.user.id];
    if (from) { query += " AND date >= ?"; params.push(from); }
    if (to) { query += " AND date <= ?"; params.push(to); }
    query += " ORDER BY date DESC";
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

app.get("/api/timesheet/employee/:empId", auth, manager, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM timesheets WHERE employee_id = ? ORDER BY date DESC",
        [req.params.empId]);
    c.end();
    res.json(r);
});

app.get("/api/timesheet/all", auth, hr, async (req, res) => {
    const c = await db();
    const { date } = req.query;
    let query = "SELECT t.*, e.FullName FROM timesheets t JOIN employees e ON t.employee_id = e.id WHERE 1=1";
    let params = [];
    if (date) { query += " AND t.date = ?"; params.push(date); }
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

/* ============ 6. LEAVE MANAGEMENT ============ */

// Leave types master
app.post("/api/leave/types", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("INSERT INTO leave_types (type_name, days_allowed) VALUES (?, ?)",
        [req.body.type_name, req.body.days_allowed]);
    c.end();
    res.json({ message: "Leave type created" });
});

app.get("/api/leave/types", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM leave_types");
    c.end();
    res.json(r);
});

app.put("/api/leave/types/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE leave_types SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ message: "Leave type updated" });
});

app.delete("/api/leave/types/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM leave_types WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ message: "Leave type deleted" });
});

// Apply leave (already exists, enhance)
app.post("/api/leave/apply", auth, async (req, res) => {
    const c = await db();
    await c.query(
        "INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.id, req.body.leave_type, req.body.start_date, req.body.end_date, req.body.reason, 'Pending']
    );
    c.end();
    res.json({ message: "Leave request submitted" });
});

app.get("/api/leave/my", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM leaves WHERE employee_id = ? ORDER BY created_at DESC", [req.user.id]);
    c.end();
    res.json(r);
});

app.put("/api/leave/cancel/:leaveId", auth, async (req, res) => {
    const c = await db();
    await c.query("UPDATE leaves SET status = ? WHERE id = ? AND employee_id = ?",
        ['Cancelled', req.params.leaveId, req.user.id]);
    c.end();
    res.json({ message: "Leave cancelled" });
});

app.get("/api/leave/pending", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM leaves WHERE status = 'Pending' ORDER BY created_at");
    c.end();
    res.json(r);
});

app.put("/api/leave/approve/:leaveId", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE leaves SET status = ?, approval_date = NOW() WHERE id = ?",
        ['Approved', req.params.leaveId]);
    c.end();
    res.json({ message: "Leave approved" });
});

app.put("/api/leave/reject/:leaveId", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE leaves SET status = ? WHERE id = ?", ['Rejected', req.params.leaveId]);
    c.end();
    res.json({ message: "Leave rejected" });
});

/* ============ 7. PAYROLL SETTINGS ============ */

app.post("/api/payroll/defaults", auth, admin, async (req, res) => {
    const c = await db();
    await c.query(
        "INSERT INTO payroll_defaults (key_name, key_value) VALUES (?, ?)",
        [req.body.key_name, req.body.key_value]
    );
    c.end();
    res.json({ message: "Payroll default set" });
});

app.get("/api/payroll/defaults", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_defaults");
    c.end();
    res.json(r);
});

app.put("/api/payroll/defaults/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE payroll_defaults SET key_value = ? WHERE id = ?", [req.body.key_value, req.params.id]);
    c.end();
    res.json({ message: "Payroll default updated" });
});

/* ============ 8. SALARY STRUCTURE ============ */

app.post("/api/salary/structure/:empId", auth, admin, async (req, res) => {
    const c = await db();
    try {
        // If client posted a single component (backwards compatible)
        if (req.body && req.body.component_name) {
            await c.query(
                "INSERT INTO salary_structures (employee_id, component_name, component_value) VALUES (?, ?, ?)",
                [req.params.empId, req.body.component_name, req.body.component_value]
            );
            res.json({ message: "Salary component added" });
            return;
        }

        // If client posted a structured payload (recommended)
        // e.g. { lpa: 6.5, basic_pct: 40, hra_pct: 40, medical_allowance: 1250 }
        const allowedKeys = Object.keys(req.body || {});
        if (allowedKeys.length === 0) {
            res.status(400).json({ error: 'No salary components provided' });
            return;
        }

        // Upsert components: delete existing keys for this employee then insert new ones
        for (const k of allowedKeys) {
            const v = req.body[k];
            // delete existing
            await c.query("DELETE FROM salary_structures WHERE employee_id = ? AND component_name = ?", [req.params.empId, k]);
            // insert new
            await c.query("INSERT INTO salary_structures (employee_id, component_name, component_value) VALUES (?, ?, ?)", [req.params.empId, k, v]);
        }

        // Attempt to update employees table columns safely by checking existing columns
        // Map common salary keys to likely employee column names
        const keyMap = {
            lpa: ['lpa','LPA','annual_salary_lpa'],
            paid_basic_monthly: ['paid_basic_monthly','paid_basic','PaidBasic','basic_monthly','monthly_basic','basic'],
            basic_pct: ['basic_pct','basic_percent'],
            hra_pct: ['hra_pct','hra_percent'],
            medical_allowance: ['medical_allowance','medical','medical_amount'],
            transport_allowance: ['transport_allowance','transport','transport_amount'],
            special_allowance: ['special_allowance','special','special_amount'],
            monthly_salary: ['monthly_salary','monthly_gross','monthly_gross_amount','gross_amount','remuneration_amount']
        };

        // get employee table columns
        const [cols] = await c.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees'", [DB.database]);
        const colSet = new Set((cols || []).map(r => r.COLUMN_NAME));

        // Build employee update from a known list of salary keys (explicit and predictable)
        const empUpdate = {};
        const salaryKeys = [
            'lpa','basic_pct','hra_pct','medical_allowance','transport_allowance','special_allowance',
            'paid_basic_monthly','working_days','loss_of_days','monthly_salary','monthly_gross','gross_amount'
        ];

        for (const k of salaryKeys) {
            if (Object.prototype.hasOwnProperty.call(req.body, k)) {
                // prefer direct column name if exists
                if (colSet.has(k)) {
                    empUpdate[k] = req.body[k];
                    continue;
                }
                // fallback to keyMap candidates
                const candidates = keyMap[k] || [k];
                for (const cand of candidates) {
                    if (colSet.has(cand)) { empUpdate[cand] = req.body[k]; break; }
                }
            }
        }

        // If we computed a monthly gross from lpa, set common monthly column if present
        if (!empUpdate.monthly_salary && req.body.lpa) {
            try {
                const lpa = Number(req.body.lpa) || 0;
                const monthlyGross = (lpa * 100000) / 12;
                const grossCols = ['monthly_salary','monthly_gross','monthly_gross_amount','gross_amount','remuneration_amount'];
                for (const g of grossCols) {
                    if (colSet.has(g)) { empUpdate[g] = Math.round((monthlyGross + Number.EPSILON) * 100) / 100; break; }
                }
            } catch (e) { }
        }

        if (Object.keys(empUpdate).length > 0) {
            // perform safe update
            await c.query("UPDATE employees SET ? WHERE id = ?", [empUpdate, req.params.empId]);
        }

        res.json({ message: 'Salary structure updated', updated_employee_columns: Object.keys(empUpdate) });
    } catch (err) {
        console.error('salary structure error', err);
        res.status(500).json({ error: 'Failed to save salary structure' });
    } finally {
        c.end();
    }
});

app.get("/api/salary/structure/:empId", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM salary_structures WHERE employee_id = ?", [req.params.empId]);
    c.end();
    res.json(r);
});

/* ============ 9. PAYROLL GENERATION ============ */

app.post("/api/payroll/generate", auth, admin, async (req, res) => {
    const { payroll_month, payroll_type, include_inactive, employee_id } = req.body;
    const c = await db();
    try {
        // Create payroll run
        const [res1] = await c.query("INSERT INTO payroll_runs (payroll_month, payroll_type) VALUES (?, ?)",
            [payroll_month, payroll_type]);
        const runId = res1.insertId;

        // Build employee selection based on flags (all active by default)
        let empQuery = `
            SELECT e.*, pd.basic AS pd_basic, pd.hra AS pd_hra, pd.medical_allowance AS pd_medical,
                   pd.transport_allowance AS pd_transport, pd.special_allowance AS pd_special
            FROM employees e
            LEFT JOIN emp_pay_details pd ON pd.employee_id = e.id
        `;
        const empParams = [];
        if (employee_id) {
            empQuery += ` WHERE e.id = ?`;
            empParams.push(employee_id);
        } else if (!include_inactive) {
            empQuery += ` WHERE e.EmploymentStatus = 'Active'`;
        }
        const [emps] = await c.query(empQuery, empParams);

        // Generate slip for each employee using available data (employees columns > emp_pay_details > salary_structures fallback)
        for (const e of emps) {
            try {
                // Determine basic monthly
                let basic = null;
                if (e.paid_basic_monthly && !isNaN(e.paid_basic_monthly)) basic = Number(e.paid_basic_monthly);
                else if (e.pd_basic && !isNaN(e.pd_basic)) basic = Number(e.pd_basic);
                else if (e.lpa && !isNaN(e.lpa)) {
                    const annual = Number(e.lpa) * 100000;
                    const monthlyGross = annual / 12;
                    const basicPct = (!isNaN(e.basic_pct) && e.basic_pct !== null) ? Number(e.basic_pct) : 40;
                    basic = monthlyGross * (basicPct / 100);
                } else {
                    basic = 0;
                }

                // HRA
                let hra = null;
                if (e.pd_hra && !isNaN(e.pd_hra)) hra = Number(e.pd_hra);
                else if (!isNaN(e.hra_pct) && e.hra_pct !== null) hra = basic * (Number(e.hra_pct) / 100);
                else hra = 0;

                // Allowances
                const med = (e.pd_medical && !isNaN(e.pd_medical)) ? Number(e.pd_medical) : (e.medical_allowance ? Number(e.medical_allowance) : 0);
                const trans = (e.pd_transport && !isNaN(e.pd_transport)) ? Number(e.pd_transport) : (e.transport_allowance ? Number(e.transport_allowance) : 0);
                const spec = (e.pd_special && !isNaN(e.pd_special)) ? Number(e.pd_special) : (e.special_allowance ? Number(e.special_allowance) : 0);

                const gross = (Number(basic) || 0) + (Number(hra) || 0) + (med || 0) + (trans || 0) + (spec || 0);

                // Deductions: PF 12% of basic, ESI 1.75% of gross (simple defaults)
                const pf_employee = (Number(basic) || 0) * 0.12;
                const esi_employee = (gross || 0) * 0.0175;
                const total_deductions = pf_employee + esi_employee;
                const net_pay = (gross || 0) - total_deductions;

                const slip = {
                    payroll_run_id: runId,
                    employee_id: e.id,
                    employment_status: e.EmploymentStatus || null,
                    date_of_joining: e.DateJoined || null,
                    date_of_birth: e.DateOfBirth || null,
                    location_name: e.LocationId || null,
                    department_name: e.DepartmentId || null,
                    job_title: e.DesignationId || null,
                    payroll_status: 'Generated',
                    actual_payable_days: e.working_days || null,
                    working_days: e.working_days || null,
                    loss_of_pay_days: e.loss_of_days || null,
                    days_payable: (e.working_days && e.loss_of_days) ? (Number(e.working_days) - Number(e.loss_of_days)) : null,
                    payable_units: null,
                    remuneration_amount: gross,
                    basic: basic,
                    hra: hra,
                    medical_allowance: med,
                    transport_allowance: trans,
                    special_allowance: spec,
                    gross_amount: gross,
                    pf_employee: pf_employee,
                    esi_employee: esi_employee,
                    total_deductions: total_deductions,
                    net_pay: net_pay
                };

                await c.query(`INSERT INTO payroll_slips SET ?`, slip);
            } catch (innerErr) {
                console.error('payroll slip generation error for emp', e.id, innerErr.message);
                // continue to next employee
            }
        }
        // Return run id and count (count may be zero if no slips created)
        const [cnt] = await c.query("SELECT COUNT(*) as cnt FROM payroll_slips WHERE payroll_run_id = ?", [runId]);
        const total = (cnt && cnt[0]) ? cnt[0].cnt : 0;
        c.end();
        res.json({ message: "Payroll generated", run_id: runId, count: total });
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

// List payroll runs with slip counts
app.get('/api/payroll/runs', auth, hr, async (req, res) => {
    const c = await db();
    try {
        const [r] = await c.query(`
            SELECT pr.*, IFNULL(COUNT(ps.id),0) as slip_count
            FROM payroll_runs pr
            LEFT JOIN payroll_slips ps ON ps.payroll_run_id = pr.id
            GROUP BY pr.id
            ORDER BY pr.created_at DESC
            LIMIT 50
        `);
        c.end();
        res.json(r || []);
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/payslips", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT ps.*, e.FullName FROM payroll_slips ps JOIN employees e ON ps.employee_id = e.id LIMIT 100");
    c.end();
    res.json(r);
});

app.get("/api/payslips/:id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_slips WHERE id = ?", [req.params.id]);
    c.end();
    res.json(r[0] || {});
});

app.get("/api/payslips/:id/pdf", auth, async (req, res) => {
    res.json({ message: "PDF generation endpoint (integrate pdfkit library)", slip_id: req.params.id });
});

app.post("/api/payroll/recalculate/:empId", auth, admin, async (req, res) => {
    const c = await db();
    try {
        const empId = req.params.empId;
        // Acceptable columns to update in payroll_slips
        const allowed = ['basic','hra','medical_allowance','transport_allowance','special_allowance','gross_amount','total_deductions','net_pay'];
        const updates = [];
        const values = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                updates.push(`${k} = ?`);
                values.push(req.body[k]);
            }
        }
        if (updates.length === 0) {
            // fallback to previous behavior
            if (req.body.net_pay === undefined) return res.status(400).json({ error: 'No fields to update' });
            await c.query("UPDATE payroll_slips SET net_pay = ? WHERE employee_id = ?", [req.body.net_pay, empId]);
            c.end();
            return res.json({ message: "Payroll recalculated" });
        }
        const sql = `UPDATE payroll_slips SET ${updates.join(', ')} WHERE employee_id = ?`;
        values.push(empId);
        await c.query(sql, values);
        c.end();
        res.json({ message: 'Payroll recalculated', updated: updates.length });
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

/* ============ 10. NOTIFICATIONS ============ */

app.get("/api/notifications", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        [req.user.id]
    );
    c.end();
    res.json(r);
});

app.post("/api/notifications/mark-read/:id", auth, async (req, res) => {
    const c = await db();
    await c.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id]);
    c.end();
    res.json({ message: "Marked as read" });
});

app.delete("/api/notifications/:id", auth, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM notifications WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id]);
    c.end();
    res.json({ message: "Notification deleted" });
});

/* ============ 11. REPORTS ============ */

app.get("/api/reports/attendance", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        `SELECT e.EmployeeNumber, e.FullName, COUNT(a.id) as days_present, 
     ROUND(COUNT(a.id) * 100.0 / 30, 2) as attendance_percentage
     FROM employees e LEFT JOIN attendance a ON e.id = a.employee_id 
     AND MONTH(a.punch_date) = MONTH(CURDATE()) AND YEAR(a.punch_date) = YEAR(CURDATE())
     GROUP BY e.id ORDER BY attendance_percentage DESC`
    );
    c.end();
    res.json(r);
});

app.get("/api/reports/leave", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        `SELECT leave_type, COUNT(*) as count, SUM(DATEDIFF(end_date, start_date)) as total_days
     FROM leaves WHERE YEAR(start_date) = YEAR(CURDATE())
     GROUP BY leave_type`
    );
    c.end();
    res.json(r);
});

app.get("/api/reports/payroll", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        `SELECT payroll_month, COUNT(*) as count, 
     SUM(net_pay) as total_net_pay, SUM(gross_amount) as total_gross
     FROM payroll_slips GROUP BY payroll_month ORDER BY payroll_month DESC LIMIT 12`
    );
    c.end();
    res.json(r);
});

app.get("/api/reports/headcount", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        `SELECT EmploymentStatus, COUNT(*) as count FROM employees GROUP BY EmploymentStatus`
    );
    c.end();
    res.json(r);
});

app.get("/api/reports/attrition", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        `SELECT YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as left_count
     FROM employees WHERE EmploymentStatus = 'Inactive'
     GROUP BY YEAR(created_at), MONTH(created_at) ORDER BY year DESC, month DESC LIMIT 12`
    );
    c.end();
    res.json(r);
});

/* ============ 12. SYSTEM & ADMIN ============ */

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date(),
        server: "HRMS API v1.0"
    });
});



/* ---------------- SWAGGER UI -----------------------------------*/

const swagger = {
    openapi: "3.0.0",
    info: {
        title: "HRMS API Complete",
        version: "1.0.0",
        description: "Human Resource Management System API with Auth, Employees, Payroll, Attendance, Timesheets, and more"
    },
    servers: [{ url:API_BASE_URL || "http://localhost:4201", description: "Local server" }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT token from /api/login"
            }
        },
        schemas: {
            User: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    username: { type: "string" },
                    role: { type: "string", enum: ["admin", "user"] },
                    password_hash: { type: "string" }
                },
                required: ["username", "role"]
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
                    JoiningDate: { type: "string", format: "date" }
                }
            },
            Attendance: { 
                type: "object",
                properties: {
                    id: { type: "integer" },
                    employee_id: { type: "integer" },
                    punch_date: { type: "string", format: "date" },
                    punch_in_time: { type: "string", format: "time" },
                    punch_out_time: { type: "string", format: "time" }
                }
            },
            Timesheet: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    employee_id: { type: "integer" },
                    project_id: { type: "integer" },
                    hours: { type: "number" },
                    submission_date: { type: "string", format: "date" }
                }
            },
            Payroll: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    payroll_run_id: { type: "integer" },
                    employee_id: { type: "integer" },
                    gross_salary: { type: "number" },
                    deductions: { type: "number" },
                    net_salary: { type: "number" }
                }
            },
            Holiday: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    holiday_date: { type: "string", format: "date" },
                    holiday_name: { type: "string" }
                }
            },
            SupportTicket: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    employee_id: { type: "integer" },
                    subject: { type: "string" },
                    message: { type: "string" },
                    status: { type: "string", enum: ["Open", "In Progress", "Resolved"] }
                }
            },
            Birthday: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    EmployeeNumber: { type: "string" },
                    FullName: { type: "string" },
                    DateOfBirth: { type: "string", format: "date" },
                    next_birthday: { type: "string", format: "date" },
                    days_until: { type: "integer" },
                    turning_age: { type: "integer" },
                    WorkEmail: { type: "string" }
                }
            },
            BirthdayWish: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    sender_user_id: { type: "integer" },
                    sender_username: { type: "string" },
                    sender_name: { type: "string" },
                    message: { type: "string" },
                    created_at: { type: "string", format: "date-time" }
                }
            },
            Master: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" }
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

        "/api/access-matrix": {
            get: {
                summary: "Get Role-wise API Access Matrix",
                description: "Returns a matrix of which roles (admin/hr/manager/employee) are allowed to use each API (for frontend permission UI). Auth required.",
                tags: ["Meta"],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "Access matrix",
                        content: {
                            "application/json": {
                                schema: { type: "object" },
                                example: ACCESS_MATRIX
                            }
                        }
                    },
                    401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                }
            }
        },

        "/api/login": {
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
                                    password: { type: "string", format: "password", example: "admin123" }
                                },
                                required: ["username", "password"]
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
                                        token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                                        user: {
                                            type: "object",
                                            properties: {
                                                id: { type: "integer", example: 1 },
                                                username: { type: "string", example: "admin" },
                                                role: { type: "string", example: "admin" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    401: {
                        description: "Invalid credentials",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: { message: "Invalid credentials" }
                            }
                        }
                    }
                }
            }
        },

        "/api/onboarding/set-password": {
            post: {
                summary: "Set Initial Password",
                description: "First-time password setup for new employees",
                security: [],
                tags: ["Onboarding"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    username: { type: "string", example: "john.doe" },
                                    password: { type: "string", format: "password", example: "SecurePass@123" }
                                },
                                required: ["username", "password"]
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Password set successfully",
                        content: {
                            "application/json": {
                                example: { message: "Password set successfully" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/forgot-password": {
            post: {
                summary: "Forgot Password",
                description: "Request password reset link",
                security: [],
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    username: { type: "string", example: "john.doe" }
                                },
                                required: ["username"]
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Reset link sent",
                        content: {
                            "application/json": {
                                example: {
                                    message: "Password reset link sent (email mock)",
                                    token: "RESET-TOKEN-MOCK"
                                }
                            }
                        }
                    }
                }
            }
        },

        "/api/employees": {
            get: {
                summary: "Get All Employees",
                description: "Retrieve list of all employees",
                tags: ["Employees"],
                responses: {
                    200: {
                        description: "List of employees",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Employee" }
                                },
                                example: [
                                    { id: 1, EmployeeNumber: "EMP001", FullName: "John Doe", WorkEmail: "john@company.com", Department: "IT", Designation: "Developer" },
                                    { id: 2, EmployeeNumber: "EMP002", FullName: "Jane Smith", WorkEmail: "jane@company.com", Department: "HR", Designation: "Manager" }
                                ]
                            }
                        }
                    },
                    401: {
                        description: "Unauthorized",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
                    }
                }
            },
            post: {
                summary: "Create Employee",
                description: "Add new employee (Admin only)",
                tags: ["Employees"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Employee" },
                            example: {
                                EmployeeNumber: "EMP003",
                                FullName: "Bob Johnson",
                                WorkEmail: "bob@company.com",
                                Department: "Finance",
                                Designation: "Analyst"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Employee created",
                        content: { "application/json": { example: { message: "Employee created" } } }
                    },
                    403: {
                        description: "Admin access required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example: { error: "Admin only" } } }
                    }
                }
            }
        },

        "/api/candidates": {
            get: {
                summary: "Get All Candidates",
                description: "Retrieve list of all candidates with optional filters",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [
                    { name: "status", in: "query", schema: { type: "string", enum: ["offered", "offer_accepted", "offer_declined", "documents_pending", "bgv_initiated", "bgv_completed", "ready_to_join", "joined", "dropped_out"] } },
                    { name: "joining_date_from", in: "query", schema: { type: "string", format: "date" } },
                    { name: "joining_date_to", in: "query", schema: { type: "string", format: "date" } },
                    { name: "department_id", in: "query", schema: { type: "integer" } }
                ],
                responses: {
                    200: {
                        description: "List of candidates",
                        content: {
                            "application/json": {
                                example: [
                                    { id: 1, candidate_id: "CAN001", full_name: "Alice Johnson", email: "alice@example.com", position: "Software Engineer", status: "offer_accepted", joining_date: "2024-03-01" }
                                ]
                            }
                        }
                    },
                    401: { description: "Unauthorized" }
                }
            },
            post: {
                summary: "Create Candidate",
                description: "Add new candidate to the pre-onboarding pipeline",
                tags: ["Candidates & Pre-onboarding"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            example: {
                                first_name: "Alice",
                                last_name: "Johnson",
                                email: "alice@example.com",
                                phone: "1234567890",
                                position: "Software Engineer",
                                designation_id: 5,
                                department_id: 2,
                                location_id: 1,
                                offered_ctc: 800000,
                                joining_date: "2024-03-01",
                                reporting_manager_id: 10
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Candidate created",
                        content: { "application/json": { example: { success: true, candidate_id: 1, message: "Candidate created successfully" } } }
                    }
                }
            }
        },

        "/api/candidates/{id}": {
            get: {
                summary: "Get Candidate Details",
                description: "Retrieve candidate details including documents and task progress",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: {
                        description: "Candidate details",
                        content: {
                            "application/json": {
                                example: {
                                    candidate: { id: 1, full_name: "Alice Johnson", status: "offer_accepted" },
                                    documents: [{ id: 1, document_type: "resume", document_name: "resume.pdf", verified: 0 }],
                                    tasks: [{ id: 1, task_name: "Upload Photo", status: "completed" }],
                                    completion_percentage: "60.00"
                                }
                            }
                        }
                    }
                }
            },
            put: {
                summary: "Update Candidate",
                description: "Update candidate information",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { example: { phone: "9876543210", joining_date: "2024-03-15" } } }
                },
                responses: {
                    200: { description: "Candidate updated", content: { "application/json": { example: { success: true, message: "Candidate updated successfully" } } } }
                }
            }
        },

        "/api/candidates/{id}/send-offer": {
            post: {
                summary: "Send Offer Letter",
                description: "Mark offer letter as sent to candidate",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { description: "Offer sent", content: { "application/json": { example: { success: true, message: "Offer letter sent" } } } }
                }
            }
        },

        "/api/candidates/{id}/accept-offer": {
            post: {
                summary: "Accept Offer",
                description: "Candidate accepts the offer and auto-assigns pre-onboarding tasks",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { description: "Offer accepted", content: { "application/json": { example: { success: true, message: "Offer accepted, pre-onboarding tasks assigned" } } } }
                }
            }
        },

        "/api/candidates/{id}/decline-offer": {
            post: {
                summary: "Decline Offer",
                description: "Candidate declines the offer",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { example: { reason: "Accepted another offer" } } }
                },
                responses: {
                    200: { description: "Offer declined", content: { "application/json": { example: { success: true, message: "Offer declined" } } } }
                }
            }
        },

        "/api/candidates/{id}/documents": {
            post: {
                summary: "Upload Candidate Document",
                description: "Upload document for candidate verification",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    file: { type: "string", format: "binary" },
                                    document_type: { type: "string", enum: ["photo", "resume", "id_proof", "address_proof", "education_certificate"] }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Document uploaded", content: { "application/json": { example: { success: true, message: "Document uploaded successfully" } } } }
                }
            }
        },

        "/api/candidates/documents/{docId}/verify": {
            put: {
                summary: "Verify Document",
                description: "HR verifies submitted document",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "docId", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { example: { remarks: "Document verified successfully" } } }
                },
                responses: {
                    200: { description: "Document verified", content: { "application/json": { example: { success: true, message: "Document verified" } } } }
                }
            }
        },

        "/api/candidates/{id}/bgv/initiate": {
            post: {
                summary: "Initiate Background Verification",
                description: "Start BGV process for candidate",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { description: "BGV initiated", content: { "application/json": { example: { success: true, message: "BGV initiated" } } } }
                }
            }
        },

        "/api/candidates/{id}/bgv/status": {
            put: {
                summary: "Update BGV Status",
                description: "Update background verification status",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { example: { bgv_status: "completed", remarks: "All checks passed" } } }
                },
                responses: {
                    200: { description: "BGV status updated", content: { "application/json": { example: { success: true, message: "BGV status updated" } } } }
                }
            }
        },

        "/api/candidates/{id}/convert-to-employee": {
            post: {
                summary: "Convert Candidate to Employee",
                description: "Convert candidate to employee after completing pre-onboarding",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    content: { "application/json": { example: { employee_number: "EMP12345" } } }
                },
                responses: {
                    200: { description: "Candidate converted", content: { "application/json": { example: { success: true, employee_id: 100, message: "Candidate converted to employee successfully" } } } }
                }
            }
        },

        "/api/candidates/stats/dashboard": {
            get: {
                summary: "Candidate Dashboard Stats",
                description: "Get statistics for candidate pipeline",
                tags: ["Candidates & Pre-onboarding"],
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
                                    joined: 2
                                }
                            }
                        }
                    }
                }
            }
        },

        "/api/preonboarding/tasks": {
            get: {
                summary: "Get Pre-onboarding Task Templates",
                description: "Retrieve all pre-onboarding task templates",
                tags: ["Candidates & Pre-onboarding"],
                responses: {
                    200: {
                        description: "Task templates",
                        content: {
                            "application/json": {
                                example: [
                                    { id: 1, task_name: "Upload Photo", task_category: "document_submission", is_mandatory: 1, task_order: 1 }
                                ]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Pre-onboarding Task",
                description: "Create new pre-onboarding task template (HR/Admin only)",
                tags: ["Candidates & Pre-onboarding"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            example: {
                                task_name: "Upload Passport",
                                description: "Upload passport copy",
                                task_category: "document_submission",
                                is_mandatory: 0,
                                task_order: 20,
                                auto_assign: 1
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Task created", content: { "application/json": { example: { success: true, task_id: 10, message: "Pre-onboarding task created" } } } }
                }
            }
        },

        "/api/preonboarding/tasks/{id}": {
            put: {
                summary: "Update Task Template",
                description: "Update pre-onboarding task template",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { example: { task_name: "Upload Passport (Updated)", is_mandatory: 1 } } }
                },
                responses: {
                    200: { description: "Task updated", content: { "application/json": { example: { success: true, message: "Task template updated" } } } }
                }
            },
            delete: {
                summary: "Delete Task Template",
                description: "Delete pre-onboarding task template (Admin only)",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { description: "Task deleted", content: { "application/json": { example: { success: true, message: "Task template deleted" } } } }
                }
            }
        },

        "/api/preonboarding/assign/{candidateId}": {
            post: {
                summary: "Assign Tasks to Candidate",
                description: "Assign pre-onboarding tasks to specific candidate",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "candidateId", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    content: { "application/json": { example: { task_ids: [1, 2, 3] } } }
                },
                responses: {
                    200: { description: "Tasks assigned", content: { "application/json": { example: { success: true, message: "Tasks assigned to candidate" } } } }
                }
            }
        },

        "/api/preonboarding/progress/{candidateId}": {
            get: {
                summary: "Get Candidate Task Progress",
                description: "Retrieve candidate's pre-onboarding task progress",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "candidateId", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: {
                        description: "Task progress",
                        content: {
                            "application/json": {
                                example: {
                                    tasks: [{ id: 1, task_name: "Upload Photo", status: "completed" }],
                                    stats: { total: 10, completed: 6, pending: 4, completion_percentage: "60.00" }
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
                description: "Update specific task progress status",
                tags: ["Candidates & Pre-onboarding"],
                parameters: [{ name: "progressId", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { example: { status: "completed", remarks: "Document uploaded successfully" } } }
                },
                responses: {
                    200: { description: "Progress updated", content: { "application/json": { example: { success: true, message: "Task progress updated" } } } }
                }
            }
        },

        "/api/preonboarding/tasks/setup-defaults": {
            post: {
                summary: "Setup Default Tasks",
                description: "One-time setup to create default pre-onboarding tasks (Admin only)",
                tags: ["Candidates & Pre-onboarding"],
                responses: {
                    200: { description: "Default tasks created", content: { "application/json": { example: { success: true, message: "15 default pre-onboarding tasks created" } } } }
                }
            }
        },

        "/api/attendance": {
            post: {
                summary: "Record Punch In/Out",
                description: "Log attendance punch in or out",
                tags: ["Attendance"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Attendance" },
                            example: {
                                employee_id: 1,
                                punch_date: "2024-01-15",
                                punch_in_time: "09:00:00",
                                punch_out_time: "17:30:00"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Punch recorded",
                        content: { "application/json": { example: { message: "Punch recorded" } } }
                    }
                }
            }
        },

        "/api/attendance/{date}": {
            get: {
                summary: "Get Daily Attendance",
                description: "Retrieve attendance records for a specific date",
                tags: ["Attendance"],
                parameters: [
                    {
                        name: "date",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "date" },
                        example: "2024-01-15"
                    }
                ],
                responses: {
                    200: {
                        description: "Daily attendance records",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Attendance" }
                                },
                                example: [
                                    { id: 1, employee_id: 1, punch_date: "2024-01-15", punch_in_time: "09:00:00", punch_out_time: "17:30:00" }
                                ]
                            }
                        }
                    }
                }
            }
        },

        "/api/timesheets": {
            get: {
                summary: "Get All Timesheets",
                description: "Retrieve all submitted timesheets",
                tags: ["Timesheets"],
                responses: {
                    200: {
                        description: "List of timesheets",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Timesheet" }
                                },
                                example: [
                                    { id: 1, employee_id: 1, project_id: 101, hours: 8, submission_date: "2024-01-15" }
                                ]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Submit Timesheet",
                description: "Submit project hours timesheet",
                tags: ["Timesheets"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Timesheet" },
                            example: {
                                employee_id: 1,
                                project_id: 101,
                                hours: 8,
                                submission_date: "2024-01-15"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Timesheet submitted",
                        content: { "application/json": { example: { message: "Timesheet submitted" } } }
                    }
                }
            }
        },

        "/api/payroll/{run}": {
            get: {
                summary: "Get Payroll Slips",
                description: "Retrieve payroll slips for a specific payroll run",
                tags: ["Payroll"],
                parameters: [
                    {
                        name: "run",
                        in: "path",
                        required: true,
                        schema: { type: "integer" },
                        example: 1
                    }
                ],
                responses: {
                    200: {
                        description: "Payroll slips",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Payroll" }
                                },
                                example: [
                                    { id: 1, payroll_run_id: 1, employee_id: 1, gross_salary: 50000, deductions: 5000, net_salary: 45000 }
                                ]
                            }
                        }
                    }
                }
            }
        },

        "/api/holidays": {
            get: {
                summary: "Get All Holidays",
                description: "Retrieve company holiday calendar",
                tags: ["Holidays"],
                responses: {
                    200: {
                        description: "Holiday list",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Holiday" }
                                },
                                example: [
                                    { id: 1, holiday_date: "2024-01-26", holiday_name: "Republic Day" },
                                    { id: 2, holiday_date: "2024-03-08", holiday_name: "Maha Shivaratri" }
                                ]
                            }
                        }
                    }
                }
            }
        },

        "/api/locations": {
            get: {
                summary: "Get Locations",
                description: "Retrieve all office locations",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of locations",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Master" }
                                },
                                example: [{ id: 1, name: "Bangalore" }, { id: 2, name: "Mumbai" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Location",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Delhi" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Location created",
                        content: { "application/json": { example: { message: "locations created" } } }
                    }
                }
            }
        },

        "/api/departments": {
            get: {
                summary: "Get Departments",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of departments",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "IT" }, { id: 2, name: "HR" }, { id: 3, name: "Finance" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Department",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Operations" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Department created",
                        content: { "application/json": { example: { message: "departments created" } } }
                    }
                }
            }
        },

        "/api/designations": {
            get: {
                summary: "Get Designations",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of designations",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Manager" }, { id: 2, name: "Developer" }, { id: 3, name: "Analyst" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Designation",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Lead" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Designation created",
                        content: { "application/json": { example: { message: "designations created" } } }
                    }
                }
            }
        },

        "/api/business-units": {
            get: {
                summary: "Get Business Units",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of business units",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Products" }, { id: 2, name: "Services" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Business Unit",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Consulting" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Business unit created",
                        content: { "application/json": { example: { message: "business-units created" } } }
                    }
                }
            }
        },

        "/api/legal-entities": {
            get: {
                summary: "Get Legal Entities",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of legal entities",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "ABC Corp Ltd" }, { id: 2, name: "XYZ Inc" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Legal Entity",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "PQR Solutions" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Legal entity created",
                        content: { "application/json": { example: { message: "legal-entities created" } } }
                    }
                }
            }
        },

        "/api/cost-centers": {
            get: {
                summary: "Get Cost Centers",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of cost centers",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, code: "CC001" }, { id: 2, code: "CC002" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Cost Center",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
                            example: { code: "CC003" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Cost center created",
                        content: { "application/json": { example: { message: "cost-centers created" } } }
                    }
                }
            }
        },

        "/api/sub-departments": {
            get: {
                summary: "Get Sub Departments",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of sub departments",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "IT Support" }, { id: 2, name: "Software Development" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Sub Department",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Quality Assurance" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Sub department created",
                        content: { "application/json": { example: { message: "sub-departments created" } } }
                    }
                }
            }
        },

        "/api/bands": {
            get: {
                summary: "Get Bands",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of employee bands",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Band A" }, { id: 2, name: "Band B" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Band",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Band C" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Band created",
                        content: { "application/json": { example: { message: "bands created" } } }
                    }
                }
            }
        },

        "/api/pay-grades": {
            get: {
                summary: "Get Pay Grades",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of pay grades",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Grade 1" }, { id: 2, name: "Grade 2" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Pay Grade",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Grade 3" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Pay grade created",
                        content: { "application/json": { example: { message: "pay-grades created" } } }
                    }
                }
            }
        },

        "/api/leave-plans": {
            get: {
                summary: "Get Leave Plans",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of leave plans",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Standard Leave Plan" }, { id: 2, name: "Executive Leave Plan" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Leave Plan",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Flexi Leave Plan" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Leave plan created",
                        content: { "application/json": { example: { message: "leave-plans created" } } }
                    }
                }
            }
        },

        "/api/shift-policies": {
            get: {
                summary: "Get Shift Policies",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of shift policies",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "9 to 5 Shift" }, { id: 2, name: "Night Shift" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Shift Policy",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Flexible Shift" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Shift policy created",
                        content: { "application/json": { example: { message: "shift-policies created" } } }
                    }
                }
            }
        },

        "/api/weekly-off-policies": {
            get: {
                summary: "Get Weekly Off Policies",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of weekly off policies",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Saturday Sunday" }, { id: 2, name: "Sunday Only" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Weekly Off Policy",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Alternate Saturday" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Weekly off policy created",
                        content: { "application/json": { example: { message: "weekly-off-policies created" } } }
                    }
                }
            }
        },

        "/api/attendance-policies": {
            get: {
                summary: "Get Attendance Policies",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of attendance policies",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Regular Attendance" }, { id: 2, name: "Flexible Attendance" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Attendance Policy",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Remote Work Policy" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Attendance policy created",
                        content: { "application/json": { example: { message: "attendance-policies created" } } }
                    }
                }
            }
        },

        "/api/attendance-capture-schemes": {
            get: {
                summary: "Get Attendance Capture Schemes",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of attendance capture schemes",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Biometric" }, { id: 2, name: "Mobile App" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Attendance Capture Scheme",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "RFID Card" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Attendance capture scheme created",
                        content: { "application/json": { example: { message: "attendance-capture-schemes created" } } }
                    }
                }
            }
        },

        "/api/holiday-lists": {
            get: {
                summary: "Get Holiday Lists",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of holiday lists",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "2025 Holidays" }, { id: 2, name: "2026 Holidays" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Holiday List",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Regional Holidays 2025" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Holiday list created",
                        content: { "application/json": { example: { message: "holiday-lists created" } } }
                    }
                }
            }
        },

        "/api/expense-policies": {
            get: {
                summary: "Get Expense Policies",
                tags: ["Masters"],
                responses: {
                    200: {
                        description: "List of expense policies",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Master" } },
                                example: [{ id: 1, name: "Standard Expenses" }, { id: 2, name: "Travel Expenses" }]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Expense Policy",
                tags: ["Masters"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
                            example: { name: "Executive Expenses" }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Expense policy created",
                        content: { "application/json": { example: { message: "expense-policies created" } } }
                    }
                }
            }
        },

        "/api/support": {
            get: {
                summary: "Get Support Tickets",
                description: "Retrieve all support tickets",
                tags: ["Support"],
                responses: {
                    200: {
                        description: "List of support tickets",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/SupportTicket" }
                                },
                                example: [
                                    { id: 1, employee_id: 1, subject: "Leave approval issue", message: "My leave request is pending", status: "Open" }
                                ]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Support Ticket",
                description: "Raise a new support ticket",
                tags: ["Support"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    subject: { type: "string" },
                                    message: { type: "string" }
                                },
                                required: ["subject", "message"]
                            },
                            example: {
                                subject: "Payslip not generated",
                                message: "I haven't received my payslip for January"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Ticket created",
                        content: { "application/json": { example: { message: "Ticket created" } } }
                    }
                }
            }
        },

        "/api/upload/employees": {
            post: {
                summary: "Bulk Upload Employees",
                description: "Import employees from Excel file (Admin only)",
                tags: ["Bulk Upload"],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    file: {
                                        type: "string",
                                        format: "binary",
                                        description: "Excel file with columns: EmployeeNumber, FullName, WorkEmail"
                                    }
                                },
                                required: ["file"]
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Employees imported",
                        content: {
                            "application/json": {
                                example: { inserted: 50 }
                            }
                        }
                    },
                    403: {
                        description: "Admin access required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
                    }
                }
            }
        },

        "/api/upload/holidays": {
            post: {
                summary: "Bulk Upload Holidays",
                description: "Import holidays from Excel file (Admin only)",
                tags: ["Bulk Upload"],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    file: {
                                        type: "string",
                                        format: "binary",
                                        description: "Excel file with columns: holiday_date (YYYY-MM-DD), holiday_name"
                                    }
                                },
                                required: ["file"]
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Holidays imported",
                        content: {
                            "application/json": {
                                example: { inserted: 12 }
                            }
                        }
                    },
                    403: {
                        description: "Admin access required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
                    }
                }
            }
        },
        "/api/upload/payroll": {
            post: {
                summary: "Bulk Upload Payroll",
                description: "Import payroll slips from Excel file (Admin only)",
                tags: ["Bulk Upload"],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    file: {
                                        type: "string",
                                        format: "binary",
                                        description: "Excel file with columns: EmployeeNumber, Payroll Month, Payroll Type, Gross, Net Pay"
                                    }
                                },
                                required: ["file"]
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Payroll imported",
                        content: {
                            "application/json": {
                                example: { inserted: 25 }
                            }
                        }
                    },
                    403: {
                        description: "Admin access required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
                    }
                }
            }
        },
        "/api/leaves": {
            get: {
                summary: "Get All Leave Requests",
                tags: ["Leaves"],
                responses: {
                    200: {
                        description: "List of leave requests",
                        content: {
                            "application/json": {
                                example: [
                                    { id: 1, employee_id: 1, leave_type: "Casual", start_date: "2025-01-20", end_date: "2025-01-22", status: "Pending" }
                                ]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Submit Leave Request",
                tags: ["Leaves"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    leave_type: { type: "string", enum: ["Casual", "Sick", "Earned", "Unpaid"] },
                                    start_date: { type: "string", format: "date" },
                                    end_date: { type: "string", format: "date" },
                                    reason: { type: "string" }
                                },
                                required: ["leave_type", "start_date", "end_date"]
                            },
                            example: { leave_type: "Casual", start_date: "2025-01-20", end_date: "2025-01-22", reason: "Personal work" }
                        }
                    }
                },
                responses: {
                    200: { description: "Leave request submitted", content: { "application/json": { example: { message: "Leave request submitted" } } } }
                }
            }
        },

        "/api/leaves/{id}": {
            put: {
                summary: "Approve/Reject Leave Request",
                tags: ["Leaves"],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties: { status: { type: "string", enum: ["Approved", "Rejected"] } }, required: ["status"] },
                            example: { status: "Approved" }
                        }
                    }
                },
                responses: {
                    200: { description: "Leave request updated", content: { "application/json": { example: { message: "Leave request updated" } } } }
                }
            }
        },

        "/api/announcements": {
            get: {
                summary: "Get Active Announcements",
                tags: ["Announcements"],
                responses: {
                    200: {
                        description: "List of active announcements",
                        content: {
                            "application/json": {
                                example: [
                                    { id: 1, title: "New HR Policy", body: "Effective from Jan 1", starts_at: "2025-01-01T00:00:00Z", ends_at: "2025-12-31T23:59:59Z" }
                                ]
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create Announcement",
                tags: ["Announcements"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    body: { type: "string" },
                                    starts_at: { type: "string", format: "date-time" },
                                    ends_at: { type: "string", format: "date-time" }
                                },
                                required: ["title", "body", "starts_at", "ends_at"]
                            },
                            example: { title: "Company Picnic", body: "Join us on Sunday", starts_at: "2025-02-01T00:00:00Z", ends_at: "2025-02-28T23:59:59Z" }
                        }
                    }
                },
                responses: {
                    200: { description: "Announcement created", content: { "application/json": { example: { message: "Announcement created" } } } }
                }
            }
        },

        "/api/profile": {
            get: {
                summary: "Get Employee Profile",
                tags: ["Profile"],
                responses: {
                    200: {
                        description: "Employee profile with department & location",
                        content: {
                            "application/json": {
                                example: { id: 1, EmployeeNumber: "EMP001", FullName: "John Doe", WorkEmail: "john@company.com", location: "Bangalore", department: "IT" }
                            }
                        }
                    }
                }
            },
            put: {
                summary: "Update Profile",
                tags: ["Profile"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    personal_email: { type: "string", format: "email" },
                                    physically_handicapped: { type: "boolean" }
                                }
                            },
                            example: { personal_email: "john.personal@email.com", physically_handicapped: false }
                        }
                    }
                },
                responses: {
                    200: { description: "Profile updated", content: { "application/json": { example: { message: "Profile updated" } } } }
                }
            }
        },

        "/api/payslips/{employee_id}": {
            get: {
                summary: "Get Employee Payslips",
                tags: ["Payroll"],
                parameters: [{ name: "employee_id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: {
                        description: "List of last 12 payslips",
                        content: {
                            "application/json": {
                                example: [
                                    { id: 1, payroll_month: "2025-01", net_pay: 45000, gross_amount: 50000 }
                                ]
                            }
                        }
                    }
                }
            }
        },

        "/api/payslips/{employee_id}/{slip_id}": {
            get: {
                summary: "Get Single Payslip Details",
                tags: ["Payroll"],
                parameters: [
                    { name: "employee_id", in: "path", required: true, schema: { type: "integer" } },
                    { name: "slip_id", in: "path", required: true, schema: { type: "integer" } }
                ],
                responses: {
                    200: {
                        description: "Detailed payslip with all earnings & deductions",
                        content: {
                            "application/json": {
                                example: {
                                    id: 1, payroll_month: "2025-01", basic: 30000, hra: 5000, gross_amount: 48200,
                                    pf_employee: 1800, income_tax: 2000, net_pay: 44400
                                }
                            }
                        }
                    }
                }
            }
        },

        "/api/attendance-report": {
            get: {
                summary: "Get Attendance Report",
                tags: ["Attendance"],
                parameters: [
                    { name: "start_date", in: "query", schema: { type: "string", format: "date" }, example: "2025-01-01" },
                    { name: "end_date", in: "query", schema: { type: "string", format: "date" }, example: "2025-01-31" },
                    { name: "employee_id", in: "query", schema: { type: "integer" }, example: 1 }
                ],
                responses: {
                    200: {
                        description: "Filtered attendance records",
                        content: {
                            "application/json": {
                                example: [
                                    { id: 1, employee_id: 1, EmployeeNumber: "EMP001", FullName: "John", punch_date: "2025-01-01", punch_in_time: "09:00:00" }
                                ]
                            }
                        }
                    }
                }
            }
        },

        "/api/employees/search": {
            get: {
                summary: "Search Employees",
                tags: ["Employees"],
                parameters: [
                    { name: "keyword", in: "query", required: true, schema: { type: "string" }, example: "John" }
                ],
                responses: {
                    200: {
                        description: "Matching employee records",
                        content: {
                            "application/json": {
                                example: [
                                    { id: 1, EmployeeNumber: "EMP001", FullName: "John Doe", WorkEmail: "john@company.com" }
                                ]
                            }
                        }
                    }
                }
            }
        },

        "/api/leave-balance/{employee_id}": {
            get: {
                summary: "Get Leave Balance",
                tags: ["Leaves"],
                parameters: [{ name: "employee_id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: {
                        description: "Leave balance by type for current year",
                        content: {
                            "application/json": {
                                example: { employee_id: 1, year: 2025, balance: { Casual: 5, Sick: 3, Earned: 0, Unpaid: 0 } }
                            }
                        }
                    }
                }
            }
        },
        "/api/birthdays": {
            get: {
                summary: "Get Upcoming Birthdays",
                description: "List employee birthdays within the next N days (query param: days). Default 30 days.",
                tags: ["HR"],
                parameters: [
                    { name: "days", in: "query", required: false, schema: { type: "integer", default: 30 }, description: "Days ahead to include" }
                ],
                responses: {
                    200: {
                        description: "Upcoming birthdays",
                        content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Birthday" } } } }
                    },
                    401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                }
            }
        },

        "/api/birthday-wishes": {
            post: {
                summary: "Send Birthday Wish",
                description: "Record a birthday wish for an employee (authenticated users).",
                tags: ["HR"],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object", properties: { employee_id: { type: "integer" }, message: { type: "string" } }, required: ["employee_id", "message"] } } }
                },
                responses: {
                    200: { description: "Wish recorded", content: { "application/json": { example: { message: "Wish recorded" } } } },
                    400: { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                }
            }
        },

        "/api/birthday-wishes/{employee_id}": {
            get: {
                summary: "Get Birthday Wishes for Employee",
                description: "Retrieve birthday wishes received by an employee",
                tags: ["HR"],
                parameters: [{ name: "employee_id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    200: { description: "List of wishes", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/BirthdayWish" } } } } },
                    401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                }
            }
        },

        "/api/auth/logout": {
            post: { summary: "Logout", tags: ["Auth"], responses: { 200: { description: "Logout successful" } } }
        },
        "/api/auth/refresh-token": {
            post: { summary: "Refresh JWT Token", tags: ["Auth"], responses: { 200: { description: "New token", content: { "application/json": { example: { token: "newToken..." } } } } } }
        },
        "/api/employees/reporting/{managerId}": {
            get: { summary: "Get Manager's Team", tags: ["Employees"], parameters: [{ name: "managerId", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Team members" } } }
        },
        "/api/attendance/checkin": {
            post: { summary: "Employee Check-in", tags: ["Attendance"], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { employee_id: { type: "integer" }, source: { type: "string" } } } } } }, responses: { 200: { description: "Check-in recorded" } } }
        },
        "/api/attendance/checkout": {
            post: { summary: "Employee Check-out", tags: ["Attendance"], responses: { 200: { description: "Check-out recorded" } } }
        },
        "/api/leave/types": {
            get: { summary: "Get Leave Types", tags: ["Leave"], responses: { 200: { description: "Leave types list" } } },
            post: { summary: "Create Leave Type", tags: ["Leave"], responses: { 200: { description: "Created" } } }
        },
        "/api/payroll/generate": {
            post: { summary: "Generate Payroll", tags: ["Payroll"], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { payroll_month: { type: "string" }, payroll_type: { type: "string" } } } } } }, responses: { 200: { description: "Payroll generated" } } }
        },
        "/api/reports/attendance": {
            get: { summary: "Attendance Report", tags: ["Reports"], responses: { 200: { description: "Attendance data" } } }
        },
        "/api/reports/leave": {
            get: { summary: "Leave Report", tags: ["Reports"], responses: { 200: { description: "Leave statistics" } } }
        },
        "/api/reports/payroll": {
            get: { summary: "Payroll Report", tags: ["Reports"], responses: { 200: { description: "Payroll summary" } } }
        },
        "/api/reports/headcount": {
            get: { summary: "Headcount Report", tags: ["Reports"], responses: { 200: { description: "Employee count by status" } } }
        },
        "/api/reports/attrition": {
            get: { summary: "Attrition Report", tags: ["Reports"], responses: { 200: { description: "Employee attrition data" } } }
        },
        "/api/notifications": {
            get: { summary: "Get Notifications", tags: ["Notifications"], responses: { 200: { description: "User notifications" } } }
        },
        "/api/health": {
            get: { summary: "Health Check", security: [], tags: ["System"], responses: { 200: { description: "Server status" } } }
        }

        // ...rest of swagger...

    }
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swagger, {
    swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: false
    },
    customCss: `.swagger-ui .topbar {background-color:#1976d2}`,
    customSiteTitle: "HRMS API Documentation"
}));

/* ============ SERVER STARTUP ============ */

(async () => {
    try {
        console.log("🔄 Initializing database...");
        await initializeDatabase();
        console.log("✅ Database initialized\n");
        
        console.log("🔄 Creating default admin user...");
        await ensureAdminUser();
        console.log("✅ Admin user ready\n");

        const port = process.env.PORT || 4201;
      app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════╗
║     HRMS API Server Started                  ║
╠══════════════════════════════════════════════╣
║ Port: ${PORT}                                   ║
║ API Docs: http://localhost:${PORT}/api-docs     ║
║ API Docs: http://localhost:${PORT}/index.html   ║
║ Default Login: admin / admin123              ║
╚══════════════════════════════════════════════╝
      `);
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
})();
