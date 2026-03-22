import { useState } from 'react';
import { Building2, UserPlus, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function CompanyRegister() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens bevatten');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registratie mislukt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex" data-testid="company-register-page">
      <div className="flex-1 flex flex-col items-center justify-center px-12 overflow-auto py-12">
        <div className="w-20 h-20 bg-[#f97316] rounded-3xl flex items-center justify-center mb-8">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl xl:text-5xl font-extrabold text-[#0f172a] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Bedrijf Registreren
        </h1>
        <p className="text-lg text-[#94a3b8] mb-4">Maak een account aan voor uw vastgoedbedrijf</p>

        <div className="w-full max-w-md bg-[#eff6ff] border-2 border-[#bfdbfe] rounded-2xl px-6 py-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#1e3a8a]">Maandabonnement</span>
            <span className="text-2xl font-extrabold text-[#1e3a8a]">SRD 3.500</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#1e3a8a]/80">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span><strong>3 dagen gratis</strong> proefperiode</span>
          </div>
          <p className="text-xs text-[#1e3a8a]/60 mt-1">Na de proefperiode betaalt u via bankoverschrijving.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl px-6 py-4 text-base font-medium" data-testid="register-error">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">Bedrijfsnaam *</label>
            <input data-testid="register-name-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
              className="kiosk-input" placeholder="Vastgoed BV" required />
          </div>
          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">E-mailadres *</label>
            <input data-testid="register-email-input" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
              className="kiosk-input" placeholder="info@bedrijf.sr" required />
          </div>
          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">Wachtwoord *</label>
            <input data-testid="register-password-input" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})}
              className="kiosk-input" placeholder="Minimaal 6 tekens" required />
          </div>
          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">Adres</label>
            <input data-testid="register-address-input" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}
              className="kiosk-input" placeholder="Straat, Stad" />
          </div>
          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">Telefoon</label>
            <input data-testid="register-phone-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
              className="kiosk-input" placeholder="+597 ..." />
          </div>
          <button data-testid="register-submit-btn" type="submit" disabled={submitting}
            className="kiosk-btn-primary w-full justify-center">
            {submitting ? (
              <><Loader2 className="w-6 h-6 mr-2 animate-spin" />Registreren...</>
            ) : (
              <><UserPlus className="w-6 h-6 mr-2" />Bedrijf Registreren</>
            )}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#94a3b8]">
          Al een account?{' '}
          <Link to="/admin/login" className="text-[#1e3a8a] font-bold hover:underline" data-testid="login-link">
            Inloggen
          </Link>
        </div>
        <Link to="/" className="mt-4 text-sm text-[#94a3b8] hover:text-[#1e3a8a] transition-colors">
          Terug naar kiosk
        </Link>
      </div>

      <div className="hidden lg:flex flex-1 bg-[#f97316] rounded-tl-[60px] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 bg-white rounded-full" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#1e3a8a] rounded-full" />
        </div>
        <div className="relative z-10 text-white text-center px-12">
          <Building2 className="w-24 h-24 mx-auto mb-8 opacity-90" />
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Multi-Tenant Platform
          </h2>
          <p className="text-lg opacity-80 max-w-sm mx-auto">
            Beheer meerdere panden met één platform
          </p>
        </div>
      </div>
    </div>
  );
}
