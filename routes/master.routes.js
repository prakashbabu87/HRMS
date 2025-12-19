const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin } = require("../middleware/auth");

// Generic master creation helper
const createMasterRoutes = (route, table, col) => {
    router.get(`/${route}`, auth, async (req, res) => {
        const c = await db();
        const [r] = await c.query(`SELECT * FROM ${table}`);
        c.end();
        res.json(r);
    });
    
    router.post(`/${route}`, auth, admin, async (req, res) => {
        const c = await db();
        await c.query(`INSERT INTO ${table}(${col}) VALUES(?)`, [req.body[col]]);
        c.end();
        res.json({ message: `${route} created` });
    });
};

// Create routes for all master tables
createMasterRoutes("locations", "locations", "name");
createMasterRoutes("departments", "departments", "name");
createMasterRoutes("designations", "designations", "name");
createMasterRoutes("business-units", "business_units", "name");
createMasterRoutes("legal-entities", "legal_entities", "name");
createMasterRoutes("cost-centers", "cost_centers", "code");
createMasterRoutes("sub-departments", "sub_departments", "name");
createMasterRoutes("bands", "bands", "name");
createMasterRoutes("pay-grades", "pay_grades", "name");
createMasterRoutes("leave-plans", "leave_plans", "name");
createMasterRoutes("shift-policies", "shift_policies", "name");
createMasterRoutes("weekly-off-policies", "weekly_off_policies", "name");
createMasterRoutes("attendance-policies", "attendance_policies", "name");
createMasterRoutes("attendance-capture-schemes", "attendance_capture_schemes", "name");
createMasterRoutes("holiday-lists", "holiday_lists", "name");
createMasterRoutes("expense-policies", "expense_policies", "name");

module.exports = router;
