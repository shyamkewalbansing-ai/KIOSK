import { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function StampPreview({ stamp, scale = 1 }) {
  const s = scale;
  const hasContent = stamp.stamp_company_name || stamp.stamp_address || stamp.stamp_phone || stamp.stamp_whatsapp;

  return (
    <div
      data-testid="stamp-preview"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${10 * s}px`,
        border: `${2 * s}px solid #8B1A1A`,
        padding: `${8 * s}px ${14 * s}px`,
        background: 'white',
      }}
    >
      {/* House Icon SVG */}
      <svg
        width={`${52 * s}`}
        height={`${48 * s}`}
        viewBox="0 0 52 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Back house */}
        <rect x="18" y="18" width="28" height="24" fill="#8B1A1A" />
        <polygon points="18,18 32,4 46,18" fill="#8B1A1A" />
        {/* Chimney */}
        <rect x="22" y="6" width="5" height="10" fill="#8B1A1A" />
        {/* Front house */}
        <rect x="4" y="22" width="24" height="22" fill="#8B1A1A" />
        <polygon points="4,22 16,10 28,22" fill="#8B1A1A" />
        {/* Windows back house */}
        <rect x="34" y="24" width="6" height="6" fill="white" />
        <rect x="34" y="34" width="6" height="6" fill="white" />
        {/* Windows front house */}
        <rect x="8" y="28" width="6" height="6" fill="white" />
        <rect x="18" y="28" width="6" height="6" fill="white" />
        <rect x="8" y="38" width="6" height="6" fill="white" />
        <rect x="18" y="38" width="6" height="6" fill="white" />
      </svg>
      {/* Text lines */}
      {hasContent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${1 * s}px` }}>
          {stamp.stamp_company_name && (
            <span style={{ fontSize: `${11 * s}px`, fontWeight: 700, color: '#8B1A1A', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
              {stamp.stamp_company_name}
            </span>
          )}
          {stamp.stamp_address && (
            <span style={{ fontSize: `${10 * s}px`, color: '#8B1A1A', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
              {stamp.stamp_address}
            </span>
          )}
          {stamp.stamp_phone && (
            <span style={{ fontSize: `${10 * s}px`, color: '#8B1A1A', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
              Tel : {stamp.stamp_phone}
            </span>
          )}
          {stamp.stamp_whatsapp && (
            <span style={{ fontSize: `${10 * s}px`, color: '#8B1A1A', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
              Whatsapp : {stamp.stamp_whatsapp}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { StampPreview };

export default function CompanySettings() {
  const [settings, setSettings] = useState({
    billing_day_of_month: 1,
    late_fee_amount: 0,
    stamp_company_name: '',
    stamp_address: '',
    stamp_phone: '',
    stamp_whatsapp: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/company/settings`, { withCredentials: true });
        setSettings(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/company/settings`, {
        billing_day_of_month: parseInt(settings.billing_day_of_month) || 1,
        late_fee_amount: parseFloat(settings.late_fee_amount) || 0,
        stamp_company_name: settings.stamp_company_name || '',
        stamp_address: settings.stamp_address || '',
        stamp_phone: settings.stamp_phone || '',
        stamp_whatsapp: settings.stamp_whatsapp || '',
      }, { withCredentials: true });
      toast.success('Instellingen opgeslagen');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij opslaan');
    }
    setSaving(false);
  };

  const handleApplyLateFees = async () => {
    if (!window.confirm('Weet u zeker dat u boetes wilt toepassen op alle huurders met openstaande huur?')) return;
    try {
      const res = await axios.post(`${API}/company/apply-late-fees`, {}, { withCredentials: true });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij toepassen boetes');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="kiosk-spinner" /></div>;
  }

  return (
    <div className="space-y-8 max-w-3xl" data-testid="company-settings">
      {/* Billing Settings */}
      <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#eff6ff] rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-[#1e3a8a]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Facturering & Boetes
            </h2>
            <p className="text-sm text-[#94a3b8]">Configureer wanneer huur vervalt en het boetebedrag</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">Huur vervalt op dag</label>
            <p className="text-xs text-[#94a3b8] mb-2">De dag van de maand waarop de huur betaald moet zijn (1-28)</p>
            <input
              data-testid="billing-day-input"
              type="number"
              min="1"
              max="28"
              value={settings.billing_day_of_month}
              onChange={(e) => setSettings({ ...settings, billing_day_of_month: e.target.value })}
              className="kiosk-input max-w-[200px]"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-[#64748b] mb-1 block">Boetebedrag (SRD)</label>
            <p className="text-xs text-[#94a3b8] mb-2">Vast bedrag dat eenmalig wordt toegevoegd bij te late betaling</p>
            <input
              data-testid="late-fee-input"
              type="number"
              min="0"
              step="0.01"
              value={settings.late_fee_amount}
              onChange={(e) => setSettings({ ...settings, late_fee_amount: e.target.value })}
              className="kiosk-input max-w-[200px]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              data-testid="save-settings-btn"
              onClick={handleSaveSettings}
              disabled={saving}
              className="kiosk-btn-primary h-12 px-6 text-base"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
            <button
              data-testid="apply-late-fees-btn"
              onClick={handleApplyLateFees}
              className="kiosk-btn-secondary h-12 px-6 text-base border-[#fbbf24] text-[#92400e] hover:bg-[#fef3c7]"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Boetes nu toepassen
            </button>
          </div>
        </div>
      </div>

      {/* Stamp Configuration */}
      <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#fef2f2] rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 52 48" fill="none">
              <rect x="18" y="18" width="28" height="24" fill="#8B1A1A" />
              <polygon points="18,18 32,4 46,18" fill="#8B1A1A" />
              <rect x="4" y="22" width="24" height="22" fill="#8B1A1A" />
              <polygon points="4,22 16,10 28,22" fill="#8B1A1A" />
              <rect x="34" y="24" width="6" height="6" fill="white" />
              <rect x="34" y="34" width="6" height="6" fill="white" />
              <rect x="8" y="28" width="6" height="6" fill="white" />
              <rect x="18" y="28" width="6" height="6" fill="white" />
              <rect x="8" y="38" width="6" height="6" fill="white" />
              <rect x="18" y="38" width="6" height="6" fill="white" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Bedrijfsstempel
            </h2>
            <p className="text-sm text-[#94a3b8]">Configureer de stempel die op kwitanties wordt getoond</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-[#64748b] mb-1 block">Bedrijfsnaam</label>
              <input
                data-testid="stamp-name-input"
                value={settings.stamp_company_name}
                onChange={(e) => setSettings({ ...settings, stamp_company_name: e.target.value })}
                className="kiosk-input"
                placeholder="bijv. Stichting : Perraysarbha"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-[#64748b] mb-1 block">Adres</label>
              <input
                data-testid="stamp-address-input"
                value={settings.stamp_address}
                onChange={(e) => setSettings({ ...settings, stamp_address: e.target.value })}
                className="kiosk-input"
                placeholder="bijv. Kewalbasingweg .nr.7"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-[#64748b] mb-1 block">Telefoon</label>
              <input
                data-testid="stamp-phone-input"
                value={settings.stamp_phone}
                onChange={(e) => setSettings({ ...settings, stamp_phone: e.target.value })}
                className="kiosk-input"
                placeholder="bijv. 8624141"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-[#64748b] mb-1 block">WhatsApp</label>
              <input
                data-testid="stamp-whatsapp-input"
                value={settings.stamp_whatsapp}
                onChange={(e) => setSettings({ ...settings, stamp_whatsapp: e.target.value })}
                className="kiosk-input"
                placeholder="bijv. 0620540162"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <p className="text-sm font-bold text-[#64748b] mb-3">Voorbeeld</p>
            <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-6 flex items-center justify-center min-h-[120px]">
              {(settings.stamp_company_name || settings.stamp_address || settings.stamp_phone || settings.stamp_whatsapp) ? (
                <StampPreview stamp={settings} scale={1.5} />
              ) : (
                <p className="text-sm text-[#94a3b8]">Vul de velden in om een voorbeeld te zien</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            data-testid="save-stamp-btn"
            onClick={handleSaveSettings}
            disabled={saving}
            className="kiosk-btn-primary h-12 px-6 text-base"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Opslaan...' : 'Stempel opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
