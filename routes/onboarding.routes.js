const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin } = require("../middleware/auth");

// SET PASSWORD (Onboarding)
router.post("/set-password", async (req, res) => {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const c = await db();
    await c.query("UPDATE users SET password_hash=? WHERE username=?", [hash, username]);
    c.end();
    res.json({ message: "Password set successfully" });
});

// Onboarding steps master
router.post("/step", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("INSERT INTO onboarding_steps (step_name, `order`, required) VALUES (?, ?, ?)",
        [req.body.step_name, req.body.order, req.body.required || 1]);
    c.end();
    res.json({ message: "Onboarding step created" });
});

router.get("/steps", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM onboarding_steps ORDER BY `order`");
    c.end();
    res.json(r);
});

router.put("/step/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE onboarding_steps SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ message: "Step updated" });
});

router.delete("/step/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM onboarding_steps WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ message: "Step deleted" });
});

router.post("/assign/:empId", auth, async (req, res) => {
    const c = await db();
    const [steps] = await c.query("SELECT id FROM onboarding_steps");
    for (const step of steps) {
        await c.query("INSERT INTO onboarding_progress (employee_id, step_id, status) VALUES (?, ?, ?)",
            [req.params.empId, step.id, 'Pending']);
    }
    c.end();
    res.json({ message: "Onboarding assigned" });
});

router.put("/complete/:stepId", auth, async (req, res) => {
    const c = await db();
    await c.query("UPDATE onboarding_progress SET status = ?, completed_date = NOW() WHERE id = ?",
        ['Completed', req.params.stepId]);
    c.end();
    res.json({ message: "Step completed" });
});

router.get("/status/:empId", auth, async (req, res) => {
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

module.exports = router;
