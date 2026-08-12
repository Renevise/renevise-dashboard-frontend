import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [step,            setStep]           = useState("email"); 
    const [email,           setEmail]           = useState("");
    const [otp,             setOtp]             = useState("");
    const [newPassword,     setNewPassword]     = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors,          setErrors]          = useState({});
    const [message,         setMessage]         = useState({ text: "", type: "" });
    const [loading,         setLoading]         = useState(false);

    async function handleSendOtp(e) {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed) { setErrors({ email: "Email is required" }); return; }
        if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
            setErrors({ email: "Enter a valid email address" });
            return;
        }
        setErrors({});
        setLoading(true);
        setMessage({ text: "", type: "" });
        try {
            const res  = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmed }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: "OTP sent! Check your email inbox.", type: "success" });
                setTimeout(() => { setMessage({ text: "", type: "" }); setStep("otp"); }, 1000);
            } else {
                setMessage({ text: data.message || "Failed to send OTP.", type: "error" });
            }
        } catch {
            setMessage({ text: "Network error. Please check your connection.", type: "error" });
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(e) {
        e.preventDefault();
        if (!otp || otp.length !== 6) { setErrors({ otp: "Enter the 6-digit OTP" }); return; }
        setErrors({});
        setLoading(true);
        setMessage({ text: "", type: "" });
        try {
            const res  = await fetch(`${API_BASE}/api/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), otp }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: "OTP verified!", type: "success" });
                setTimeout(() => { setMessage({ text: "", type: "" }); setStep("password"); }, 700);
            } else {
                setMessage({ text: data.message || "Invalid OTP.", type: "error" });
            }
        } catch {
            setMessage({ text: "Network error. Please check your connection.", type: "error" });
        } finally {
            setLoading(false);
        }
    }

    async function handleResetPassword(e) {
        e.preventDefault();
        const errs = {};
        if (!newPassword)                            errs.newPassword     = "Password is required";
        else if (newPassword.length < 6)             errs.newPassword     = "Password must be at least 6 characters";
        if (!confirmPassword)                        errs.confirmPassword = "Please confirm your password";
        else if (newPassword !== confirmPassword)    errs.confirmPassword = "Passwords do not match";
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);
        setMessage({ text: "", type: "" });
        try {
            const res  = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), otp, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: "Password reset successfully! Redirecting to sign in…", type: "success" });
                setTimeout(() => navigate("/login", { replace: true }), 2000);
            } else {
                setMessage({ text: data.message || "Failed to reset password.", type: "error" });
            }
        } catch {
            setMessage({ text: "Network error. Please check your connection.", type: "error" });
        } finally {
            setLoading(false);
        }
    }

    const stepsDone = { email: false, otp: step === "password" || step === "otp", password: step === "password" };
    const stepsActive = { email: step === "email", otp: step === "otp", password: step === "password" };

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

                <div className="fp-steps">
                    <div className={`fp-step${stepsActive.email ? " fp-step--active" : ""}${step !== "email" ? " fp-step--done" : ""}`}>
                        {step !== "email" ? "✓" : "1"}
                    </div>
                    <div className="fp-step-line" />
                    <div className={`fp-step${stepsActive.otp ? " fp-step--active" : ""}${step === "password" ? " fp-step--done" : ""}`}>
                        {step === "password" ? "✓" : "2"}
                    </div>
                    <div className="fp-step-line" />
                    <div className={`fp-step${stepsActive.password ? " fp-step--active" : ""}`}>3</div>
                </div>

                {message.text && (
                    <div className={`auth-message auth-message--${message.type}`}>{message.text}</div>
                )}

                {step === "email" && (
                    <>
                        <h2 className="auth-title">Forgot Password?</h2>
                        <p className="auth-subtitle">Enter your registered email and we'll send a 6-digit OTP.</p>
                        <form onSubmit={handleSendOtp} noValidate>
                            <div className="form-group">
                                <label className="form-label" htmlFor="fp-email">Email Address</label>
                                <input
                                    id="fp-email"
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); if (errors.email) setErrors({}); }}
                                    className={`form-input${errors.email ? " form-input--error" : ""}`}
                                    placeholder="user@gmail.com"
                                    autoComplete="email"
                                    autoFocus
                                />
                                {errors.email && <span className="form-error">{errors.email}</span>}
                            </div>
                            <button type="submit" className="auth-btn" disabled={loading}>
                                {loading ? <span className="auth-spinner" /> : "Send OTP"}
                            </button>
                        </form>
                    </>
                )}

                {/* ── Step 2: OTP ── */}
                {step === "otp" && (
                    <>
                        <h2 className="auth-title">Enter OTP</h2>
                        <p className="auth-subtitle">
                            A 6-digit code was sent to{" "}
                            <span className="fp-email-highlight">{email}</span>.
                            Valid for 10 minutes.
                        </p>
                        <form onSubmit={handleVerifyOtp} noValidate>
                            <div className="form-group">
                                <label className="form-label" htmlFor="fp-otp">6-Digit OTP</label>
                                <input
                                    id="fp-otp"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => {
                                        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                                        setOtp(v);
                                        if (errors.otp) setErrors({});
                                    }}
                                    className={`form-input fp-otp-input${errors.otp ? " form-input--error" : ""}`}
                                    placeholder="000000"
                                    autoFocus
                                />
                                {errors.otp && <span className="form-error">{errors.otp}</span>}
                            </div>
                            <button
                                type="submit"
                                className="auth-btn"
                                disabled={loading || otp.length !== 6}
                            >
                                {loading ? <span className="auth-spinner" /> : "Verify OTP"}
                            </button>
                        </form>
                        <p className="auth-switch">
                            Didn't receive it?{" "}
                            <button
                                type="button"
                                className="auth-link fp-text-btn"
                                onClick={() => { setOtp(""); setErrors({}); setMessage({ text: "", type: "" }); setStep("email"); }}
                            >
                                Resend OTP
                            </button>
                        </p>
                    </>
                )}

                {step === "password" && (
                    <>
                        <h2 className="auth-title">Set New Password</h2>
                        <p className="auth-subtitle">Choose a strong password for your account.</p>
                        <form onSubmit={handleResetPassword} noValidate>
                            <div className="form-group">
                                <label className="form-label" htmlFor="fp-newpw">New Password</label>
                                <input
                                    id="fp-newpw"
                                    type="password"
                                    value={newPassword}
                                    onChange={e => { setNewPassword(e.target.value); if (errors.newPassword) setErrors(p => ({ ...p, newPassword: "" })); }}
                                    className={`form-input${errors.newPassword ? " form-input--error" : ""}`}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    autoFocus
                                />
                                {errors.newPassword && <span className="form-error">{errors.newPassword}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="fp-confirmpw">Confirm Password</label>
                                <input
                                    id="fp-confirmpw"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: "" })); }}
                                    className={`form-input${errors.confirmPassword ? " form-input--error" : ""}`}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                            </div>
                            <button type="submit" className="auth-btn" disabled={loading}>
                                {loading ? <span className="auth-spinner" /> : "Reset Password"}
                            </button>
                        </form>
                    </>
                )}

                <p className="auth-switch">
                    Remember your password?{" "}
                    <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
