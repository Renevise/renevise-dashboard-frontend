import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        userName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ text: "", type: "" });
    const [loading, setLoading] = useState(false);

    function validateEmailField(value) {
        const v = value.trim();
        if (!v) return "Email is required";
        if (v.length > 254) return "Email address is too long";
        if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v))
            return "Enter a valid email (e.g. user@gmail.com)";
        if (/\.{2,}/.test(v)) return "Email cannot contain consecutive dots";
        return "";
    }

    const validate = () => {
        const errs = {};
        if (!form.userName.trim()) {
            errs.userName = "Username is required";
        } else if (form.userName.trim().length < 2) {
            errs.userName = "Username must be at least 2 characters";
        }
        const emailErr = validateEmailField(form.email);
        if (emailErr) errs.email = emailErr;
        if (!form.password) {
            errs.password = "Password is required";
        } else if (form.password.length < 6) {
            errs.password = "Password must be at least 6 characters";
        }
        if (!form.confirmPassword) {
            errs.confirmPassword = "Please confirm your password";
        } else if (form.password !== form.confirmPassword) {
            errs.confirmPassword = "Passwords do not match";
        }
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
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }

        setLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userName: form.userName.trim(),
                    email: form.email.trim(),
                    password: form.password,
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
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-username">
                            Username
                        </label>
                        <input
                            id="reg-username"
                            type="text"
                            name="userName"
                            value={form.userName}
                            onChange={handleChange}
                            className={`form-input${errors.userName ? " form-input--error" : ""}`}
                            placeholder="John Doe"
                            autoComplete="name"
                        />
                        {errors.userName && <span className="form-error">{errors.userName}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">
                            Email
                        </label>
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
                        <label className="form-label" htmlFor="reg-password">
                            Password
                        </label>
                        <input
                            id="reg-password"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            className={`form-input${errors.password ? " form-input--error" : ""}`}
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                        {errors.password && <span className="form-error">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">
                            Confirm Password
                        </label>
                        <input
                            id="reg-confirm"
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            className={`form-input${errors.confirmPassword ? " form-input--error" : ""}`}
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
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
                    <Link to="/login" className="auth-link">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
