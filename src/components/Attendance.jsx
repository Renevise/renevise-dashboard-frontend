import React, { useState, useMemo, useEffect } from "react";
import "./Attendance.css";
import * as XLSX from "xlsx";
import { FaDownload, FaSearch, FaUsers, FaUser, FaCalendarAlt } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight, FaClockRotateLeft } from "react-icons/fa6";
import { useApp }           from "../context/AppContext";
import { formatHours, formatBreak } from "../utils/time";
import { calcLeaveStats }  from "../utils/leave";

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
        <span className="att-table-status-badge" style={{ background: s.bg, color: s.color }}>
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
                isLate      : false,
                adminRemarks: null,
                reason      : co.reason,
            });
            cur.setDate(cur.getDate() + 1);
        }
    }
    return rows;
}

function Attendance() {
    const { attendance, employees, currentEmployee, companyOffs, overtime, leave } = useApp();
    const { records } = attendance;
    const isAdmin = currentEmployee?.role === "admin";

    const [activeTab,     setActiveTab]     = useState("all");
    const [selectedEmpId, setSelectedEmpId] = useState("");
    const [search,        setSearch]        = useState("");
    const [page,          setPage]          = useState(1);

    const _now = new Date();
    const [exportMonth, setExportMonth] = useState(
        `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}`
    );

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

    useEffect(() => { setPage(1); }, [records.length]);


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
        const [expYear, expMonth] = exportMonth.split("-").map(Number);
        const pad        = n => String(n).padStart(2, "0");
        const fileLabel  = new Date(expYear, expMonth - 1, 1)
            .toLocaleDateString("en-US", { month: "short", year: "numeric" })
            .replace(" ", "-");

        // Build set of admin IDs to exclude from export
        const adminIds = new Set(
            employees.filter(e => e.role === "admin").map(e => e._id?.toString() ?? "")
        );

        // Sheet 1: Attendance — filter by selected month, exclude admins
        const attFiltered = filtered.filter(r =>
            r.date.startsWith(exportMonth) && !adminIds.has(r.employeeId)
        );
        const header = ["Employee", "Department", "Date", "Clock In", "Clock Out", "Break", "Hours", "Status"];
        const rows   = attFiltered.map(r => [
            r.employee,
            getRowDept(r),
            r.date,
            r.clockIn,
            r.clockOut,
            formatBreak(r.breakMinutes),
            formatHours(r.workedHours),
            r.status,
        ]);

        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

        const colWidths = header.map((h, i) => {
            const max = Math.max(h.length, ...rows.map(r => String(r[i] ?? "").length));
            return { wch: max + 2 };
        });
        ws["!cols"] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");

        // Sheet 2: Employee Summary (admin only) — same logic as dashboard computeStats
        if (isAdmin) {
            const currentYear  = expYear;
            const currentMonth = expMonth;
            const monthPrefix  = exportMonth;
            const allLeaves    = leave?.allLeaves ?? [];

            // Restrict to current month (same as dashboard)
            const monthRecords = records.filter(r => r.date.startsWith(monthPrefix) && !r.isCompanyOff);

            // Build set of company off dates for the selected month
            const companyOffDates = new Set();
            for (const co of coList) {
                const from  = new Date(co.fromDate  + "T00:00:00");
                const until = new Date(co.untilDate + "T00:00:00");
                const cur   = new Date(from);
                while (cur <= until) {
                    const ds = `${cur.getFullYear()}-${pad(cur.getMonth()+1)}-${pad(cur.getDate())}`;
                    companyOffDates.add(ds);
                    cur.setDate(cur.getDate() + 1);
                }
            }

            // Working days = all days in month - Saturday - Sunday - Company Off
            const daysInMonth = new Date(expYear, expMonth, 0).getDate();
            const workingDates = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const ds  = `${expYear}-${pad(expMonth)}-${pad(d)}`;
                const day = new Date(ds + "T00:00:00").getDay(); // 0=Sun, 6=Sat
                if (day !== 0 && day !== 6 && !companyOffDates.has(ds)) {
                    workingDates.push(ds);
                }
            }

            const summaryHeader = [
                "Employee", "Department",
                "Present Days", "Late Days", "Half Days", "Early Leave",
                "Total Absent", "Leaves Used (Year)", "Remaining Leaves", "Salary Deducted",
            ];

            const summaryRows = [...employees]
                .filter(emp => emp.role !== "admin")
                .sort((a, b) => (a.userName ?? "").localeCompare(b.userName ?? ""))
                .map(emp => {
                    const empId   = emp._id?.toString() ?? "";
                    const empRecs = monthRecords.filter(r => r.employeeId === empId);

                    // Exact same logic as computeStats in attendance.js
                    const present    = empRecs.filter(r => r.status === "Present" || r.status === "Late").length;
                    const late       = empRecs.filter(r => r.isLate).length;
                    const halfDay    = empRecs.filter(r => r.status === "Half Day"    && !r.isLate).length;
                    const earlyLeave = empRecs.filter(r => r.status === "Early Leave" && !r.isLate).length;

                    // Expand this employee's approved leaves into individual dates
                    const empApprovedLeaves = allLeaves.filter(
                        l => l.userId?.toString() === empId && l.status === "Approved"
                    );
                    const empLeaveDates = new Set();
                    for (const lv of empApprovedLeaves) {
                        const lvFrom  = new Date((lv.fromDate  || lv.startDate) + "T00:00:00");
                        const lvUntil = new Date((lv.untilDate || lv.endDate)   + "T00:00:00");
                        const cur     = new Date(lvFrom);
                        while (cur <= lvUntil) {
                            empLeaveDates.add(`${cur.getFullYear()}-${pad(cur.getMonth()+1)}-${pad(cur.getDate())}`);
                            cur.setDate(cur.getDate() + 1);
                        }
                    }

                    // Absent = working day with no attendance record AND no approved leave
                    const empAttDates = new Set(empRecs.map(r => r.date));
                    const absent = workingDates.filter(d => !empAttDates.has(d) && !empLeaveDates.has(d)).length;

                    const allEmpLeaves = allLeaves.filter(l => l.userId?.toString() === empId);
                    const leaveStats   = calcLeaveStats(allEmpLeaves, currentYear, currentMonth);

                    return [
                        emp.userName ?? "—",
                        emp.department ?? "—",
                        present,
                        late,
                        halfDay,
                        earlyLeave,
                        absent,
                        leaveStats.yearlyUsed,
                        leaveStats.balance,
                        (() => { const d = Math.max(0, leaveStats.yearlyUsed - leaveStats.yearlyTotal); return d === 0 ? "0" : `${d} day${d !== 1 ? "s" : ""}`; })(),
                    ];
                });

            const ws2 = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
            ws2["!cols"] = [
                { wch: 22 }, { wch: 14 },
                { wch: 13 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
                { wch: 13 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
            ];
            XLSX.utils.book_append_sheet(wb, ws2, "Employee Summary");
        }

        // Sheet 3: Overtime Records (admin only) — filter by selected month
        if (isAdmin && overtime?.allOvertimes?.length > 0) {
            const otFiltered = overtime.allOvertimes.filter(o => o.date.startsWith(exportMonth));
            if (otFiltered.length > 0) {
                const otHeader = ["Date", "Employee", "Requested For", "OT Hours", "Status", "Reason"];
                const otRows   = [...otFiltered]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(o => [o.date, o.employee, o.requestedFor, o.extraHours, o.status, o.reason]);
                const ws3 = XLSX.utils.aoa_to_sheet([otHeader, ...otRows]);
                ws3["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 40 }];
                XLSX.utils.book_append_sheet(wb, ws3, "Overtime Records");
            }
        }

        XLSX.writeFile(wb, `attendance-${fileLabel}.xlsx`);
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
                    {isAdmin && (
                        <>
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

                            <div className="att-month-wrap">
                                <FaCalendarAlt className="att-month-icon" size={12} />
                                <input
                                    type="month"
                                    className="att-month-input"
                                    value={exportMonth}
                                    onChange={e => setExportMonth(e.target.value)}
                                />
                            </div>

                            <button
                                className="att-export-btn"
                                onClick={handleExport}
                                disabled={records.length === 0}
                            >
                                <FaDownload size={13} />
                                Export to Excel
                            </button>
                        </>
                    )}
                </div>
            </div>

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
                                        <td>
                                            <div className="att-status-cell">
                                                <StatusBadge status={row.status} />
                                                {row.isLate && row.status !== "Late" && (
                                                    <span className="att-late-dot" title="Late arrival">L</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

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
