import { useState, useEffect } from 'react';
import { Building2, ArrowRight, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CompanySelect() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/companies/public`).then(res => {
      setCompanies(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && companies.length === 1) {
      navigate(`/kiosk/${companies[0].company_id}`, { replace: true });
    }
  }, [loading, companies, navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="kiosk-spinner" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col" data-testid="company-select">
      <div className="kiosk-topbar">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f97316] rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Appartement Kiosk
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-base text-[#94a3b8]">
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <a
            href="/admin/login"
            data-testid="admin-login-link"
            className="kiosk-btn-icon w-11 h-11 opacity-40 hover:opacity-100 transition-opacity"
            title="Beheerder"
          >
            <Settings className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <h1 className="text-4xl xl:text-5xl font-extrabold text-[#0f172a] mb-3 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Kies uw gebouw
        </h1>
        <p className="text-lg text-[#94a3b8] mb-10 text-center">
          Selecteer het vastgoedbedrijf waarvoor u wilt betalen
        </p>

        {companies.length === 0 ? (
          <div className="bg-[#f8fafc] rounded-2xl border-2 border-[#e2e8f0] p-12 text-center max-w-md">
            <Building2 className="w-16 h-16 text-[#94a3b8] mx-auto mb-4" />
            <p className="text-[#94a3b8] text-lg mb-4">Geen bedrijven beschikbaar</p>
            <a href="/register" className="text-[#1e3a8a] font-bold hover:underline" data-testid="register-company-link">
              Registreer uw bedrijf
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
            {companies.map((c) => (
              <button
                key={c.company_id}
                data-testid={`company-btn-${c.company_id}`}
                onClick={() => navigate(`/kiosk/${c.company_id}`)}
                className="bg-white rounded-3xl border-2 border-[#e2e8f0] p-8 text-left hover:border-[#1e3a8a] hover:shadow-lg transition-all group"
              >
                <div className="w-16 h-16 bg-[#1e3a8a] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#f97316] transition-colors">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-[#0f172a] mb-1">{c.name}</h3>
                {c.address && <p className="text-sm text-[#94a3b8]">{c.address}</p>}
                <div className="flex items-center gap-2 mt-4 text-[#1e3a8a] font-bold text-sm group-hover:text-[#f97316] transition-colors">
                  <span>Selecteren</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
