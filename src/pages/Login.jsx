import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({ email: "", password: "" });
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
        const emailErr = validateEmailField(form.email);
        if (emailErr) errs.email = emailErr;
        if (!form.password) errs.password = "Password is required";
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
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: form.email.trim(), password: form.password }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                navigate("/dashboard", { replace: true });
            } else {
                setMessage({ text: data.message || "Login failed. Please try again.", type: "error" });
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

                <h2 className="auth-title">Welcome back</h2>
                <p className="auth-subtitle">Sign in to your account to continue</p>

                {message.text && (
                    <div className={`auth-message auth-message--${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">
                            Email
                        </label>
                        <input
                            id="login-email"
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
                        <div className="fp-label-row">
                            <label className="form-label" htmlFor="login-password">
                                Password
                            </label>
                            <Link to="/forgot-password" className="auth-link fp-forgot-link">
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            id="login-password"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            className={`form-input${errors.password ? " form-input--error" : ""}`}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                        {errors.password && <span className="form-error">{errors.password}</span>}
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? <span className="auth-spinner" /> : "Sign In"}
                    </button>
                </form>

            </div>
        </div>
    );
}

export default Login;
