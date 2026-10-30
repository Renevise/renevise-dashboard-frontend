import { useState, useEffect, useCallback } from "react";
import leaveConfig from "../data/leave.json";
import config      from "../data/dashboard.json";

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

export function useLeave() {
    const user    = getStoredUser();
    const userId  = (user?.id ?? user?._id ?? "").toString();
    const isAdmin = user?.role === "admin";

    const [myLeaves,    setMyLeaves]    = useState([]);
    const [allLeaves,   setAllLeaves]   = useState([]);
    const [balance,     setBalance]     = useState(config.initialLeaveBalance);
    const [yearlyUsed,  setYearlyUsed]  = useState(0);
    const [monthlyUsed, setMonthlyUsed] = useState(0);
    const [loading,     setLoading]     = useState(true);

    const fetchMyLeaves = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/leave/my`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setMyLeaves(data.leaves ?? []);
                setBalance(data.balance     ?? config.initialLeaveBalance);
                setYearlyUsed(data.yearlyUsed   ?? 0);
                setMonthlyUsed(data.monthlyUsed ?? 0);
            }
        } catch (err) {
        }
    }, []);

    const fetchAllLeaves = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/leave/all`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setAllLeaves(data.leaves ?? []);
            }
        } catch (err) {
        }
    }, []);

    useEffect(() => {
        setMyLeaves([]);
        setAllLeaves([]);
        setBalance(config.initialLeaveBalance);
        setYearlyUsed(0);
        setMonthlyUsed(0);

        if (!userId) { setLoading(false); return; }

        async function init() {
            setLoading(true);
            if (isAdmin) {
                await Promise.all([fetchMyLeaves(), fetchAllLeaves()]);
            } else {
                await fetchMyLeaves();
            }
            setLoading(false);
        }
        init();
    }, [userId]); 

    const applyLeave = useCallback(async ({ type, from, to, reason, departureTime }) => {
        const body = { leaveType: type, fromDate: from, untilDate: to, reason };
        if (departureTime)  body.departureTime  = departureTime;
        const res = await fetch(`${API_BASE}/api/leave`, {
            method : "POST",
            headers: getAuthHeaders(),
            body   : JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to submit leave request");
        await fetchMyLeaves();
        return data.leave;
    }, [fetchMyLeaves]);

    const approveLeave = useCallback(async (id) => {
        const res = await fetch(`${API_BASE}/api/leave/${id}/review`, {
            method : "PATCH",
            headers: getAuthHeaders(),
            body   : JSON.stringify({ status: "Approved" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to approve leave");
        await Promise.all([fetchAllLeaves(), fetchMyLeaves()]);
    }, [fetchAllLeaves, fetchMyLeaves]);

    const rejectLeave = useCallback(async (id) => {
        const res = await fetch(`${API_BASE}/api/leave/${id}/review`, {
            method : "PATCH",
            headers: getAuthHeaders(),
            body   : JSON.stringify({ status: "Rejected" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to reject leave");
        await Promise.all([fetchAllLeaves(), fetchMyLeaves()]);
    }, [fetchAllLeaves, fetchMyLeaves]);

    const displayList = isAdmin ? allLeaves : myLeaves;

    return {
        currentBalance : balance,
        yearlyTotal    : config.initialLeaveBalance,
        yearlyUsed,
        monthlyUsed,
        myLeaves,
        allLeaves,
        requests    : displayList,
        pendingList : displayList.filter(r => r.status === "Pending"),
        reviewedList: displayList.filter(r => r.status !== "Pending"),
        leaveTypes  : leaveConfig.types,
        loading,
        isAdmin,
        applyLeave,
        approveLeave,
        rejectLeave,
        refresh: async () => {
            await fetchMyLeaves();
            if (isAdmin) await fetchAllLeaves();
        },
    };
}
