/**
 * PAYROLL ROUTES
 * Handles payroll generation, salary slips, runs, and recalculation
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin, hr } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============ PAYROLL SETTINGS ============ */

// Create payroll defaults
router.post("/defaults", auth, admin, async (req, res) => {
    const { pf_percent, esi_percent, professional_tax, variable_pay_percent } = req.body;
    const c = await db();
    const [result] = await c.query("INSERT INTO payroll_defaults SET ?", {
        pf_percent, esi_percent, professional_tax, variable_pay_percent
    });
    c.end();
    res.json({ id: result.insertId, success: true });
});

// Get payroll defaults
router.get("/defaults", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_defaults LIMIT 1");
    c.end();
    res.json(r[0] || {});
});

// Update payroll defaults
router.put("/defaults/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE payroll_defaults SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ success: true });
});

/* ============ SALARY STRUCTURE ============ */

// Create/Update salary structure
router.post("/salary/structure/:empId", auth, admin, async (req, res) => {
    const { empId } = req.params;
    const { basic, hra, conveyance, special_allowance, pf, esi, professional_tax, other_deductions } = req.body;
    
    const gross = parseFloat(basic || 0) + parseFloat(hra || 0) + parseFloat(conveyance || 0) + parseFloat(special_allowance || 0);
    const total_deductions = parseFloat(pf || 0) + parseFloat(esi || 0) + parseFloat(professional_tax || 0) + parseFloat(other_deductions || 0);
    const net_salary = gross - total_deductions;
    
    const c = await db();
    
    // Check if structure exists
    const [existing] = await c.query("SELECT id FROM salary_structure WHERE employee_id = ?", [empId]);
    
    if (existing.length > 0) {
        // Update
        await c.query(
            "UPDATE salary_structure SET basic=?, hra=?, conveyance=?, special_allowance=?, pf=?, esi=?, professional_tax=?, other_deductions=?, gross_salary=?, net_salary=? WHERE employee_id=?",
            [basic, hra, conveyance, special_allowance, pf, esi, professional_tax, other_deductions, gross, net_salary, empId]
        );
    } else {
        // Insert
        await c.query(
            "INSERT INTO salary_structure (employee_id, basic, hra, conveyance, special_allowance, pf, esi, professional_tax, other_deductions, gross_salary, net_salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [empId, basic, hra, conveyance, special_allowance, pf, esi, professional_tax, other_deductions, gross, net_salary]
        );
    }
    
    c.end();
    res.json({ success: true, gross_salary: gross, net_salary });
});

// Get salary structure
router.get("/salary/structure/:empId", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM salary_structure WHERE employee_id = ?", [req.params.empId]);
    c.end();
    res.json(r[0] || null);
});

/* ============ PAYROLL GENERATION ============ */

// Generate payroll for a month
router.post("/generate", auth, admin, async (req, res) => {
    const { month, year } = req.body;
    const c = await db();
    
    try {
        // Create payroll run
        const [runResult] = await c.query(
            "INSERT INTO payroll_runs (month, year, status, created_by) VALUES (?, ?, 'processing', ?)",
            [month, year, req.user.id]
        );
        const runId = runResult.insertId;
        
        // Get all active employees
        const [employees] = await c.query("SELECT id FROM employees WHERE status = 'active'");
        
        let processedCount = 0;
        
        for (const emp of employees) {
            // Get salary structure
            const [structure] = await c.query("SELECT * FROM salary_structure WHERE employee_id = ?", [emp.id]);
            
            if (structure.length === 0) continue;
            
            const s = structure[0];
            
            // Calculate attendance
            const [attendance] = await c.query(
                "SELECT COUNT(*) as present_days FROM attendance WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ? AND status = 'present'",
                [emp.id, month, year]
            );
            
            const presentDays = attendance[0]?.present_days || 0;
            const workingDays = 30; // You can make this dynamic
            
            // Pro-rata calculation
            const basicEarned = (s.basic / workingDays) * presentDays;
            const hraEarned = (s.hra / workingDays) * presentDays;
            const conveyanceEarned = (s.conveyance / workingDays) * presentDays;
            const specialAllowanceEarned = (s.special_allowance / workingDays) * presentDays;
            
            const grossEarned = basicEarned + hraEarned + conveyanceEarned + specialAllowanceEarned;
            const netEarned = grossEarned - (s.pf + s.esi + s.professional_tax + s.other_deductions);
            
            // Create payslip
            await c.query(
                `INSERT INTO payroll_slips (run_id, employee_id, month, year, 
                 basic, hra, conveyance, special_allowance, gross_salary, 
                 pf, esi, professional_tax, other_deductions, total_deductions, 
                 net_salary, days_worked, days_in_month, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated')`,
                [runId, emp.id, month, year, 
                 basicEarned, hraEarned, conveyanceEarned, specialAllowanceEarned, grossEarned,
                 s.pf, s.esi, s.professional_tax, s.other_deductions, 
                 (s.pf + s.esi + s.professional_tax + s.other_deductions),
                 netEarned, presentDays, workingDays]
            );
            
            processedCount++;
        }
        
        // Update run status
        await c.query(
            "UPDATE payroll_runs SET status = 'completed', completed_at = NOW() WHERE id = ?",
            [runId]
        );
        
        c.end();
        res.json({ success: true, run_id: runId, processed: processedCount });
        
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// List payroll runs
router.get("/runs", auth, hr, async (req, res) => {
    const c = await db();
    const [runs] = await c.query(
        `SELECT pr.*, COUNT(ps.id) as slip_count, SUM(ps.net_salary) as total_payout
         FROM payroll_runs pr
         LEFT JOIN payroll_slips ps ON pr.id = ps.run_id
         GROUP BY pr.id
         ORDER BY pr.created_at DESC`
    );
    c.end();
    res.json(runs);
});

// Get payroll by run (legacy endpoint)
router.get("/:run", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT ps.*, e.FirstName, e.LastName FROM payroll_slips ps LEFT JOIN employees e ON ps.employee_id = e.id WHERE ps.run_id = ?",
        [req.params.run]
    );
    c.end();
    res.json(r);
});

// Recalculate payroll for employee
router.post("/recalculate/:empId", auth, admin, async (req, res) => {
    const { empId } = req.params;
    const { month, year } = req.body;
    
    const c = await db();
    
    try {
        // Get salary structure
        const [structure] = await c.query("SELECT * FROM salary_structure WHERE employee_id = ?", [empId]);
        
        if (structure.length === 0) {
            c.end();
            return res.status(404).json({ error: "Salary structure not found" });
        }
        
        const s = structure[0];
        
        // Calculate attendance
        const [attendance] = await c.query(
            "SELECT COUNT(*) as present_days FROM attendance WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ? AND status = 'present'",
            [empId, month, year]
        );
        
        const presentDays = attendance[0]?.present_days || 0;
        const workingDays = 30;
        
        const basicEarned = (s.basic / workingDays) * presentDays;
        const hraEarned = (s.hra / workingDays) * presentDays;
        const grossEarned = basicEarned + hraEarned + (s.conveyance || 0) + (s.special_allowance || 0);
        const netEarned = grossEarned - (s.pf + s.esi + s.professional_tax + s.other_deductions);
        
        // Update existing slip or create new one
        await c.query(
            `INSERT INTO payroll_slips (employee_id, month, year, basic, hra, gross_salary, pf, esi, professional_tax, net_salary, days_worked, days_in_month)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE basic=VALUES(basic), hra=VALUES(hra), gross_salary=VALUES(gross_salary), net_salary=VALUES(net_salary), days_worked=VALUES(days_worked)`,
            [empId, month, year, basicEarned, hraEarned, grossEarned, s.pf, s.esi, s.professional_tax, netEarned, presentDays, workingDays]
        );
        
        c.end();
        res.json({ success: true, net_salary: netEarned });
        
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ PAYSLIPS ============ */

// Get all payslips (HR)
router.get("/slips/all", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT ps.*, e.FirstName, e.LastName FROM payroll_slips ps LEFT JOIN employees e ON ps.employee_id = e.id ORDER BY ps.created_at DESC"
    );
    c.end();
    res.json(r);
});

// Get employee payslips
router.get("/slips/employee/:employee_id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_slips WHERE employee_id = ? ORDER BY year DESC, month DESC", 
        [req.params.employee_id]);
    c.end();
    res.json(r);
});

// Get single payslip
router.get("/slips/:employee_id/:slip_id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_slips WHERE employee_id = ? AND id = ?", 
        [req.params.employee_id, req.params.slip_id]);
    c.end();
    res.json(r[0] || null);
});

// Get payslip by ID
router.get("/slip/:id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_slips WHERE id = ?", [req.params.id]);
    c.end();
    res.json(r[0] || null);
});

// Generate PDF (placeholder)
router.get("/slip/:id/pdf", auth, async (req, res) => {
    res.json({ message: "PDF generation not implemented yet" });
});

module.exports = router;
