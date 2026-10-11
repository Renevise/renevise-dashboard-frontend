import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import {
    FaCheckCircle, FaClock, FaAdjust, FaUmbrellaBeach,
    FaCalendarPlus, FaEdit, FaBusinessTime,
    FaArrowRight, FaBuilding, FaHome,
    FaUsers, FaUser, FaChartBar, FaCoffee, FaSignOutAlt,
    FaCalendarAlt, FaTrash, FaPlus, FaTimes,
} from "react-icons/fa";
import { calcLeaveStats } from "../utils/leave";
import { useApp }       from "../context/AppContext";
import { useClock }     from "../hooks/useClock";
import { formatSeconds, formatHours, todayISO } from "../utils/time";
import { computeWeeklyHours, computeStats } from "../utils/attendance";

const STAT_CONFIG = [
    { key: "presentDays",    label: "Present Days",   subFn: () => "this month",                                              icon: FaCheckCircle,   color: "#3E6BFF", glow: "rgba(62,107,255,0.25)"  },
    { key: "lateDays",       label: "Late Days",      subFn: () => "this month",                                              icon: FaClock,         color: "#8B5CF6", glow: "rgba(139,92,246,0.25)" },
    { key: "halfDays",       label: "Half Days",      subFn: () => "this month",                                              icon: FaAdjust,        color: "#F59E0B", glow: "rgba(245,158,11,0.25)" },
    { key: "earlyLeaveDays", label: "Early Leave",    subFn: () => "this month",                                              icon: FaSignOutAlt,    color: "#F97316", glow: "rgba(249,115,22,0.25)"  },
    { key: "monthlyUsed",    label: "This Month",     subFn: () => "leave days used",                                        icon: FaCalendarAlt,   color: "#10B981", glow: "rgba(16,185,129,0.25)" },
    { key: "leaveBalance",   label: "Yearly Balance", subFn: s => `Used: ${s.yearlyUsed ?? 0} / ${s.yearlyTotal ?? 12}`,     icon: FaUmbrellaBeach, color: "#06B6D4", glow: "rgba(6,182,212,0.25)"  },
    { key: "companyOff",     label: "Company Off",    subFn: () => "days this month",                                        icon: FaBuilding,      color: "#EF4444", glow: "rgba(239,68,68,0.25)"  },
    { key: "clientOff",      label: "Client Off",     subFn: () => "days this month",                                        icon: FaUsers,         color: "#EC4899", glow: "rgba(236,72,153,0.25)" },
    { key: "overtimeHours",  label: "Overtime",       subFn: () => "hours approved this month",                               icon: FaBusinessTime,  color: "#14B8A6", glow: "rgba(20,184,166,0.25)"  },
];

const ACTIONS = [
    { label: "Apply Leave",           desc: "Submit a leave request for approval",      icon: FaCalendarPlus, color: "#3E6BFF", path: "/apply-leave" },
    { label: "Attendance Correction", desc: "Fix a missed clock in or clock out",       icon: FaEdit,         color: "#8B5CF6", path: "/attendance-correction" },
    { label: "Report Overtime",       desc: "Log extra hours worked beyond shift",      icon: FaBusinessTime, color: "#F59E0B", path: "/report-overtime" },
];

function WeeklyPillars({ data, live }) {
    const maxH = 9;
    return (
        <div className="weekly-pillars">
            {data.map(({ day, hours }) => {
                const pct   = Math.min((hours / maxH) * 100, 100).toFixed(1);
                const label = hours === 0 ? "–" : `${hours}h`;
                return (
                    <div className="pillar-col" key={day}>
                        <span className="pillar-hours">{label}</span>
                        <div className="pillar-track">
                            {hours > 0 && (
                                <div className="pillar-fill" style={{ height: `${pct}%` }} />
                            )}
                        </div>
                        <span className="pillar-day">{day}</span>
                    </div>
                );
            })}
            {live && <span className="live-pill pillar-live">● LIVE</span>}
        </div>
    );
}

function TeamReportModal({ employees, onClose }) {
    const navigate = useNavigate();
    const [selected, setSelected] = useState([]);

    const sorted = [...employees].sort((a, b) => {
        if (a.role === b.role) return a.userName.localeCompare(b.userName);
        return a.role === "admin" ? -1 : 1;
    });

    function toggleEmployee(id) {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }

    function handleViewReport() {
        const ids = selected.join(",");
        onClose();
        navigate(`/team-report?employees=${ids}`);
    }

    function getInitial(name) {
        return name ? name.charAt(0).toUpperCase() : "?";
    }

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    return (
        <div className="trm-overlay" onClick={onClose}>
            <div className="trm-card" onClick={e => e.stopPropagation()}>

                <div className="trm-header">
                    <div>
                        <h2 className="trm-title">Select employees</h2>
                        <p className="trm-desc">Pick one or more employees to view their team report.</p>
                    </div>
                    <button className="trm-close" onClick={onClose} aria-label="Close">×</button>
                </div>

                <div className="trm-grid">
                    {sorted.map(emp => {
                        const isSelected = selected.includes(emp._id);
                        const isAdminUser = emp.role === "admin";
                        return (
                            <button
                                key={emp._id}
                                className={`trm-emp-card${isSelected ? " trm-selected" : ""}`}
                                onClick={() => toggleEmployee(emp._id)}
                            >
                                <div className={`trm-avatar${isAdminUser ? " trm-avatar-admin" : ""}`}>
                                    {getInitial(emp.userName)}
                                </div>
                                <div className="trm-emp-info">
                                    <span className="trm-emp-name">{emp.userName}</span>
                                    <span className={`trm-role-badge ${isAdminUser ? "trm-badge-admin" : "trm-badge-emp"}`}>
                                        {isAdminUser ? "Admin" : "Employee"}
                                    </span>
                                </div>
                                {isSelected && <span className="trm-check">✓</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="trm-footer">
                    <span className="trm-selected-count">
                        {selected.length > 0 ? `${selected.length} selected` : "No employees selected"}
                    </span>
                    <button
                        className="trm-view-btn"
                        disabled={selected.length === 0}
                        onClick={handleViewReport}
                    >
                        View team report
                    </button>
                </div>
            </div>
        </div>
    );
}

const EMPTY_CO_FORM = { fromDate: "", untilDate: "", reason: "" };

function CompanyOffModal({ onClose, onSubmit }) {
    const [form,       setForm]       = useState(EMPTY_CO_FORM);
    const [error,      setError]      = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const { fromDate, untilDate, reason } = form;
        if (!fromDate || !untilDate || !reason.trim()) {
            setError("All fields are required.");
            return;
        }
        if (untilDate < fromDate) {
            setError("Until date must be on or after from date.");
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit({ fromDate, untilDate, reason: reason.trim() });
            onClose();
        } catch (err) {
            setError(err.message || "Failed to create company off.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="co-modal-overlay" onClick={onClose}>
            <div className="co-modal-card" onClick={e => e.stopPropagation()}>
                <div className="co-modal-header">
                    <div>
                        <h3 className="co-modal-title">Create Company Off</h3>
                        <p className="co-modal-sub">
                            All employees will be notified and emailed automatically.
                        </p>
                    </div>
                    <button className="co-modal-close" onClick={onClose} aria-label="Close">
                        <FaTimes size={14} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="co-modal-form">
                    <div className="co-form-row">
                        <label className="co-form-label">From Date</label>
                        <input
                            type="date"
                            name="fromDate"
                            className="co-form-input"
                            value={form.fromDate}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="co-form-row">
                        <label className="co-form-label">Until Date</label>
                        <input
                            type="date"
                            name="untilDate"
                            className="co-form-input"
                            value={form.untilDate}
                            min={form.fromDate || undefined}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="co-form-row">
                        <label className="co-form-label">Reason / Description</label>
                        <textarea
                            name="reason"
                            className="co-form-textarea"
                            placeholder="e.g. Independence Day / Office Closed"
                            value={form.reason}
                            onChange={handleChange}
                            rows={3}
                            required
                        />
                    </div>

                    {error && <p className="co-form-error">{error}</p>}

                    <div className="co-modal-footer">
                        <button type="button" className="co-btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="co-btn-submit" disabled={submitting}>
                            {submitting ? "Creating…" : "Create Company Off"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DeleteConfirmModal({ record, onClose, onConfirm }) {
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    async function handleDelete() {
        setDeleting(true);
        try {
            await onConfirm(record._id);
            onClose();
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="co-modal-overlay" onClick={onClose}>
            <div className="co-modal-card co-del-card" onClick={e => e.stopPropagation()}>
                <div className="co-modal-header">
                    <h3 className="co-modal-title">Delete Company Off?</h3>
                    <button className="co-modal-close" onClick={onClose}><FaTimes size={14} /></button>
                </div>
                <p className="co-del-msg">
                    <strong>{record.fromDate}</strong>
                    {record.fromDate !== record.untilDate && <> → <strong>{record.untilDate}</strong></>}
                    <br />{record.reason}
                </p>
                <p className="co-del-warn">
                    This will remove the company off record. Employee notifications already sent will not be recalled.
                </p>
                <div className="co-modal-footer">
                    <button className="co-btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="co-btn-delete" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CompanyOffSection({ companyOffs }) {
    const { companyOffs: coList, createCompanyOff, deleteCompanyOff } = companyOffs;
    const [showCreate, setShowCreate] = useState(false);
    const [toDelete,   setToDelete]   = useState(null);

    const sorted = [...coList].sort((a, b) => b.fromDate.localeCompare(a.fromDate));

    function formatRange(co) {
        if (co.fromDate === co.untilDate) return co.fromDate;
        return `${co.fromDate} → ${co.untilDate}`;
    }

    return (
        <div className="co-admin-section">
            <div className="co-admin-header">
                <div>
                    <h3 className="co-admin-title">Company Off Management</h3>
                    <p className="co-admin-sub">
                        Create company-wide off periods. All employees are notified and emailed automatically.
                    </p>
                </div>
                <button className="co-create-btn" onClick={() => setShowCreate(true)}>
                    <FaPlus size={11} /> New Company Off
                </button>
            </div>

            {sorted.length === 0 ? (
                <div className="co-empty">No company off periods have been created yet.</div>
            ) : (
                <ul className="co-list">
                    {sorted.map(co => (
                        <li key={co._id} className="co-item">
                            <div className="co-item-left">
                                <span className="co-item-range">{formatRange(co)}</span>
                                <span className="co-item-reason">{co.reason}</span>
                            </div>
                            <button
                                className="co-delete-btn"
                                onClick={() => setToDelete(co)}
                                title="Delete"
                            >
                                <FaTrash size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {showCreate && (
                <CompanyOffModal
                    onClose={() => setShowCreate(false)}
                    onSubmit={createCompanyOff}
                />
            )}
            {toDelete && (
                <DeleteConfirmModal
                    record={toDelete}
                    onClose={() => setToDelete(null)}
                    onConfirm={deleteCompanyOff}
                />
            )}
        </div>
    );
}

function ClientOffModal({ onClose, myClientOffs, submitClientOff }) {
    const [date,        setDate]        = useState("");
    const [reason,      setReason]      = useState("");
    const [error,       setError]       = useState("");
    const [submitting,  setSubmitting]  = useState(false);
    const [successDate, setSuccessDate] = useState("");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!date)          { setError("Please select a date."); return; }
        if (!reason.trim()) { setError("Please enter a reason."); return; }
        setError("");
        setSubmitting(true);
        try {
            await submitClientOff({ date, reason: reason.trim() });
            setSuccessDate(date);
            setDate("");
            setReason("");
        } catch (err) {
            setError(err.message || "Failed to submit request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    const statusColors = { Approved: "#10B981", Rejected: "#EF4444", Pending: "#F59E0B" };
    const recent = (myClientOffs ?? []).slice(0, 5);

    return (
        <div className="co-modal-overlay" onClick={onClose}>
            <div className="co-modal-card cof-modal-card" onClick={e => e.stopPropagation()}>

                <div className="co-modal-header">
                    <div>
                        <h3 className="co-modal-title">Client Off</h3>
                        <p className="co-modal-sub">Request a day off due to client unavailability.</p>
                    </div>
                    <button className="co-modal-close" onClick={onClose} aria-label="Close">
                        <FaTimes size={14} />
                    </button>
                </div>

                {successDate && (
                    <div className="cof-success-msg">
                        <FaCheckCircle size={15} />
                        <span>Request submitted for <strong>{successDate}</strong>. Pending admin review.</span>
                        <button className="cof-another-btn" onClick={() => setSuccessDate("")}>
                            Submit another
                        </button>
                    </div>
                )}

                {!successDate && (
                    <form className="co-modal-form" onSubmit={handleSubmit} noValidate>
                        <div className="co-form-row">
                            <label className="co-form-label">Date</label>
                            <input
                                type="date"
                                className="co-form-input"
                                value={date}
                                onChange={e => { setDate(e.target.value); setError(""); }}
                            />
                        </div>
                        <div className="co-form-row">
                            <label className="co-form-label">Reason</label>
                            <textarea
                                className="co-form-textarea"
                                placeholder="e.g. Client did not come today."
                                value={reason}
                                rows={3}
                                onChange={e => { setReason(e.target.value); setError(""); }}
                            />
                        </div>
                        {error && <p className="co-form-error">{error}</p>}
                        <div className="co-modal-footer">
                            <button type="button" className="co-btn-cancel" onClick={onClose}>Cancel</button>
                            <button type="submit" className="cof-submit-btn" disabled={submitting}>
                                {submitting ? "Submitting…" : "Submit Request"}
                            </button>
                        </div>
                    </form>
                )}

                {recent.length > 0 && (
                    <div className="cof-history">
                        <p className="cof-history-label">Your Recent Requests</p>
                        <ul className="cof-history-list">
                            {recent.map(r => (
                                <li key={r._id} className="cof-history-item">
                                    <span className="cof-history-date">{r.date}</span>
                                    <span
                                        className="cof-history-status"
                                        style={{ color: statusColors[r.status] ?? "#fff" }}
                                    >
                                        {r.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

function Dashboard() {
    const navigate = useNavigate();
    const { attendance, leave, currentEmployee, employees, companyOffs, clientOffs, overtime } = useApp();
    const {
        isClockedIn, clockInMs, clockedInLocType,
        clockIn, clockOut, alreadyDone,
        activeBreakStartMs, accumulatedBreakSec,
        startBreak, endBreak,
    } = attendance;
    const {
        currentBalance, allLeaves,
        yearlyUsed: myYearlyUsed, monthlyUsed: myMonthlyUsed, yearlyTotal,
    } = leave;
    const isAdmin = currentEmployee?.role === "admin";

    const [now,          setNow]          = useState(new Date());
    const [locType,      setLocType]      = useState("remote");
    const [activeTab,    setActiveTab]    = useState("all");
    const [selectedEmpId,setSelectedEmpId]= useState("");
    const [showTeamModal,      setShowTeamModal]      = useState(false);
    const [showClientOffModal, setShowClientOffModal] = useState(false);
    const [successMsg,      setSuccessMsg]      = useState("");
    const [clockInLoading,  setClockInLoading]  = useState(false);
    const [clockOutLoading, setClockOutLoading] = useState(false);
    const [pendingAction,   setPendingAction]   = useState(null);

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(""), 4000);
        return () => clearTimeout(t);
    }, [successMsg]);

    const elapsed = useClock(isClockedIn, clockInMs);

    // Derive break state entirely from DB fields — no localStorage needed
    const onBreak      = activeBreakStartMs !== null;
    const breakStartMs = onBreak ? activeBreakStartMs : null;

    // Current break session running time (seconds)
    const breakRunning = onBreak && breakStartMs !== null
        ? Math.max(0, Math.floor((now.getTime() - breakStartMs) / 1000))
        : 0;

    // Net worked time frozen at the moment the current break started
    const frozenElapsed = onBreak && clockInMs && breakStartMs
        ? Math.max(0, Math.floor((breakStartMs - clockInMs) / 1000) - accumulatedBreakSec)
        : 0;

    const displayElapsed = onBreak
        ? frozenElapsed
        : Math.max(0, elapsed - accumulatedBreakSec);

    const activeLocType = isClockedIn ? clockedInLocType : locType;

    const viewEmpId = isAdmin
        ? ((activeTab === "emp" && selectedEmpId) ? selectedEmpId : currentEmployee.id)
        : null;

    const viewStats  = computeStats(attendance.records, viewEmpId);
    const chartHours = computeWeeklyHours(attendance.records, viewEmpId);

    const currentYear  = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const companyOffThisMonth = companyOffs?.getMonthlyCount
        ? companyOffs.getMonthlyCount(currentYear, currentMonth)
        : 0;

    const pad = n => String(n).padStart(2, "0");
    const clientOffThisMonth = (() => {
        if (!clientOffs) return 0;
        if (isAdmin && activeTab === "emp" && selectedEmpId && clientOffs.allClientOffs) {
            const now      = new Date();
            const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            return (clientOffs.allClientOffs ?? []).filter(co => {
                if (co.userId !== selectedEmpId && co.userId?.toString() !== selectedEmpId) return false;
                if (co.status !== "Approved") return false;
                if (co.date > todayStr) return false;
                const d = new Date(co.date + "T00:00:00");
                return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
            }).length;
        }
        return clientOffs.getMonthlyCount
            ? clientOffs.getMonthlyCount(currentYear, currentMonth)
            : 0;
    })();

    const empLeaves = (isAdmin && activeTab === "emp" && selectedEmpId)
        ? (allLeaves ?? []).filter(l => l.userId === viewEmpId || l.userId?.toString() === viewEmpId)
        : (leave.myLeaves ?? []);

    const viewLeaveStats = (isAdmin && activeTab === "emp" && selectedEmpId)
        ? calcLeaveStats(empLeaves, currentYear, currentMonth)
        : { yearlyTotal, yearlyUsed: myYearlyUsed, balance: currentBalance, monthlyUsed: myMonthlyUsed };

    const viewLeaveBalance = viewLeaveStats.balance;
    const viewMonthlyUsed  = viewLeaveStats.monthlyUsed;
    const viewYearlyUsed   = viewLeaveStats.yearlyUsed;
    const viewYearlyTotal  = viewLeaveStats.yearlyTotal ?? yearlyTotal;

    const empPendingCount  = empLeaves.filter(l => l.status === "Pending").length;
    const empApprovedCount = empLeaves.filter(l => l.status === "Approved").length;
    const empRejectedCount = empLeaves.filter(l => l.status === "Rejected").length;

    const overtimeEmpId = isAdmin ? viewEmpId : currentEmployee.id;
    const overtimeHours = overtime?.getApprovedHoursThisMonth(currentYear, currentMonth, overtimeEmpId) ?? 0;

    const allStats = {
        ...viewStats,
        leaveBalance    : viewLeaveBalance,
        monthlyUsed     : viewMonthlyUsed,
        yearlyUsed      : viewYearlyUsed,
        yearlyTotal     : viewYearlyTotal,
        companyOff      : companyOffThisMonth,
        clientOff       : clientOffThisMonth,
        overtimeHours,
    };

    const today          = todayISO();
    const empTodayRecord = attendance.records.find(r => r.date === today && r.employeeId === viewEmpId) ?? null;

    async function doClockIn() {
        if (clockInLoading) return;
        setClockInLoading(true);
        const ok = await clockIn(locType);
        setClockInLoading(false);
        if (ok) setSuccessMsg("in");
    }

    async function doClockOut() {
        if (clockOutLoading) return;
        setClockOutLoading(true);
        const result = await clockOut();
        setClockOutLoading(false);
        if (result) setSuccessMsg("out");
    }

    function handleClockIn()    { setPendingAction({ label: "Clock In",    fn: doClockIn   }); }
    function handleClockOut()   { setPendingAction({ label: "Clock Out",   fn: doClockOut  }); }
    function handleStartBreak() { setPendingAction({ label: "Start Break", fn: startBreak  }); }
    function handleEndBreak()   { setPendingAction({ label: "End Break",   fn: endBreak    }); }

    function getBadgeInfo() {
        if (onBreak)     return { text: "On Break",       cls: "badge-break"   };
        if (isClockedIn) return { text: "Clocked In",     cls: "badge-clocked" };
        return                  { text: "Not Clocked In", cls: "badge-none"    };
    }
    const badge = getBadgeInfo();

    function getStatusText() {
        if (onBreak)
            return `On break · ${formatSeconds(breakRunning)} elapsed`;
        if (isClockedIn) {
            const loc = clockedInLocType === "remote" ? "Remote" : "Office";
            return `Clocked in · ${loc}`;
        }
        return "Not clocked in today";
    }

    return (
        <div className="dashboard">

            <div className="filter-bar">
                {isAdmin && (
                    <div className="filter-bar-left">
                        <div className="filter-tabs">
                            <button
                                className={`filter-tab ${activeTab === "all" ? "active" : ""}`}
                                onClick={() => setActiveTab("all")}
                            >
                                <FaUsers size={12} /> All Employees
                            </button>
                            <button
                                className={`filter-tab ${activeTab === "emp" ? "active" : ""}`}
                                onClick={() => setActiveTab("emp")}
                            >
                                <FaUser size={12} /> Employee Data
                            </button>
                        </div>

                        {activeTab === "all" ? (
                            <p className="filter-view-label">
                                Viewing <span className="filter-view-highlight">all employees'</span> attendance
                            </p>
                        ) : (
                            <select
                                className="emp-filter-select"
                                value={selectedEmpId}
                                onChange={e => setSelectedEmpId(e.target.value)}
                            >
                                <option value="">Select employee…</option>
                                <option value={currentEmployee.id}>
                                    {currentEmployee.name} (admin){currentEmployee.department ? ` — ${currentEmployee.department}` : ""}
                                </option>
                                {employees
                                    .filter(e => e._id !== currentEmployee.id && e._id !== currentEmployee._id)
                                    .map(e => (
                                        <option key={e._id} value={e._id}>
                                            {e.userName}{e.role === "admin" ? " (admin)" : ""}{e.department ? ` — ${e.department}` : ""}
                                        </option>
                                    ))}
                            </select>
                        )}
                    </div>
                )}

                <div className="filter-right">
                    {isAdmin && activeTab === "emp" && selectedEmpId && (
                        <div className="emp-today-status">
                            <span className="emp-today-label">Today</span>
                            {empTodayRecord ? (
                                <span className={`emp-today-badge status-${empTodayRecord.clockOutMs ? empTodayRecord.status.toLowerCase().replace(" ", "-") : "clocked-in"}`}>
                                    {empTodayRecord.clockOutMs ? empTodayRecord.status : "Clocked In"}
                                </span>
                            ) : (
                                <span className="emp-today-badge status-absent">Not Clocked In</span>
                            )}
                        </div>
                    )}
                    {isAdmin && (
                        <button className="view-reports-btn" onClick={() => setShowTeamModal(true)}>
                            <FaChartBar size={12} /> View Team Reports
                        </button>
                    )}
                </div>
            </div>

            {/* ══ Attendance Card ══ */}
            <div className="att-card">
                <div className={`att-status-badge ${badge.cls}`}>{badge.text}</div>

                <div className="att-card-body">
                    <div className="att-card-left">
                        <p className="att-shift-label">Today &middot; Day Shift</p>
                        <div className={`att-elapsed ${isClockedIn && !onBreak ? "running" : ""} ${onBreak ? "paused" : ""}`}>
                            {formatSeconds(displayElapsed)}
                        </div>

                        <p className="att-status-text">{getStatusText()}</p>

                        <div className="location-toggle">
                            <button
                                className={`loc-btn active`}
                                disabled={true}
                            >
                                <FaHome size={11} /> Remote
                            </button>
                        </div>

                        {onBreak && (
                            <span className="break-pill">⏸ BREAK · {formatSeconds(breakRunning)}</span>
                        )}
                    </div>
                </div>

                <div className="att-btn-row">
                    {isClockedIn ? (
                        <>
                            <button
                                className="clockin-btn clocked"
                                onClick={handleClockOut}
                                disabled={clockOutLoading}
                            >
                                {clockOutLoading ? "Clocking out…" : "⏹  Clock Out"}
                            </button>
                            <button
                                className={`break-btn ${onBreak ? "on-break" : ""}`}
                                onClick={onBreak ? handleEndBreak : handleStartBreak}
                                disabled={clockOutLoading}
                            >
                                <FaCoffee size={13} />
                                {onBreak ? "End Break" : "Start Break"}
                            </button>
                        </>
                    ) : (
                        <button className="clockin-btn" onClick={handleClockIn} disabled={clockInLoading}>
                            {clockInLoading ? "Clocking in…" : "▶  Clock In"}
                        </button>
                    )}
                </div>

                {successMsg === "in" && (
                    <div className="success-msg success-in">
                        <FaCheckCircle size={14} /> Clocked in successfully
                    </div>
                )}
                {successMsg === "out" && (
                    <div className="success-msg success-out">
                        <FaCheckCircle size={14} /> Clocked out successfully
                    </div>
                )}
            </div>

            {/* ── Stats Row ── */}
            <div className="stats-row">
                {STAT_CONFIG.map(({ key, label, subFn, icon: Icon, color, glow }) => (
                    <div className="stat-card" key={key} style={{ "--glow": glow }}>
                        <div className="stat-icon-wrap" style={{ background: `${color}22`, boxShadow: `0 0 16px ${glow}` }}>
                            <Icon size={20} style={{ color }} />
                        </div>
                        <div>
                            <div className="stat-value">{allStats[key] ?? 0}</div>
                            <div className="stat-label">{label}</div>
                            <div className="stat-sub">{subFn(allStats)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Weekly Pillars ── */}
            <div className="chart-card">
                <div className="card-header">
                    <div>
                        <h3 className="card-title">Hours Worked</h3>
                        <p className="card-sub">Last 5 working days</p>
                    </div>
                </div>
                <WeeklyPillars data={chartHours} live={isClockedIn && !onBreak} />
            </div>

            {/* ── Employee Leave Summary (admin, employee selected) ── */}
            {isAdmin && activeTab === "emp" && selectedEmpId && (
                <div className="emp-leave-summary-row">
                    <div className="emp-ls-header">
                        <span className="emp-ls-title">Leave Summary</span>
                        <span className="emp-ls-name">
                            {employees.find(e => e._id === selectedEmpId)?.userName ?? ""}
                        </span>
                    </div>
                    <div className="emp-ls-cards">
                        <div className="emp-ls-card emp-ls-pending">
                            <span className="emp-ls-val">{empPendingCount}</span>
                            <span className="emp-ls-label">Pending</span>
                        </div>
                        <div className="emp-ls-card emp-ls-approved">
                            <span className="emp-ls-val">{empApprovedCount}</span>
                            <span className="emp-ls-label">Approved</span>
                        </div>
                        <div className="emp-ls-card emp-ls-rejected">
                            <span className="emp-ls-val">{empRejectedCount}</span>
                            <span className="emp-ls-label">Rejected</span>
                        </div>
                        <div className="emp-ls-card emp-ls-balance">
                            <span className="emp-ls-val">{viewLeaveBalance}d</span>
                            <span className="emp-ls-label">Leave Balance</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── My Requests (employees only) ── */}
            {!isAdmin && (
                <>
                    <div className="actions-section-header">
                        <h3 className="card-title">My Requests</h3>
                    </div>
                    <div className="actions-grid">
                        {ACTIONS.map(({ label, desc, icon: Icon, color, path }) => (
                            <button
                                className="action-btn"
                                key={label}
                                style={{ "--ac": color }}
                                onClick={() => path && navigate(path)}
                            >
                                <span className="action-icon-wrap" style={{ background: `${color}22` }}>
                                    <Icon size={18} style={{ color }} />
                                </span>
                                <span className="action-text">
                                    <span className="action-label">{label}</span>
                                    <span className="action-desc">{desc}</span>
                                </span>
                                <FaArrowRight size={11} className="action-arrow" />
                            </button>
                        ))}
                        <button
                            className="action-btn"
                            style={{ "--ac": "#EC4899" }}
                            onClick={() => setShowClientOffModal(true)}
                        >
                            <span className="action-icon-wrap" style={{ background: "#EC489922" }}>
                                <FaUsers size={18} style={{ color: "#EC4899" }} />
                            </span>
                            <span className="action-text">
                                <span className="action-label">Client Off</span>
                                <span className="action-desc">Mark a day as client off</span>
                            </span>
                            <FaArrowRight size={11} className="action-arrow" />
                        </button>
                    </div>
                </>
            )}

            {/* ── Company Off Management (admin only) ── */}
            {isAdmin && <CompanyOffSection companyOffs={companyOffs} />}

            {/* Team Report Modal */}
            {showTeamModal && (
                <TeamReportModal
                    employees={employees}
                    onClose={() => setShowTeamModal(false)}
                />
            )}

            {/* Client Off Modal — employees only */}
            {showClientOffModal && (
                <ClientOffModal
                    onClose={() => setShowClientOffModal(false)}
                    myClientOffs={clientOffs?.myClientOffs ?? []}
                    submitClientOff={clientOffs?.submitClientOff ?? (() => {})}
                />
            )}

            {pendingAction && (
                <>
                    <div className="confirm-backdrop" onClick={() => setPendingAction(null)} />
                    <div className="confirm-dialog">
                        <p className="confirm-msg">
                            Are you sure you want to <strong>{pendingAction.label}</strong>?
                        </p>
                        <div className="confirm-btns">
                            <button
                                className="confirm-yes"
                                onClick={async () => { setPendingAction(null); await pendingAction.fn(); }}
                            >
                                Confirm
                            </button>
                            <button
                                className="confirm-no"
                                onClick={() => setPendingAction(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}

export default Dashboard;
