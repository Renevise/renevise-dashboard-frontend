import React, { useState } from "react";
import "./Leave.css";
import {
    FaCalendarAlt, FaCheck, FaTimes, FaCalendarTimes,
} from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useApp } from "../context/AppContext";
import { calcLeaveStats } from "../utils/leave";

const ROWS_PER_PAGE = 10;

function StatusBadge({ status }) {
    const cls = { Approved: "approved", Rejected: "rejected", Pending: "pending" }[status] || "pending";
    return <span className={`lv-badge ${cls}`}>{status}</span>;
}

function LeaveCard({ req, isAdmin, onReview }) {
    const appliedDate = new Date(req.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
    });

    return (
        <div className={`lv-card${req.status === "Pending" ? " pending-card" : ""}`}>
            <div className="lv-card-top">
                <div>
                    <p className="lv-card-name">{req.employee}</p>
                    <p className="lv-card-dept">{req.email}</p>
                </div>
                <StatusBadge status={req.status} />
            </div>

            <div className="lv-card-body">
                <p className="lv-type">{req.leaveType}</p>
                <div className="lv-dates">
                    <span>{req.fromDate}</span>
                    <span className="lv-arrow">→</span>
                    <span>{req.untilDate}</span>
                    <span className="lv-days">{req.days}d</span>
                </div>
                <p className="lv-reason">"{req.reason}"</p>
                {req.status !== "Pending" && req.reviewedBy && (
                    <p className="lv-approver">
                        {req.status} by <strong>{req.reviewedBy}</strong>
                    </p>
                )}
                <p className="lv-applied">Applied: {appliedDate}</p>
            </div>

            {isAdmin && req.status === "Pending" && (
                <div className="lv-review-btns">
                    <button className="lv-btn-review" onClick={() => onReview(req)}>
                        Review Request
                    </button>
                </div>
            )}
        </div>
    );
}

function AdminReviewedTable({ list }) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(list.length / ROWS_PER_PAGE));
    const pageData   = list.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    return (
        <div className="lv-table-card">
            <div className="lv-reviewed-table-header">
                <div>
                    <h3 className="lv-reviewed-table-title">Approved &amp; Rejected Records</h3>
                    <p className="lv-reviewed-table-sub">
                        {list.length} record{list.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            <div className="lv-table-scroll">
                <table className="lv-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Leave Type</th>
                            <th>From</th>
                            <th>Until</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Reviewed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="lv-table-empty">
                                    No reviewed records yet.
                                </td>
                            </tr>
                        ) : (
                            pageData.map(req => (
                                <tr key={req._id}>
                                    <td className="lv-emp-name">{req.employee}</td>
                                    <td>{req.leaveType}</td>
                                    <td>{req.fromDate}</td>
                                    <td>{req.untilDate}</td>
                                    <td>
                                        <span className="lv-days-badge">{req.days}d</span>
                                    </td>
                                    <td><StatusBadge status={req.status} /></td>
                                    <td className="lv-reviewed-by">
                                        {req.reviewedBy || <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="lv-pagination">
                    <button
                        className="lv-page-arrow"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <FaChevronLeft size={11} />
                    </button>
                    <span className="lv-page-label">Page {page} of {totalPages}</span>
                    <button
                        className="lv-page-arrow"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        <FaChevronRight size={11} />
                    </button>
                </div>
            )}
        </div>
    );
}

function ReviewModal({ req, onApprove, onReject, onClose, loading, error }) {
    const appliedDate = new Date(req.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
        <div className="lv-overlay" onClick={onClose}>
            <div className="lv-modal" onClick={e => e.stopPropagation()}>

                <div className="lv-modal-header">
                    <h3 className="lv-modal-title">Review Leave Request</h3>
                    <button className="lv-modal-close" onClick={onClose} disabled={loading}>
                        <FaTimes size={14} />
                    </button>
                </div>

                <div className="lv-modal-body">
                    <div className="lv-modal-emp-row">
                        <div className="lv-modal-avatar">
                            {req.employee.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="lv-modal-emp-name">{req.employee}</p>
                            <p className="lv-modal-emp-email">{req.email}</p>
                        </div>
                    </div>

                    <div className="lv-modal-details">
                        <div className="lv-modal-row">
                            <span className="lv-modal-key">Leave Type</span>
                            <span className="lv-modal-val">{req.leaveType}</span>
                        </div>
                        <div className="lv-modal-row">
                            <span className="lv-modal-key">From</span>
                            <span className="lv-modal-val">{req.fromDate}</span>
                        </div>
                        <div className="lv-modal-row">
                            <span className="lv-modal-key">Until</span>
                            <span className="lv-modal-val">{req.untilDate}</span>
                        </div>
                        <div className="lv-modal-row">
                            <span className="lv-modal-key">Total Days</span>
                            <span className="lv-modal-val">
                                <span className="lv-modal-days-badge">
                                    {req.days} day{req.days !== 1 ? "s" : ""}
                                </span>
                            </span>
                        </div>
                        <div className="lv-modal-row">
                            <span className="lv-modal-key">Applied On</span>
                            <span className="lv-modal-val">{appliedDate}</span>
                        </div>
                    </div>

                    <div className="lv-modal-reason-wrap">
                        <p className="lv-modal-reason-label">Reason</p>
                        <p className="lv-modal-reason-text">{req.reason}</p>
                    </div>

                    {error && <p className="lv-modal-error">{error}</p>}
                </div>

                <div className="lv-modal-footer">
                    <button
                        className="lv-btn-reject"
                        onClick={() => onReject(req._id)}
                        disabled={loading}
                    >
                        <FaTimes size={12} />
                        {loading ? "Processing…" : "Reject"}
                    </button>
                    <button
                        className="lv-btn-approve"
                        onClick={() => onApprove(req._id)}
                        disabled={loading}
                    >
                        <FaCheck size={12} />
                        {loading ? "Processing…" : "Approve"}
                    </button>
                </div>

            </div>
        </div>
    );
}

function Leave() {
    const { leave, employees } = useApp();
    const {
        myLeaves, allLeaves, pendingList, reviewedList,
        loading, isAdmin, approveLeave, rejectLeave,
    } = leave;

    const currentYear  = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [reviewing,     setReviewing]     = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError,   setReviewError]   = useState("");
    const [selectedEmpId, setSelectedEmpId] = useState("");

    async function handleApprove(id) {
        setReviewLoading(true);
        setReviewError("");
        try {
            await approveLeave(id);
            setReviewing(null);
        } catch (err) {
            setReviewError(err.message || "Failed to approve. Please try again.");
        } finally {
            setReviewLoading(false);
        }
    }

    async function handleReject(id) {
        setReviewLoading(true);
        setReviewError("");
        try {
            await rejectLeave(id);
            setReviewing(null);
        } catch (err) {
            setReviewError(err.message || "Failed to reject. Please try again.");
        } finally {
            setReviewLoading(false);
        }
    }

    const filteredPending  = (isAdmin && selectedEmpId)
        ? pendingList.filter(l => l.userId === selectedEmpId || l.userId?.toString() === selectedEmpId)
        : pendingList;
    const filteredReviewed = (isAdmin && selectedEmpId)
        ? reviewedList.filter(l => l.userId === selectedEmpId || l.userId?.toString() === selectedEmpId)
        : reviewedList;

    const teamSummary = (() => {
        if (!isAdmin) return [];
        const map = {};
        allLeaves.forEach(l => {
            if (!map[l.userId]) {
                map[l.userId] = { name: l.employee, email: l.email, leaves: [], pending: 0 };
            }
            map[l.userId].leaves.push(l);
            if (l.status === "Pending") map[l.userId].pending += 1;
        });
        return Object.values(map).map(emp => ({
            name    : emp.name,
            email   : emp.email,
            pending : emp.pending,
            ...calcLeaveStats(emp.leaves, currentYear, currentMonth),
        }));
    })();

    if (loading) {
        return (
            <div className="lv-page">
                <div className="lv-empty-state">
                    <FaCalendarAlt size={32} className="lv-empty-icon" />
                    <p className="lv-empty-title">Loading…</p>
                    <p className="lv-empty-sub">Fetching leave records</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lv-page">

            {isAdmin && (
                <div className="lv-filter-bar">
                    <div className="lv-filter-left">
                        <span className="lv-filter-label">Filter by employee</span>
                        <select
                            className="lv-emp-select"
                            value={selectedEmpId}
                            onChange={e => setSelectedEmpId(e.target.value)}
                        >
                            <option value="">All Employees</option>
                            {employees.filter(e => e.role === "employee").map(e => (
                                <option key={e._id} value={e._id}>{e.userName}</option>
                            ))}
                        </select>
                        {selectedEmpId && (
                            <button className="lv-filter-clear" onClick={() => setSelectedEmpId("")}>
                                Clear
                            </button>
                        )}
                    </div>
                    {selectedEmpId && employees.find(e => e._id === selectedEmpId) && (
                        <div className="lv-filter-selected">
                            Showing: <strong>{employees.find(e => e._id === selectedEmpId)?.userName}</strong>
                        </div>
                    )}
                </div>
            )}

            <section className="lv-section">
                <div className="lv-section-header">
                    <h3 className="lv-section-title">
                        {isAdmin ? "Pending Approvals" : "My Pending Requests"}
                    </h3>
                    {filteredPending.length > 0 && (
                        <span className="lv-count pending-count">{filteredPending.length} pending</span>
                    )}
                </div>

                {filteredPending.length === 0 ? (
                    <div className="lv-empty-state">
                        <FaCalendarAlt size={32} className="lv-empty-icon" />
                        <p className="lv-empty-title">No Pending Requests</p>
                        <p className="lv-empty-sub">
                            {isAdmin
                                ? "All leave requests have been reviewed."
                                : "You have no pending leave requests."}
                        </p>
                    </div>
                ) : (
                    <div className="lv-cards-grid">
                        {filteredPending.map(req => (
                            <LeaveCard
                                key={req._id}
                                req={req}
                                isAdmin={isAdmin}
                                onReview={setReviewing}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="lv-section">
                <div className="lv-section-header">
                    <h3 className="lv-section-title">
                        {isAdmin ? "Approved & Rejected" : "My Leave History"}
                    </h3>
                    {filteredReviewed.length > 0 && (
                        <span className="lv-count">
                            {filteredReviewed.length} record{filteredReviewed.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {filteredReviewed.length === 0 ? (
                    <div className="lv-empty-state">
                        <FaCalendarTimes size={32} className="lv-empty-icon" />
                        <p className="lv-empty-title">No Records Yet</p>
                        <p className="lv-empty-sub">
                            Approved and rejected leave requests will appear here.
                        </p>
                    </div>
                ) : isAdmin ? (

                    <AdminReviewedTable key={selectedEmpId || "all"} list={filteredReviewed} />
                ) : (

                    <div className="lv-cards-grid">
                        {reviewedList.map(req => (
                            <LeaveCard key={req._id} req={req} isAdmin={false} />
                        ))}
                    </div>
                )}
            </section>

            {isAdmin && (
                <section className="lv-section">
                    <div className="lv-section-header">
                        <h3 className="lv-section-title">Team Leave Summary</h3>
                    </div>
                    <div className="lv-table-card">
                        <div className="lv-table-scroll">
                            <table className="lv-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Email</th>
                                        <th>Approved Days</th>
                                        <th>Pending</th>
                                        <th>Leave Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamSummary.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="lv-table-empty">
                                                No leave requests submitted yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        teamSummary.map((emp, i) => (
                                            <tr key={i}>
                                                <td className="lv-emp-name">{emp.name}</td>
                                                <td>{emp.email}</td>
                                                <td>{emp.yearlyUsed}d</td>
                                                <td>
                                                    {emp.pending > 0
                                                        ? <span className="lv-badge pending">{emp.pending}</span>
                                                        : <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>
                                                    }
                                                </td>
                                                <td>
                                                    <span className="lv-remaining-badge">
                                                        {emp.balance}d
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {reviewing && (
                <ReviewModal
                    req={reviewing}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onClose={() => { if (!reviewLoading) { setReviewing(null); setReviewError(""); } }}
                    loading={reviewLoading}
                    error={reviewError}
                />
            )}

        </div>
    );
}

export default Leave;
