import React, { useState } from "react";
import "./SideBar.css";
import { NavLink, useNavigate } from "react-router-dom";
import {
    FaTachometerAlt, FaClock, FaCalendarAlt,
    FaUserCircle, FaUsers, FaSignOutAlt, FaClipboardList, FaClipboardCheck,
    FaInbox, FaUserSlash, FaTimes, FaIdCard, FaCommentAlt, FaPowerOff,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";

const mainNav = [
    { to: "/dashboard",          icon: FaTachometerAlt, label: "Dashboard"           },
    { to: "/attendance",         icon: FaClock,         label: "Attendance"          },
    { to: "/attendance-remarks", icon: FaCommentAlt,    label: "Remarks"             },
    { to: "/profile",            icon: FaIdCard,        label: "My Profile"          },
];

const employeeNav = [
    { to: "/leave",       icon: FaCalendarAlt, label: "Leave"       },
    { to: "/my-requests", icon: FaInbox,       label: "My Requests" },
];

const adminNav = [
    { to: "/employees",            icon: FaUsers,         label: "Employee Management"     },
    { to: "/leave-management",     icon: FaClipboardList, label: "Leave Management"        },
    { to: "/correction-management",icon: FaClipboardCheck,label: "Correction Management"   },
    { to: "/overtime-management",      icon: FaClock,       label: "Overtime Management"     },
    { to: "/client-off-management",    icon: FaUserSlash,   label: "Client Off Management"   },
];

function SideBar() {
    const { currentEmployee, sidebarOpen, closeSidebar } = useApp();
    const isAdmin  = currentEmployee?.role === "admin";
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);

    function confirmLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    }

    function handleNavClick() {
        closeSidebar();
    }

    return (
        <>
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <div className={`sidebar${sidebarOpen ? " sidebar--open" : ""}`}>
            <div>

                <div className="sidebar-brand">
                    <div className="sidebar-brand-logo">
                        <img src="/logo.jpeg" alt="Renevise" className="brand-logo-img" />
                        <span className="brand-name">Renevise</span>
                    </div>
                    <div className="brand-subtitle">Human Resource Management</div>
                    <button className="sidebar-close-btn" onClick={closeSidebar} aria-label="Close menu">
                        <FaTimes size={14} />
                    </button>
                </div>

                <div className="nav-section-label">Main Menu</div>
                <ul className="sidebar-nav">
                    {mainNav.map(({ to, icon: Icon, label }) => (
                        <li key={to}>
                            <NavLink to={to} className="nav-link" onClick={handleNavClick}>
                                <Icon className="nav-icon" />
                                {label}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                {!isAdmin && (
                    <>
                        <div className="nav-section-label">My Requests</div>
                        <ul className="sidebar-nav">
                            {employeeNav.map(({ to, icon: Icon, label }) => (
                                <li key={to}>
                                    <NavLink to={to} className="nav-link" onClick={handleNavClick}>
                                        <Icon className="nav-icon" />
                                        {label}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {isAdmin && (
                    <>
                        <div className="nav-section-label">Administration</div>
                        <ul className="sidebar-nav">
                            {adminNav.map(({ to, icon: Icon, label }) => (
                                <li key={to}>
                                    <NavLink to={to} className="nav-link" onClick={handleNavClick}>
                                        <Icon className="nav-icon" />
                                        {label}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            <div className="sidebar-footer">
                <div className="user-avatar">
                    <FaUserCircle size={20} />
                </div>
                <div className="user-info">
                    <p className="user-name">{currentEmployee.name}</p>
                    <span className="user-role">{currentEmployee.role}</span>
                </div>
                <button className="logout-btn" onClick={() => setShowConfirm(true)} title="Sign out">
                    <FaPowerOff size={17} />
                </button>
            </div>

            {showConfirm && (
                <div className="logout-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="logout-modal" onClick={e => e.stopPropagation()}>
                        <div className="logout-modal-icon">
                            <FaSignOutAlt size={22} style={{ color: "#5EA8FF" }} />
                        </div>
                        <h3 className="logout-modal-title">Sign Out</h3>
                        <p className="logout-modal-msg">
                            Are you sure you want to sign out of your account?
                        </p>
                        <div className="logout-modal-actions">
                            <button
                                className="logout-cancel-btn"
                                onClick={() => setShowConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="logout-confirm-btn"
                                onClick={confirmLogout}
                            >
                                Yes, Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}

export default SideBar;
