import { useState, useEffect, useCallback } from "react";
import {
    FaUserClock, FaCheckCircle, FaTimesCircle, FaCalendarAlt,
    FaBuilding, FaUserSlash, FaSyncAlt,
} from "react-icons/fa";
import { todayISO } from "../utils/time";
import "./TodayAttendance.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function formatDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
}

const STATUS_CONFIG = {
    "Present":     { color: "#10B981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.25)"  },
    "Absent":      { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.25)"   },
    "On Leave":    { color: "#8B5CF6", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.25)"  },
    "Company Off": { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)"  },
    "Client Off":  { color: "#EC4899", bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.25)"  },
    "Not Started": { color: "#94A3B8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)" },
};

const ATT_STATUS_CONFIG = {
    "Present":     { color: "#10B981" },
    "Late":        { color: "#F59E0B" },
    "Half Day":    { color: "#F97316" },
    "Early Leave": { color: "#FB923C" },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Not Started"];
    return (
        <span
            className="ta-badge"
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
            {status}
        </span>
    );
}

function AttStatusBadge({ status }) {
    if (!status || status === "Present") return null;
    const cfg = ATT_STATUS_CONFIG[status];
    if (!cfg) return null;
    return (
        <span className="ta-att-sub" style={{ color: cfg.color }}>
            {status}
        </span>
    );
}

const SUMMARY_CARDS = [
    { key: "present",    label: "Present",     icon: FaCheckCircle, color: "#10B981", glow: "rgba(16,185,129,0.18)"  },
    { key: "absent",     label: "Absent",      icon: FaTimesCircle, color: "#EF4444", glow: "rgba(239,68,68,0.18)"   },
    { key: "onLeave",    label: "On Leave",    icon: FaCalendarAlt, color: "#8B5CF6", glow: "rgba(139,92,246,0.18)"  },
    { key: "companyOff", label: "Company Off", icon: FaBuilding,    color: "#F59E0B", glow: "rgba(245,158,11,0.18)"  },
    { key: "clientOff",  label: "Client Off",  icon: FaUserSlash,   color: "#EC4899", glow: "rgba(236,72,153,0.18)"  },
];

export default function TodayAttendance() {
    const [selectedDate, setSelectedDate] = useState(() => todayISO());
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [search, setSearch]   = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const fetchData = useCallback(async (date) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `${API_BASE}/api/attendance/today-summary?date=${date}`,
                { headers: getAuthHeaders() }
            );
            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.assign("/login");
                return;
            }
            if (res.status === 403) {
                setError("Access denied. Admin only.");
                setLoading(false);
                return;
            }
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || `Server error ${res.status}`);
            }
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err.message || "Failed to load attendance data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(selectedDate); }, [fetchData, selectedDate]);

    const allStatuses = ["All", "Present", "Absent", "On Leave", "Company Off", "Client Off", "Not Started"];

    const filtered = data
        ? data.employees.filter(e => {
            const matchSearch = !search.trim() ||
                e.name.toLowerCase().includes(search.toLowerCase()) ||
                (e.department || "").toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === "All" || e.status === statusFilter;
            return matchSearch && matchStatus;
        })
        : [];

    function handleDateChange(e) {
        const val = e.target.value;
        if (val) {
            setSelectedDate(val);
            setStatusFilter("All");
            setSearch("");
        }
    }

    return (
        <div className="ta-page">
            <div className="ta-header">
                <div>
                    <h1 className="ta-title">
                        <FaUserClock className="ta-title-icon" />
                        Attendance
                    </h1>
                    <p className="ta-subtitle">
                        {data ? formatDate(data.date) : "Loading date…"}
                    </p>
                </div>
                <div className="ta-header-controls">
                    <input
                        type="date"
                        className="ta-date-input"
                        value={selectedDate}
                        onChange={handleDateChange}
                        disabled={loading}
                        title="Select date"
                    />
                    <button
                        className="ta-refresh-btn"
                        onClick={() => fetchData(selectedDate)}
                        disabled={loading}
                        title="Refresh"
                    >
                        <FaSyncAlt className={loading ? "ta-spin" : ""} size={14} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="ta-cards-grid">
                {SUMMARY_CARDS.map(({ key, label, icon: Icon, color, glow }) => (
                    <button
                        key={key}
                        className={`ta-card${statusFilter === label ? " ta-card--active" : ""}`}
                        style={{ "--card-color": color, "--card-glow": glow }}
                        onClick={() => setStatusFilter(prev => prev === label ? "All" : label)}
                    >
                        <div className="ta-card-icon-wrap">
                            <Icon size={18} style={{ color }} />
                        </div>
                        <div className="ta-card-body">
                            <span className="ta-card-count" style={{ color }}>
                                {loading ? "—" : (data?.summary?.[key] ?? 0)}
                            </span>
                            <span className="ta-card-label">{label}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="ta-filter-bar">
                <input
                    className="ta-search"
                    type="text"
                    placeholder="Search by name or department…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select
                    className="ta-select"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    {allStatuses.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                {(search || statusFilter !== "All") && (
                    <button className="ta-clear-btn" onClick={() => { setSearch(""); setStatusFilter("All"); }}>
                        Clear
                    </button>
                )}
            </div>

            {/* Table */}
            {loading && (
                <div className="ta-state-wrap">
                    <div className="ta-spinner" />
                    <p className="ta-state-text">Loading attendance data…</p>
                </div>
            )}

            {!loading && error && (
                <div className="ta-state-wrap ta-state-error">
                    <FaTimesCircle size={32} style={{ color: "#EF4444", marginBottom: 10 }} />
                    <p className="ta-state-text">{error}</p>
                    <button className="ta-refresh-btn" onClick={() => fetchData(selectedDate)} style={{ marginTop: 12 }}>
                        Try Again
                    </button>
                </div>
            )}

            {!loading && !error && data && (
                filtered.length === 0 ? (
                    <div className="ta-state-wrap">
                        <FaUserClock size={32} style={{ color: "rgba(255,255,255,0.2)", marginBottom: 10 }} />
                        <p className="ta-state-text">No employees match your filters.</p>
                    </div>
                ) : (
                    <div className="ta-table-wrap">
                        <table className="ta-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Employee</th>
                                    <th>Department</th>
                                    <th>Clock In</th>
                                    <th>Clock Out</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((emp, i) => (
                                    <tr key={emp.userId}>
                                        <td className="ta-td-num">{i + 1}</td>
                                        <td className="ta-td-name">{emp.name}</td>
                                        <td className="ta-td-dept">
                                            {emp.department
                                                ? <span className="ta-dept-tag">{emp.department}</span>
                                                : <span className="ta-na">—</span>}
                                        </td>
                                        <td className="ta-td-time">
                                            {emp.clockIn
                                                ? <span className="ta-time">{emp.clockIn}</span>
                                                : <span className="ta-na">—</span>}
                                        </td>
                                        <td className="ta-td-time">
                                            {emp.clockOut
                                                ? <span className="ta-time">{emp.clockOut}</span>
                                                : <span className="ta-na">—</span>}
                                        </td>
                                        <td className="ta-td-status">
                                            <StatusBadge status={emp.status} />
                                            <AttStatusBadge status={emp.attendanceStatus} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="ta-count-note">
                            Showing {filtered.length} of {data.employees.length} employees
                        </p>
                    </div>
                )
            )}
        </div>
    );
}
