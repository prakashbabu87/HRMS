/**
 * REPORT ROUTES
 * Handles various HR reports and analytics
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, hr } = require("../middleware/auth");

/* ============ REPORTS ============ */

// Attendance report
router.get("/attendance", auth, hr, async (req, res) => {
    const { startDate, endDate, employee_id } = req.query;
    const c = await db();
    
    let query = `SELECT a.*, e.FirstName, e.LastName, e.EmployeeNumber 
                 FROM attendance a 
                 LEFT JOIN employees e ON a.employee_id = e.id 
                 WHERE a.attendance_date BETWEEN ? AND ?`;
    const params = [startDate || '2020-01-01', endDate || '2099-12-31'];
    
    if (employee_id) {
        query += " AND a.employee_id = ?";
        params.push(employee_id);
    }
    
    query += " ORDER BY a.attendance_date DESC";
    
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

// Leave report
router.get("/leave", auth, hr, async (req, res) => {
    const { startDate, endDate, status } = req.query;
    const c = await db();
    
    let query = `SELECT l.*, e.FirstName, e.LastName, e.EmployeeNumber 
                 FROM leaves l 
                 LEFT JOIN employees e ON l.employee_id = e.id 
                 WHERE l.start_date BETWEEN ? AND ?`;
    const params = [startDate || '2020-01-01', endDate || '2099-12-31'];
    
    if (status) {
        query += " AND l.status = ?";
        params.push(status);
    }
    
    query += " ORDER BY l.applied_at DESC";
    
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

// Payroll report
router.get("/payroll", auth, hr, async (req, res) => {
    const { month, year } = req.query;
    const c = await db();
    
    let query = `SELECT ps.*, e.FirstName, e.LastName, e.EmployeeNumber 
                 FROM payroll_slips ps 
                 LEFT JOIN employees e ON ps.employee_id = e.id 
                 WHERE 1=1`;
    const params = [];
    
    if (month) {
        query += " AND ps.month = ?";
        params.push(month);
    }
    if (year) {
        query += " AND ps.year = ?";
        params.push(year);
    }
    
    query += " ORDER BY ps.created_at DESC";
    
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

// Headcount report
router.get("/headcount", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(`
        SELECT 
            COUNT(*) as total_employees,
            SUM(CASE WHEN EmploymentStatus = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN EmploymentStatus = 'inactive' THEN 1 ELSE 0 END) as inactive,
            SUM(CASE WHEN Gender = 'Male' THEN 1 ELSE 0 END) as male,
            SUM(CASE WHEN Gender = 'Female' THEN 1 ELSE 0 END) as female
        FROM employees
    `);
    c.end();
    res.json(r[0] || {});
});

// Attrition report
router.get("/attrition", auth, hr, async (req, res) => {
    const { year } = req.query;
    const c = await db();
    
    let query = `
        SELECT 
            COUNT(*) as total_exits,
            MONTH(exit_date) as month,
            termination_type,
            COUNT(*) as count
        FROM employees
        WHERE exit_date IS NOT NULL
    `;
    const params = [];
    
    if (year) {
        query += " AND YEAR(exit_date) = ?";
        params.push(year);
    }
    
    query += " GROUP BY MONTH(exit_date), termination_type ORDER BY month";
    
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

// Department-wise headcount
router.get("/headcount/department", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(`
        SELECT d.name as department, COUNT(e.id) as employee_count
        FROM employees e
        LEFT JOIN departments d ON e.DepartmentId = d.id
        WHERE e.EmploymentStatus = 'active'
        GROUP BY d.id, d.name
        ORDER BY employee_count DESC
    `);
    c.end();
    res.json(r);
});

// Location-wise headcount
router.get("/headcount/location", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(`
        SELECT l.name as location, COUNT(e.id) as employee_count
        FROM employees e
        LEFT JOIN locations l ON e.LocationId = l.id
        WHERE e.EmploymentStatus = 'active'
        GROUP BY l.id, l.name
        ORDER BY employee_count DESC
    `);
    c.end();
    res.json(r);
});

module.exports = router;
