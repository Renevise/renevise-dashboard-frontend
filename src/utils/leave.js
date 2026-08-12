import dashConfig from "../data/dashboard.json";

const YEARLY_TOTAL = dashConfig.initialLeaveBalance; 

export function calcLeaveStats(leaves, targetYear, targetMonth) {
    const pad      = n => String(n).padStart(2, "0");
    const now      = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    let yearlyUsed  = 0;
    let monthlyUsed = 0;

    for (const l of leaves.filter(l => l.status === "Approved")) {
        const from  = new Date(l.fromDate  + "T00:00:00");
        const until = new Date(l.untilDate + "T00:00:00");
        const cur   = new Date(from);
        while (cur <= until) {
            const curStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
            if (curStr <= todayStr) {         
                const y = cur.getFullYear();
                const m = cur.getMonth() + 1;
                if (y === targetYear) {
                    yearlyUsed++;
                    if (m === targetMonth) monthlyUsed++;
                }
            }
            cur.setDate(cur.getDate() + 1);
        }
    }

    return {
        yearlyTotal : YEARLY_TOTAL,
        yearlyUsed,
        balance     : Math.max(0, YEARLY_TOTAL - yearlyUsed),
        monthlyUsed,
    };
}
