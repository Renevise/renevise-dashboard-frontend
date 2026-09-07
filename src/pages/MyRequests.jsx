import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarPlus, FaEdit, FaHourglassHalf, FaHistory, FaPlus } from "react-icons/fa";
import { useApp } from "../context/AppContext";
import "./MyRequests.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

const TABS = [
    { key: "leave",      label: "Leave",                  icon: FaCalendarPlus,  route: "/apply-leave"           },
    { key: "correction", label: "Attendance Correction",  icon: FaEdit,           route: "/attendance-correction" },
    { key: "overtime",   label: "Report Overtime",        icon: FaHourglassHalf, route: "/report-overtime"       },
];

function StatusBadge({ status }) {
    const cls = {
        Approved: "mr-badge--approved",
        Rejected: "mr-badge--rejected",
        Pending:  "mr-badge--pending",
        Expired:  "mr-badge--expired",
    };
    return <span className={`mr-badge ${cls[status] || "mr-badge--pending"}`}>{status}</span>;
}

function LeaveList({ leaves, loading }) {
    if (loading) return <p className="mr-empty">Loading…</p>;
    if (!leaves.length) return <p className="mr-empty">No leave requests submitted yet.</p>;
    return (
        <div className="mr-list">
            {leaves.map(req => (
                <div key={req._id} className="mr-item">
                    <div className="mr-item-left">
                        <span className="mr-item-title">{req.leaveType}</span>
                        <span className="mr-item-sub">
                            {req.fromDate} &rarr; {req.untilDate}
                            {req.days && (
                                <span className="mr-days-pill">{req.days}d</span>
                            )}
                        </span>
                        <span className="mr-item-reason">"{req.reason}"</span>
                    </div>
                    <div className="mr-item-right">
                        <StatusBadge status={req.status} />
                        {req.status !== "Pending" && req.reviewedBy && (
                            <span className="mr-reviewer">by {req.reviewedBy}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CorrectionList({ items, loading }) {
    if (loading) return <p className="mr-empty">Loading…</p>;
    if (!items.length) return <p className="mr-empty">No correction requests submitted yet.</p>;
    return (
        <div className="mr-list">
            {items.map(req => (
                <div key={req._id} className="mr-item">
                    <div className="mr-item-left">
                        <span className="mr-item-title">{req.date}</span>
                        <span className="mr-item-sub mr-mono">{req.clockIn} &rarr; {req.clockOut}</span>
                        <span className="mr-item-reason">"{req.reason}"</span>
                    </div>
                    <div className="mr-item-right">
                        <StatusBadge status={req.status} />
                        {req.status !== "Pending" && req.reviewedBy && (
                            <span className="mr-reviewer">by {req.reviewedBy}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function OvertimeList({ items, loading }) {
    if (loading) return <p className="mr-empty">Loading…</p>;
    if (!items.length) return <p className="mr-empty">No overtime requests submitted yet.</p>;
    return (
        <div className="mr-list">
            {items.map(req => (
                <div key={req._id} className="mr-item">
                    <div className="mr-item-left">
                        <span className="mr-item-title">{req.date}</span>
                        <span className="mr-item-hours">{req.extraHours}h overtime</span>
                        {req.requestedFor && req.requestedFor !== req.employee && (
                            <span className="mr-item-sub">For: {req.requestedFor}</span>
                        )}
                        <span className="mr-item-reason">"{req.reason}"</span>
                    </div>
                    <div className="mr-item-right">
                        <StatusBadge status={req.status} />
                        {req.status !== "Pending" && req.reviewedBy && (
                            <span className="mr-reviewer">by {req.reviewedBy}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function MyRequests() {
    const navigate = useNavigate();
    const { leave } = useApp();
    const { myLeaves, loading: leaveLoading } = leave;

    const [activeTab, setActiveTab] = useState("leave");

    const [corrections,    setCorrections]    = useState([]);
    const [corrLoading,    setCorrLoading]    = useState(true);
    const [overtimes,      setOvertimes]      = useState([]);
    const [otLoading,      setOtLoading]      = useState(true);

    const fetchCorrections = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/attendance-correction/my`, { headers: getAuthHeaders() });
            if (res.ok) {
                const { corrections: data } = await res.json();
                setCorrections(data ?? []);
            }
        } catch {  } finally { setCorrLoading(false); }
    }, []);

    const fetchOvertimes = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/overtime/my`, { headers: getAuthHeaders() });
            if (res.ok) {
                const { overtimes: data } = await res.json();
                setOvertimes(data ?? []);
            }
        } catch {  } finally { setOtLoading(false); }
    }, []);

    useEffect(() => {
        fetchCorrections();
        fetchOvertimes();
    }, [fetchCorrections, fetchOvertimes]);

    const counts = {
        leave:      myLeaves.length,
        correction: corrections.length,
        overtime:   overtimes.length,
    };

    const activeTabMeta = TABS.find(t => t.key === activeTab);

    return (
        <div className="mr-page">
            <div className="mr-page-header">
                <div>
                    <h2 className="mr-page-title">My Requests</h2>
                    <p className="mr-page-sub">Track the status of your submitted requests</p>
                </div>
                <button
                    className="mr-new-btn"
                    onClick={() => navigate(activeTabMeta.route)}
                >
                    <FaPlus size={11} />
                    Submit New {activeTabMeta.label}
                </button>
            </div>

            <div className="mr-tabs">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        className={`mr-tab${activeTab === key ? " mr-tab--active" : ""}`}
                        onClick={() => setActiveTab(key)}
                    >
                        <Icon size={13} />
                        {label}
                        {counts[key] > 0 && (
                            <span className="mr-tab-count">{counts[key]}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="mr-content-card">
                {activeTab === "leave" && (
                    <LeaveList leaves={myLeaves} loading={leaveLoading} />
                )}
                {activeTab === "correction" && (
                    <CorrectionList items={corrections} loading={corrLoading} />
                )}
                {activeTab === "overtime" && (
                    <OvertimeList items={overtimes} loading={otLoading} />
                )}
            </div>
        </div>
    );
}
