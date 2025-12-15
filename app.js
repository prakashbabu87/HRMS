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

const app = express();
app.use(bodyParser.json());
const upload = multer({ dest: "uploads/" });
const cors = require('cors');
app.use(cors());
 
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
 
 

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
        // Create database
        await conn.query(`CREATE DATABASE IF NOT EXISTS hrms_db_new`);
        console.log("✅ Database hrms_db_new created/verified");

        // Use the database
        await conn.query(`USE hrms_db_new`);

        // Create all tables
        const createTablesSQL = `
      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin','employee', 'hr', 'manager') DEFAULT 'employee',
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      -- Locations Master
      CREATE TABLE IF NOT EXISTS locations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Departments Master
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Designations Master
      CREATE TABLE IF NOT EXISTS designations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Business Units Master
      CREATE TABLE IF NOT EXISTS business_units (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Legal Entities Master
      CREATE TABLE IF NOT EXISTS legal_entities (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Cost Centers Master
      CREATE TABLE IF NOT EXISTS cost_centers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Employees Master
      CREATE TABLE IF NOT EXISTS employees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        EmployeeNumber VARCHAR(50) UNIQUE NOT NULL,
        FirstName VARCHAR(100),
        MiddleName VARCHAR(100),
        LastName VARCHAR(100),
        FullName VARCHAR(255),
        WorkEmail VARCHAR(100),
        PersonalEmail VARCHAR(100),
        PANNumber VARCHAR(20),
        AadhaarNumber VARCHAR(20),
        Gender VARCHAR(20),
        MaritalStatus VARCHAR(20),
        BloodGroup VARCHAR(5),
        PhysicallyHandicapped TINYINT DEFAULT 0,
        Nationality VARCHAR(50),
        DateOfBirth DATE,
        DateJoined DATE,
        LocationId INT,
        DepartmentId INT,
        DesignationId INT,
        BusinessUnitId INT,
        LegalEntityId INT,
        CostCenterId INT,
        SubDepartment VARCHAR(100),
        EmploymentStatus VARCHAR(50),
        WorkerType VARCHAR(50),
        Band VARCHAR(20),
        PayGrade VARCHAR(20),
        -- Added fields from your list (assuming DECIMAL for currency/percentages)
        lpa DECIMAL(15, 2),
        basic_pct DECIMAL(5, 2),
        hra_pct DECIMAL(5, 2),
        medical_allowance DECIMAL(10, 2),
        transport_allowance DECIMAL(10, 2),
        special_allowance DECIMAL(10, 2),
        paid_basic_monthly DECIMAL(10, 2),
        working_days INT,
        loss_of_days INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (LocationId) REFERENCES locations(id),
        FOREIGN KEY (DepartmentId) REFERENCES departments(id),
        FOREIGN KEY (DesignationId) REFERENCES designations(id),
        FOREIGN KEY (BusinessUnitId) REFERENCES business_units(id),
        FOREIGN KEY (LegalEntityId) REFERENCES legal_entities(id),
        FOREIGN KEY (CostCenterId) REFERENCES cost_centers(id)
      );

      -- Attendance Table
      CREATE TABLE IF NOT EXISTS attendance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        punch_date DATE NOT NULL,
        punch_in_time TIME,
        punch_out_time TIME,
        source VARCHAR(50),
        notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        UNIQUE KEY unique_attendance (employee_id, punch_date)
      );

      -- Timesheets Table
      CREATE TABLE IF NOT EXISTS timesheets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        project_id INT,
        project_name VARCHAR(255),
        date DATE NOT NULL,
        hours DECIMAL(5,2),
        description TEXT,
        submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );

      -- Leaves Table
      CREATE TABLE IF NOT EXISTS leaves (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        leave_type VARCHAR(50),
        start_date DATE,
        end_date DATE,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        approver_id INT,
        approval_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );

      -- Payroll Runs Table
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        payroll_month VARCHAR(20),
        payroll_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Employee Pay Details
        CREATE TABLE IF NOT EXISTS emp_pay_details (
        -- Primary Key, auto-incrementing
        id INT PRIMARY KEY AUTO_INCREMENT,

        -- Foreign Key linking back to the employees master table
        employee_id INT UNIQUE NOT NULL,

        -- Compensation Components (matching the fields you wanted to update)
        basic DECIMAL(10, 2) DEFAULT 0.00,
        hra DECIMAL(10, 2) DEFAULT 0.00,
        medical_allowance DECIMAL(10, 2) DEFAULT 0.00,
        transport_allowance DECIMAL(10, 2) DEFAULT 0.00,
        special_allowance DECIMAL(10, 2) DEFAULT 0.00,
        meal_coupons DECIMAL(10, 2) DEFAULT 0.00,

        -- Other common pay details you might want to include:
        annual_ctc DECIMAL(12, 2) DEFAULT 0.00,
        bank_account_number VARCHAR(50),
        ifsc_code VARCHAR(20),
        payment_mode VARCHAR(50), -- e.g., 'Bank Transfer', 'Cash'
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- Define the Foreign Key constraint
        FOREIGN KEY (employee_id) 
            REFERENCES employees(id) 
            ON DELETE CASCADE -- If an employee record is deleted, delete their pay details
            ON UPDATE CASCADE -- If the employee ID somehow changes, update this link
    );

      -- Payroll Slips Table
      CREATE TABLE IF NOT EXISTS payroll_slips (
        id INT PRIMARY KEY AUTO_INCREMENT,
        payroll_run_id INT NOT NULL,
        employee_id INT NOT NULL,
        employment_status VARCHAR(50),
        date_of_joining DATE,
        date_of_birth DATE,
        location_name VARCHAR(100),
        department_name VARCHAR(100),
        job_title VARCHAR(100),
        payroll_status VARCHAR(50),
        status_description VARCHAR(255),
        warnings TEXT,
        actual_payable_days DECIMAL(5,2),
        working_days DECIMAL(5,2),
        loss_of_pay_days DECIMAL(5,2),
        days_payable DECIMAL(5,2),
        payable_units DECIMAL(10,2),
        remuneration_amount DECIMAL(15,2),
        basic DECIMAL(15,2),
        hra DECIMAL(15,2),
        medical_allowance DECIMAL(15,2),
        transport_allowance DECIMAL(15,2),
        special_allowance DECIMAL(15,2),
        meal_coupons DECIMAL(15,2),
        mobile_internet_allowance DECIMAL(15,2),
        newspaper_journal_allowance DECIMAL(15,2),
        child_education_allowance DECIMAL(15,2),
        incentives DECIMAL(15,2),
        other_reimbursement DECIMAL(15,2),
        relocation_bonus DECIMAL(15,2),
        gross_amount DECIMAL(15,2),
        pf_employer DECIMAL(15,2),
        esi_employer DECIMAL(15,2),
        total_employer_contributions DECIMAL(15,2),
        pf_employee DECIMAL(15,2),
        esi_employee DECIMAL(15,2),
        total_contributions DECIMAL(15,2),
        professional_tax DECIMAL(15,2),
        total_income_tax DECIMAL(15,2),
        loan_deduction DECIMAL(15,2),
        meal_coupon_service_charge DECIMAL(15,2),
        other_deduction DECIMAL(15,2),
        meal_coupon_deduction DECIMAL(15,2),
        total_deductions DECIMAL(15,2),
        net_pay DECIMAL(15,2),
        cash_advance DECIMAL(15,2),
        settlement_against_advance DECIMAL(15,2),
        social_media_login_invoice DECIMAL(15,2),
        total_reimbursements DECIMAL(15,2),
        total_net_pay DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );

      -- Holidays Table
      CREATE TABLE IF NOT EXISTS holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        holiday_date DATE UNIQUE NOT NULL,
        holiday_name VARCHAR(100),
        day_name VARCHAR(20),
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Support Tickets Table
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        subject VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'Open',
        priority VARCHAR(20) DEFAULT 'Medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );

      -- Announcements Table
      CREATE TABLE IF NOT EXISTS announcements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255),
        body TEXT,
        created_by INT,
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );

      -- Birthday Wishes Table
      CREATE TABLE IF NOT EXISTS birthday_wishes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT,
        employee_id INT,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );

      -- Leave Types Table

      CREATE TABLE IF NOT EXISTS leave_types (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type_name VARCHAR(50),
        days_allowed INT
      );
  
      -- Onboarding Steps Table
  CREATE TABLE IF NOT EXISTS onboarding_steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    step_name VARCHAR(100),
    order_num INT,
    required TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Onboarding Progress Table
  CREATE TABLE IF NOT EXISTS onboarding_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    step_id INT NOT NULL,
    status VARCHAR(20),
    completed_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (step_id) REFERENCES onboarding_steps(id)
  );

  -- Payroll Defaults Table
  CREATE TABLE IF NOT EXISTS payroll_defaults (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    key_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Salary Structures Table
  CREATE TABLE IF NOT EXISTS salary_structures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    component_name VARCHAR(100),
    component_value DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  -- Notifications Table
  CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message TEXT,
    is_read TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

        // Split and execute each statement
        const statements = createTablesSQL.split(';').filter(s => s.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                await conn.query(statement);
            }
        }

        console.log("✅ All tables created successfully");

        // Ensure `users.role` column accepts broader values to avoid ENUM truncation errors
        try {
            await conn.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'employee'");
            console.log('✅ users.role column converted to VARCHAR(50)');
        } catch (e) {
            console.warn('⚠️ Skipping ALTER TABLE users.role:', e.message);
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

    let inserted = 0, skipped = 0, errors = [];

    for (const r of rows) {
        try {
            // Map common column names
            const empNo = r.EmployeeNumber || r['Employee Number'] || null;
            if (!empNo) { skipped++; errors.push('Missing EmployeeNumber'); continue; }

            const locationName = r.Location || r.location || r.LocationName || r['Location Name'] || null;
            const departmentName = r.Department || r.department || r['Department'] || null;
            const designationName = r.Designation || r.JobTitle || r['Job Title'] || null;
            const buName = r.BusinessUnit || r['Business Unit'] || null;
            const legalName = r.LegalEntity || r['Legal Entity'] || null;
            const costCenterCode = r.CostCenter || r['Cost Center'] || r.CostCenterCode || null;

            const maritalStatus = r.MaritalStatus || r['Marital Status'] || null;
            const bloodGroup = r.BloodGroup || r['Blood Group'] || r.Blood || null;
            // Ensure masters exist and get IDs
            const locationId = await getOrCreateMaster(c, 'locations', 'name', locationName);
            const deptId = await getOrCreateMaster(c, 'departments', 'name', departmentName);
            const desgId = await getOrCreateMaster(c, 'designations', 'name', designationName);
            const buId = await getOrCreateMaster(c, 'business_units', 'name', buName);
            const legalId = await getOrCreateMaster(c, 'legal_entities', 'name', legalName);
            const costId = await getOrCreateMaster(c, 'cost_centers', 'code', costCenterCode);

            // Insert employee with master FK ids
            await c.query(
                `INSERT IGNORE INTO employees
       (EmployeeNumber, FirstName, MiddleName, LastName, FullName, WorkEmail,
        DateOfBirth, DateJoined, Gender, Nationality, MaritalStatus, BloodGroup, PANNumber, AadhaarNumber,
        LocationId, DepartmentId, DesignationId, BusinessUnitId, LegalEntityId, CostCenterId)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    empNo,
                    r.FirstName || r['First Name'] || null,
                    r.MiddleName || r['Middle Name'] || null,
                    r.LastName || r['Last Name'] || null,
                    r.FullName || r['Name'] || null,
                    r.WorkEmail || r['Work Email'] || null,
                    r.DateOfBirth || r['DateOfBirth'] || null,
                    r.DateJoined || r['DateJoined'] || null,
                    r.Gender || null,
                    r.Nationality || null,
                    maritalStatus,
                    bloodGroup,
                    r.PANNumber || r['PANNumber'] || null,
                    r.AadhaarNumber || r['AadhaarNumber'] || null,
                    locationId, deptId, desgId, buId, legalId, costId
                ]
            );
            inserted++;
        } catch (err) {
            skipped++;
            errors.push(err.message);
        }
    }

    c.end();
    res.json({ inserted, skipped, processed: rows.length, errors: errors.slice(0, 10) });
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
    servers: [{ url: "http://tamminademoapps.com:9295" }],
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

app.listen(3000, () => {
    console.log("✅ HRMS COMPLETE SERVER STARTED");
    console.log("➡ Swagger UI: http://localhost:3000/api-docs");
});

/* ============ SERVER STARTUP ============ */

(async () => {
    try {
        console.log("🔄 Initializing database...");
        await initializeDatabase();
        await ensureAdminUser();
        console.log("✅ Database ready\n");

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`
╔══════════════════════════════════════════════╗
║     HRMS API Server Started                  ║
╠══════════════════════════════════════════════╣
║ Port: ${port}                                   ║
║ API Docs: http://localhost:${port}/api-docs     ║
║ API Docs: http://localhost:${port}/index.html   ║
║ Default Login: admin / admin123              ║
╚══════════════════════════════════════════════╝
      `);
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
})();
