import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Building2, Keyboard } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ApartmentSelect({ onBack, onSelect }) {
  const [mode, setMode] = useState('grid');
  const [apartments, setApartments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aptRes, tenRes] = await Promise.all([
          axios.get(`${API}/apartments`),
          axios.get(`${API}/tenants`)
        ]);
        setApartments(aptRes.data);
        setTenants(tenRes.data);
      } catch {
        setError('Kon gegevens niet laden');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApartmentClick = (apt) => {
    const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
    if (!tenant) {
      setError('Geen actieve huurder gevonden voor dit appartement');
      return;
    }
    setError('');
    onSelect(tenant);
  };

  const handleCodeSearch = async () => {
    if (!searchCode.trim()) return;
    setError('');
    try {
      const res = await axios.get(`${API}/tenants/lookup/${searchCode.trim()}`);
      onSelect(res.data);
    } catch {
      setError('Huurder niet gevonden. Controleer uw code.');
    }
  };

  const handleKeypadPress = (val) => {
    if (val === 'DEL') {
      setSearchCode(prev => prev.slice(0, -1));
    } else if (val === 'OK') {
      handleCodeSearch();
    } else {
      setSearchCode(prev => prev + val);
    }
  };

  if (loading) {
    return (
      <div className="kiosk-root bg-white flex items-center justify-center">
        <div className="kiosk-spinner" />
      </div>
    );
  }

  return (
    <div className="kiosk-root bg-white flex flex-col" data-testid="apartment-select">
      {/* Top bar */}
      <div className="kiosk-topbar">
        <div className="flex items-center gap-4">
          <button
            data-testid="back-to-welcome-btn"
            onClick={onBack}
            className="kiosk-btn-icon"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl xl:text-3xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Kies uw appartement
          </h1>
        </div>
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            data-testid="mode-grid-btn"
            onClick={() => { setMode('grid'); setError(''); }}
            className={`kiosk-tab ${mode === 'grid' ? 'kiosk-tab-active' : ''}`}
          >
            <Building2 className="w-5 h-5 mr-2" />
            Appartement
          </button>
          <button
            data-testid="mode-code-btn"
            onClick={() => { setMode('code'); setError(''); }}
            className={`kiosk-tab ${mode === 'code' ? 'kiosk-tab-active' : ''}`}
          >
            <Keyboard className="w-5 h-5 mr-2" />
            Huurderscode
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-8 mt-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl px-6 py-4 text-lg font-medium" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {mode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {apartments.map((apt) => {
              const hasTenant = tenants.some(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              return (
                <button
                  key={apt.apartment_id}
                  data-testid={`apt-btn-${apt.number}`}
                  onClick={() => handleApartmentClick(apt)}
                  disabled={!hasTenant}
                  className={`kiosk-apt-card ${hasTenant ? 'kiosk-apt-card-active' : 'kiosk-apt-card-disabled'}`}
                >
                  <span className="text-3xl xl:text-4xl font-extrabold">{apt.number}</span>
                  <span className="text-sm mt-2 opacity-70">
                    {hasTenant ? tenant?.name : 'Leegstaand'}
                  </span>
                  <span className={`mt-2 text-xs font-bold px-3 py-1 rounded-full ${
                    hasTenant ? 'bg-[#dcfce7] text-[#166534]' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {hasTenant ? 'Bewoond' : 'Leeg'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto mt-8">
            <p className="text-lg text-[#64748b] mb-6 text-center">
              Voer uw huurderscode of appartementnummer in
            </p>
            {/* Display */}
            <div className="bg-[#f1f5f9] rounded-2xl border-2 border-[#e2e8f0] p-6 text-center mb-6">
              <span className="text-4xl font-extrabold tracking-[0.3em] text-[#0f172a] font-mono" data-testid="code-display">
                {searchCode || '_ _ _ _ _'}
              </span>
            </div>
            {/* Keypad */}
            <div className="keypad-grid gap-3">
              {['A', 'B', 'C', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'].map((key) => (
                <button
                  key={key}
                  data-testid={`keypad-${key}`}
                  onClick={() => handleKeypadPress(key)}
                  className={`kiosk-keypad-btn ${
                    key === 'OK' ? 'bg-[#f97316] text-white hover:bg-[#ea580c]' :
                    key === 'DEL' ? 'bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca]' :
                    'bg-white text-[#0f172a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
