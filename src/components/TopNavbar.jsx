import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TopNavbar.css";
import { useApp } from "../context/AppContext";

const PAGE_TITLES = {
    "/dashboard"             : "Dashboard",
    "/attendance"            : "Attendance",
    "/leave"                 : "Leave Management",
    "/employees"             : "Employee Management",
    "/my-requests"           : "My Requests",
    "/team-report"           : "Team Report",
    "/apply-leave"           : "Apply Leave",
    "/attendance-correction" : "Attendance Correction",
    "/report-overtime"       : "Report Overtime",
    "/leave-management"      : "Leave Management",
    "/correction-management" : "Correction Management",
    "/overtime-management"   : "Overtime Management",
};

function formatZoneTime(date, offsetHours) {
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
    const zoned = new Date(utcMs + 3600000 * offsetHours);
    return zoned.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function BellIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

function NotificationPanel({ notifications, unreadCount, markAsRead, markAllAsRead, onClose }) {
    const navigate = useNavigate();

    function handleNotifClick(notif) {
        if (!notif.read) markAsRead(notif._id);
        onClose();
        if (notif.type === "company_off") navigate("/attendance");
        else if (notif.type?.startsWith("correction")) navigate("/attendance-correction");
        else if (notif.type?.startsWith("overtime")) navigate("/report-overtime");
        else navigate("/leave");
    }

    return (
        <div className="notif-panel">
            <div className="notif-panel-header">
                <span className="notif-panel-title">Notifications</span>
                {unreadCount > 0 && (
                    <button className="notif-mark-all" onClick={markAllAsRead}>
                        Mark all read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="notif-empty">No notifications yet</div>
            ) : (
                <ul className="notif-list">
                    {notifications.map(n => (
                        <li
                            key={n._id}
                            className={`notif-item${n.read ? "" : " notif-item--unread"}`}
                            onClick={() => handleNotifClick(n)}
                        >
                            <div className={`notif-dot${n.type === "leave_approved" ? " notif-dot--green" : n.type === "company_off" ? " notif-dot--blue" : " notif-dot--red"}`} />
                            <div className="notif-content">
                                <span className="notif-item-title">{n.title}</span>
                                <span className="notif-item-msg">{n.message}</span>
                                <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function TopNavbar() {
    const { pathname }        = useLocation();
    const { currentEmployee, notifications: notifCtx, setSidebarOpen } = useApp();
    const [now, setNow]       = useState(new Date());
    const [open, setOpen]     = useState(false);
    const bellRef             = useRef(null);

    const { notifications = [], unreadCount = 0, markAsRead, markAllAsRead } = notifCtx ?? {};

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        function handleOutsideClick(e) {
            if (bellRef.current && !bellRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [open]);

    const title = PAGE_TITLES[pathname] || "Dashboard";

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const isAdmin = currentEmployee?.role === "admin";

    return (
        <header className="topnav">

            <button className="topnav-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <span /><span /><span />
            </button>

            <div className="topnav-left">
                <h1 className="topnav-title">{title}</h1>
                <span className="topnav-welcome">
                    Welcome back, <strong>{currentEmployee.name}</strong>
                </span>
            </div>

            <div className="topnav-right">
                <div className="nav-tz-wrap">
                    <div className="nav-tz">
                        <span className="nav-tz-label">PKT</span>
                        <span className="nav-tz-time">{formatZoneTime(now, 5)}</span>
                    </div>
                    <div className="nav-tz-sep" />
                    <div className="nav-tz">
                        <span className="nav-tz-label">EST</span>
                        <span className="nav-tz-time">{formatZoneTime(now, -5)}</span>
                    </div>
                </div>
                <div className="nav-date">{today}</div>

                {!isAdmin && (
                    <div className="notif-bell-wrap" ref={bellRef}>
                        <button
                            className="notif-bell-btn"
                            onClick={() => setOpen(prev => !prev)}
                            aria-label="Notifications"
                        >
                            <BellIcon />
                            {unreadCount > 0 && (
                                <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                            )}
                        </button>

                        {open && (
                            <NotificationPanel
                                notifications={notifications}
                                unreadCount={unreadCount}
                                markAsRead={markAsRead}
                                markAllAsRead={markAllAsRead}
                                onClose={() => setOpen(false)}
                            />
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

export default TopNavbar;
