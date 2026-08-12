import "./Auth.css";

function ChangePassword() {
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

                <h2 className="auth-title">Set a New Password</h2>
                <p className="auth-subtitle">
                    Your account requires a password change before you can continue.
                </p>

                <p className="auth-subtitle" style={{ marginTop: "1.5rem", color: "#94a3b8" }}>
                    This feature will be available once the backend endpoint is connected.
                </p>
            </div>
        </div>
    );
}

export default ChangePassword;
