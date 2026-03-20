import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Hash } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ApartmentSelect({ onBack, onSelect }) {
  const [mode, setMode] = useState('grid'); // 'grid' or 'code'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="apartment-select">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          data-testid="back-to-welcome-btn"
          variant="ghost"
          onClick={onBack}
          className="h-12 w-12 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Kies uw appartement
        </h2>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          data-testid="mode-grid-btn"
          onClick={() => setMode('grid')}
          className={`flex-1 h-14 text-base font-bold rounded-xl transition-transform active:scale-95 ${
            mode === 'grid'
              ? 'bg-[#1e3a8a] text-white'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Hash className="w-5 h-5 mr-2" />
          Appartement Nr.
        </Button>
        <Button
          data-testid="mode-code-btn"
          onClick={() => setMode('code')}
          className={`flex-1 h-14 text-base font-bold rounded-xl transition-transform active:scale-95 ${
            mode === 'code'
              ? 'bg-[#1e3a8a] text-white'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Search className="w-5 h-5 mr-2" />
          Huurderscode
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" data-testid="error-message">
          {error}
        </div>
      )}

      {mode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {apartments.map((apt) => {
            const hasTenant = tenants.some(t => t.apartment_id === apt.apartment_id && t.status === 'active');
            return (
              <button
                key={apt.apartment_id}
                data-testid={`apt-btn-${apt.number}`}
                onClick={() => handleApartmentClick(apt)}
                disabled={!hasTenant}
                className={`p-4 rounded-xl border-2 text-center transition-all active:scale-95 ${
                  hasTenant
                    ? 'bg-white border-gray-200 hover:border-[#1e3a8a] hover:shadow-md cursor-pointer'
                    : 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="block text-2xl font-bold text-[#1e3a8a]">{apt.number}</span>
                <span className="block text-xs text-gray-500 mt-1">
                  {hasTenant ? 'Bewoond' : 'Leeg'}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Voer uw huurderscode in (bijv. HUR001) of appartementnummer (bijv. A101)</p>
          <Input
            data-testid="tenant-code-input"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleCodeSearch()}
            placeholder="HUR001 of A101"
            className="h-14 text-lg px-4 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:border-[#1e3a8a] text-center font-bold tracking-widest"
          />
          <Button
            data-testid="search-tenant-btn"
            onClick={handleCodeSearch}
            className="w-full h-16 text-xl font-bold bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl shadow-md active:scale-95 transition-transform"
          >
            <Search className="w-6 h-6 mr-3" />
            Zoeken
          </Button>
        </div>
      )}
    </div>
  );
}
