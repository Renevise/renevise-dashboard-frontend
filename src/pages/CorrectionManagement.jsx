import { useState, useEffect, useCallback } from "react";
import { FaClipboardCheck, FaTimes, FaCheck, FaInbox } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useApp } from "../context/AppContext";
import "./CorrectionManagement.css";

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
        Approved: "cm-badge--approved",
        Rejected: "cm-badge--rejected",
        Pending : "cm-badge--pending",
        Expired : "cm-badge--expired",
    };
    return <span className={`cm-badge ${map[status] || "cm-badge--pending"}`}>{status}</span>;
}

function ReviewModal({ req, onApprove, onReject, onClose, loading, error }) {
    const appliedDate = new Date(req.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
        <div className="cm-overlay" onClick={onClose}>
            <div className="cm-modal" onClick={e => e.stopPropagation()}>

                <div className="cm-modal-header">
                    <h3 className="cm-modal-title">Review Correction Request</h3>
                    <button className="cm-modal-close" onClick={onClose} disabled={loading}>
                        <FaTimes size={14} />
                    </button>
                </div>

                <div className="cm-modal-body">
                    <div className="cm-modal-emp-row">
                        <div className="cm-modal-avatar">
                            {req.employee.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="cm-modal-emp-name">{req.employee}</p>
                            <p className="cm-modal-emp-email">{req.email}</p>
                        </div>
                    </div>

                    <div className="cm-modal-details">
                        <div className="cm-modal-row">
                            <span className="cm-modal-key">Date</span>
                            <span className="cm-modal-val">{req.date}</span>
                        </div>
                        <div className="cm-modal-row">
                            <span className="cm-modal-key">Clock In</span>
                            <span className="cm-modal-val cm-mono">{req.clockIn}</span>
                        </div>
                        <div className="cm-modal-row">
                            <span className="cm-modal-key">Clock Out</span>
                            <span className="cm-modal-val cm-mono">{req.clockOut}</span>
                        </div>
                        <div className="cm-modal-row">
                            <span className="cm-modal-key">Submitted</span>
                            <span className="cm-modal-val">{appliedDate}</span>
                        </div>
                    </div>

                    <div className="cm-modal-reason-wrap">
                        <p className="cm-modal-reason-label">Reason</p>
                        <p className="cm-modal-reason-text">"{req.reason}"</p>
                    </div>

                    {error && <p className="cm-modal-error">{error}</p>}
                </div>

                <div className="cm-modal-footer">
                    <button
                        className="cm-btn-reject"
                        onClick={() => onReject(req._id)}
                        disabled={loading}
                    >
                        <FaTimes size={12} />
                        {loading ? "Processing…" : "Reject"}
                    </button>
                    <button
                        className="cm-btn-approve"
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
        <div className="cm-table-card">
            <div className="cm-table-card-header">
                <h3 className="cm-table-title">Approved, Rejected &amp; Expired Records</h3>
                <p className="cm-table-sub">{list.length} record{list.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="cm-table-scroll">
                <table className="cm-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Status</th>
                            <th>Reviewed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="cm-table-empty">No reviewed records yet.</td>
                            </tr>
                        ) : (
                            pageData.map(req => (
                                <tr key={req._id}>
                                    <td className="cm-emp-name">{req.employee}</td>
                                    <td>{req.date}</td>
                                    <td className="cm-mono">{req.clockIn}</td>
                                    <td className="cm-mono">{req.clockOut}</td>
                                    <td><StatusBadge status={req.status} /></td>
                                    <td className="cm-reviewed-by">
                                        {req.reviewedBy || <span className="cm-dash">—</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="cm-pagination">
                    <button
                        className="cm-page-arrow"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <FaChevronLeft size={11} />
                    </button>
                    <span className="cm-page-label">Page {page} of {totalPages}</span>
                    <button
                        className="cm-page-arrow"
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
        <div className="cm-card">
            <div className="cm-card-top">
                <div>
                    <p className="cm-card-name">{req.employee}</p>
                    <p className="cm-card-email">{req.email}</p>
                </div>
                <StatusBadge status={req.status} />
            </div>
            <div className="cm-card-body">
                <p className="cm-card-date">{req.date}</p>
                <p className="cm-card-times cm-mono">{req.clockIn} &rarr; {req.clockOut}</p>
                <p className="cm-card-reason">"{req.reason}"</p>
                <p className="cm-card-applied">Submitted: {appliedDate}</p>
            </div>
            <div className="cm-card-footer">
                <button className="cm-btn-review" onClick={() => onReview(req)}>
                    Review Request
                </button>
            </div>
        </div>
    );
}

function CorrectionManagement() {
    const { employees } = useApp();

    const [corrections,   setCorrections]   = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [reviewing,     setReviewing]     = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError,   setReviewError]   = useState("");
    const [selectedEmpId, setSelectedEmpId] = useState("");

    const fetchAll = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/attendance-correction/all`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const { corrections: data } = await res.json();
                setCorrections(data ?? []);
            }
        } catch (err) {
            console.error("Failed to fetch corrections:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleReview(id, status) {
        setReviewLoading(true);
        setReviewError("");
        try {
            const res = await fetch(`${API_BASE}/api/attendance-correction/${id}/review`, {
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
        ? corrections.filter(c => c.userId === selectedEmpId || c.userId?.toString() === selectedEmpId)
        : corrections;

    const pendingList  = filtered.filter(c => c.status === "Pending");
    const reviewedList = filtered.filter(c => c.status !== "Pending");

    if (loading) {
        return (
            <div className="cm-page">
                <div className="cm-empty-state">
                    <FaClipboardCheck size={32} className="cm-empty-icon" />
                    <p className="cm-empty-title">Loading…</p>
                    <p className="cm-empty-sub">Fetching correction requests</p>
                </div>
            </div>
        );
    }

    return (
        <div className="cm-page">

            <div className="cm-page-header">
                <div>
                    <h2 className="cm-page-title">Correction Management</h2>
                    <p className="cm-page-sub">Review and action employee attendance correction requests</p>
                </div>
            </div>

            <div className="cm-filter-bar">
                <span className="cm-filter-label">Filter by employee</span>
                <select
                    className="cm-emp-select"
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                >
                    <option value="">All Employees</option>
                    {employees.filter(e => e.role === "employee").map(e => (
                        <option key={e._id} value={e._id}>{e.userName}</option>
                    ))}
                </select>
                {selectedEmpId && (
                    <button className="cm-filter-clear" onClick={() => setSelectedEmpId("")}>
                        Clear
                    </button>
                )}
            </div>

            <section className="cm-section">
                <div className="cm-section-header">
                    <h3 className="cm-section-title">Pending Requests</h3>
                    {pendingList.length > 0 && (
                        <span className="cm-count cm-count--pending">{pendingList.length} pending</span>
                    )}
                </div>

                {pendingList.length === 0 ? (
                    <div className="cm-empty-state">
                        <FaInbox size={28} className="cm-empty-icon" />
                        <p className="cm-empty-title">No Pending Requests</p>
                        <p className="cm-empty-sub">All correction requests have been reviewed.</p>
                    </div>
                ) : (
                    <div className="cm-cards-grid">
                        {pendingList.map(req => (
                            <PendingCard key={req._id} req={req} onReview={setReviewing} />
                        ))}
                    </div>
                )}
            </section>

            <section className="cm-section">
                <div className="cm-section-header">
                    <h3 className="cm-section-title">Approved, Rejected &amp; Expired</h3>
                    {reviewedList.length > 0 && (
                        <span className="cm-count">{reviewedList.length} record{reviewedList.length !== 1 ? "s" : ""}</span>
                    )}
                </div>

                {reviewedList.length === 0 ? (
                    <div className="cm-empty-state">
                        <FaClipboardCheck size={28} className="cm-empty-icon" />
                        <p className="cm-empty-title">No Records Yet</p>
                        <p className="cm-empty-sub">Reviewed requests will appear here.</p>
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

export default CorrectionManagement;
