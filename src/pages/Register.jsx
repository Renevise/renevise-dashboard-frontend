import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function normalizePart(str) {
    return str.trim().toLowerCase().replace(/\s+/g, "");
}

function previewUserName(firstName, lastName) {
    const f = normalizePart(firstName);
    const l = normalizePart(lastName);
    return f && l ? `${f}.${l}` : "";
}

function validateEmailField(value) {
    const v = value.trim();
    if (!v) return "Email is required";
    if (v.length > 254) return "Email address is too long";
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v))
        return "Enter a valid email (e.g. user@gmail.com)";
    if (/\.{2,}/.test(v)) return "Email cannot contain consecutive dots";
    return "";
}

function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ text: "", type: "" });
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState({ password: false, confirm: false });

    const validate = () => {
        const errs = {};
        if (!form.firstName.trim()) errs.firstName = "First name is required";
        else if (form.firstName.trim().length < 2) errs.firstName = "Must be at least 2 characters";
        if (!form.lastName.trim()) errs.lastName = "Last name is required";
        else if (form.lastName.trim().length < 2) errs.lastName = "Must be at least 2 characters";
        const emailErr = validateEmailField(form.email);
        if (emailErr) errs.email = emailErr;
        if (!form.password) errs.password = "Password is required";
        else if (form.password.length < 6) errs.password = "Password must be at least 6 characters";
        if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
        else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
        return errs;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (name === "email" && errors.email) {
            setErrors((prev) => ({ ...prev, email: validateEmailField(value) }));
        } else if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleEmailBlur = () => {
        setErrors((prev) => ({ ...prev, email: validateEmailField(form.email) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: form.firstName.trim(),
                    lastName:  form.lastName.trim(),
                    email:     form.email.trim(),
                    password:  form.password,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ text: data.message, type: "success" });
                setTimeout(() => navigate("/login", { replace: true }), 1500);
            } else {
                setMessage({ text: data.message || "Registration failed. Please try again.", type: "error" });
            }
        } catch {
            setMessage({ text: "Network error. Please check your connection.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const usernamePreview = previewUserName(form.firstName, form.lastName);

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <img src="/logo.jpeg" alt="Renevise" className="auth-logo" />
                    <div>
                        <h1 className="auth-brand-name">Renevise</h1>
                        <p className="auth-brand-sub">Human Resource Management</p>
                    </div>
                </div>

                <h2 className="auth-title">Create your account</h2>
                <p className="auth-subtitle">Join the Renevise platform today</p>

                {message.text && (
                    <div className={`auth-message auth-message--${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="reg-firstName">First Name</label>
                            <input
                                id="reg-firstName"
                                type="text"
                                name="firstName"
                                value={form.firstName}
                                onChange={handleChange}
                                className={`form-input${errors.firstName ? " form-input--error" : ""}`}
                                placeholder="Abdul"
                                autoComplete="given-name"
                            />
                            {errors.firstName && <span className="form-error">{errors.firstName}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="reg-lastName">Last Name</label>
                            <input
                                id="reg-lastName"
                                type="text"
                                name="lastName"
                                value={form.lastName}
                                onChange={handleChange}
                                className={`form-input${errors.lastName ? " form-input--error" : ""}`}
                                placeholder="Ahad"
                                autoComplete="family-name"
                            />
                            {errors.lastName && <span className="form-error">{errors.lastName}</span>}
                        </div>
                    </div>

                    {usernamePreview && (
                        <div className="form-group" style={{ marginTop: "-4px" }}>
                            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 12px" }}>
                                Username will be: <strong style={{ color: "#5EA8FF" }}>{usernamePreview}</strong>
                            </p>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">Email</label>
                        <input
                            id="reg-email"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            onBlur={handleEmailBlur}
                            className={`form-input${errors.email ? " form-input--error" : ""}`}
                            placeholder="user@gmail.com"
                            autoComplete="email"
                        />
                        {errors.email && <span className="form-error">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <div className="pw-field">
                            <input
                                id="reg-password"
                                type={showPw.password ? "text" : "password"}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                className={`form-input${errors.password ? " form-input--error" : ""}`}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <button type="button" className="pw-toggle" onClick={() => setShowPw(p => ({ ...p, password: !p.password }))} tabIndex={-1} aria-label={showPw.password ? "Hide password" : "Show password"}>
                                {showPw.password ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
                        {errors.password && <span className="form-error">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                        <div className="pw-field">
                            <input
                                id="reg-confirm"
                                type={showPw.confirm ? "text" : "password"}
                                name="confirmPassword"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                className={`form-input${errors.confirmPassword ? " form-input--error" : ""}`}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <button type="button" className="pw-toggle" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} tabIndex={-1} aria-label={showPw.confirm ? "Hide password" : "Show password"}>
                                {showPw.confirm ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <span className="form-error">{errors.confirmPassword}</span>
                        )}
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? <span className="auth-spinner" /> : "Create Account"}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?{" "}
                    <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
