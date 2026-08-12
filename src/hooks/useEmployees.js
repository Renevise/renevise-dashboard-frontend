import { useState, useEffect } from "react";

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

export function useEmployees() {
    const user    = getStoredUser();
    const userId  = (user?.id ?? user?._id ?? "").toString();
    const isAdmin = user?.role === "admin";

    const [employees, setEmployees] = useState([]);
    const [loading,   setLoading]   = useState(true);

    useEffect(() => {
        setEmployees([]);

        if (!userId || !isAdmin) {
            setLoading(false);
            return;
        }

        async function load() {
            try {
                const res = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data.employees ?? []);
                }
            } catch (err) {
                console.error("Failed to fetch employees:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [userId]); 

    return { employees, loading };
}
