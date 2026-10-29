import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getStoredUser() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export function useOvertime() {
    const user    = getStoredUser();
    const userId  = (user?.id ?? user?._id ?? "").toString();
    const isAdmin = user?.role === "admin";

    const [myOvertimes,  setMyOvertimes]  = useState([]);
    const [allOvertimes, setAllOvertimes] = useState([]);

    const fetchMy = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/overtime/my`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setMyOvertimes(data.overtimes ?? []);
            }
        } catch (err) {
        }
    }, []);

    const fetchAll = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/overtime/all`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setAllOvertimes(data.overtimes ?? []);
            }
        } catch (err) {
        }
    }, []);

    useEffect(() => {
        setMyOvertimes([]);
        setAllOvertimes([]);
        if (!userId) return;
        fetchMy();
        if (isAdmin) fetchAll();
    }, [userId]);

    function getApprovedHoursThisMonth(year, month, empId) {
        const pad    = n => String(n).padStart(2, "0");
        const prefix = `${year}-${pad(month)}`;
        const list   = isAdmin ? allOvertimes : myOvertimes;
        return list
            .filter(o => {
                if (o.status !== "Approved") return false;
                if (!o.date.startsWith(prefix)) return false;
                if (!empId) return true;
                const reqId = o.requestedForId?.toString() ?? "";
                const uid   = o.userId?.toString() ?? "";
                return reqId === empId || uid === empId;
            })
            .reduce((sum, o) => sum + (o.extraHours ?? 0), 0);
    }

    function getApprovedDaysThisMonth(year, month, empId) {
        const pad    = n => String(n).padStart(2, "0");
        const prefix = `${year}-${pad(month)}`;
        const list   = isAdmin ? allOvertimes : myOvertimes;
        const dates  = new Set(
            list
                .filter(o => {
                    if (o.status !== "Approved") return false;
                    if (!o.date.startsWith(prefix)) return false;
                    if (!empId) return true;
                    const reqId = o.requestedForId?.toString() ?? "";
                    const uid   = o.userId?.toString() ?? "";
                    return reqId === empId || uid === empId;
                })
                .map(o => o.date)
        );
        return dates.size;
    }

    return {
        myOvertimes,
        allOvertimes,
        getApprovedHoursThisMonth,
        getApprovedDaysThisMonth,
        refresh: async () => {
            await fetchMy();
            if (isAdmin) await fetchAll();
        },
    };
}
