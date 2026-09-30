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

export function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount,   setUnreadCount]   = useState(0);

    const user   = getStoredUser();
    const userId = (user?.id ?? user?._id ?? "").toString();

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/notifications`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications ?? []);
                setUnreadCount(data.unreadCount ?? 0);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    }, []);

    useEffect(() => {
        setNotifications([]);
        setUnreadCount(0);
        if (!userId) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications, userId]); 

    const markAsRead = useCallback(async (id) => {
        try {
            const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
                method: "PATCH",
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
                method: "PATCH",
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    }, []);

    return { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead };
}
