import { useState, useEffect, useCallback } from "react";
import { FaCheckCircle, FaHistory } from "react-icons/fa";
import "./ReportOvertime.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getStoredUser() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

const EMPTY_FORM = { onBehalf: "", requestedFor: "", date: "", extraHours: "", reason: "" };

function StatusBadge({ status }) {
    const map = { Approved: "ro-badge--approved", Rejected: "ro-badge--rejected", Pending: "ro-badge--pending" };
    return <span className={`ro-badge ${map[status] || "ro-badge--pending"}`}>{status}</span>;
}

function ReportOvertime() {
    const user     = getStoredUser();
    const userName = user?.userName || "Unknown User";

    const [form,       setForm]       = useState(EMPTY_FORM);
    const [errors,     setErrors]     = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError,   setApiError]   = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [history,     setHistory]     = useState([]);
    const [histLoading, setHistLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/overtime/my`, { headers: getAuthHeaders() });
            if (res.ok) {
                const { overtimes } = await res.json();
                setHistory(overtimes ?? []);
            }
        } catch {  } finally {
            setHistLoading(false);
        }
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    }

    function validate() {
        const errs = {};
        if (!form.requestedFor.trim()) errs.requestedFor = "Please specify who this request is for";
        if (!form.date)                errs.date         = "Date is required";
        if (!form.extraHours || isNaN(form.extraHours) || Number(form.extraHours) < 0.5)
            errs.extraHours = "Enter valid hours (minimum 0.5)";
        if (!form.reason.trim())       errs.reason       = "Please describe the work that required overtime";
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        setApiError("");
        setSuccessMsg("");
        try {
            const res = await fetch(`${API_BASE}/api/overtime`, {
                method : "POST",
                headers: getAuthHeaders(),
                body   : JSON.stringify({
                    onBehalf    : form.onBehalf,
                    requestedFor: form.requestedFor.trim(),
                    date        : form.date,
                    extraHours  : Number(form.extraHours),
                    reason      : form.reason.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setApiError(data.message || "Failed to submit request."); return; }
            setForm(EMPTY_FORM);
            setErrors({});
            setSuccessMsg("Overtime request submitted successfully. Pending approval.");
            fetchHistory();
        } catch {
            setApiError("Network error. Please check your connection.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="ro-page">

            <div className="ro-page-header">
                <div>
                    <h2 className="ro-page-title">Report Overtime</h2>
                    <p className="ro-page-sub">Log extra hours worked beyond your regular shift</p>
                </div>
            </div>

            <div className="ro-split">

                <div className="ro-form-col">

                    {successMsg && (
                        <div className="ro-success-banner">
                            <FaCheckCircle size={15} />
                            {successMsg}
                        </div>
                    )}

                    {apiError && <div className="ro-api-error">{apiError}</div>}

                    <p className="ro-required-note">
                        <span className="ro-asterisk">*</span>&nbsp;Indicates required
                    </p>

                    <form onSubmit={handleSubmit} noValidate>

                        <div className="ro-card">
                            <div className="ro-section-label">REQUESTER INFORMATION</div>

                            <div className="ro-field">
                                <label className="ro-label">Requested By</label>
                                <div className="ro-requester-row">
                                    <div className="ro-requester-avatar">{userName.charAt(0).toUpperCase()}</div>
                                    <span className="ro-requester-name">{userName}</span>
                                </div>
                            </div>

                            <div className="ro-field">
                                <label className="ro-label">Submitting on behalf of someone else?</label>
                                <select name="onBehalf" value={form.onBehalf} onChange={handleChange} className="ro-select">
                                    <option value="">-- None --</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>

                            <div className="ro-field">
                                <label className="ro-label">Requested For<span className="ro-asterisk"> *</span></label>
                                <input type="text" name="requestedFor" value={form.requestedFor} onChange={handleChange}
                                    placeholder="Enter employee name…"
                                    className={`ro-input${errors.requestedFor ? " ro-input--err" : ""}`} />
                                {errors.requestedFor && <span className="ro-field-error">{errors.requestedFor}</span>}
                            </div>
                        </div>

                        <div className="ro-card">
                            <div className="ro-section-label">OVERTIME DETAILS</div>

                            <div className="ro-two-col">
                                <div className="ro-field">
                                    <label className="ro-label">Date of overtime<span className="ro-asterisk"> *</span></label>
                                    <input type="date" name="date" value={form.date} onChange={handleChange}
                                        max={new Date().toISOString().split("T")[0]}
                                        className={`ro-input${errors.date ? " ro-input--err" : ""}`} />
                                    {errors.date && <span className="ro-field-error">{errors.date}</span>}
                                </div>
                                <div className="ro-field">
                                    <label className="ro-label">Extra hours worked<span className="ro-asterisk"> *</span></label>
                                    <input type="number" name="extraHours" value={form.extraHours} onChange={handleChange}
                                        placeholder="e.g. 2.5" min="0.5" step="0.5"
                                        className={`ro-input${errors.extraHours ? " ro-input--err" : ""}`} />
                                    {errors.extraHours && <span className="ro-field-error">{errors.extraHours}</span>}
                                </div>
                            </div>

                            <div className="ro-field">
                                <label className="ro-label">What work required overtime?<span className="ro-asterisk"> *</span></label>
                                <textarea name="reason" value={form.reason} onChange={handleChange} rows={4}
                                    placeholder="Describe the tasks or project that required overtime…"
                                    className={`ro-textarea${errors.reason ? " ro-input--err" : ""}`} />
                                {errors.reason && <span className="ro-field-error">{errors.reason}</span>}
                            </div>
                        </div>

                        <div className="ro-form-footer">
                            <button type="button" className="ro-reset-btn"
                                onClick={() => { setForm(EMPTY_FORM); setErrors({}); setApiError(""); setSuccessMsg(""); }}>
                                Reset
                            </button>
                            <button type="submit" className="ro-submit-btn" disabled={submitting}>
                                {submitting ? <span className="ro-spinner" /> : "Submit Overtime Request"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="ro-history-col">
                    <div className="ro-history-card">
                        <div className="ro-history-header">
                            <FaHistory size={13} style={{ color: "rgba(94,168,255,0.5)" }} />
                            <span className="ro-history-title">My Overtime Requests</span>
                            {history.length > 0 && <span className="ro-history-count">{history.length}</span>}
                        </div>

                        {histLoading ? (
                            <p className="ro-history-empty">Loading…</p>
                        ) : history.length === 0 ? (
                            <p className="ro-history-empty">No overtime requests submitted yet.</p>
                        ) : (
                            <div className="ro-history-list">
                                {history.map(req => (
                                    <div key={req._id} className="ro-history-item">
                                        <div className="ro-history-item-left">
                                            <span className="ro-history-date">{req.date}</span>
                                            <span className="ro-history-hours">{req.extraHours}h overtime</span>
                                            {req.requestedFor && req.requestedFor !== req.employee && (
                                                <span className="ro-history-for">For: {req.requestedFor}</span>
                                            )}
                                            <span className="ro-history-reason">"{req.reason}"</span>
                                        </div>
                                        <div className="ro-history-item-right">
                                            <StatusBadge status={req.status} />
                                            {req.status !== "Pending" && req.reviewedBy && (
                                                <span className="ro-history-reviewer">by {req.reviewedBy}</span>
                                            )}
                                        </div>
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

export default ReportOvertime;
