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

export function useCompanyOffs() {
    const user   = getStoredUser();
    const userId = (user?.id ?? user?._id ?? "").toString();

    const [companyOffs, setCompanyOffs] = useState([]);

    const fetchCompanyOffs = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/company-off`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setCompanyOffs(data.companyOffs ?? []);
            }
        } catch (err) {
            console.error("Failed to fetch company offs:", err);
        }
    }, []);

    useEffect(() => {
        setCompanyOffs([]);
        if (!userId) return;
        fetchCompanyOffs();
    }, [userId, fetchCompanyOffs]);

    const createCompanyOff = useCallback(async ({ fromDate, untilDate, reason }) => {
        const res = await fetch(`${API_BASE}/api/company-off`, {
            method : "POST",
            headers: getAuthHeaders(),
            body   : JSON.stringify({ fromDate, untilDate, reason }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create company off");
        await fetchCompanyOffs();
        return data.companyOff;
    }, [fetchCompanyOffs]);

    const deleteCompanyOff = useCallback(async (id) => {
        const res = await fetch(`${API_BASE}/api/company-off/${id}`, {
            method : "DELETE",
            headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to delete company off");
        await fetchCompanyOffs();
    }, [fetchCompanyOffs]);

    const getMonthlyCount = useCallback((year, month) => {
        let count = 0;
        for (const co of companyOffs) {
            const from  = new Date(co.fromDate  + "T00:00:00");
            const until = new Date(co.untilDate + "T00:00:00");
            const cur   = new Date(from);
            while (cur <= until) {
                if (cur.getFullYear() === year && cur.getMonth() + 1 === month) count++;
                cur.setDate(cur.getDate() + 1);
            }
        }
        return count;
    }, [companyOffs]);

    const isCompanyOffDay = useCallback((dateStr) => {
        return companyOffs.some(co => dateStr >= co.fromDate && dateStr <= co.untilDate);
    }, [companyOffs]);

    const getAllCompanyOffDates = useCallback(() => {
        const dates = new Set();
        for (const co of companyOffs) {
            const from  = new Date(co.fromDate  + "T00:00:00");
            const until = new Date(co.untilDate + "T00:00:00");
            const cur   = new Date(from);
            while (cur <= until) {
                dates.add(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
                cur.setDate(cur.getDate() + 1);
            }
        }
        return dates;
    }, [companyOffs]);

    return {
        companyOffs,
        fetchCompanyOffs,
        createCompanyOff,
        deleteCompanyOff,
        getMonthlyCount,
        isCompanyOffDay,
        getAllCompanyOffDates,
    };
}
