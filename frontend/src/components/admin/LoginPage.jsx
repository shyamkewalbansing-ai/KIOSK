import { Building2, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/button';
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4" data-testid="admin-login-page">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-[#1e3a8a] rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Beheerder Portaal
            </h1>
            <p className="text-sm text-gray-500 mt-1">Log in om het dashboard te openen</p>
          </div>
        </div>

        {/* Login button */}
        <Button
          data-testid="google-login-btn"
          onClick={handleLogin}
          className="w-full h-14 text-base font-bold bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white rounded-xl shadow-md active:scale-95 transition-transform"
        >
          <LogIn className="w-5 h-5 mr-2" />
          Inloggen met Google
        </Button>

        {/* Back to kiosk */}
        <div className="text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Terug naar kiosk
          </a>
        </div>
      </div>
    </div>
  );
}
