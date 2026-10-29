import React from "react";
import "./SideBar.css";
import { NavLink } from "react-router-dom";
import {
    FaTachometerAlt, FaClock, FaCalendarAlt,
    FaUsers, FaClipboardList, FaClipboardCheck,
    FaInbox, FaUserSlash, FaTimes, FaCommentAlt,
    FaUserClock,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";

const mainNav = [
    { to: "/dashboard",          icon: FaTachometerAlt, label: "Dashboard"           },
    { to: "/attendance",         icon: FaClock,         label: "Attendance"          },
    { to: "/attendance-remarks", icon: FaCommentAlt,    label: "Remarks"             },
];

const employeeNav = [
    { to: "/leave",       icon: FaCalendarAlt, label: "Leave"       },
    { to: "/my-requests", icon: FaInbox,       label: "My Requests" },
];

const adminNav = [
    { to: "/today-attendance",     icon: FaUserClock,     label: "Today's Attendance"      },
    { to: "/employees",            icon: FaUsers,         label: "Employee Management"     },
    { to: "/leave-management",     icon: FaClipboardList, label: "Leave Management"        },
    { to: "/correction-management",icon: FaClipboardCheck,label: "Correction Management"   },
    { to: "/overtime-management",      icon: FaClock,       label: "Overtime Management"     },
    { to: "/client-off-management",    icon: FaUserSlash,   label: "Client Off Management"   },
];

function SideBar() {
    const { currentEmployee, sidebarOpen, closeSidebar } = useApp();
    const isAdmin = currentEmployee?.role === "admin";

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
        </div>
        </>
    );
}

export default SideBar;
