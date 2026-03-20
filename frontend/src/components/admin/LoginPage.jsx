import { useState, useEffect } from 'react';
import { Building2, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/admin', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Inloggen mislukt');
    } finally {
      setSubmitting(false);
    }
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
      <div className="flex-1 flex flex-col items-center justify-center px-12">
        <div className="w-20 h-20 bg-[#1e3a8a] rounded-3xl flex items-center justify-center mb-8">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl xl:text-5xl font-extrabold text-[#0f172a] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Beheerder Portaal
        </h1>
        <p className="text-lg text-[#94a3b8] mb-10">Log in met uw bedrijfsaccount</p>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl px-6 py-4 text-base font-medium" data-testid="login-error">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">E-mailadres</label>
            <input
              data-testid="login-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="kiosk-input"
              placeholder="email@bedrijf.sr"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">Wachtwoord</label>
            <input
              data-testid="login-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="kiosk-input"
              placeholder="Wachtwoord"
              required
            />
          </div>
          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={submitting}
            className="kiosk-btn-primary w-full justify-center"
          >
            {submitting ? (
              <><Loader2 className="w-6 h-6 mr-2 animate-spin" />Inloggen...</>
            ) : (
              <><LogIn className="w-6 h-6 mr-2" />Inloggen</>
            )}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#94a3b8]">
          Nog geen account?{' '}
          <Link to="/register" className="text-[#1e3a8a] font-bold hover:underline" data-testid="register-link">
            Registreer uw bedrijf
          </Link>
        </div>
        <Link to="/" className="mt-4 text-sm text-[#94a3b8] hover:text-[#1e3a8a] transition-colors">
          Terug naar kiosk
        </Link>
      </div>

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
