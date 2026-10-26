import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaPlus, FaEdit, FaTrash, FaUsers, FaUserShield,
    FaUser, FaTimes, FaCheckCircle, FaExclamationTriangle, FaEye, FaEyeSlash,
} from "react-icons/fa";
import "./EmployeeManagement.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const DEPARTMENTS = ["ServiceNow", "Web Development", "App Development", "AI Content Creation", "Digital Marketing"];
const EMPTY_FORM = { firstName: "", lastName: "", email: "", password: "", role: "employee", department: "" };

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

function EmployeeManagement() {
    const navigate = useNavigate();

    const [employees,  setEmployees]  = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [pageError,  setPageError]  = useState("");
    const [toast,      setToast]      = useState({ text: "", type: "" });

    const [modal,      setModal]      = useState({ open: false, mode: "add", employee: null });
    const [form,       setForm]       = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [formApiErr, setFormApiErr] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [confirmDel, setConfirmDel] = useState({ open: false, employee: null });
    const [deleting,   setDeleting]   = useState(false);
    const [showEmpPw,  setShowEmpPw]  = useState(false);

    const [deptFilter, setDeptFilter] = useState("");

    function showToast(text, type = "success") {
        setToast({ text, type });
        setTimeout(() => setToast({ text: "", type: "" }), 3500);
    }

    function handleUnauth() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    }

    async function apiFetch(path, options = {}) {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    ...(options.headers || {}),
                },
            });
            if (res.status === 401) { handleUnauth(); return null; }
            return res;
        } catch {
            return null;
        }
    }

    async function loadEmployees() {
        setLoading(true);
        setPageError("");
        const res = await apiFetch("/api/employees");
        if (!res) { setLoading(false); return; }

        const data = await res.json();
        if (res.ok) {
            setEmployees(data.employees || []);
        } else if (res.status === 403) {
            setPageError("Access Denied. You do not have permission to manage employees.");
        } else {
            setPageError(data.message || "Failed to load employees.");
        }
        setLoading(false);
    }

    useEffect(() => { loadEmployees(); }, []);

    function openAdd() {
        setForm(EMPTY_FORM);
        setFormErrors({});
        setFormApiErr("");
        setShowEmpPw(false);
        setModal({ open: true, mode: "add", employee: null });
    }

    function openEdit(emp) {
        setForm({
            firstName:  emp.firstName || "",
            lastName:   emp.lastName  || "",
            email:      emp.email,
            password:   "",
            role:       emp.role,
            department: emp.department || "",
        });
        setFormErrors({});
        setFormApiErr("");
        setShowEmpPw(false);
        setModal({ open: true, mode: "edit", employee: emp });
    }

    function closeModal() {
        if (submitting) return;
        setModal({ open: false, mode: "add", employee: null });
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (name === "email" && formErrors.email) {
            setFormErrors(prev => ({ ...prev, email: validateEmailField(value) }));
        } else if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: "" }));
        }
    }

    function handleEmailBlur() {
        setFormErrors(prev => ({ ...prev, email: validateEmailField(form.email) }));
    }

    function validateForm() {
        const errs = {};
        if (!form.firstName.trim()) errs.firstName = "First name is required";
        else if (form.firstName.trim().length < 2) errs.firstName = "Must be at least 2 characters";
        if (!form.lastName.trim()) errs.lastName = "Last name is required";
        else if (form.lastName.trim().length < 2) errs.lastName = "Must be at least 2 characters";
        const emailErr = validateEmailField(form.email);
        if (emailErr) errs.email = emailErr;
        if (modal.mode === "add") {
            if (!form.password) errs.password = "Password is required";
            else if (form.password.length < 6) errs.password = "Password must be at least 6 characters";
        }
        if (!form.role) errs.role = "Role is required";
        if (!form.department) errs.department = "Department is required";
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validateForm();
        if (Object.keys(errs).length) { setFormErrors(errs); return; }

        setSubmitting(true);
        setFormApiErr("");

        const isEdit = modal.mode === "edit";
        const path   = isEdit ? `/api/employees/${modal.employee._id}` : "/api/employees";
        const method = isEdit ? "PUT" : "POST";
        const body   = isEdit
            ? { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), role: form.role, department: form.department }
            : { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), password: form.password, role: form.role, department: form.department };

        const res = await apiFetch(path, { method, body: JSON.stringify(body) });
        if (!res) { setSubmitting(false); return; }

        const data = await res.json();

        if (res.ok) {
            closeModal();
            showToast(isEdit ? "Employee updated successfully." : "Employee created successfully.");
            loadEmployees();
        } else if (res.status === 403) {
            setFormApiErr("Access denied. Admin permission required.");
        } else {
            setFormApiErr(data.message || "Something went wrong. Please try again.");
        }

        setSubmitting(false);
    }

    function openConfirmDelete(emp) {
        setConfirmDel({ open: true, employee: emp });
    }

    function closeConfirmDelete() {
        if (deleting) return;
        setConfirmDel({ open: false, employee: null });
    }

    async function handleDelete() {
        setDeleting(true);
        const res = await apiFetch(`/api/employees/${confirmDel.employee._id}`, { method: "DELETE" });

        closeConfirmDelete();
        setDeleting(false);

        if (!res) return;

        const data = await res.json();
        if (res.ok) {
            showToast("Employee deleted successfully.");
            loadEmployees();
        } else if (res.status === 403) {
            showToast("Access denied. Admin permission required.", "error");
        } else {
            showToast(data.message || "Delete failed. Please try again.", "error");
        }
    }

    const filteredEmployees = deptFilter
        ? employees.filter(e => e.department === deptFilter)
        : employees;

    const totalCount = filteredEmployees.length;
    const adminCount = filteredEmployees.filter(e => e.role === "admin").length;
    const empCount   = filteredEmployees.filter(e => e.role === "employee").length;

    const usernamePreview = previewUserName(form.firstName, form.lastName);

    return (
        <div className="emp-page">

            {toast.text && (
                <div className={`emp-toast emp-toast--${toast.type}`}>
                    {toast.type === "success"
                        ? <FaCheckCircle size={13} />
                        : <FaExclamationTriangle size={13} />
                    }
                    {toast.text}
                </div>
            )}

            <div className="emp-page-header">
                <div>
                    <h2 className="emp-page-title">Employee Management</h2>
                    <p className="emp-page-sub">Manage your organisation's team members</p>
                </div>
                <button className="emp-add-btn" onClick={openAdd}>
                    <FaPlus size={11} /> Add Employee
                </button>
            </div>

            {/* Stat cards */}
            <div className="emp-stats-row">
                <div className="emp-stat-card" style={{ "--glow": "rgba(62,107,255,0.25)" }}>
                    <div className="emp-stat-icon" style={{ background: "rgba(62,107,255,0.15)", boxShadow: "0 0 16px rgba(62,107,255,0.25)" }}>
                        <FaUsers size={20} style={{ color: "#3E6BFF" }} />
                    </div>
                    <div>
                        <div className="emp-stat-value">{totalCount}</div>
                        <div className="emp-stat-label">Total Members</div>
                        <div className="emp-stat-sub">all roles</div>
                    </div>
                </div>

                <div className="emp-stat-card" style={{ "--glow": "rgba(94,168,255,0.2)" }}>
                    <div className="emp-stat-icon" style={{ background: "rgba(94,168,255,0.12)", boxShadow: "0 0 16px rgba(94,168,255,0.18)" }}>
                        <FaUserShield size={20} style={{ color: "#5EA8FF" }} />
                    </div>
                    <div>
                        <div className="emp-stat-value">{adminCount}</div>
                        <div className="emp-stat-label">Admins</div>
                        <div className="emp-stat-sub">admin accounts</div>
                    </div>
                </div>

                <div className="emp-stat-card" style={{ "--glow": "rgba(16,185,129,0.2)" }}>
                    <div className="emp-stat-icon" style={{ background: "rgba(16,185,129,0.12)", boxShadow: "0 0 16px rgba(16,185,129,0.18)" }}>
                        <FaUser size={20} style={{ color: "#10B981" }} />
                    </div>
                    <div>
                        <div className="emp-stat-value">{empCount}</div>
                        <div className="emp-stat-label">Employees</div>
                        <div className="emp-stat-sub">employee accounts</div>
                    </div>
                </div>
            </div>

            {/* Table card */}
            <div className="emp-table-card">
                <div className="emp-table-card-header">
                    <div>
                        <h3 className="card-title">Team Members</h3>
                        <p className="card-sub">{totalCount} total {totalCount === 1 ? "member" : "members"}</p>
                    </div>
                    <select
                        className="emp-dept-filter"
                        value={deptFilter}
                        onChange={e => setDeptFilter(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                {loading && <div className="emp-state-msg">Loading employees…</div>}

                {!loading && pageError && (
                    <div className="emp-state-msg emp-state-msg--error">{pageError}</div>
                )}

                {!loading && !pageError && employees.length === 0 && (
                    <div className="emp-state-msg">
                        No team members yet. Click <strong>Add Employee</strong> to get started.
                    </div>
                )}

                {!loading && !pageError && employees.length > 0 && (
                    <div className="emp-table-wrap">
                        <table className="emp-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Department</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="emp-state-msg">
                                            No employees in this department.
                                        </td>
                                    </tr>
                                ) : filteredEmployees.map(emp => (
                                    <tr key={emp._id}>
                                        <td className="emp-td-name">
                                            {emp.firstName && emp.lastName
                                                ? `${emp.firstName} ${emp.lastName}`
                                                : emp.userName}
                                            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                                                {emp.userName}
                                            </div>
                                        </td>
                                        <td className="emp-td-email">{emp.email}</td>
                                        <td className="emp-td-dept">{emp.department || "—"}</td>
                                        <td>
                                            <span className={`role-badge role-badge--${emp.role}`}>
                                                {emp.role === "admin" ? "Admin" : "Employee"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="emp-row-actions">
                                                <button className="emp-edit-btn" onClick={() => openEdit(emp)}>
                                                    <FaEdit size={12} /> Edit
                                                </button>
                                                <button className="emp-delete-btn" onClick={() => openConfirmDelete(emp)}>
                                                    <FaTrash size={11} /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Add / Edit Modal ── */}
            {modal.open && (
                <div className="emp-overlay" onClick={closeModal}>
                    <div className="emp-modal" onClick={e => e.stopPropagation()}>

                        <div className="emp-modal-header">
                            <h3 className="emp-modal-title">
                                {modal.mode === "add" ? "Add Employee" : "Edit Employee"}
                            </h3>
                            <button className="emp-modal-close" onClick={closeModal} disabled={submitting}>
                                <FaTimes size={14} />
                            </button>
                        </div>

                        {formApiErr && <div className="emp-api-error">{formApiErr}</div>}

                        <form onSubmit={handleSubmit} noValidate>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                                <div className="emp-form-group">
                                    <label className="emp-form-label">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={form.firstName}
                                        onChange={handleChange}
                                        className={`emp-form-input${formErrors.firstName ? " emp-input-error" : ""}`}
                                        placeholder="Abdul"
                                        autoComplete="off"
                                    />
                                    {formErrors.firstName && (
                                        <span className="emp-field-error">{formErrors.firstName}</span>
                                    )}
                                </div>

                                <div className="emp-form-group">
                                    <label className="emp-form-label">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={form.lastName}
                                        onChange={handleChange}
                                        className={`emp-form-input${formErrors.lastName ? " emp-input-error" : ""}`}
                                        placeholder="Ahad"
                                        autoComplete="off"
                                    />
                                    {formErrors.lastName && (
                                        <span className="emp-field-error">{formErrors.lastName}</span>
                                    )}
                                </div>
                            </div>

                            {usernamePreview && (
                                <div className="emp-form-group" style={{ marginTop: "-4px" }}>
                                    <p style={{ fontSize: "12px", color: "#888", margin: "0 0 10px" }}>
                                        Username:{" "}
                                        <strong style={{ color: "#5EA8FF" }}>{usernamePreview}</strong>
                                    </p>
                                </div>
                            )}

                            <div className="emp-form-group">
                                <label className="emp-form-label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    onBlur={handleEmailBlur}
                                    className={`emp-form-input${formErrors.email ? " emp-input-error" : ""}`}
                                    placeholder="user@gmail.com"
                                    autoComplete="off"
                                />
                                {formErrors.email && (
                                    <span className="emp-field-error">{formErrors.email}</span>
                                )}
                            </div>

                            {modal.mode === "add" && (
                                <div className="emp-form-group">
                                    <label className="emp-form-label">Temporary Password</label>
                                    <div className="pw-field">
                                        <input
                                            type={showEmpPw ? "text" : "password"}
                                            name="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            className={`emp-form-input${formErrors.password ? " emp-input-error" : ""}`}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                        />
                                        <button type="button" className="pw-toggle" onClick={() => setShowEmpPw(p => !p)} tabIndex={-1} aria-label={showEmpPw ? "Hide password" : "Show password"}>
                                            {showEmpPw ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                                        </button>
                                    </div>
                                    {formErrors.password && (
                                        <span className="emp-field-error">{formErrors.password}</span>
                                    )}
                                </div>
                            )}

                            <div className="emp-form-group">
                                <label className="emp-form-label">Role</label>
                                <select
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    className={`emp-form-select${formErrors.role ? " emp-input-error" : ""}`}
                                >
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                </select>
                                {formErrors.role && (
                                    <span className="emp-field-error">{formErrors.role}</span>
                                )}
                            </div>

                            <div className="emp-form-group">
                                <label className="emp-form-label">Department</label>
                                <select
                                    name="department"
                                    value={form.department}
                                    onChange={handleChange}
                                    className={`emp-form-select${formErrors.department ? " emp-input-error" : ""}`}
                                >
                                    <option value="">Select department</option>
                                    {DEPARTMENTS.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                {formErrors.department && (
                                    <span className="emp-field-error">{formErrors.department}</span>
                                )}
                            </div>

                            <div className="emp-modal-footer">
                                <button
                                    type="button"
                                    className="emp-cancel-btn"
                                    onClick={closeModal}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="emp-submit-btn"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? <span className="emp-spinner" />
                                        : (modal.mode === "add" ? "Create Employee" : "Save Changes")
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation ── */}
            {confirmDel.open && (
                <div className="emp-overlay" onClick={closeConfirmDelete}>
                    <div className="emp-modal emp-modal--sm" onClick={e => e.stopPropagation()}>
                        <div className="emp-confirm-icon-wrap">
                            <FaTrash size={22} style={{ color: "#EF4444" }} />
                        </div>
                        <h3 className="emp-confirm-title">Delete Employee</h3>
                        <p className="emp-confirm-msg">
                            Are you sure you want to delete{" "}
                            <strong>
                                {confirmDel.employee?.firstName && confirmDel.employee?.lastName
                                    ? `${confirmDel.employee.firstName} ${confirmDel.employee.lastName}`
                                    : confirmDel.employee?.userName}
                            </strong>?{" "}
                            This action cannot be undone.
                        </p>
                        <div className="emp-modal-footer emp-modal-footer--center">
                            <button
                                className="emp-cancel-btn"
                                onClick={closeConfirmDelete}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="emp-danger-btn"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? <span className="emp-spinner" /> : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeeManagement;
