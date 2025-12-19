const XLSX = require("xlsx");

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

    // Normalize column names: trim spaces
    rows = rows.map(row => {
        const normalized = {};
        for (const k of Object.keys(row)) {
            const trimmedKey = k.trim();
            normalized[trimmedKey] = row[k];
        }
        return normalized;
    });

    // Filter out rows where all values are null/empty
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

module.exports = { excel };
