import { useState, useEffect } from 'react';
import { Shield, LogIn, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    axios.get(`${API}/superadmin/me`, { withCredentials: true })
      .then(() => navigate('/superadmin', { replace: true }))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axios.post(`${API}/superadmin/login`, { email, password }, { withCredentials: true });
      navigate('/superadmin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Inloggen mislukt');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return <div className="fixed inset-0 flex items-center justify-center bg-white"><div className="kiosk-spinner" /></div>;
  }

  return (
    <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center" data-testid="superadmin-login-page">
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl">
        <div className="w-16 h-16 bg-[#0f172a] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-[#f97316]" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#0f172a] text-center mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Super Admin
        </h1>
        <p className="text-sm text-[#94a3b8] text-center mb-8">Facturatie & Abonnementsbeheer</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" data-testid="sa-login-error">
              {error}
            </div>
          )}
          <input data-testid="sa-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="kiosk-input" placeholder="E-mailadres" required />
          <input data-testid="sa-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="kiosk-input" placeholder="Wachtwoord" required />
          <button data-testid="sa-login-btn" type="submit" disabled={submitting}
            className="w-full h-12 bg-[#0f172a] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1e293b] transition-colors">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {submitting ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>
        <Link to="/" className="block mt-6 text-center text-sm text-[#94a3b8] hover:text-[#0f172a] transition-colors">
          Terug naar hoofdpagina
        </Link>
      </div>
    </div>
  );
}
