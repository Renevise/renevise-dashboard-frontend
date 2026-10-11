import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./AttendanceRemarks.css";
import { FaUsers, FaUser } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight, FaClockRotateLeft } from "react-icons/fa6";
import { useApp } from "../context/AppContext";
import { formatHours } from "../utils/time";

const ROWS_PER_PAGE = 10;

const STATUS_STYLE = {
    Present       : { bg: "rgba(16,185,129,0.15)",  color: "#10B981" },
    Late          : { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" },
    "Half Day"    : { bg: "rgba(139,92,246,0.15)",  color: "#8B5CF6" },
    "Early Leave" : { bg: "rgba(249,115,22,0.15)",  color: "#F97316" },
    "Company Off" : { bg: "rgba(99,102,241,0.15)",  color: "#6366F1" },
};

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function StatusBadge({ status }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE.Present;
    return (
        <span className="rmkp-badge" style={{ background: s.bg, color: s.color }}>
            {status}
        </span>
    );
}

function getAutoRemarks(record) {
    if (record.isCompanyOff)                                return "";
    if (record.status === "Early Leave" && record.isLate)   return "Late, Early Leave";
    if (record.status === "Half Day"    && record.isLate)   return "Late, Half Day";
    return "";
}

function RemarksPanel({ row, allRecords, isAdmin, onClose, onSave }) {
    const [text,   setText]   = useState(row.adminRemarks ?? "");
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);

    useEffect(() => {
        setText(row.adminRemarks ?? "");
        setSaved(false);
    }, [row.id, row.adminRemarks]);

    const empRecords = useMemo(() =>
        allRecords.filter(r => !r.isCompanyOff && r.employeeId === row.employeeId),
    [allRecords, row.employeeId]);

    const lateCount       = empRecords.filter(r => r.isLate).length;
    const halfDayCount    = empRecords.filter(r => r.status === "Half Day"    && !r.isLate).length;
    const earlyLeaveCount = empRecords.filter(r => r.status === "Early Leave" && !r.isLate).length;

    const dayName = useMemo(() => {
        if (!row.date) return "";
        return DAYS[new Date(row.date + "T00:00:00").getDay()];
    }, [row.date]);

    const handleSave = async () => {
        setSaving(true);
        const ok = await onSave(row.id, text);
        setSaving(false);
        if (ok) setSaved(true);
    };

    return (
        <>
            <div className="rmkp-backdrop" onClick={onClose} />
            <div className="rmkp-panel">
                <div className="rmkp-header">
                    <span className="rmkp-title">Attendance Remarks</span>
                    <button className="rmkp-close" onClick={onClose}>✕</button>
                </div>

                <div className="rmkp-body">
                    {/* Info */}
                    <div className="rmkp-info-card">
                        <div className="rmkp-row">
                            <span className="rmkp-lbl">Employee</span>
                            <span className="rmkp-val rmkp-emp">{row.employee}</span>
                        </div>
                        <div className="rmkp-row">
                            <span className="rmkp-lbl">Date</span>
                            <span className="rmkp-val">
                                {row.date}&nbsp;
                                <span className="rmkp-day">{dayName}</span>
                            </span>
                        </div>
                        <div className="rmkp-row">
                            <span className="rmkp-lbl">Clock In</span>
                            <span className="rmkp-val">{row.clockIn}</span>
                        </div>
                        <div className="rmkp-row">
                            <span className="rmkp-lbl">Clock Out</span>
                            <span className="rmkp-val">{row.clockOut}</span>
                        </div>
                        <div className="rmkp-row">
                            <span className="rmkp-lbl">Hours</span>
                            <span className="rmkp-val">{formatHours(row.workedHours)}</span>
                        </div>
                        <div className="rmkp-row">
                            <span className="rmkp-lbl">Status</span>
                            <span className="rmkp-val" style={{ gap: 6 }}>
                                <StatusBadge status={row.status} />
                                {row.isLate && row.status !== "Late" && (
                                    <span className="rmkp-late-tag">+ Late Arrival</span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="rmkp-stats">
                        <div className="rmkp-stat rmkp-stat--late">
                            <span className="rmkp-stat-num">{lateCount}</span>
                            <span className="rmkp-stat-lbl">Late Days</span>
                        </div>
                        <div className="rmkp-stat rmkp-stat--half">
                            <span className="rmkp-stat-num">{halfDayCount}</span>
                            <span className="rmkp-stat-lbl">Half Days</span>
                        </div>
                        <div className="rmkp-stat rmkp-stat--early">
                            <span className="rmkp-stat-num">{earlyLeaveCount}</span>
                            <span className="rmkp-stat-lbl">Early Leaves</span>
                        </div>
                    </div>

                    {/* System note for Late + Half Day */}
                    {row.isLate && row.status === "Half Day" && (
                        <div className="rmkp-sysnote">
                            <span className="rmkp-sysnote-lbl">System Note</span>
                            <p className="rmkp-sysnote-text">
                                This record is <strong>Late + Half Day</strong>. It is counted under <strong>Late Days</strong> only — Half Day count is not incremented.
                            </p>
                        </div>
                    )}

                    {/* System note for Late + Early Leave */}
                    {row.isLate && row.status === "Early Leave" && (
                        <div className="rmkp-sysnote">
                            <span className="rmkp-sysnote-lbl">System Note</span>
                            <p className="rmkp-sysnote-text">
                                This record is <strong>Late + Early Leave</strong>. It is counted under <strong>Late Days</strong> only — Early Leave count is not incremented.
                            </p>
                        </div>
                    )}

                    {/* Remarks */}
                    <div className="rmkp-section">
                        <div className="rmkp-section-lbl">Admin Remarks</div>
                        {isAdmin ? (
                            <>
                                <textarea
                                    className="rmkp-textarea"
                                    rows={5}
                                    placeholder="Write remarks about this attendance record…"
                                    value={text}
                                    onChange={e => { setText(e.target.value); setSaved(false); }}
                                />
                                <button
                                    className={`rmkp-save${saved ? " rmkp-save--saved" : ""}`}
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? "Saving…" : saved ? "Saved ✓" : "Save Remarks"}
                                </button>
                            </>
                        ) : (
                            <div className="rmkp-readonly">
                                {row.adminRemarks
                                    ? <p className="rmkp-readonly-text">{row.adminRemarks}</p>
                                    : <p className="rmkp-no-remarks">No remarks added by admin.</p>
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function AttendanceRemarks() {
    const { attendance, employees, currentEmployee, updateRemarks } = useApp();
    const { records } = attendance;
    const isAdmin = currentEmployee?.role === "admin";

    const [activeTab,     setActiveTab]     = useState("all");
    const [selectedEmpId, setSelectedEmpId] = useState("");
    const [page,          setPage]          = useState(1);
    const [openRow,       setOpenRow]       = useState(null);

    const filtered = useMemo(() => {
        let result = records.filter(r => !r.isCompanyOff);
        if (isAdmin && activeTab === "emp" && selectedEmpId) {
            result = result.filter(r => r.employeeId === selectedEmpId);
        }
        return result;
    }, [records, isAdmin, activeTab, selectedEmpId]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const pageData   = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    useEffect(() => { setPage(1); }, [activeTab, selectedEmpId]);

    const handleTabChange = tab => { setActiveTab(tab); setSelectedEmpId(""); };

    const handleSave = useCallback(async (recordId, text) => {
        return await updateRemarks(recordId, text);
    }, [updateRemarks]);

    // Keep panel in sync when record updates after save
    useEffect(() => {
        if (!openRow) return;
        const fresh = records.find(r => r.id === openRow.id);
        if (fresh) setOpenRow(fresh);
    }, [records]);

    return (
        <div className="rmkpage">

            <div className="rmkpage-card">
                <div className="rmkpage-card-header">
                    <div>
                        <h3 className="rmkpage-card-title">Attendance Remarks</h3>
                        <p className="rmkpage-card-sub">
                            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                            {isAdmin
                                ? activeTab === "emp" && selectedEmpId
                                    ? ` · ${employees.find(e => e._id === selectedEmpId)?.userName ?? currentEmployee.name}`
                                    : " · All Employees"
                                : ` · ${currentEmployee?.name}`
                            }
                        </p>
                    </div>
                </div>

                <div className="rmkpage-scroll">
                    <table className="rmkpage-table">
                        <thead>
                            <tr>
                                {isAdmin && <th>Employee</th>}
                                <th>Date</th>
                                <th>Clock In</th>
                                <th>Clock Out</th>
                                <th>Hours</th>
                                <th>Status</th>
                                <th>Remarks</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageData.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 8 : 7}>
                                        <div className="rmkpage-empty">
                                            <FaClockRotateLeft size={26} style={{ opacity: 0.2, marginBottom: 8 }} />
                                            <div>No records found.</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pageData.map(row => (
                                    <tr
                                        key={row.id}
                                        className="rmkpage-tr"
                                        onClick={() => setOpenRow(row)}
                                    >
                                        {isAdmin && <td className="rmkpage-empname">{row.employee}</td>}
                                        <td>{row.date}</td>
                                        <td>{row.clockIn}</td>
                                        <td>{row.clockOut}</td>
                                        <td><strong>{formatHours(row.workedHours)}</strong></td>
                                        <td>
                                            <div className="rmkpage-status-cell">
                                                <StatusBadge status={row.status} />
                                                {row.isLate && row.status !== "Late" && (
                                                    <span className="rmkpage-late-dot" title="Late arrival">L</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="rmkpage-remarks-preview">
                                            {getAutoRemarks(row)
                                                ? <span className="rmkpage-has-remarks">{getAutoRemarks(row)}</span>
                                                : <span className="rmkpage-no-remarks">—</span>
                                            }
                                        </td>
                                        <td>
                                            <button className={`rmkpage-open-btn${row.adminRemarks ? " rmkpage-open-btn--has" : ""}`}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="rmkpage-pagination">
                        <button
                            className="rmkpage-arrow"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <FaChevronLeft size={11} />
                        </button>
                        <span className="rmkpage-page-lbl">Page {page} of {totalPages}</span>
                        <button
                            className="rmkpage-arrow"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <FaChevronRight size={11} />
                        </button>
                    </div>
                )}
            </div>

            {openRow && (
                <RemarksPanel
                    row={openRow}
                    allRecords={records}
                    isAdmin={isAdmin}
                    onClose={() => setOpenRow(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

export default AttendanceRemarks;
