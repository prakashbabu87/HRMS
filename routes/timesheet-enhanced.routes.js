/**
 * ENHANCED TIMESHEET ROUTES
 * Handles both regular and project-based timesheets with client timesheet validation
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, hr, admin } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");
const multer = require("multer");
const path = require("path");

// File upload configuration for client timesheets
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/client_timesheets/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "client-timesheet-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /xlsx|xls|pdf|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb("Error: Only Excel, PDF, and Image files are allowed!");
        }
    }
});

/* ============ CHECK EMPLOYEE PROJECT ASSIGNMENT ============ */

// Get employee's project assignment status
router.get("/assignment-status", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });

        const c = await db();
        
        // Check if employee has active project assignments
        const [assignments] = await c.query(`
            SELECT 
                pa.id,
                pa.project_id,
                p.project_code,
                p.project_name,
                p.client_name,
                ps.shift_name,
                ps.start_time,
                ps.end_time,
                ps.daily_hours,
                pa.start_date,
                pa.end_date
            FROM project_assignments pa
            JOIN projects p ON pa.project_id = p.id
            LEFT JOIN project_shifts ps ON pa.shift_id = ps.id
            WHERE pa.employee_id = ? 
            AND pa.status = 'active'
            AND (pa.end_date IS NULL OR pa.end_date >= CURDATE())
            ORDER BY pa.start_date DESC
        `, [emp.id]);

        c.end();

        res.json({
            has_project: assignments.length > 0,
            assignments: assignments,
            timesheet_type: assignments.length > 0 ? 'project_based' : 'regular'
        });
    } catch (error) {
        console.error("Error checking assignment status:", error);
        res.status(500).json({ error: error.message });
    }
});

/* ============ REGULAR TIMESHEET (Non-Project Employees) ============ */

// Submit regular timesheet (hourly based on shift)
router.post("/regular/submit", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });

        const { date, hours_breakdown, total_hours, notes } = req.body;

        const c = await db();

        // Verify employee has no active projects
        const [projects] = await c.query(`
            SELECT id FROM project_assignments 
            WHERE employee_id = ? AND status = 'active'
            AND (end_date IS NULL OR end_date >= ?)
        `, [emp.id, date]);

        if (projects.length > 0) {
            c.end();
            return res.status(400).json({ 
                error: "You are assigned to a project. Please use project-based timesheet." 
            });
        }

        // Check if timesheet already exists for this date
        const [existing] = await c.query(`
            SELECT id FROM timesheets 
            WHERE employee_id = ? AND date = ? AND timesheet_type = 'regular'
        `, [emp.id, date]);

        if (existing.length > 0) {
            // Update existing
            await c.query(`
                UPDATE timesheets 
                SET hours_breakdown = ?, total_hours = ?, notes = ?, 
                    submission_date = NOW(), status = 'submitted'
                WHERE id = ?
            `, [JSON.stringify(hours_breakdown), total_hours, notes, existing[0].id]);

            c.end();
            return res.json({ 
                success: true, 
                message: "Regular timesheet updated successfully",
                timesheet_id: existing[0].id
            });
        }

        // Insert new timesheet
        const [result] = await c.query(`
            INSERT INTO timesheets 
            (employee_id, date, timesheet_type, hours_breakdown, total_hours, notes, status, submission_date)
            VALUES (?, ?, 'regular', ?, ?, ?, 'submitted', NOW())
        `, [emp.id, date, JSON.stringify(hours_breakdown), total_hours, notes]);

        c.end();

        res.json({ 
            success: true, 
            message: "Regular timesheet submitted successfully",
            timesheet_id: result.insertId
        });
    } catch (error) {
        console.error("Error submitting regular timesheet:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get my regular timesheets
router.get("/regular/my-timesheets", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });

        const { start_date, end_date, month, year } = req.query;
        const c = await db();

        let query = `
            SELECT 
                id, date, total_hours, hours_breakdown, notes, 
                status, submission_date, verified_by, verified_at
            FROM timesheets
            WHERE employee_id = ? AND timesheet_type = 'regular'
        `;
        const params = [emp.id];

        if (start_date && end_date) {
            query += " AND date BETWEEN ? AND ?";
            params.push(start_date, end_date);
        } else if (month && year) {
            query += " AND MONTH(date) = ? AND YEAR(date) = ?";
            params.push(month, year);
        }

        query += " ORDER BY date DESC";

        const [timesheets] = await c.query(query, params);
        c.end();

        res.json(timesheets);
    } catch (error) {
        console.error("Error fetching regular timesheets:", error);
        res.status(500).json({ error: error.message });
    }
});

/* ============ PROJECT-BASED TIMESHEET ============ */

// Submit project-based timesheet (hourly based on project shift)
router.post("/project/submit", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });

        const { date, project_id, hours_breakdown, total_hours, work_description, notes } = req.body;

        const c = await db();

        // Verify employee is assigned to this project
        const [assignment] = await c.query(`
            SELECT pa.id, ps.daily_hours
            FROM project_assignments pa
            LEFT JOIN project_shifts ps ON pa.shift_id = ps.id
            WHERE pa.employee_id = ? AND pa.project_id = ? 
            AND pa.status = 'active'
            AND pa.start_date <= ?
            AND (pa.end_date IS NULL OR pa.end_date >= ?)
        `, [emp.id, project_id, date, date]);

        if (assignment.length === 0) {
            c.end();
            return res.status(400).json({ 
                error: "You are not assigned to this project or assignment is not active for this date." 
            });
        }

        // Check if timesheet already exists for this date and project
        const [existing] = await c.query(`
            SELECT id FROM timesheets 
            WHERE employee_id = ? AND date = ? AND project_id = ? AND timesheet_type = 'project'
        `, [emp.id, date, project_id]);

        if (existing.length > 0) {
            // Update existing
            await c.query(`
                UPDATE timesheets 
                SET hours_breakdown = ?, total_hours = ?, work_description = ?, 
                    notes = ?, submission_date = NOW(), status = 'submitted'
                WHERE id = ?
            `, [JSON.stringify(hours_breakdown), total_hours, work_description, notes, existing[0].id]);

            c.end();
            return res.json({ 
                success: true, 
                message: "Project timesheet updated successfully",
                timesheet_id: existing[0].id
            });
        }

        // Insert new timesheet
        const [result] = await c.query(`
            INSERT INTO timesheets 
            (employee_id, project_id, date, timesheet_type, hours_breakdown, total_hours, 
             work_description, notes, status, submission_date)
            VALUES (?, ?, ?, 'project', ?, ?, ?, ?, 'submitted', NOW())
        `, [emp.id, project_id, date, JSON.stringify(hours_breakdown), total_hours, work_description, notes]);

        c.end();

        res.json({ 
            success: true, 
            message: "Project timesheet submitted successfully",
            timesheet_id: result.insertId
        });
    } catch (error) {
        console.error("Error submitting project timesheet:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get my project timesheets
router.get("/project/my-timesheets", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });

        const { start_date, end_date, month, year, project_id } = req.query;
        const c = await db();

        let query = `
            SELECT 
                t.id, t.date, t.project_id, p.project_name, p.client_name,
                t.total_hours, t.hours_breakdown, t.work_description, t.notes, 
                t.status, t.submission_date, t.verified_by, t.verified_at,
                t.client_timesheet_file, t.client_timesheet_upload_date
            FROM timesheets t
            JOIN projects p ON t.project_id = p.id
            WHERE t.employee_id = ? AND t.timesheet_type = 'project'
        `;
        const params = [emp.id];

        if (project_id) {
            query += " AND t.project_id = ?";
            params.push(project_id);
        }

        if (start_date && end_date) {
            query += " AND t.date BETWEEN ? AND ?";
            params.push(start_date, end_date);
        } else if (month && year) {
            query += " AND MONTH(t.date) = ? AND YEAR(t.date) = ?";
            params.push(month, year);
        }

        query += " ORDER BY t.date DESC";

        const [timesheets] = await c.query(query, params);
        c.end();

        res.json(timesheets);
    } catch (error) {
        console.error("Error fetching project timesheets:", error);
        res.status(500).json({ error: error.message });
    }
});

/* ============ CLIENT TIMESHEET UPLOAD (End of Month) ============ */

// Upload client timesheet for a month
router.post("/client-timesheet/upload", auth, upload.single("file"), async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });

        if (!req.file) {
            return res.status(400).json({ error: "Please upload a file" });
        }

        const { month, year, project_id } = req.body;

        const c = await db();

        // Get all timesheets for this month and project
        const [timesheets] = await c.query(`
            SELECT id FROM timesheets 
            WHERE employee_id = ? AND project_id = ? 
            AND MONTH(date) = ? AND YEAR(date) = ?
            AND timesheet_type = 'project'
        `, [emp.id, project_id, month, year]);

        if (timesheets.length === 0) {
            c.end();
            return res.status(400).json({ 
                error: "No internal timesheets found for this month and project" 
            });
        }

        // Update all timesheets with client timesheet file
        await c.query(`
            UPDATE timesheets 
            SET client_timesheet_file = ?, 
                client_timesheet_upload_date = NOW(),
                client_timesheet_status = 'pending_validation'
            WHERE employee_id = ? AND project_id = ? 
            AND MONTH(date) = ? AND YEAR(date) = ?
            AND timesheet_type = 'project'
        `, [req.file.path, emp.id, project_id, month, year]);

        c.end();

        res.json({ 
            success: true, 
            message: "Client timesheet uploaded successfully",
            file_path: req.file.path,
            timesheets_updated: timesheets.length
        });
    } catch (error) {
        console.error("Error uploading client timesheet:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get client timesheet status
router.get("/client-timesheet/status", auth, async (req, res) => {
    try {
        const emp = await findEmployeeByUserId(req.user.id);
        if (!emp) return res.status(404).json({ error: "Employee not found" });

        const { month, year } = req.query;
        const c = await db();

        const [status] = await c.query(`
            SELECT 
                t.project_id,
                p.project_name,
                p.client_name,
                COUNT(t.id) as total_days,
                SUM(t.total_hours) as total_hours,
                MAX(t.client_timesheet_file) as client_file,
                MAX(t.client_timesheet_upload_date) as upload_date,
                MAX(t.client_timesheet_status) as validation_status
            FROM timesheets t
            JOIN projects p ON t.project_id = p.id
            WHERE t.employee_id = ? 
            AND MONTH(t.date) = ? AND YEAR(t.date) = ?
            AND t.timesheet_type = 'project'
            GROUP BY t.project_id, p.project_name, p.client_name
        `, [emp.id, month, year]);

        c.end();

        res.json(status);
    } catch (error) {
        console.error("Error fetching client timesheet status:", error);
        res.status(500).json({ error: error.message });
    }
});

/* ============ ADMIN VALIDATION ============ */

// Get timesheets pending validation
router.get("/admin/pending-validation", auth, admin, async (req, res) => {
    try {
        const { month, year, project_id } = req.query;
        const c = await db();

        let query = `
            SELECT 
                e.id as employee_id,
                e.EmployeeNumber,
                e.FirstName,
                e.LastName,
                t.project_id,
                p.project_name,
                p.client_name,
                COUNT(t.id) as total_days,
                SUM(t.total_hours) as internal_total_hours,
                MAX(t.client_timesheet_file) as client_file,
                MAX(t.client_timesheet_upload_date) as upload_date,
                MAX(t.client_timesheet_status) as validation_status
            FROM timesheets t
            JOIN employees e ON t.employee_id = e.id
            JOIN projects p ON t.project_id = p.id
            WHERE t.timesheet_type = 'project'
            AND t.client_timesheet_file IS NOT NULL
            AND t.client_timesheet_status = 'pending_validation'
        `;
        const params = [];

        if (month && year) {
            query += " AND MONTH(t.date) = ? AND YEAR(t.date) = ?";
            params.push(month, year);
        }

        if (project_id) {
            query += " AND t.project_id = ?";
            params.push(project_id);
        }

        query += " GROUP BY e.id, t.project_id ORDER BY upload_date DESC";

        const [pending] = await c.query(query, params);
        c.end();

        res.json(pending);
    } catch (error) {
        console.error("Error fetching pending validation:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get detailed comparison for validation
router.get("/admin/validation-details/:employeeId/:projectId/:month/:year", auth, admin, async (req, res) => {
    try {
        const { employeeId, projectId, month, year } = req.params;
        const c = await db();

        // Get all internal timesheets
        const [internal] = await c.query(`
            SELECT 
                t.id,
                t.date,
                t.total_hours,
                t.hours_breakdown,
                t.work_description,
                t.status,
                t.submission_date
            FROM timesheets t
            WHERE t.employee_id = ? AND t.project_id = ?
            AND MONTH(t.date) = ? AND YEAR(t.date) = ?
            AND t.timesheet_type = 'project'
            ORDER BY t.date
        `, [employeeId, projectId, month, year]);

        // Get client timesheet info
        const [client] = await c.query(`
            SELECT 
                client_timesheet_file,
                client_timesheet_upload_date,
                client_timesheet_status
            FROM timesheets
            WHERE employee_id = ? AND project_id = ?
            AND MONTH(date) = ? AND YEAR(date) = ?
            AND client_timesheet_file IS NOT NULL
            LIMIT 1
        `, [employeeId, projectId, month, year]);

        // Get employee and project info
        const [empInfo] = await c.query(`
            SELECT 
                e.EmployeeNumber, e.FirstName, e.LastName, e.Email,
                p.project_name, p.client_name, p.project_code
            FROM employees e, projects p
            WHERE e.id = ? AND p.id = ?
        `, [employeeId, projectId]);

        c.end();

        res.json({
            employee: empInfo[0] || null,
            internal_timesheets: internal,
            internal_summary: {
                total_days: internal.length,
                total_hours: internal.reduce((sum, t) => sum + parseFloat(t.total_hours || 0), 0)
            },
            client_timesheet: client[0] || null
        });
    } catch (error) {
        console.error("Error fetching validation details:", error);
        res.status(500).json({ error: error.message });
    }
});

// Validate and approve timesheets
router.post("/admin/validate", auth, admin, async (req, res) => {
    try {
        const { employee_id, project_id, month, year, validation_status, remarks, client_hours } = req.body;

        const c = await db();

        // Update all timesheets for this employee/project/month
        await c.query(`
            UPDATE timesheets 
            SET client_timesheet_status = ?,
                validation_remarks = ?,
                client_reported_hours = ?,
                validated_by = ?,
                validated_at = NOW()
            WHERE employee_id = ? AND project_id = ?
            AND MONTH(date) = ? AND YEAR(date) = ?
            AND timesheet_type = 'project'
        `, [validation_status, remarks, client_hours, req.user.id, employee_id, project_id, month, year]);

        c.end();

        res.json({ 
            success: true, 
            message: `Timesheets ${validation_status === 'validated' ? 'validated' : 'rejected'} successfully`
        });
    } catch (error) {
        console.error("Error validating timesheets:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get validation statistics
router.get("/admin/validation-stats", auth, admin, async (req, res) => {
    try {
        const { month, year } = req.query;
        const c = await db();

        const [stats] = await c.query(`
            SELECT 
                COUNT(DISTINCT CONCAT(employee_id, '-', project_id, '-', MONTH(date), '-', YEAR(date))) as total_submissions,
                COUNT(DISTINCT CASE WHEN client_timesheet_status = 'pending_validation' 
                    THEN CONCAT(employee_id, '-', project_id, '-', MONTH(date), '-', YEAR(date)) END) as pending,
                COUNT(DISTINCT CASE WHEN client_timesheet_status = 'validated' 
                    THEN CONCAT(employee_id, '-', project_id, '-', MONTH(date), '-', YEAR(date)) END) as validated,
                COUNT(DISTINCT CASE WHEN client_timesheet_status = 'rejected' 
                    THEN CONCAT(employee_id, '-', project_id, '-', MONTH(date), '-', YEAR(date)) END) as rejected
            FROM timesheets
            WHERE timesheet_type = 'project'
            AND client_timesheet_file IS NOT NULL
            ${month && year ? 'AND MONTH(date) = ? AND YEAR(date) = ?' : ''}
        `, month && year ? [month, year] : []);

        c.end();

        res.json(stats[0] || { total_submissions: 0, pending: 0, validated: 0, rejected: 0 });
    } catch (error) {
        console.error("Error fetching validation stats:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
