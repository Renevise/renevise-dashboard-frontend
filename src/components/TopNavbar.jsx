import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import "./TopNavbar.css";
import { useApp } from "../context/AppContext";
import { FaUserCircle, FaIdCard, FaSignOutAlt, FaPowerOff } from "react-icons/fa";

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

function formatZoneTime(date, timezone) {
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", hour12: true, timeZone: timezone,
    });
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
        if (notif.type === "company_off")              navigate("/attendance");
        else if (notif.type === "correction_submitted") navigate("/correction-management");
        else if (notif.type === "overtime_submitted")   navigate("/overtime-management");
        else if (notif.type === "leave_submitted")      navigate("/leave-management");
        else if (notif.type?.startsWith("correction"))  navigate("/attendance-correction");
        else if (notif.type?.startsWith("overtime"))    navigate("/report-overtime");
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
    const navigate            = useNavigate();
    const { currentEmployee, notifications: notifCtx, setSidebarOpen } = useApp();
    const [now, setNow]       = useState(new Date());
    const [open, setOpen]     = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const bellRef             = useRef(null);
    const userMenuRef         = useRef(null);

    const { notifications = [], unreadCount = 0, markAsRead, markAllAsRead } = notifCtx ?? {};

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        function handleOutsideClick(e) {
            if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        }
        if (open || userMenuOpen) document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [open, userMenuOpen]);

    function confirmLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    }

    const title = PAGE_TITLES[pathname] || "Dashboard";

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    return (
        <>

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
                        <span className="nav-tz-time">{formatZoneTime(now, "Asia/Karachi")}</span>
                    </div>
                    <div className="nav-tz-sep" />
                    <div className="nav-tz">
                        <span className="nav-tz-label">EST</span>
                        <span className="nav-tz-time">{formatZoneTime(now, "America/New_York")}</span>
                    </div>
                </div>
                <div className="nav-date">{today}</div>

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

                <div className="user-menu-wrap" ref={userMenuRef}>
                    <button
                        className="user-menu-btn"
                        onClick={() => setUserMenuOpen(prev => !prev)}
                        aria-label="User menu"
                    >
                        <FaUserCircle size={20} />
                    </button>

                    {userMenuOpen && (
                        <div className="user-menu-panel">
                            <div className="user-menu-info">
                                <div className="user-menu-avatar">
                                    <FaUserCircle size={28} />
                                </div>
                                <div>
                                    <div className="user-menu-name">{currentEmployee.name}</div>
                                    <div className="user-menu-role">{currentEmployee.role}</div>
                                </div>
                            </div>
                            <div className="user-menu-divider" />
                            <NavLink
                                to="/profile"
                                className="user-menu-item"
                                onClick={() => setUserMenuOpen(false)}
                            >
                                <FaIdCard size={13} />
                                My Profile
                            </NavLink>
                            <button
                                className="user-menu-item user-menu-item--logout"
                                onClick={() => { setUserMenuOpen(false); setShowLogoutConfirm(true); }}
                            >
                                <FaPowerOff size={13} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </header>

        {showLogoutConfirm && (
            <div className="logout-overlay" onClick={() => setShowLogoutConfirm(false)}>
                <div className="logout-modal" onClick={e => e.stopPropagation()}>
                    <div className="logout-modal-icon">
                        <FaSignOutAlt size={22} style={{ color: "#5EA8FF" }} />
                    </div>
                    <h3 className="logout-modal-title">Sign Out</h3>
                    <p className="logout-modal-msg">
                        Are you sure you want to sign out of your account?
                    </p>
                    <div className="logout-modal-actions">
                        <button className="logout-cancel-btn" onClick={() => setShowLogoutConfirm(false)}>
                            Cancel
                        </button>
                        <button className="logout-confirm-btn" onClick={confirmLogout}>
                            Yes, Sign Out
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

export default TopNavbar;
