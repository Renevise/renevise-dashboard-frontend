

export const KEYS = {
    ATTENDANCE : "hrms_attendance_v1",
    LEAVE_REQ  : "hrms_leave_requests_v1",
    LEAVE_BAL  : "hrms_leave_balance_v1",
    CLOCK_STATE: "hrms_clock_state_v1",
};

export function readStore(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

export function writeStore(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {  }
}

export function clearStore(key) {
    localStorage.removeItem(key);
}

export function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
