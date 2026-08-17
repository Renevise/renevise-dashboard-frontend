import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppContext }         from "./context/AppContext";
import { useAttendance }      from "./hooks/useAttendance";
import { useLeave }           from "./hooks/useLeave";
import { useNotifications }   from "./hooks/useNotifications";
import { useEmployees }       from "./hooks/useEmployees";
import { useCompanyOffs }    from "./hooks/useCompanyOffs";
import { useClientOffs }    from "./hooks/useClientOffs";
import SideBar        from "./components/SideBar";
import TopNavbar      from "./components/TopNavbar";
import Dashboard      from "./components/Dashboard";
import Attendance     from "./components/Attendance";
import Leave          from "./components/Leave";
import Login               from "./pages/Login";
import Register            from "./pages/Register";
import ChangePassword      from "./pages/ChangePassword";
import ForgotPassword      from "./pages/ForgotPassword";
import EmployeeManagement    from "./pages/EmployeeManagement";
import ApplyLeave            from "./pages/ApplyLeave";
import AttendanceCorrection  from "./pages/AttendanceCorrection";
import CorrectionManagement  from "./pages/CorrectionManagement";
import OvertimeManagement    from "./pages/OvertimeManagement";
import ReportOvertime        from "./pages/ReportOvertime";
import MyRequests            from "./pages/MyRequests";
import TeamReport            from "./pages/TeamReport";
import ClientOffManagement  from "./pages/ClientOffManagement";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getStoredUser() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function isAuthenticated() {
    return !!localStorage.getItem("token") && !!getStoredUser();
}

function AuthenticatedRoute({ children }) {
    return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function PrivateRoute({ children }) {
    if (!isAuthenticated()) return <Navigate to="/login" replace />;
    const user = getStoredUser();
    if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;
    return children;
}

function GuestRoute({ children }) {
    return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

function SetupRoute({ children }) {
    const [adminExists, setAdminExists] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/auth/setup-status`)
            .then((r) => r.json())
            .then((data) => setAdminExists(data.adminExists))
            .catch(() => setAdminExists(true)); 
    }, []);

    if (isAuthenticated()) return <Navigate to="/dashboard" replace />;
    if (adminExists === null) return null; 
    if (adminExists) return <Navigate to="/login" replace />;
    return children;
}

export function RoleRoute({ roles, children }) {
    const user = getStoredUser();
    if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return children;
}

function DashboardLayout({ attendance, leave, notifications, employees, companyOffs, clientOffs }) {
    const raw = getStoredUser();
    const currentEmployee = raw
        ? {
            ...raw,
            name: (raw.firstName && raw.lastName)
                ? `${raw.firstName} ${raw.lastName}`
                : raw.userName,
            id: raw.id ?? raw._id ?? "",
          }
        : null;

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    return (
        <AppContext.Provider value={{ attendance, leave, notifications, currentEmployee, employees, companyOffs, clientOffs, sidebarOpen, setSidebarOpen, closeSidebar }}>
            <div className="app-layout">
                <SideBar />
                <div className="main-content">
                    <TopNavbar />
                    <Outlet />
                </div>
            </div>
        </AppContext.Provider>
    );
}

function App() {
    const attendance    = useAttendance();
    const leave         = useLeave();
    const notifications = useNotifications();
    const { employees } = useEmployees();
    const companyOffs   = useCompanyOffs();
    const clientOffs    = useClientOffs();

    return (
        <Routes>

            <Route path="/register" element={<SetupRoute><Register /></SetupRoute>} />

            <Route path="/login"            element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/forgot-password"  element={<GuestRoute><ForgotPassword /></GuestRoute>} />

            <Route
                path="/change-password"
                element={<AuthenticatedRoute><ChangePassword /></AuthenticatedRoute>}
            />

            <Route
                element={
                    <PrivateRoute>
                        <DashboardLayout attendance={attendance} leave={leave} notifications={notifications} employees={employees} companyOffs={companyOffs} clientOffs={clientOffs} />
                    </PrivateRoute>
                }
            >
                <Route path="/"                      element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"             element={<Dashboard />} />
                <Route path="/attendance"            element={<Attendance />} />
                <Route path="/leave"                 element={<Leave />} />
                <Route path="/my-requests"           element={<MyRequests />} />
                <Route path="/apply-leave"           element={<ApplyLeave />} />
                <Route path="/attendance-correction" element={<AttendanceCorrection />} />
                <Route path="/report-overtime"       element={<ReportOvertime />} />

                <Route
                    path="/team-report"
                    element={<RoleRoute roles={["admin"]}><TeamReport /></RoleRoute>}
                />
                <Route
                    path="/employees"
                    element={<RoleRoute roles={["admin"]}><EmployeeManagement /></RoleRoute>}
                />
                <Route
                    path="/leave-management"
                    element={<RoleRoute roles={["admin"]}><Leave /></RoleRoute>}
                />
                <Route
                    path="/correction-management"
                    element={<RoleRoute roles={["admin"]}><CorrectionManagement /></RoleRoute>}
                />
                <Route
                    path="/overtime-management"
                    element={<RoleRoute roles={["admin"]}><OvertimeManagement /></RoleRoute>}
                />
                <Route
                    path="/client-off-management"
                    element={<RoleRoute roles={["admin"]}><ClientOffManagement /></RoleRoute>}
                />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export default App;
