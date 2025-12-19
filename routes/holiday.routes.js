/**
 * HOLIDAY ROUTES
 * Handles holiday lists and calendar
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth } = require("../middleware/auth");

/* ============ HOLIDAY MANAGEMENT ============ */

// Get all holidays
router.get("/", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM holidays ORDER BY holiday_date ASC");
    c.end();
    res.json(r);
});

// Get holidays by year
router.get("/year/:year", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM holidays WHERE YEAR(holiday_date) = ? ORDER BY holiday_date ASC", [req.params.year]);
    c.end();
    res.json(r);
});

// Get upcoming holidays
router.get("/upcoming", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM holidays WHERE holiday_date >= CURDATE() ORDER BY holiday_date ASC LIMIT 10");
    c.end();
    res.json(r);
});

module.exports = router;
