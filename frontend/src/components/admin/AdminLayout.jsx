import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, CreditCard, Zap, LogOut, Home
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tenants', path: '/admin/tenants', label: 'Huurders', icon: Users },
  { id: 'apartments', path: '/admin/apartments', label: 'Appartementen', icon: Building2 },
  { id: 'payments', path: '/admin/payments', label: 'Kwitanties', icon: CreditCard },
  { id: 'breakers', path: '/admin/breakers', label: 'Stroombrekers', icon: Zap },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const currentPath = location.pathname;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden flex flex-col bg-white" data-testid="admin-layout">
      {/* Top bar */}
      <div className="kiosk-topbar flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e3a8a] rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Beheerder
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3 mr-2">
              <div className="w-10 h-10 bg-[#1e3a8a] rounded-xl flex items-center justify-center text-white font-bold">
                {user.name?.charAt(0)}
              </div>
              <div className="hidden xl:block">
                <p className="text-sm font-bold text-[#0f172a]">{user.name}</p>
                <p className="text-xs text-[#94a3b8]">{user.email}</p>
              </div>
            </div>
          )}
          <a href={user?.company_id ? `/kiosk/${user.company_id}` : '/'} className="kiosk-btn-icon" data-testid="go-to-kiosk-link" title="Naar kiosk">
            <Home className="w-5 h-5" />
          </a>
          <button onClick={handleLogout} className="kiosk-btn-icon" data-testid="logout-btn" title="Uitloggen">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex-shrink-0 border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-3 flex gap-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/admin'
            ? currentPath === '/admin'
            : currentPath.startsWith(item.path);
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => navigate(item.path)}
              className={`kiosk-tab ${isActive ? 'kiosk-tab-active' : ''}`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 xl:p-8">
        <Outlet />
      </div>
    </div>
  );
}
