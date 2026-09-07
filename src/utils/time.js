const pad = n => String(n).padStart(2, "0");

export function formatSeconds(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function todayISO() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
}

export function currentMonthPrefix() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function getCurrentWeekDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = today.getDay(); 
    const offsetToMonday = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - offsetToMonday);

    return Array.from({ length: 5 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
}

export function dayLabel(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
}

export function isSameDay(tsMs) {
    const a = new Date(tsMs);
    const b = new Date();
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function formatTimestamp(tsMs) {
    return new Date(tsMs).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", hour12: true,
    });
}

export function parseTimeToMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

export function calcDaysBetween(fromISO, toISO) {
    if (!fromISO || !toISO) return 0;
    const diff = new Date(toISO) - new Date(fromISO);
    if (diff < 0) return 0;
    return Math.round(diff / 86400000) + 1;
}

export function formatHours(decimalHours) {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

export function formatBreak(minutes) {
    if (!minutes) return "--";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}
