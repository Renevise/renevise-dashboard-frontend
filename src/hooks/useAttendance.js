import { useState, useEffect, useCallback } from "react";
import { computeStats, computeWeeklyHours } from "../utils/attendance";
import { todayISO } from "../utils/time";
import { apiFetch } from "../utils/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getLoggedInEmployee() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return { id: "", name: "Unknown", role: "" };
        const user = JSON.parse(raw);
        return {
            id  : user.id ?? user._id ?? "",
            name: user.userName ?? user.name ?? "Unknown",
            role: user.role ?? "",
        };
    } catch {
        return { id: "", name: "Unknown", role: "" };
    }
}

function normalizeRecord(r) {
    return {
        id           : r._id ?? r.id,
        employeeId   : r.userId?.toString() ?? "",
        employee     : r.employee,
        date         : r.date,
        clockIn      : r.clockIn  ?? "--",
        clockOut     : r.clockOut ?? "--",
        clockInMs    : r.clockInMs  ?? null,
        clockOutMs   : r.clockOutMs ?? null,
        breakMinutes : r.breakMinutes  ?? 0,
        workedSeconds: r.workedSeconds ?? 0,
        workedHours  : r.workedHours   ?? 0,
        status       : r.status ?? "Present",
        locationType : r.locationType ?? "office",
        isLate       : r.isLate ?? (r.status === "Late"),
        adminRemarks : r.adminRemarks ?? null,
    };
}

export function useAttendance() {
    const currentEmployee = getLoggedInEmployee();
    const userId  = currentEmployee.id;
    const isAdmin = currentEmployee.role === "admin";

    const [records,    setRecords]    = useState([]);
    const [clockState, setClockState] = useState(null); 

    useEffect(() => {
        let cancelled = false;

        setRecords([]);
        setClockState(null);

        if (!userId) return () => { cancelled = true; }; 

        async function init() {
            try {
                const headers = getAuthHeaders();
                const recordsEndpoint = isAdmin ? "/api/attendance/all" : "/api/attendance/my";

                const [todayRes, allRes] = await Promise.all([
                    apiFetch(`${API_BASE}/api/attendance/today-status`, { headers }),
                    apiFetch(`${API_BASE}${recordsEndpoint}`, { headers }),
                ]);
                if (cancelled) return;

                if (todayRes.ok) {
                    const { record } = await todayRes.json();
                    if (!cancelled && record && record.clockInMs && !record.clockOutMs) {
                        setClockState({
                            clockInMs          : record.clockInMs,
                            locationType       : record.locationType ?? "office",
                            activeBreakStartMs : record.activeBreakStartMs ?? null,
                            accumulatedBreakSec: record.accumulatedBreakSec ?? 0,
                        });
                    }
                }

                if (allRes.ok) {
                    const { records: raw } = await allRes.json();
                    if (!cancelled) setRecords(raw.map(normalizeRecord));
                }
            } catch (err) {
            }
        }
        init();
        return () => { cancelled = true; };
    }, [userId]); 

    const clockIn = useCallback(async (locationType = "office") => {
        try {
            const res = await apiFetch(`${API_BASE}/api/attendance/clock-in`, {
                method : "POST",
                headers: getAuthHeaders(),
                body   : JSON.stringify({ locationType }),
            });

            if (res.status === 409) {

                const todayRes = await apiFetch(`${API_BASE}/api/attendance/today-status`, {
                    headers: getAuthHeaders(),
                });
                if (todayRes.ok) {
                    const { record } = await todayRes.json();
                    if (record && record.clockInMs && !record.clockOutMs) {
                        setClockState({
                            clockInMs          : record.clockInMs,
                            locationType       : record.locationType ?? locationType,
                            activeBreakStartMs : record.activeBreakStartMs ?? null,
                            accumulatedBreakSec: record.accumulatedBreakSec ?? 0,
                        });
                        setRecords(prev => {
                            const normalized = normalizeRecord(record);
                            return [normalized, ...prev.filter(r => r.id !== normalized.id)];
                        });
                        return true;
                    }
                }
                return false;
            }

            if (!res.ok) {
                const { message } = await res.json().catch(() => ({ message: "Unknown error" }));
                return false;
            }

            const { record } = await res.json();
            const normalized = normalizeRecord(record);
            if (!normalized.clockInMs) {
                return false;
            }
            setClockState({ clockInMs: normalized.clockInMs, locationType });
            setRecords(prev => [normalized, ...prev.filter(r => r.id !== normalized.id)]);
            return true;
        } catch (err) {
            return false;
        }
    }, []);

    const startBreak = useCallback(async () => {
        try {
            const res = await apiFetch(`${API_BASE}/api/attendance/break-start`, {
                method : "POST",
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const { message } = await res.json().catch(() => ({ message: "Unknown error" }));
                return false;
            }
            const { record } = await res.json();
            setClockState(prev => prev ? {
                ...prev,
                activeBreakStartMs : record.activeBreakStartMs,
                accumulatedBreakSec: record.accumulatedBreakSec ?? 0,
            } : null);
            return true;
        } catch (err) {
            return false;
        }
    }, []);

    const endBreak = useCallback(async () => {
        try {
            const res = await apiFetch(`${API_BASE}/api/attendance/break-end`, {
                method : "POST",
                headers: getAuthHeaders(),
            });
            if (!res.ok) {
                const { message } = await res.json().catch(() => ({ message: "Unknown error" }));
                return false;
            }
            const { record } = await res.json();
            setClockState(prev => prev ? {
                ...prev,
                activeBreakStartMs : null,
                accumulatedBreakSec: record.accumulatedBreakSec ?? 0,
            } : null);
            return true;
        } catch (err) {
            return false;
        }
    }, []);

    const updateRemarks = useCallback(async (recordId, text) => {
        try {
            const res = await apiFetch(`${API_BASE}/api/attendance/${recordId}/remarks`, {
                method : "PATCH",
                headers: getAuthHeaders(),
                body   : JSON.stringify({ adminRemarks: text || null }),
            });
            if (!res.ok) return false;
            const { record } = await res.json();
            const normalized = normalizeRecord(record);
            setRecords(prev => prev.map(r => r.id === normalized.id ? normalized : r));
            return true;
        } catch {
            return false;
        }
    }, []);

    const clockOut = useCallback(async () => {
        if (!clockState) return null;
        try {
            const res = await apiFetch(`${API_BASE}/api/attendance/clock-out`, {
                method : "POST",
                headers: getAuthHeaders(),
                body   : JSON.stringify({}),
            });
            if (!res.ok) {
                const { message } = await res.json().catch(() => ({ message: "Unknown error" }));
                return null;
            }
            const { record } = await res.json();
            const normalized = normalizeRecord(record);

            const endpoint = isAdmin ? "/api/attendance/all" : "/api/attendance/my";
            const refetchRes = await apiFetch(`${API_BASE}${endpoint}`, { headers: getAuthHeaders() });
            if (refetchRes.ok) {
                const { records: fresh } = await refetchRes.json();
                setRecords(fresh.map(normalizeRecord));
            } else {
                setRecords(prev => [normalized, ...prev.filter(r => r.id !== normalized.id)]);
            }

            setClockState(null);
            return normalized;
        } catch (err) {
            return null;
        }
    }, [clockState, isAdmin]);

    const today       = todayISO();
    const isClockedIn = clockState !== null;

    const todayRecord = isAdmin
        ? (records.find(r => r.date === today && r.employeeId === currentEmployee.id) ?? null)
        : (records.find(r => r.date === today) ?? null);

    const alreadyDone = todayRecord !== null && !isClockedIn;

    return {
        records,
        stats              : computeStats(records, isAdmin ? currentEmployee.id : null),
        weeklyHours        : computeWeeklyHours(records, isAdmin ? currentEmployee.id : null),
        isClockedIn,
        clockInMs          : clockState?.clockInMs ?? null,
        clockedInLocType   : clockState?.locationType ?? "office",
        activeBreakStartMs : clockState?.activeBreakStartMs ?? null,
        accumulatedBreakSec: clockState?.accumulatedBreakSec ?? 0,
        todayRecord,
        alreadyDone,
        clockIn,
        clockOut,
        startBreak,
        endBreak,
        updateRemarks,
    };
}
