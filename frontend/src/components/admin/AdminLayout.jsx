import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, CreditCard, Zap, LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const NAV_ITEMS = [
  { id: 'dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tenants', path: '/admin/tenants', label: 'Huurders', icon: Users },
  { id: 'apartments', path: '/admin/apartments', label: 'Appartementen', icon: Building2 },
  { id: 'payments', path: '/admin/payments', label: 'Betalingen', icon: CreditCard },
  { id: 'breakers', path: '/admin/breakers', label: 'Stroombrekers', icon: Zap },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex" data-testid="admin-layout">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#1e3a8a] text-white transform transition-transform lg:translate-x-0 lg:static ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="p-5 flex items-center gap-3 border-b border-white/10">
            <div className="w-8 h-8 bg-[#f97316] rounded-lg flex items-center justify-center font-bold text-sm">AK</div>
            <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Admin
            </span>
            <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/admin'
                ? currentPath === '/admin'
                : currentPath.startsWith(item.path);
              return (
                <button
                  key={item.id}
                  data-testid={`nav-${item.id}`}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* User + logout */}
          <div className="p-4 border-t border-white/10">
            {user && (
              <div className="flex items-center gap-3 mb-3">
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                    {user.name?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
              </div>
            )}
            <Button
              data-testid="logout-btn"
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-white/70 hover:text-white hover:bg-white/10 justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            data-testid="sidebar-toggle"
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {NAV_ITEMS.find(n => {
              if (n.path === '/admin') return currentPath === '/admin';
              return currentPath.startsWith(n.path);
            })?.label || 'Dashboard'}
          </h1>
          <div className="ml-auto">
            <a href="/" className="text-sm text-gray-400 hover:text-[#1e3a8a] transition-colors" data-testid="go-to-kiosk-link">
              Naar kiosk
            </a>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
