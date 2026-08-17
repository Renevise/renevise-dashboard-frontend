import React, { useState, useMemo, useEffect } from "react";
import "./Attendance.css";
import { FaDownload, FaSearch, FaUsers, FaUser } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight, FaClockRotateLeft } from "react-icons/fa6";
import { useApp }           from "../context/AppContext";
import { formatHours, formatBreak } from "../utils/time";

const ROWS_PER_PAGE = 10;

const STATUS_STYLE = {
    Present         : { bg: "rgba(16,185,129,0.15)",  color: "#10B981" },
    Late            : { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" },
    "Half Day"      : { bg: "rgba(139,92,246,0.15)",  color: "#8B5CF6" },
    "Early Leave"   : { bg: "rgba(249,115,22,0.15)",  color: "#F97316" },
    "Company Off"   : { bg: "rgba(99,102,241,0.15)",  color: "#6366F1" },
};

function StatusBadge({ status }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE.Present;
    return (
        <span className="att-status-badge" style={{ background: s.bg, color: s.color }}>
            {status}
        </span>
    );
}

function buildCompanyOffRows(companyOffs, employeeName, employeeId) {
    const pad = n => String(n).padStart(2, "0");
    const rows = [];

    for (const co of companyOffs) {
        const from  = new Date(co.fromDate  + "T00:00:00");
        const until = new Date(co.untilDate + "T00:00:00");
        const cur   = new Date(from);
        while (cur <= until) {
            const dateStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
            rows.push({
                id          : `co_${co._id}_${dateStr}`,
                employeeId  : employeeId ?? "",
                employee    : employeeName,
                date        : dateStr,
                clockIn     : "--",
                clockOut    : "--",
                clockInMs   : null,
                clockOutMs  : null,
                breakMinutes: 0,
                workedSeconds: 0,
                workedHours : 0,
                status      : "Company Off",
                locationType: "office",
                isCompanyOff: true,
                reason      : co.reason,
            });
            cur.setDate(cur.getDate() + 1);
        }
    }
    return rows;
}

function Attendance() {
    const { attendance, employees, currentEmployee, companyOffs } = useApp();
    const { records } = attendance;
    const isAdmin = currentEmployee?.role === "admin";

    const [activeTab,     setActiveTab]     = useState("all");
    const [selectedEmpId, setSelectedEmpId] = useState("");
    const [search,        setSearch]        = useState("");
    const [page,          setPage]          = useState(1);

    const coList = companyOffs?.companyOffs ?? [];

    const mergedRecords = useMemo(() => {
        if (coList.length === 0) return records;

        if (!isAdmin) {

            const offRows = buildCompanyOffRows(coList, currentEmployee?.name ?? "Me", currentEmployee?.id);

            const realDates = new Set(records.map(r => r.date));
            const toInject = offRows.filter(r => !realDates.has(r.date));
            return [...records, ...toInject].sort((a, b) => b.date.localeCompare(a.date));
        }

        if (isAdmin && activeTab === "emp" && selectedEmpId) {

            const emp = employees.find(e => e._id === selectedEmpId);
            const empName = emp?.userName ?? "Employee";
            const offRows = buildCompanyOffRows(coList, empName, selectedEmpId);
            const realDates = new Set(
                records.filter(r => r.employeeId === selectedEmpId).map(r => r.date)
            );
            const toInject = offRows.filter(r => !realDates.has(r.date));
            return [...records, ...toInject].sort((a, b) => b.date.localeCompare(a.date));
        }

        const realDateSet = new Set(records.map(r => r.date));
        const offRows = buildCompanyOffRows(coList, "Company Holiday", "company-wide");
        const toInject = offRows.filter(r => !realDateSet.has(r.date));
        return [...records, ...toInject].sort((a, b) => b.date.localeCompare(a.date));
    }, [records, coList, isAdmin, activeTab, selectedEmpId, employees, currentEmployee]);

    const filtered = useMemo(() => {
        let result = mergedRecords;
        if (isAdmin && activeTab === "emp" && selectedEmpId) {
            result = result.filter(r =>
                r.employeeId === selectedEmpId || r.employee === "Company Holiday"
            );
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result  = result.filter(r => r.employee.toLowerCase().includes(q));
        }
        return result;
    }, [mergedRecords, isAdmin, activeTab, selectedEmpId, search]);

    const empDeptMap = useMemo(() => {
        const m = {};
        for (const e of employees) m[e._id] = e.department ?? "—";
        return m;
    }, [employees]);

    const getRowDept = (row) => {
        if (row.isCompanyOff) return "—";
        if (isAdmin) return empDeptMap[row.employeeId] ?? "—";
        return currentEmployee?.department ?? "—";
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const pageData   = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    useEffect(() => {
        const newTotal = Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE));
        setPage(newTotal);
    }, [records.length]);

    const handleTabChange = tab => {
        setActiveTab(tab);
        setSelectedEmpId("");
        setPage(1);
    };

    const handleEmpChange = e => {
        setSelectedEmpId(e.target.value);
        setPage(1);
    };

    const handleSearch = e => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleExport = () => {
        const header  = ["Employee", "Department", "Date", "Clock In", "Clock Out", "Break", "Hours", "Status"];
        const rows    = filtered.map(r => [
            r.employee, getRowDept(r), r.date, r.clockIn, r.clockOut,
            formatBreak(r.breakMinutes), formatHours(r.workedHours), r.status,
        ]);
        const csv  = [header, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement("a"), { href: url, download: "attendance.csv" });
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="att-page">

            <div className="att-toolbar-card">
                {isAdmin && (
                    <div className="att-toolbar-left">
                        <div className="att-filter-tabs">
                            <button
                                className={`att-filter-tab ${activeTab === "all" ? "active" : ""}`}
                                onClick={() => handleTabChange("all")}
                            >
                                <FaUsers size={12} /> All Employees
                            </button>
                            <button
                                className={`att-filter-tab ${activeTab === "emp" ? "active" : ""}`}
                                onClick={() => handleTabChange("emp")}
                            >
                                <FaUser size={12} /> Employee Data
                            </button>
                        </div>

                        {activeTab === "all" ? (
                            <p className="att-view-label">
                                Viewing <span className="att-view-highlight">all employees'</span> attendance
                            </p>
                        ) : (
                            <select
                                className="att-emp-select"
                                value={selectedEmpId}
                                onChange={handleEmpChange}
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

                <div className="att-toolbar-right">
                    <div className="att-search-wrap">
                        <FaSearch className="att-search-icon" />
                        <input
                            type="text"
                            className="att-search-input"
                            placeholder="Search by name…"
                            value={search}
                            onChange={handleSearch}
                        />
                        {search && (
                            <button className="att-search-clear" onClick={() => { setSearch(""); setPage(1); }}>
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        className="att-export-btn"
                        onClick={handleExport}
                        disabled={records.length === 0}
                    >
                        <FaDownload size={13} />
                        Export to Excel
                    </button>
                </div>
            </div>

            {/* ── Table Card ── */}
            <div className="att-table-card">
                <div className="att-table-header">
                    <div>
                        <h3 className="att-table-title">Attendance History</h3>
                        <p className="att-table-sub">
                            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                            {isAdmin
                                ? (() => {
                                    if (!selectedEmpId) return " · All Employees";
                                    if (selectedEmpId === currentEmployee.id) return ` · ${currentEmployee.name} (admin)`;
                                    const emp = employees.find(e => e._id === selectedEmpId);
                                    return emp ? ` · ${emp.userName}` : " · All Employees";
                                })()
                                : ` · ${currentEmployee?.name ?? "My Attendance"}`
                            }
                        </p>
                    </div>
                </div>

                <div className="att-table-scroll">
                    <table className="att-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Date</th>
                                <th>Clock In</th>
                                <th>Clock Out</th>
                                <th>Break</th>
                                <th>Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageData.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="att-empty">
                                            <FaClockRotateLeft size={28} style={{ opacity: 0.25, marginBottom: 10 }} />
                                            <div>
                                                {records.length === 0
                                                    ? "No attendance records yet. Clock In from the Dashboard to start tracking."
                                                    : "No records match your search."
                                                }
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pageData.map(row => (
                                    <tr key={row.id ?? row._id} className={row.isCompanyOff ? "att-row-company-off" : ""}>
                                        <td className="att-emp-name">{row.employee}</td>
                                        <td>{getRowDept(row)}</td>
                                        <td>{row.date}</td>
                                        <td>{row.clockIn}</td>
                                        <td>{row.clockOut}</td>
                                        <td>{formatBreak(row.breakMinutes)}</td>
                                        <td>
                                            {row.isCompanyOff
                                                ? <span style={{ color: "rgba(99,102,241,0.5)", fontSize: 12 }}>—</span>
                                                : <strong>{formatHours(row.workedHours)}</strong>
                                            }
                                        </td>
                                        <td><StatusBadge status={row.status} /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="att-pagination">
                        <button
                            className="att-page-arrow"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <FaChevronLeft size={11} />
                        </button>
                        <span className="att-page-label">Page {page} of {totalPages}</span>
                        <button
                            className="att-page-arrow"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <FaChevronRight size={11} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Attendance;
