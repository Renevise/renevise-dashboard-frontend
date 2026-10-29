import { useState, useEffect, useCallback } from "react";
import { FaClock, FaTimes, FaCheck, FaInbox } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useApp } from "../context/AppContext";
import "./OvertimeManagement.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const ROWS_PER_PAGE = 10;

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function StatusBadge({ status }) {
    const map = {
        Approved: "om-badge--approved",
        Rejected: "om-badge--rejected",
        Pending : "om-badge--pending",
        Expired : "om-badge--expired",
    };
    return <span className={`om-badge ${map[status] || "om-badge--pending"}`}>{status}</span>;
}

function ReviewModal({ req, onApprove, onReject, onClose, loading, error }) {
    const appliedDate = new Date(req.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
        <div className="om-overlay" onClick={onClose}>
            <div className="om-modal" onClick={e => e.stopPropagation()}>

                <div className="om-modal-header">
                    <h3 className="om-modal-title">Review Overtime Request</h3>
                    <button className="om-modal-close" onClick={onClose} disabled={loading}>
                        <FaTimes size={14} />
                    </button>
                </div>

                <div className="om-modal-body">
                    <div className="om-modal-emp-row">
                        <div className="om-modal-avatar">
                            {req.employee.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="om-modal-emp-name">{req.employee}</p>
                            <p className="om-modal-emp-email">{req.email}</p>
                        </div>
                    </div>

                    <div className="om-modal-details">
                        <div className="om-modal-row">
                            <span className="om-modal-key">Date</span>
                            <span className="om-modal-val">{req.date}</span>
                        </div>
                        <div className="om-modal-row">
                            <span className="om-modal-key">Extra Hours</span>
                            <span className="om-modal-val om-hours-val">{req.extraHours}h</span>
                        </div>
                        {req.requestedFor && req.requestedFor !== req.employee && (
                            <div className="om-modal-row">
                                <span className="om-modal-key">Requested For</span>
                                <span className="om-modal-val">{req.requestedFor}</span>
                            </div>
                        )}
                        {req.onBehalf && (
                            <div className="om-modal-row">
                                <span className="om-modal-key">On Behalf</span>
                                <span className="om-modal-val">{req.onBehalf}</span>
                            </div>
                        )}
                        <div className="om-modal-row">
                            <span className="om-modal-key">Submitted</span>
                            <span className="om-modal-val">{appliedDate}</span>
                        </div>
                    </div>

                    <div className="om-modal-reason-wrap">
                        <p className="om-modal-reason-label">Reason</p>
                        <p className="om-modal-reason-text">"{req.reason}"</p>
                    </div>

                    {error && <p className="om-modal-error">{error}</p>}
                </div>

                <div className="om-modal-footer">
                    <button
                        className="om-btn-reject"
                        onClick={() => onReject(req._id)}
                        disabled={loading}
                    >
                        <FaTimes size={12} />
                        {loading ? "Processing…" : "Reject"}
                    </button>
                    <button
                        className="om-btn-approve"
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

function ReviewedTable({ list }) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(list.length / ROWS_PER_PAGE));
    const pageData   = list.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    return (
        <div className="om-table-card">
            <div className="om-table-card-header">
                <h3 className="om-table-title">Approved, Rejected &amp; Expired Records</h3>
                <p className="om-table-sub">{list.length} record{list.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="om-table-scroll">
                <table className="om-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Extra Hours</th>
                            <th>Requested For</th>
                            <th>Status</th>
                            <th>Reviewed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="om-table-empty">No reviewed records yet.</td>
                            </tr>
                        ) : (
                            pageData.map(req => (
                                <tr key={req._id}>
                                    <td className="om-emp-name">{req.employee}</td>
                                    <td>{req.date}</td>
                                    <td><span className="om-hours-badge">{req.extraHours}h</span></td>
                                    <td className="om-requested-for">{req.requestedFor}</td>
                                    <td><StatusBadge status={req.status} /></td>
                                    <td className="om-reviewed-by">
                                        {req.reviewedBy || <span className="om-dash">—</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="om-pagination">
                    <button
                        className="om-page-arrow"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <FaChevronLeft size={11} />
                    </button>
                    <span className="om-page-label">Page {page} of {totalPages}</span>
                    <button
                        className="om-page-arrow"
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

function PendingCard({ req, onReview }) {
    const appliedDate = new Date(req.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
    });

    return (
        <div className="om-card">
            <div className="om-card-top">
                <div>
                    <p className="om-card-name">{req.employee}</p>
                    <p className="om-card-email">{req.email}</p>
                </div>
                <StatusBadge status={req.status} />
            </div>
            <div className="om-card-body">
                <p className="om-card-date">{req.date}</p>
                <p className="om-card-hours">{req.extraHours}h overtime</p>
                {req.requestedFor && req.requestedFor !== req.employee && (
                    <p className="om-card-for">For: {req.requestedFor}</p>
                )}
                <p className="om-card-reason">"{req.reason}"</p>
                <p className="om-card-applied">Submitted: {appliedDate}</p>
            </div>
            <div className="om-card-footer">
                <button className="om-btn-review" onClick={() => onReview(req)}>
                    Review Request
                </button>
            </div>
        </div>
    );
}

function OvertimeManagement() {
    const { employees } = useApp();

    const [overtimes,     setOvertimes]     = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [reviewing,     setReviewing]     = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError,   setReviewError]   = useState("");
    const [selectedEmpId, setSelectedEmpId] = useState("");

    const fetchAll = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/overtime/all`, { headers: getAuthHeaders() });
            if (res.ok) {
                const { overtimes: data } = await res.json();
                setOvertimes(data ?? []);
            }
        } catch (err) {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleReview(id, status) {
        setReviewLoading(true);
        setReviewError("");
        try {
            const res = await fetch(`${API_BASE}/api/overtime/${id}/review`, {
                method : "PATCH",
                headers: getAuthHeaders(),
                body   : JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to review request");
            setReviewing(null);
            fetchAll();
        } catch (err) {
            setReviewError(err.message || "Something went wrong. Please try again.");
        } finally {
            setReviewLoading(false);
        }
    }

    const filtered = selectedEmpId
        ? overtimes.filter(o => o.userId === selectedEmpId || o.userId?.toString() === selectedEmpId)
        : overtimes;

    const pendingList  = filtered.filter(o => o.status === "Pending");
    const reviewedList = filtered.filter(o => o.status !== "Pending");


    if (loading) {
        return (
            <div className="om-page">
                <div className="om-empty-state">
                    <FaClock size={32} className="om-empty-icon" />
                    <p className="om-empty-title">Loading…</p>
                    <p className="om-empty-sub">Fetching overtime requests</p>
                </div>
            </div>
        );
    }

    return (
        <div className="om-page">

            <div className="om-page-header">
                <div>
                    <h2 className="om-page-title">Overtime Management</h2>
                    <p className="om-page-sub">Review and action employee overtime requests</p>
                </div>
            </div>

            <div className="om-filter-bar">
                <span className="om-filter-label">Filter by employee</span>
                <select
                    className="om-emp-select"
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                >
                    <option value="">All Employees</option>
                    {employees.filter(e => e.role === "employee").map(e => (
                        <option key={e._id} value={e._id}>{e.userName}</option>
                    ))}
                </select>
                {selectedEmpId && (
                    <button className="om-filter-clear" onClick={() => setSelectedEmpId("")}>
                        Clear
                    </button>
                )}
            </div>

            <section className="om-section">
                <div className="om-section-header">
                    <h3 className="om-section-title">Pending Requests</h3>
                    {pendingList.length > 0 && (
                        <span className="om-count om-count--pending">{pendingList.length} pending</span>
                    )}
                </div>

                {pendingList.length === 0 ? (
                    <div className="om-empty-state">
                        <FaInbox size={28} className="om-empty-icon" />
                        <p className="om-empty-title">No Pending Requests</p>
                        <p className="om-empty-sub">All overtime requests have been reviewed.</p>
                    </div>
                ) : (
                    <div className="om-cards-grid">
                        {pendingList.map(req => (
                            <PendingCard key={req._id} req={req} onReview={setReviewing} />
                        ))}
                    </div>
                )}
            </section>

            <section className="om-section">
                <div className="om-section-header">
                    <h3 className="om-section-title">Approved, Rejected &amp; Expired</h3>
                    {reviewedList.length > 0 && (
                        <span className="om-count">{reviewedList.length} record{reviewedList.length !== 1 ? "s" : ""}</span>
                    )}
                </div>

                {reviewedList.length === 0 ? (
                    <div className="om-empty-state">
                        <FaClock size={28} className="om-empty-icon" />
                        <p className="om-empty-title">No Records Yet</p>
                        <p className="om-empty-sub">Reviewed requests will appear here.</p>
                    </div>
                ) : (
                    <ReviewedTable key={selectedEmpId || "all"} list={reviewedList} />
                )}
            </section>

            {reviewing && (
                <ReviewModal
                    req={reviewing}
                    onApprove={id => handleReview(id, "Approved")}
                    onReject={id => handleReview(id, "Rejected")}
                    onClose={() => { if (!reviewLoading) { setReviewing(null); setReviewError(""); } }}
                    loading={reviewLoading}
                    error={reviewError}
                />
            )}

        </div>
    );
}

export default OvertimeManagement;
