import { useState, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
    FaChevronLeft, FaChevronRight, FaTimes, FaArrowLeft,
} from "react-icons/fa";
import { useApp }               from "../context/AppContext";
import { formatHours, formatBreak, todayISO } from "../utils/time";
import { computeWeeklyHours }   from "../utils/attendance";
import "./TeamReport.css";
import { calcLeaveStats } from "../utils/leave";

function toMonthPrefix(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(prefix) {
    const [y, m] = prefix.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
        month: "long", year: "numeric",
    });
}

function calcStats(empRecords) {
    return {
        present    : empRecords.filter(r => r.status === "Present").length,
        late       : empRecords.filter(r => r.status === "Late").length,
        halfDay    : empRecords.filter(r => r.status === "Half Day").length,
        earlyLeave : empRecords.filter(r => r.status === "Early Leave").length,
    };
}

function AttBadge({ status }) {
    const cls = {
        Present      : "atb-present",
        Late         : "atb-late",
        "Half Day"   : "atb-half",
        "Early Leave": "atb-early",
    };
    return <span className={`tr-atb ${cls[status] || "atb-present"}`}>{status}</span>;
}

function LeaveBadge({ status }) {
    const cls = { Approved: "lbg-approved", Rejected: "lbg-rejected", Pending: "lbg-pending" };
    return <span className={`tr-lbg ${cls[status] || "lbg-pending"}`}>{status}</span>;
}

function ClockStatusBadge({ todayRecord }) {
    if (!todayRecord)            return <span className="tr-clock-badge tr-clock-none">● Not Clocked In</span>;
    if (!todayRecord.clockOutMs) return <span className="tr-clock-badge tr-clock-in">● Clocked In</span>;
    return                              <span className="tr-clock-badge tr-clock-out">● Clocked Out</span>;
}

function WeeklyHoursChart({ data }) {
    const maxH = Math.max(...data.map(d => d.hours), 1);
    return (
        <div className="tr-weekly">
            {data.map(({ day, hours }) => (
                <div key={day} className="tr-wk-col">
                    <span className="tr-wk-hours">{hours > 0 ? `${hours}h` : "–"}</span>
                    <div className="tr-wk-track">
                        {hours > 0 && (
                            <div
                                className="tr-wk-fill"
                                style={{ height: `${((hours / maxH) * 100).toFixed(1)}%` }}
                            />
                        )}
                    </div>
                    <span className="tr-wk-day">{day}</span>
                </div>
            ))}
        </div>
    );
}

function LeavePanel({ empId, allLeaves }) {
    const [leaveTab, setLeaveTab] = useState("all");
    const leaves   = allLeaves.filter(l => String(l.userId) === String(empId));
    const approved = leaves.filter(l => l.status === "Approved");
    const pending  = leaves.filter(l => l.status === "Pending");
    const rejected = leaves.filter(l => l.status === "Rejected");

    const tabDefs = [
        { key: "all",      label: "All",      list: leaves   },
        { key: "approved", label: "Approved", list: approved },
        { key: "pending",  label: "Pending",  list: pending  },
        { key: "rejected", label: "Rejected", list: rejected },
    ];
    const visible = tabDefs.find(t => t.key === leaveTab)?.list ?? [];

    return (
        <div className="tr-card">
            <div className="tr-card-label">Leave Information</div>
            <div className="tr-leave-tabs">
                {tabDefs.map(t => (
                    <button
                        key={t.key}
                        className={`tr-leave-tab${leaveTab === t.key ? " active" : ""}`}
                        onClick={() => setLeaveTab(t.key)}
                    >
                        {t.label}
                        {t.list.length > 0 && (
                            <span className="tr-leave-cnt">{t.list.length}</span>
                        )}
                    </button>
                ))}
            </div>
            {visible.length === 0 ? (
                <p className="tr-empty">
                    No {leaveTab === "all" ? "" : leaveTab + " "}leave requests.
                </p>
            ) : (
                <div className="tr-leave-list">
                    {visible.map(l => (
                        <div key={l._id} className="tr-leave-item">
                            <div className="tr-leave-row1">
                                <span className="tr-leave-type">{l.leaveType}</span>
                                <LeaveBadge status={l.status} />
                            </div>
                            <div className="tr-leave-dates">
                                {l.fromDate} → {l.untilDate}
                                <span className="tr-leave-days"> · {l.days}d</span>
                            </div>
                            {l.reason && (
                                <div className="tr-leave-reason">"{l.reason}"</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function EmployeeDetail({ emp, leaves, viewMonth, onClose }) {
    const [leaveTab, setLeaveTab] = useState("all");

    const approvedLeaves = leaves.filter(l => l.status === "Approved");
    const pendingLeaves  = leaves.filter(l => l.status === "Pending");
    const rejectedLeaves = leaves.filter(l => l.status === "Rejected");

    const tabDefs = [
        { key: "all",      label: "All",     list: leaves          },
        { key: "approved", label: "Approved", list: approvedLeaves  },
        { key: "pending",  label: "Pending",  list: pendingLeaves   },
        { key: "rejected", label: "Rejected", list: rejectedLeaves  },
    ];
    const visibleLeaves = tabDefs.find(t => t.key === leaveTab)?.list ?? [];

    const { present, late, halfDay, earlyLeave } = emp.stats;
    const empTotal = present + late + halfDay + earlyLeave;
    const empMix = empTotal > 0 ? [
        { label: "On Time",     count: present,    pct: Math.round(present    / empTotal * 100), cls: "mix-present" },
        { label: "Late",        count: late,        pct: Math.round(late        / empTotal * 100), cls: "mix-late"    },
        { label: "Half Day",    count: halfDay,     pct: Math.round(halfDay     / empTotal * 100), cls: "mix-half"    },
        { label: "Early Leave", count: earlyLeave,  pct: Math.round(earlyLeave  / empTotal * 100), cls: "mix-early"   },
    ] : [];

    return (
        <div className="tr-detail">
            <div className="tr-detail-head">
                <div className="tr-detail-emp-info">
                    <div className={`tr-detail-avatar${emp.role === "admin" ? " tr-detail-avatar-admin" : ""}`}>
                        {emp.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="tr-detail-name">
                            {emp.userName}
                            <span className={`tr-role-pill${emp.role === "admin" ? " tr-role-pill-admin" : ""}`}>
                                {emp.role === "admin" ? "Admin" : "Employee"}
                            </span>
                        </div>
                        <div className="tr-detail-sub">{monthLabel(viewMonth)} — Detailed Report</div>
                    </div>
                </div>
                <button className="tr-close-btn" onClick={onClose}>
                    <FaTimes size={12} />
                </button>
            </div>

            <div className="tr-detail-stats">
                <div className="tr-ds tr-ds-present">
                    <div className="tr-ds-val">{present}</div>
                    <div className="tr-ds-lbl">Present</div>
                </div>
                <div className="tr-ds tr-ds-late">
                    <div className="tr-ds-val">{late}</div>
                    <div className="tr-ds-lbl">Late</div>
                </div>
                <div className="tr-ds tr-ds-half">
                    <div className="tr-ds-val">{halfDay}</div>
                    <div className="tr-ds-lbl">Half Day</div>
                </div>
                <div className="tr-ds tr-ds-early">
                    <div className="tr-ds-val">{earlyLeave}</div>
                    <div className="tr-ds-lbl">Early Leave</div>
                </div>
                <div className="tr-ds tr-ds-leave">
                    <div className="tr-ds-val">{emp.leaveBalance}</div>
                    <div className="tr-ds-lbl">Leave Left</div>
                </div>
            </div>

            <div className="tr-detail-body">
                <div className="tr-detail-left">
                    <div className="tr-card">
                        <div className="tr-card-label">Daily Attendance — {monthLabel(viewMonth)}</div>
                        {emp.monthRecords.length === 0 ? (
                            <p className="tr-empty">No attendance records this month.</p>
                        ) : (
                            <div className="tr-tbl-scroll">
                                <table className="tr-tbl">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Clock In</th>
                                            <th>Clock Out</th>
                                            <th>Break</th>
                                            <th>Hours</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emp.monthRecords.map(rec => (
                                            <tr key={rec.id}>
                                                <td>{rec.date}</td>
                                                <td>{rec.clockIn}</td>
                                                <td>{rec.clockOut || "–"}</td>
                                                <td>{formatBreak(rec.breakMinutes)}</td>
                                                <td><strong>{formatHours(rec.workedHours)}</strong></td>
                                                <td><AttBadge status={rec.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="tr-detail-right">
                    <div className="tr-card">
                        <div className="tr-card-label">Status Mix</div>
                        {empMix.length === 0 ? (
                            <p className="tr-empty">No records this month.</p>
                        ) : (
                            <div className="tr-mix">
                                {empMix.map(item => (
                                    <div key={item.label} className="tr-mix-row">
                                        <div className="tr-mix-top">
                                            <span className="tr-mix-label">{item.label}</span>
                                            <span className="tr-mix-count">
                                                {item.count}&ensp;<span className="tr-mix-pct">{item.pct}%</span>
                                            </span>
                                        </div>
                                        <div className="tr-mix-track">
                                            <div className={`tr-mix-fill ${item.cls}`} style={{ width: `${item.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                                <p className="tr-mix-total">Total: {empTotal} record{empTotal !== 1 ? "s" : ""}</p>
                            </div>
                        )}
                    </div>

                    <div className="tr-card">
                        <div className="tr-card-label">Leave Requests</div>
                        <div className="tr-leave-tabs">
                            {tabDefs.map(t => (
                                <button
                                    key={t.key}
                                    className={`tr-leave-tab${leaveTab === t.key ? " active" : ""}`}
                                    onClick={() => setLeaveTab(t.key)}
                                >
                                    {t.label}
                                    {t.list.length > 0 && (
                                        <span className="tr-leave-cnt">{t.list.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {visibleLeaves.length === 0 ? (
                            <p className="tr-empty">No {leaveTab === "all" ? "" : leaveTab + " "}leave requests.</p>
                        ) : (
                            <div className="tr-leave-list">
                                {visibleLeaves.map(l => (
                                    <div key={l._id} className="tr-leave-item">
                                        <div className="tr-leave-row1">
                                            <span className="tr-leave-type">{l.leaveType}</span>
                                            <LeaveBadge status={l.status} />
                                        </div>
                                        <div className="tr-leave-dates">
                                            {l.fromDate} → {l.untilDate}
                                            <span className="tr-leave-days"> · {l.days}d</span>
                                        </div>
                                        {l.reason && <div className="tr-leave-reason">"{l.reason}"</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TeamReport() {
    const navigate       = useNavigate();
    const [searchParams] = useSearchParams();
    const { attendance, leave, employees } = useApp();
    const { records }   = attendance;
    const { allLeaves } = leave;

    const selectedIds = useMemo(() => {
        const param = searchParams.get("employees");
        return param ? param.split(",").filter(Boolean) : [];
    }, [searchParams]);

    const [monthOffset,   setMonthOffset]   = useState(0);
    const [expandedEmpId, setExpandedEmpId] = useState(null);

    const viewMonth = useMemo(() => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() + monthOffset);
        return toMonthPrefix(d);
    }, [monthOffset]);

    const selectedPeople = useMemo(() =>
        employees
            .filter(e => selectedIds.includes(String(e._id)))
            .sort((a, b) => {
                if (a.role === b.role) return a.userName.localeCompare(b.userName);
                return a.role === "admin" ? -1 : 1;
            })
    , [employees, selectedIds]);

    const monthRecords = useMemo(() =>
        records.filter(r =>
            r.date.startsWith(viewMonth) &&
            selectedIds.includes(r.employeeId)
        )
    , [records, viewMonth, selectedIds]);

    const [viewYear, viewMonthNum] = viewMonth.split("-").map(Number);

    const empData = useMemo(() =>
        selectedPeople.map(emp => {
            const id        = String(emp._id);
            const empRec    = monthRecords
                .filter(r => r.employeeId === id)
                .sort((a, b) => a.date.localeCompare(b.date));
            const empLeaves = allLeaves.filter(l => String(l.userId) === id);
            const ls        = calcLeaveStats(empLeaves, viewYear, viewMonthNum);
            return {
                ...emp,
                _id         : id,
                stats       : calcStats(empRec),
                leaveBalance: ls.balance,
                monthRecords: empRec,
            };
        })
    , [selectedPeople, monthRecords, allLeaves, viewYear, viewMonthNum]);

    const isSingle  = selectedIds.length === 1;
    const singleEmp = isSingle ? (empData[0] ?? null) : null;

    const weeklyHours = useMemo(() => {
        if (!isSingle || !singleEmp) return [];
        return computeWeeklyHours(records, singleEmp._id);
    }, [isSingle, singleEmp, records]);

    const todayRecord = useMemo(() => {
        if (!isSingle || !singleEmp) return null;
        const today = todayISO();
        return records.find(r => r.date === today && r.employeeId === singleEmp._id) ?? null;
    }, [isSingle, singleEmp, records]);

    const overview = useMemo(() => {
        const totalPresent    = empData.reduce((s, e) => s + e.stats.present,    0);
        const totalLate       = empData.reduce((s, e) => s + e.stats.late,       0);
        const totalHalfDay    = empData.reduce((s, e) => s + e.stats.halfDay,    0);
        const totalEarlyLeave = empData.reduce((s, e) => s + e.stats.earlyLeave, 0);
        const totalLeave      = empData.reduce((s, e) => s + e.leaveBalance,     0);
        const totalAtt        = totalPresent + totalLate + totalHalfDay + totalEarlyLeave;
        return { totalPresent, totalLate, totalHalfDay, totalEarlyLeave, totalLeave, totalAtt };
    }, [empData]);

    const { totalAtt, totalPresent, totalLate, totalHalfDay, totalEarlyLeave } = overview;
    const statusMix = totalAtt > 0 ? [
        { label: "On Time",     count: totalPresent,    pct: Math.round(totalPresent    / totalAtt * 100), cls: "mix-present" },
        { label: "Late",        count: totalLate,        pct: Math.round(totalLate        / totalAtt * 100), cls: "mix-late"    },
        { label: "Half Day",    count: totalHalfDay,     pct: Math.round(totalHalfDay     / totalAtt * 100), cls: "mix-half"    },
        { label: "Early Leave", count: totalEarlyLeave,  pct: Math.round(totalEarlyLeave  / totalAtt * 100), cls: "mix-early"   },
    ] : [];

    if (selectedIds.length === 0) return <Navigate to="/dashboard" replace />;

    const pageTitle = isSingle && singleEmp
        ? `Report for ${singleEmp.userName}`
        : `Report for ${selectedIds.length} employee${selectedIds.length !== 1 ? "s" : ""}`;

    return (
        <div className="tr-page">

            <button className="tr-back-btn" onClick={() => navigate("/dashboard")}>
                <FaArrowLeft size={11} /> Dashboard
            </button>

            <div className="tr-page-header">
                <div>
                    <h2 className="tr-page-title">
                        {isSingle ? "Individual Report" : "Team Report"}
                    </h2>
                    <p className="tr-page-sub">{pageTitle}</p>
                </div>
                <div className="tr-month-nav">
                    <button className="tr-nav-btn" onClick={() => setMonthOffset(o => o - 1)}>
                        <FaChevronLeft size={11} />
                    </button>
                    <span className="tr-month-label">{monthLabel(viewMonth)}</span>
                    <button
                        className="tr-nav-btn"
                        disabled={monthOffset >= 0}
                        onClick={() => setMonthOffset(o => o + 1)}
                    >
                        <FaChevronRight size={11} />
                    </button>
                </div>
            </div>

            {isSingle && singleEmp && (
                <>

                    <div className="tr-profile-card">
                        <div className={`tr-profile-avatar${singleEmp.role === "admin" ? " tr-profile-admin" : ""}`}>
                            {singleEmp.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="tr-profile-info">
                            <div className="tr-profile-name">{singleEmp.userName}</div>
                            <div className="tr-profile-meta">
                                <span className={`tr-role-pill${singleEmp.role === "admin" ? " tr-role-pill-admin" : ""}`}>
                                    {singleEmp.role === "admin" ? "Admin" : "Employee"}
                                </span>
                                {singleEmp.email && (
                                    <span className="tr-profile-email">{singleEmp.email}</span>
                                )}
                            </div>
                        </div>
                        <div className="tr-profile-status">
                            <span className="tr-clock-status-label">Today's Status</span>
                            <ClockStatusBadge todayRecord={todayRecord} />
                        </div>
                    </div>

                    {/* 4 Summary cards */}
                    <div className="tr-ov-grid tr-ov-4col">
                        <div className="tr-ov-card tr-ov-present">
                            <div className="tr-ov-num">{singleEmp.stats.present}</div>
                            <div className="tr-ov-lbl">Present Days</div>
                        </div>
                        <div className="tr-ov-card tr-ov-late">
                            <div className="tr-ov-num">{singleEmp.stats.late}</div>
                            <div className="tr-ov-lbl">Late Days</div>
                        </div>
                        <div className="tr-ov-card tr-ov-half">
                            <div className="tr-ov-num">{singleEmp.stats.halfDay}</div>
                            <div className="tr-ov-lbl">Half Days</div>
                        </div>
                        <div className="tr-ov-card tr-ov-leave">
                            <div className="tr-ov-num">{singleEmp.leaveBalance}</div>
                            <div className="tr-ov-lbl">Leave Balance</div>
                        </div>
                    </div>

                    {/* Weekly hours + Status mix */}
                    <div className="tr-mid-grid">
                        <div className="tr-card">
                            <div className="tr-card-label">Hours Worked — This Week</div>
                            <WeeklyHoursChart data={weeklyHours} />
                        </div>
                        <div className="tr-card">
                            <div className="tr-card-label">Status Mix — {monthLabel(viewMonth)}</div>
                            {(() => {
                                const total = singleEmp.stats.present + singleEmp.stats.late +
                                              singleEmp.stats.halfDay + singleEmp.stats.earlyLeave;
                                if (total === 0) return <p className="tr-empty">No records this month.</p>;
                                const mix = [
                                    { label: "On Time",     count: singleEmp.stats.present,   cls: "mix-present" },
                                    { label: "Late",        count: singleEmp.stats.late,       cls: "mix-late"    },
                                    { label: "Half Day",    count: singleEmp.stats.halfDay,    cls: "mix-half"    },
                                    { label: "Early Leave", count: singleEmp.stats.earlyLeave, cls: "mix-early"   },
                                ].map(m => ({ ...m, pct: Math.round((m.count / total) * 100) }));
                                return (
                                    <div className="tr-mix">
                                        {mix.map(item => (
                                            <div key={item.label} className="tr-mix-row">
                                                <div className="tr-mix-top">
                                                    <span className="tr-mix-label">{item.label}</span>
                                                    <span className="tr-mix-count">
                                                        {item.count}&ensp;<span className="tr-mix-pct">{item.pct}%</span>
                                                    </span>
                                                </div>
                                                <div className="tr-mix-track">
                                                    <div
                                                        className={`tr-mix-fill ${item.cls}`}
                                                        style={{ width: `${item.pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <p className="tr-mix-total">
                                            Total: {total} record{total !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Daily attendance table */}
                    <div className="tr-card tr-card-mb">
                        <div className="tr-card-label">Daily Attendance — {monthLabel(viewMonth)}</div>
                        {singleEmp.monthRecords.length === 0 ? (
                            <p className="tr-empty">No attendance records for this month.</p>
                        ) : (
                            <div className="tr-tbl-scroll">
                                <table className="tr-tbl">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Clock In</th>
                                            <th>Clock Out</th>
                                            <th>Break</th>
                                            <th>Hours</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {singleEmp.monthRecords.map(rec => (
                                            <tr key={rec.id}>
                                                <td>{rec.date}</td>
                                                <td>{rec.clockIn}</td>
                                                <td>{rec.clockOut || "–"}</td>
                                                <td>{formatBreak(rec.breakMinutes)}</td>
                                                <td><strong>{formatHours(rec.workedHours)}</strong></td>
                                                <td><AttBadge status={rec.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Leave panel */}
                    <LeavePanel empId={singleEmp._id} allLeaves={allLeaves} />
                </>
            )}

            {isSingle && !singleEmp && (
                <p className="tr-empty" style={{ padding: "60px 0" }}>
                    Employee not found.
                </p>
            )}

            {/* ══ MULTIPLE EMPLOYEES VIEW ══ */}
            {!isSingle && (
                <>
                    {/* Combined overview cards */}
                    <div className="tr-ov-grid tr-ov-4col">
                        <div className="tr-ov-card tr-ov-present">
                            <div className="tr-ov-num">{overview.totalPresent}</div>
                            <div className="tr-ov-lbl">Total Present Days</div>
                        </div>
                        <div className="tr-ov-card tr-ov-late">
                            <div className="tr-ov-num">{overview.totalLate}</div>
                            <div className="tr-ov-lbl">Total Late Days</div>
                        </div>
                        <div className="tr-ov-card tr-ov-half">
                            <div className="tr-ov-num">{overview.totalHalfDay}</div>
                            <div className="tr-ov-lbl">Total Half Days</div>
                        </div>
                        <div className="tr-ov-card tr-ov-leave">
                            <div className="tr-ov-num">{overview.totalLeave}</div>
                            <div className="tr-ov-lbl">Combined Leave Balance</div>
                        </div>
                    </div>

                    {/* Ranking + status mix */}
                    <div className="tr-mid-grid">
                        <div className="tr-card">
                            <div className="tr-card-label">Present Days by Employee</div>
                            {empData.every(e => e.stats.present + e.stats.late + e.stats.halfDay === 0) ? (
                                <p className="tr-empty">No attendance records this month.</p>
                            ) : (
                                <div className="tr-ranking">
                                    {[...empData]
                                        .map(e => ({
                                            name: e.userName,
                                            days: e.stats.present + e.stats.late + e.stats.halfDay,
                                        }))
                                        .sort((a, b) => b.days - a.days)
                                        .map((r, i) => {
                                            const maxDays = Math.max(
                                                ...empData.map(e => e.stats.present + e.stats.late + e.stats.halfDay),
                                                1
                                            );
                                            return (
                                                <div key={i} className="tr-rank-row">
                                                    <span className="tr-rank-name">{r.name}</span>
                                                    <div className="tr-rank-track">
                                                        <div
                                                            className="tr-rank-fill"
                                                            style={{ width: `${Math.round(r.days / maxDays * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="tr-rank-val">{r.days}d</span>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            )}
                        </div>

                        <div className="tr-card">
                            <div className="tr-card-label">Combined Status Mix</div>
                            {statusMix.length === 0 ? (
                                <p className="tr-empty">No attendance records this month.</p>
                            ) : (
                                <div className="tr-mix">
                                    {statusMix.map(item => (
                                        <div key={item.label} className="tr-mix-row">
                                            <div className="tr-mix-top">
                                                <span className="tr-mix-label">{item.label}</span>
                                                <span className="tr-mix-count">
                                                    {item.count}&ensp;<span className="tr-mix-pct">{item.pct}%</span>
                                                </span>
                                            </div>
                                            <div className="tr-mix-track">
                                                <div
                                                    className={`tr-mix-fill ${item.cls}`}
                                                    style={{ width: `${item.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <p className="tr-mix-total">Total attendance records: {totalAtt}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Individual breakdown cards */}
                    <div className="tr-section-label">Individual Breakdown</div>
                    <div className="tr-emp-grid">
                        {empData.map(emp => (
                            <div
                                key={emp._id}
                                className={`tr-emp-card${expandedEmpId === emp._id ? " tr-emp-card--sel" : ""}`}
                                onClick={() => setExpandedEmpId(prev => prev === emp._id ? null : emp._id)}
                            >
                                <div className="tr-emp-top">
                                    <div className={`tr-emp-avatar${emp.role === "admin" ? " tr-emp-avatar-admin" : ""}`}>
                                        {emp.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="tr-emp-name">{emp.userName}</div>
                                        <span className={`tr-role-pill${emp.role === "admin" ? " tr-role-pill-admin" : ""}`}>
                                            {emp.role === "admin" ? "Admin" : "Employee"}
                                        </span>
                                    </div>
                                </div>
                                <div className="tr-emp-stats">
                                    <div className="tr-emp-stat">
                                        <span className="tr-es-val es-present">{emp.stats.present}</span>
                                        <span className="tr-es-lbl">Present</span>
                                    </div>
                                    <div className="tr-emp-stat">
                                        <span className="tr-es-val es-late">{emp.stats.late}</span>
                                        <span className="tr-es-lbl">Late</span>
                                    </div>
                                    <div className="tr-emp-stat">
                                        <span className="tr-es-val es-half">{emp.stats.halfDay}</span>
                                        <span className="tr-es-lbl">Half Day</span>
                                    </div>
                                    <div className="tr-emp-stat">
                                        <span className="tr-es-val es-leave">{emp.leaveBalance}</span>
                                        <span className="tr-es-lbl">Leave Left</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Expanded detail panel */}
                    {expandedEmpId && (() => {
                        const emp       = empData.find(e => e._id === expandedEmpId);
                        const empLeaves = allLeaves.filter(l => String(l.userId) === expandedEmpId);
                        if (!emp) return null;
                        return (
                            <EmployeeDetail
                                emp={emp}
                                leaves={empLeaves}
                                viewMonth={viewMonth}
                                onClose={() => setExpandedEmpId(null)}
                            />
                        );
                    })()}
                </>
            )}
        </div>
    );
}
