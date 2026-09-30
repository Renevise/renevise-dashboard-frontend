import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowLeft, FaEye, FaEyeSlash,
    FaCheckCircle, FaExclamationTriangle, FaSave,
} from "react-icons/fa";
import "./Profile.css";

const API_BASE  = import.meta.env.VITE_API_URL || "http://localhost:3000";
const EMPTY_PW  = { oldPassword: "", newPassword: "", confirmNewPassword: "" };

function Profile() {
    const navigate = useNavigate();

    const [profile,  setProfile]  = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [toast,    setToast]    = useState({ text: "", type: "" });

    const [form,    setForm]    = useState({ firstName: "", lastName: "", phone: "", city: "", department: "", designation: "" });
    const [saving,  setSaving]  = useState(false);
    const [formErr, setFormErr] = useState("");

    const [pwForm,  setPwForm]  = useState(EMPTY_PW);
    const [pwErr,   setPwErr]   = useState("");
    const [showPw,   setShowPw]   = useState({ old: false, nw: false, cf: false });

    function toast_(text, type = "success") {
        setToast({ text, type });
        setTimeout(() => setToast({ text: "", type: "" }), 3500);
    }

    function handleUnauth() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    }

    function authFetch(url, opts = {}) {
        const token = localStorage.getItem("token");
        return fetch(`${API_BASE}${url}`, {
            ...opts,
            headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
        });
    }

    async function loadProfile() {
        setLoading(true);
        try {
            const res  = await authFetch("/api/profile");
            if (res.status === 401) { handleUnauth(); return; }
            const data = await res.json();
            if (res.ok) {
                setProfile(data.user);
                setForm({
                    firstName:   data.user.firstName   || "",
                    lastName:    data.user.lastName    || "",
                    phone:       data.user.phone       || "",
                    city:        data.user.city        || "",
                    department:  data.user.department  || "",
                    designation: data.user.designation || "",
                });
            } else {
                toast_(data.message || "Failed to load profile", "error");
            }
        } catch {
            toast_("Failed to load profile", "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadProfile(); }, []);

    async function handleSubmit() {
        setFormErr("");
        setPwErr("");

        if (!form.firstName.trim() || !form.lastName.trim()) {
            setFormErr("First name and last name are required");
            return;
        }

        const pwFilled = !!(pwForm.newPassword || pwForm.confirmNewPassword);
        if (pwFilled) {
            if (!pwForm.oldPassword) {
                setPwErr("Old password is required to change password");
                return;
            }
            if (!pwForm.newPassword || !pwForm.confirmNewPassword) {
                setPwErr("All password fields are required");
                return;
            }
            if (pwForm.newPassword.length < 8) {
                setPwErr("New password must be at least 8 characters");
                return;
            }
            if (pwForm.newPassword !== pwForm.confirmNewPassword) {
                setPwErr("New password and confirm password do not match");
                return;
            }
        }

        setSaving(true);
        try {
            const res  = await authFetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.status === 401) { handleUnauth(); return; }
            const data = await res.json();
            if (!res.ok) { setFormErr(data.message || "Failed to update profile"); return; }

            setProfile(data.user);
            const stored = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({
                ...stored,
                firstName:  data.user.firstName,
                lastName:   data.user.lastName,
                department: data.user.department,
            }));

            if (pwFilled) {
                const pwRes  = await authFetch("/api/profile/password", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(pwForm),
                });
                if (pwRes.status === 401) { handleUnauth(); return; }
                const pwData = await pwRes.json();
                if (!pwRes.ok) { setPwErr(pwData.message || "Failed to change password"); toast_("Profile saved, but password change failed", "error"); return; }
                toast_("Profile and password updated successfully");
            } else {
                toast_("Profile updated successfully");
            }
            setPwForm(EMPTY_PW);
            setShowPw({ old: false, nw: false, cf: false });
        } catch {
            setFormErr("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="pf-loading">
                <div className="pf-spinner" />
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="pf-page">

            {}
            {toast.text && (
                <div className={`pf-toast pf-toast--${toast.type}`}>
                    {toast.type === "success" ? <FaCheckCircle size={13} /> : <FaExclamationTriangle size={13} />}
                    {toast.text}
                </div>
            )}

            {}
            <div className="pf-card">

                <button className="pf-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
                    <FaArrowLeft size={13} />
                    Back
                </button>

                {}
                <div className="pf-section-label">
                    <span>Personal Information</span>
                </div>

                <div className="pf-grid">
                    <div className="pf-field">
                        <label className="pf-label">First Name</label>
                        <input
                            className="pf-input"
                            type="text"
                            value={form.firstName}
                            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                            placeholder="First name"
                            maxLength={50}
                        />
                    </div>
                    <div className="pf-field">
                        <label className="pf-label">Last Name</label>
                        <input
                            className="pf-input"
                            type="text"
                            value={form.lastName}
                            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                            placeholder="Last name"
                            maxLength={50}
                        />
                    </div>
                    <div className="pf-field pf-field--full">
                        <label className="pf-label">
                            Email
                            <span className="pf-badge">Read-only</span>
                        </label>
                        <input
                            className="pf-input pf-input--ro"
                            type="email"
                            value={profile?.email || ""}
                            readOnly
                        />
                    </div>
                    <div className="pf-field">
                        <label className="pf-label">Phone Number</label>
                        <input
                            className="pf-input"
                            type="tel"
                            value={form.phone}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="+92 300 1234567"
                            maxLength={20}
                        />
                    </div>
                    <div className="pf-field">
                        <label className="pf-label">City</label>
                        <input
                            className="pf-input"
                            type="text"
                            value={form.city}
                            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                            placeholder="Your city"
                            maxLength={60}
                        />
                    </div>
                </div>

                {}
                <div className="pf-section-label pf-section-label--gap">
                    <span>Change Password</span>
                </div>

                <p className="pf-pw-hint">Leave blank if you don't want to change your password.</p>

                <div className="pf-pw-stack">
                    {[
                        { key: "oldPassword",        label: "Old Password",         showKey: "old" },
                        { key: "newPassword",        label: "New Password",         showKey: "nw"  },
                        { key: "confirmNewPassword", label: "Confirm New Password", showKey: "cf"  },
                    ].map(({ key, label, showKey }) => (
                        <div className="pf-field" key={key}>
                            <label className="pf-label">{label}</label>
                            <div className="pf-pw-wrap">
                                <input
                                    className="pf-input pf-input--pw"
                                    type={showPw[showKey] ? "text" : "password"}
                                    value={pwForm[key]}
                                    onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                                    placeholder={`Enter ${label.toLowerCase()}`}
                                    autoComplete={key === "oldPassword" ? "current-password" : "new-password"}
                                />
                                <button
                                    type="button"
                                    className="pf-eye"
                                    onClick={() => setShowPw(s => ({ ...s, [showKey]: !s[showKey] }))}
                                    tabIndex={-1}
                                >
                                    {showPw[showKey] ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {formErr && (
                    <div className="pf-error">
                        <FaExclamationTriangle size={12} /> {formErr}
                    </div>
                )}

                {pwErr && (
                    <div className="pf-error">
                        <FaExclamationTriangle size={12} /> {pwErr}
                    </div>
                )}

                <div className="pf-btn-row">
                    <button className="pf-btn pf-btn--primary" onClick={handleSubmit} disabled={saving}>
                        <FaSave size={13} />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Profile;
