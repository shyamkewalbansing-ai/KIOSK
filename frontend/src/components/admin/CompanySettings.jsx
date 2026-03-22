import { useState, useEffect, useRef } from 'react';
import { Settings, Upload, Trash2, Save, AlertTriangle, Image } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CompanySettings() {
  const [settings, setSettings] = useState({ billing_day_of_month: 1, late_fee_amount: 0, signature_uploaded: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/company/settings`, { withCredentials: true });
        setSettings(res.data);
        if (res.data.signature_uploaded) {
          setSignaturePreview(`${API}/company/signature/image`);
        }
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
      }, { withCredentials: true });
      toast.success('Instellingen opgeslagen');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij opslaan');
    }
    setSaving(false);
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API}/company/signature`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Handtekening/stempel geüpload');
      setSettings(prev => ({ ...prev, signature_uploaded: true }));
      setSignaturePreview(`${API}/company/signature/image?t=${Date.now()}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij uploaden');
    }
  };

  const handleDeleteSignature = async () => {
    try {
      await axios.delete(`${API}/company/signature`, { withCredentials: true });
      toast.success('Handtekening/stempel verwijderd');
      setSettings(prev => ({ ...prev, signature_uploaded: false }));
      setSignaturePreview(null);
    } catch (err) {
      toast.error('Fout bij verwijderen');
    }
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

      {/* Signature / Stamp */}
      <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#fef3c7] rounded-xl flex items-center justify-center">
            <Image className="w-6 h-6 text-[#d97706]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Handtekening / Stempel
            </h2>
            <p className="text-sm text-[#94a3b8]">Upload een afbeelding die op kwitanties wordt getoond</p>
          </div>
        </div>

        {signaturePreview ? (
          <div className="space-y-4">
            <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-6 flex items-center justify-center">
              <img
                src={signaturePreview}
                alt="Handtekening/stempel"
                className="max-h-32 max-w-full object-contain"
                data-testid="signature-preview"
                crossOrigin="use-credentials"
              />
            </div>
            <div className="flex gap-3">
              <button
                data-testid="change-signature-btn"
                onClick={() => fileInputRef.current?.click()}
                className="kiosk-btn-secondary h-12 px-6 text-base"
              >
                <Upload className="w-5 h-5 mr-2" />
                Wijzigen
              </button>
              <button
                data-testid="delete-signature-btn"
                onClick={handleDeleteSignature}
                className="kiosk-btn-secondary h-12 px-6 text-base border-red-200 text-[#dc2626] hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Verwijderen
              </button>
            </div>
          </div>
        ) : (
          <button
            data-testid="upload-signature-btn"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-[#cbd5e1] rounded-xl p-8 flex flex-col items-center gap-3 hover:border-[#1e3a8a] hover:bg-[#f8fafc] transition-colors cursor-pointer"
          >
            <Upload className="w-10 h-10 text-[#94a3b8]" />
            <span className="text-base font-bold text-[#64748b]">Klik om afbeelding te uploaden</span>
            <span className="text-sm text-[#94a3b8]">PNG, JPG of WEBP (max 5MB)</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleSignatureUpload}
          data-testid="signature-file-input"
        />
      </div>
    </div>
  );
}
