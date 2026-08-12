import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const pad = n => String(n).padStart(2, "0");

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

export function useClientOffs() {
    const user    = getStoredUser();
    const userId  = (user?.id ?? user?._id ?? "").toString();
    const isAdmin = user?.role === "admin";

    const [myClientOffs,  setMyClientOffs]  = useState([]);
    const [allClientOffs, setAllClientOffs] = useState([]);

    const fetchMyClientOffs = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/client-off/my`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setMyClientOffs(data.clientOffs ?? []);
            }
        } catch (err) {
            console.error("[ClientOff] Failed to fetch own records:", err);
        }
    }, []);

    const fetchAllClientOffs = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/client-off/all`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setAllClientOffs(data.clientOffs ?? []);
            }
        } catch (err) {
            console.error("[ClientOff] Failed to fetch all records:", err);
        }
    }, []);

    useEffect(() => {
        setMyClientOffs([]);
        setAllClientOffs([]);
        if (!userId) return;
        fetchMyClientOffs();
        if (isAdmin) fetchAllClientOffs();
    }, [userId, isAdmin, fetchMyClientOffs, fetchAllClientOffs]);

    const submitClientOff = useCallback(async ({ date, reason }) => {
        const res = await fetch(`${API_BASE}/api/client-off`, {
            method : "POST",
            headers: getAuthHeaders(),
            body   : JSON.stringify({ date, reason }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to submit Client Off request");
        await fetchMyClientOffs();
        return data.clientOff;
    }, [fetchMyClientOffs]);

    const reviewClientOff = useCallback(async (id, status) => {
        const res = await fetch(`${API_BASE}/api/client-off/${id}/review`, {
            method : "PATCH",
            headers: getAuthHeaders(),
            body   : JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to review Client Off request");
        await fetchAllClientOffs();
        return data.clientOff;
    }, [fetchAllClientOffs]);

    const getMonthlyCount = useCallback((year, month) => {
        const now      = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const source   = isAdmin ? allClientOffs : myClientOffs;
        return source.filter(co => {
            if (co.status !== "Approved") return false;
            if (co.date > todayStr) return false;
            const d = new Date(co.date + "T00:00:00");
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        }).length;
    }, [isAdmin, allClientOffs, myClientOffs]);

    const getMonthlyCountForEmployee = useCallback((year, month, empId) => {
        const now      = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        return allClientOffs.filter(co => {
            if (co.userId !== empId && co.userId?.toString() !== empId) return false;
            if (co.status !== "Approved") return false;
            if (co.date > todayStr) return false;
            const d = new Date(co.date + "T00:00:00");
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        }).length;
    }, [allClientOffs]);

    return {
        myClientOffs,
        allClientOffs,
        fetchMyClientOffs,
        fetchAllClientOffs,
        submitClientOff,
        reviewClientOff,
        getMonthlyCount,
        getMonthlyCountForEmployee,
    };
}
