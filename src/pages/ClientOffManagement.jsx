import { useState, useEffect, useCallback } from "react";
import { FaUsers, FaTimes, FaCheck, FaInbox, FaBuilding } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useApp } from "../context/AppContext";
import "./ClientOffManagement.css";

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
        Approved: "com-badge--approved",
        Rejected: "com-badge--rejected",
        Pending : "com-badge--pending",
    };
    return <span className={`com-badge ${map[status] || "com-badge--pending"}`}>{status}</span>;
}

function ReviewModal({ req, onApprove, onReject, onClose, loading, error }) {
    const submittedDate = new Date(req.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
        <div className="com-overlay" onClick={onClose}>
            <div className="com-modal" onClick={e => e.stopPropagation()}>

                <div className="com-modal-header">
                    <h3 className="com-modal-title">Review Client Off Request</h3>
                    <button className="com-modal-close" onClick={onClose} disabled={loading}>
                        <FaTimes size={14} />
                    </button>
                </div>

                <div className="com-modal-body">
                    <div className="com-modal-emp-row">
                        <div className="com-modal-avatar">
                            {req.employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="com-modal-emp-name">{req.employeeName}</p>
                            <p className="com-modal-emp-email">{req.employeeEmail}</p>
                        </div>
                    </div>

                    <div className="com-modal-details">
                        <div className="com-modal-row">
                            <span className="com-modal-key">Department</span>
                            <span className="com-modal-val com-dept-val">
                                <FaBuilding size={11} style={{ marginRight: 5, opacity: 0.6 }} />
                                {req.department}
                            </span>
                        </div>
                        <div className="com-modal-row">
                            <span className="com-modal-key">Client Off Date</span>
                            <span className="com-modal-val com-date-val">{req.date}</span>
                        </div>
                        <div className="com-modal-row">
                            <span className="com-modal-key">Submitted</span>
                            <span className="com-modal-val">{submittedDate}</span>
                        </div>
                    </div>

                    <div className="com-modal-reason-wrap">
                        <p className="com-modal-reason-label">Reason</p>
                        <p className="com-modal-reason-text">"{req.reason}"</p>
                    </div>

                    {error && <p className="com-modal-error">{error}</p>}
                </div>

                <div className="com-modal-footer">
                    <button
                        className="com-btn-reject"
                        onClick={() => onReject(req._id)}
                        disabled={loading}
                    >
                        <FaTimes size={12} />
                        {loading ? "Processing…" : "Reject"}
                    </button>
                    <button
                        className="com-btn-approve"
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
        <div className="com-table-card">
            <div className="com-table-card-header">
                <h3 className="com-table-title">Approved &amp; Rejected Records</h3>
                <p className="com-table-sub">{list.length} record{list.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="com-table-scroll">
                <table className="com-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Date</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Reviewed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="com-table-empty">No reviewed records yet.</td>
                            </tr>
                        ) : (
                            pageData.map(req => (
                                <tr key={req._id}>
                                    <td>
                                        <p className="com-emp-name">{req.employeeName}</p>
                                        <p className="com-emp-email">{req.employeeEmail}</p>
                                    </td>
                                    <td className="com-dept-cell">{req.department}</td>
                                    <td className="com-date-cell">{req.date}</td>
                                    <td className="com-reason-cell">{req.reason}</td>
                                    <td><StatusBadge status={req.status} /></td>
                                    <td className="com-reviewed-by">
                                        {req.reviewedBy || <span className="com-dash">—</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="com-pagination">
                    <button
                        className="com-page-arrow"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <FaChevronLeft size={11} />
                    </button>
                    <span className="com-page-label">Page {page} of {totalPages}</span>
                    <button
                        className="com-page-arrow"
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
    const submittedDate = new Date(req.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
    });

    return (
        <div className="com-card">
            <div className="com-card-top">
                <div>
                    <p className="com-card-name">{req.employeeName}</p>
                    <p className="com-card-email">{req.employeeEmail}</p>
                </div>
                <StatusBadge status={req.status} />
            </div>
            <div className="com-card-body">
                <p className="com-card-dept">
                    <FaBuilding size={10} style={{ marginRight: 5, opacity: 0.55 }} />
                    {req.department}
                </p>
                <p className="com-card-date">{req.date}</p>
                <p className="com-card-reason">"{req.reason}"</p>
                <p className="com-card-applied">Submitted: {submittedDate}</p>
            </div>
            <div className="com-card-footer">
                <button className="com-btn-review" onClick={() => onReview(req)}>
                    Review Request
                </button>
            </div>
        </div>
    );
}

function ClientOffManagement() {
    const { employees } = useApp();

    const [clientOffs,    setClientOffs]    = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [reviewing,     setReviewing]     = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError,   setReviewError]   = useState("");
    const [selectedEmpId, setSelectedEmpId] = useState("");

    const fetchAll = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/client-off/all`, { headers: getAuthHeaders() });
            if (res.ok) {
                const { clientOffs: data } = await res.json();
                setClientOffs(data ?? []);
            }
        } catch (err) {
            console.error("Failed to fetch client offs:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleReview(id, status) {
        setReviewLoading(true);
        setReviewError("");
        try {
            const res = await fetch(`${API_BASE}/api/client-off/${id}/review`, {
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
        ? clientOffs.filter(c => c.userId === selectedEmpId || c.userId?.toString() === selectedEmpId)
        : clientOffs;

    const pendingList  = filtered.filter(c => c.status === "Pending");
    const reviewedList = filtered.filter(c => c.status !== "Pending");

    if (loading) {
        return (
            <div className="com-page">
                <div className="com-empty-state">
                    <FaUsers size={32} className="com-empty-icon" />
                    <p className="com-empty-title">Loading…</p>
                    <p className="com-empty-sub">Fetching client off requests</p>
                </div>
            </div>
        );
    }

    return (
        <div className="com-page">

            <div className="com-page-header">
                <div>
                    <h2 className="com-page-title">Client Off Management</h2>
                    <p className="com-page-sub">Review and action employee client off requests</p>
                </div>
            </div>

            <div className="com-filter-bar">
                <span className="com-filter-label">Filter by employee</span>
                <select
                    className="com-emp-select"
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                >
                    <option value="">All Employees</option>
                    {employees.filter(e => e.role === "employee").map(e => (
                        <option key={e._id} value={e._id}>{e.userName}</option>
                    ))}
                </select>
                {selectedEmpId && (
                    <button className="com-filter-clear" onClick={() => setSelectedEmpId("")}>
                        Clear
                    </button>
                )}
            </div>

            <section className="com-section">
                <div className="com-section-header">
                    <h3 className="com-section-title">Pending Requests</h3>
                    {pendingList.length > 0 && (
                        <span className="com-count com-count--pending">{pendingList.length} pending</span>
                    )}
                </div>

                {pendingList.length === 0 ? (
                    <div className="com-empty-state">
                        <FaInbox size={28} className="com-empty-icon" />
                        <p className="com-empty-title">No Pending Requests</p>
                        <p className="com-empty-sub">All client off requests have been reviewed.</p>
                    </div>
                ) : (
                    <div className="com-cards-grid">
                        {pendingList.map(req => (
                            <PendingCard key={req._id} req={req} onReview={setReviewing} />
                        ))}
                    </div>
                )}
            </section>

            <section className="com-section">
                <div className="com-section-header">
                    <h3 className="com-section-title">Approved &amp; Rejected</h3>
                    {reviewedList.length > 0 && (
                        <span className="com-count">{reviewedList.length} record{reviewedList.length !== 1 ? "s" : ""}</span>
                    )}
                </div>

                {reviewedList.length === 0 ? (
                    <div className="com-empty-state">
                        <FaUsers size={28} className="com-empty-icon" />
                        <p className="com-empty-title">No Records Yet</p>
                        <p className="com-empty-sub">Reviewed requests will appear here.</p>
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

export default ClientOffManagement;
