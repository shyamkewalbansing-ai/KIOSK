import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Kiosk
import KioskLayout from "./components/kiosk/KioskLayout";

// Admin
import LoginPage from "./components/admin/LoginPage";
import AuthCallback from "./components/admin/AuthCallback";
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

function AppRouter() {
  const location = useLocation();

  // CRITICAL: Check URL fragment for session_id BEFORE rendering routes
  // This prevents race conditions with ProtectedRoute
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Kiosk (public) */}
      <Route path="/" element={<KioskLayout />} />

      {/* Admin auth */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Admin protected */}
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
