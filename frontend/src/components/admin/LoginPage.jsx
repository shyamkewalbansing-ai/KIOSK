import { Building2, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/admin', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/admin';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="kiosk-spinner" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white flex" data-testid="admin-login-page">
      {/* Left panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-12">
        <div className="w-20 h-20 bg-[#1e3a8a] rounded-3xl flex items-center justify-center mb-8">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl xl:text-5xl font-extrabold text-[#0f172a] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Beheerder Portaal
        </h1>
        <p className="text-lg text-[#94a3b8] mb-10">Log in om het dashboard te openen</p>

        <button
          data-testid="google-login-btn"
          onClick={handleLogin}
          className="kiosk-btn-primary"
        >
          <LogIn className="w-7 h-7 mr-3" />
          <span>Inloggen met Google</span>
        </button>

        <a href="/" className="mt-8 text-sm text-[#94a3b8] hover:text-[#1e3a8a] transition-colors">
          Terug naar kiosk
        </a>
      </div>

      {/* Right panel - decorative */}
      <div className="hidden lg:flex flex-1 bg-[#1e3a8a] rounded-tl-[60px] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 bg-white rounded-full" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#f97316] rounded-full" />
        </div>
        <div className="relative z-10 text-white text-center px-12">
          <Building2 className="w-24 h-24 mx-auto mb-8 opacity-90" />
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Appartement Kiosk
          </h2>
          <p className="text-lg opacity-80 max-w-sm mx-auto">
            Beheer huurders, appartementen en betalingen
          </p>
        </div>
      </div>
    </div>
  );
}
