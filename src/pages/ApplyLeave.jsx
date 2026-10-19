import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowLeft, FaCloudUploadAlt, FaPaperclip, FaTimes, FaCheckCircle, FaHistory,
} from "react-icons/fa";
import leaveJson from "../data/leave.json";
import { useApp } from "../context/AppContext";
import { countWorkingDays } from "../utils/leave";
import "./ApplyLeave.css";

const LEAVE_TYPES = leaveJson.types;

const EMPTY_FORM = {
    leaveType: LEAVE_TYPES[0],
    fromDate : "",
    untilDate: "",
    reason   : "",
};

function StatusBadge({ status }) {
    const map = { Approved: "al-badge--approved", Rejected: "al-badge--rejected", Pending: "al-badge--pending" };
    return <span className={`al-badge ${map[status] || "al-badge--pending"}`}>{status}</span>;
}

function ApplyLeave() {
    const navigate = useNavigate();
    const { leave }   = useApp();
    const { myLeaves, applyLeave } = leave;

    const [form,       setForm]       = useState(EMPTY_FORM);
    const [errors,     setErrors]     = useState({});
    const [files,      setFiles]      = useState([]);
    const [dragOver,   setDragOver]   = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [apiError,   setApiError]   = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
        if (apiError)     setApiError("");
    }

    function addFiles(fileList) {
        setFiles(prev => [...prev, ...Array.from(fileList)]);
    }

    function removeFile(idx) {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    }

    function validate() {
        const errs = {};
        if (!form.fromDate)  errs.fromDate  = "From date is required";
        if (!form.untilDate) errs.untilDate = "Until date is required";
        else if (form.fromDate && form.untilDate && form.untilDate < form.fromDate)
            errs.untilDate = "Until date must be on or after from date";
        else if (form.fromDate && form.untilDate && form.untilDate >= form.fromDate
                 && countWorkingDays(form.fromDate, form.untilDate) === 0)
            errs.untilDate = "The selected dates contain no working days. Saturday and Sunday are not chargeable leave days.";
        if (!form.reason.trim()) errs.reason = "Please provide a reason for your leave";
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
            await applyLeave({
                type  : form.leaveType,
                from  : form.fromDate,
                to    : form.untilDate,
                reason: form.reason.trim(),
            });
            setForm(EMPTY_FORM);
            setFiles([]);
            setErrors({});
            setSuccessMsg("Leave request submitted successfully and is pending approval.");
        } catch (err) {
            setApiError(err.message || "Failed to submit leave request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    const sortedLeaves = [...myLeaves].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return (
        <div className="al-page">

            <div className="al-page-header">
                <button className="al-back-btn" onClick={() => navigate(-1)}>
                    <FaArrowLeft size={14} />
                </button>
                <div>
                    <h2 className="al-page-title">Apply for Leave</h2>
                    <p className="al-page-sub">Submit a leave request for approval</p>
                </div>
            </div>

            <div className="al-split">

                <div className="al-form-col">

                    {successMsg && (
                        <div className="al-success-banner">
                            <FaCheckCircle size={15} />
                            {successMsg}
                        </div>
                    )}

                    {apiError && (
                        <div className="al-api-error">{apiError}</div>
                    )}

                    <p className="al-required-note">
                        <span className="al-asterisk">*</span>&nbsp;Indicates required
                    </p>

                    <form onSubmit={handleSubmit} noValidate>

                        <div className="al-card">
                            <div className="al-section-label">REQUESTER INFORMATION</div>
                            <div className="al-field">
                                <label className="al-label">Requested By</label>
                                <div className="al-requester-row">
                                    <div className="al-requester-avatar">
                                        {(leave.myLeaves[0]?.employee || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="al-requester-info">
                                        <span className="al-requester-name">
                                            {leave.myLeaves[0]?.employee || "You"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="al-card">
                            <div className="al-section-label">LEAVE DETAILS</div>

                            <div className="al-field">
                                <label className="al-label">
                                    Leave type<span className="al-asterisk"> *</span>
                                </label>
                                <select
                                    className="al-select"
                                    name="leaveType"
                                    value={form.leaveType}
                                    onChange={handleChange}
                                >
                                    {LEAVE_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="al-two-col">
                                <div className="al-field">
                                    <label className="al-label">
                                        From date<span className="al-asterisk"> *</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="fromDate"
                                        value={form.fromDate}
                                        onChange={handleChange}
                                        className={`al-input${errors.fromDate ? " al-input--err" : ""}`}
                                    />
                                    {errors.fromDate && <span className="al-field-error">{errors.fromDate}</span>}
                                </div>

                                <div className="al-field">
                                    <label className="al-label">
                                        Until date<span className="al-asterisk"> *</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="untilDate"
                                        value={form.untilDate}
                                        onChange={handleChange}
                                        className={`al-input${errors.untilDate ? " al-input--err" : ""}`}
                                    />
                                    {errors.untilDate && <span className="al-field-error">{errors.untilDate}</span>}
                                </div>
                            </div>

                            {(() => {
                                if (!form.fromDate || !form.untilDate || form.untilDate < form.fromDate) return null;
                                const wd = countWorkingDays(form.fromDate, form.untilDate);
                                if (wd === 0) return (
                                    <div className="al-working-days-row">
                                        <span className="al-working-days-pill al-working-days-pill--warn">
                                            0 working days
                                        </span>
                                        <span className="al-working-days-note">Saturday and Sunday are not counted</span>
                                    </div>
                                );
                                return (
                                    <div className="al-working-days-row">
                                        <span className="al-working-days-pill">
                                            {wd} working day{wd !== 1 ? "s" : ""}
                                        </span>
                                        <span className="al-working-days-note">Saturday and Sunday excluded</span>
                                    </div>
                                );
                            })()}

                            <div className="al-field">
                                <label className="al-label">
                                    Reason<span className="al-asterisk"> *</span>
                                </label>
                                <textarea
                                    name="reason"
                                    value={form.reason}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Describe the reason for your leave request…"
                                    className={`al-textarea${errors.reason ? " al-input--err" : ""}`}
                                />
                                {errors.reason && <span className="al-field-error">{errors.reason}</span>}
                            </div>

                        </div>

                        <div className="al-form-footer">
                            <button type="button" className="al-cancel-btn"
                                onClick={() => { setForm(EMPTY_FORM); setErrors({}); setFiles([]); setApiError(""); setSuccessMsg(""); }}
                                disabled={submitting}>
                                Reset
                            </button>
                            <button type="submit" className="al-submit-btn" disabled={submitting}>
                                {submitting ? <span className="al-spinner" /> : "Submit Request"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="al-history-col">
                    <div className="al-history-card">
                        <div className="al-history-header">
                            <FaHistory size={13} style={{ color: "rgba(94,168,255,0.5)" }} />
                            <span className="al-history-title">My Leave Requests</span>
                            {sortedLeaves.length > 0 && (
                                <span className="al-history-count">{sortedLeaves.length}</span>
                            )}
                        </div>

                        {sortedLeaves.length === 0 ? (
                            <p className="al-history-empty">No leave requests submitted yet.</p>
                        ) : (
                            <div className="al-history-list">
                                {sortedLeaves.map(req => (
                                    <div key={req._id} className="al-history-item">
                                        <div className="al-history-item-left">
                                            <span className="al-history-type">{req.leaveType}</span>
                                            <span className="al-history-dates">
                                                {req.fromDate} &rarr; {req.untilDate}
                                                <span className="al-history-days">{req.days}d</span>
                                            </span>
                                            <span className="al-history-reason">"{req.reason}"</span>
                                        </div>
                                        <div className="al-history-item-right">
                                            <StatusBadge status={req.status} />
                                            {req.status !== "Pending" && req.reviewedBy && (
                                                <span className="al-history-reviewer">by {req.reviewedBy}</span>
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

export default ApplyLeave;
