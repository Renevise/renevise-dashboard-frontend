import { useState, useEffect, useCallback } from "react";
import {
    FaCloudUploadAlt, FaPaperclip, FaTimes, FaCheckCircle, FaHistory,
} from "react-icons/fa";
import "./AttendanceCorrection.css";

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

const EMPTY_FORM = { date: "", clockIn: "", clockOut: "", reason: "" };

function StatusBadge({ status }) {
    const map = { Approved: "ac-badge--approved", Rejected: "ac-badge--rejected", Pending: "ac-badge--pending" };
    return <span className={`ac-badge ${map[status] || "ac-badge--pending"}`}>{status}</span>;
}

function AttendanceCorrection() {
    const user     = getStoredUser();
    const userName = user?.userName || "Unknown User";

    const [form,       setForm]       = useState(EMPTY_FORM);
    const [errors,     setErrors]     = useState({});
    const [files,      setFiles]      = useState([]);
    const [dragOver,   setDragOver]   = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [apiError,   setApiError]   = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [history,     setHistory]     = useState([]);
    const [histLoading, setHistLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/attendance-correction/my`, { headers: getAuthHeaders() });
            if (res.ok) {
                const { corrections } = await res.json();
                setHistory(corrections ?? []);
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

    function addFiles(fileList) {
        const valid = Array.from(fileList).filter(f =>
            ["application/pdf", "image/jpeg", "image/png"].includes(f.type) || f.name.match(/\.(pdf|jpe?g|png)$/i)
        );
        setFiles(prev => [...prev, ...valid]);
    }

    function removeFile(idx) { setFiles(prev => prev.filter((_, i) => i !== idx)); }

    function validate() {
        const errs = {};
        if (!form.date)    errs.date    = "Date is required";
        if (!form.clockIn) errs.clockIn = "Clock in time is required";
        if (!form.clockOut) errs.clockOut = "Clock out time is required";
        else if (form.clockIn && form.clockOut <= form.clockIn) errs.clockOut = "Clock out must be after clock in";
        if (!form.reason.trim()) errs.reason = "Please describe why the clock in/out was missed";
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
            const res = await fetch(`${API_BASE}/api/attendance-correction`, {
                method : "POST",
                headers: getAuthHeaders(),
                body   : JSON.stringify({ date: form.date, clockIn: form.clockIn, clockOut: form.clockOut, reason: form.reason.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setApiError(data.message || "Failed to submit request."); return; }
            setForm(EMPTY_FORM);
            setFiles([]);
            setErrors({});
            setSuccessMsg("Correction request submitted successfully. Pending review.");
            fetchHistory();
        } catch {
            setApiError("Network error. Please check your connection.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="ac-page">

            <div className="ac-page-header">
                <div>
                    <h2 className="ac-page-title">Attendance Correction</h2>
                    <p className="ac-page-sub">Submit a correction request for a missed clock in or clock out</p>
                </div>
            </div>

            <div className="ac-split">

                <div className="ac-form-col">

                    {successMsg && (
                        <div className="ac-success-banner">
                            <FaCheckCircle size={15} />
                            {successMsg}
                        </div>
                    )}

                    {apiError && <div className="ac-api-error">{apiError}</div>}

                    <p className="ac-required-note">
                        <span className="ac-asterisk">*</span>&nbsp;Indicates required
                    </p>

                    <form onSubmit={handleSubmit} noValidate>

                        <div className="ac-card">
                            <div className="ac-section-label">REQUESTER INFORMATION</div>
                            <div className="ac-field">
                                <label className="ac-label">Requested By</label>
                                <div className="ac-requester-row">
                                    <div className="ac-requester-avatar">{userName.charAt(0).toUpperCase()}</div>
                                    <div className="ac-requester-info">
                                        <span className="ac-requester-name">{userName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="ac-card">
                            <div className="ac-section-label">CORRECTION DETAILS</div>

                            <div className="ac-field">
                                <label className="ac-label">Which date needs correction?<span className="ac-asterisk"> *</span></label>
                                <input type="date" name="date" value={form.date} onChange={handleChange}
                                    max={new Date().toISOString().split("T")[0]}
                                    className={`ac-input${errors.date ? " ac-input--err" : ""}`} />
                                {errors.date && <span className="ac-field-error">{errors.date}</span>}
                            </div>

                            <div className="ac-two-col">
                                <div className="ac-field">
                                    <label className="ac-label">Actual clock in time<span className="ac-asterisk"> *</span></label>
                                    <input type="time" name="clockIn" value={form.clockIn} onChange={handleChange}
                                        className={`ac-input${errors.clockIn ? " ac-input--err" : ""}`} />
                                    {errors.clockIn && <span className="ac-field-error">{errors.clockIn}</span>}
                                </div>
                                <div className="ac-field">
                                    <label className="ac-label">Actual clock out time<span className="ac-asterisk"> *</span></label>
                                    <input type="time" name="clockOut" value={form.clockOut} onChange={handleChange}
                                        className={`ac-input${errors.clockOut ? " ac-input--err" : ""}`} />
                                    {errors.clockOut && <span className="ac-field-error">{errors.clockOut}</span>}
                                </div>
                            </div>

                            <div className="ac-field">
                                <label className="ac-label">Why was clock in/out missed?<span className="ac-asterisk"> *</span></label>
                                <textarea name="reason" value={form.reason} onChange={handleChange} rows={4}
                                    placeholder="Describe the reason your clock in or clock out was missed…"
                                    className={`ac-textarea${errors.reason ? " ac-input--err" : ""}`} />
                                {errors.reason && <span className="ac-field-error">{errors.reason}</span>}
                            </div>

                            <div className="ac-field">
                                <label className="ac-label">Attachments</label>
                                <div className={`ac-dropzone${dragOver ? " ac-dropzone--over" : ""}`}
                                    onClick={() => document.getElementById("ac-file-input").click()}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}>
                                    <FaCloudUploadAlt size={28} className="ac-dropzone-icon" />
                                    <p className="ac-dropzone-text">Choose a file<span className="ac-dropzone-or"> or drag it here.</span></p>
                                    <p className="ac-dropzone-hint">PDF, JPG, JPEG, PNG</p>
                                    <input id="ac-file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                                        style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />
                                </div>
                                {files.length > 0 && (
                                    <ul className="ac-file-list">
                                        {files.map((f, i) => (
                                            <li key={i} className="ac-file-item">
                                                <FaPaperclip size={11} />
                                                <span className="ac-file-name">{f.name}</span>
                                                <button type="button" className="ac-file-remove" onClick={() => removeFile(i)}>
                                                    <FaTimes size={10} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="ac-form-footer">
                            <button type="button" className="ac-reset-btn"
                                onClick={() => { setForm(EMPTY_FORM); setErrors({}); setFiles([]); setApiError(""); setSuccessMsg(""); }}>
                                Reset
                            </button>
                            <button type="submit" className="ac-submit-btn" disabled={submitting}>
                                {submitting ? <span className="ac-spinner" /> : "Submit Request"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="ac-history-col">
                    <div className="ac-history-card">
                        <div className="ac-history-header">
                            <FaHistory size={13} style={{ color: "rgba(94,168,255,0.5)" }} />
                            <span className="ac-history-title">My Correction Requests</span>
                            {history.length > 0 && <span className="ac-history-count">{history.length}</span>}
                        </div>

                        {histLoading ? (
                            <p className="ac-history-empty">Loading…</p>
                        ) : history.length === 0 ? (
                            <p className="ac-history-empty">No correction requests submitted yet.</p>
                        ) : (
                            <div className="ac-history-list">
                                {history.map(req => (
                                    <div key={req._id} className="ac-history-item">
                                        <div className="ac-history-item-left">
                                            <span className="ac-history-date">{req.date}</span>
                                            <span className="ac-history-times">{req.clockIn} &rarr; {req.clockOut}</span>
                                            <span className="ac-history-reason">"{req.reason}"</span>
                                        </div>
                                        <div className="ac-history-item-right">
                                            <StatusBadge status={req.status} />
                                            {req.status !== "Pending" && req.reviewedBy && (
                                                <span className="ac-history-reviewer">by {req.reviewedBy}</span>
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

export default AttendanceCorrection;
