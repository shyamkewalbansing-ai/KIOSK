import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

import KioskLayout from "./components/kiosk/KioskLayout";
import CompanySelect from "./components/kiosk/CompanySelect";
import LoginPage from "./components/admin/LoginPage";
import CompanyRegister from "./components/admin/CompanyRegister";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./components/admin/Dashboard";
import TenantManagement from "./components/admin/TenantManagement";
import ApartmentManagement from "./components/admin/ApartmentManagement";
import PaymentHistory from "./components/admin/PaymentHistory";
import TuyaBreakerPanel from "./components/admin/TuyaBreakerPanel";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<CompanySelect />} />
          <Route path="/kiosk/:companyId" element={<KioskLayout />} />
          <Route path="/register" element={<CompanyRegister />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="tenants" element={<TenantManagement />} />
            <Route path="apartments" element={<ApartmentManagement />} />
            <Route path="payments" element={<PaymentHistory />} />
            <Route path="breakers" element={<TuyaBreakerPanel />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
