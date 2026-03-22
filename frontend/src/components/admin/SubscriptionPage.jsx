import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  CreditCard, Upload, CheckCircle, AlertTriangle, Clock, Gift,
  Building2, FileText, Loader2, Shield
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ax = axios.create({ withCredentials: true });

const STATUS_CONFIG = {
  trial: { label: 'Proefperiode', color: 'bg-blue-100 text-blue-700', icon: Clock },
  active: { label: 'Actief', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired: { label: 'Verlopen', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  deactivated: { label: 'Gedeactiveerd', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  free: { label: 'Gratis', color: 'bg-purple-100 text-purple-700', icon: Gift },
};

function fmt(val) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'SRD' }).format(val || 0);
}

function fmtDate(val) {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SubscriptionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const fileRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const res = await ax.get(`${API}/subscription/status`);
      setData(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await ax.post(`${API}/subscription/upload-proof`, formData);
      setSuccess(res.data.message);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload mislukt');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="kiosk-spinner" /></div>;
  }

  if (!data) return null;

  const st = STATUS_CONFIG[data.subscription_status] || STATUS_CONFIG.trial;
  const StIcon = st.icon;
  const needsPayment = ['expired', 'deactivated', 'trial'].includes(data.subscription_status);

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="subscription-page">
      {/* Current Plan */}
      <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] overflow-hidden">
        <div className="bg-[#1e3a8a] px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>Uw Abonnement</h2>
              <p className="text-white/70 mt-1">Maandabonnement Appartement Kiosk</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-extrabold">{fmt(data.subscription_price)}</p>
              <p className="text-white/70">per maand</p>
            </div>
          </div>
        </div>
        <div className="px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${st.color}`}>
              <StIcon className="w-4 h-4" />
              <span className="font-bold text-sm">{st.label}</span>
            </div>
            {data.subscription_status === 'trial' && (
              <span className="text-sm text-[#94a3b8]">Proefperiode eindigt: <strong className="text-[#0f172a]">{fmtDate(data.trial_end)}</strong></span>
            )}
            {data.subscription_status === 'active' && (
              <span className="text-sm text-[#94a3b8]">Geldig tot: <strong className="text-[#0f172a]">{fmtDate(data.subscription_end)}</strong></span>
            )}
            {data.subscription_status === 'free' && (
              <span className="text-sm text-[#94a3b8]">Geen vervaldatum</span>
            )}
          </div>

          {needsPayment && (
            <div className="bg-[#fffbeb] border-2 border-[#fbbf24] rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#f59e0b] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-[#92400e]">
                    {data.subscription_status === 'trial'
                      ? 'Uw proefperiode loopt af. Betaal om uw abonnement te activeren.'
                      : 'Uw abonnement is verlopen. Betaal om opnieuw te activeren.'}
                  </p>
                  <p className="text-sm text-[#92400e]/70 mt-1">Na 3 dagen zonder betaling wordt uw account gedeactiveerd.</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-3" data-testid="upload-success">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="font-bold text-green-700">{success}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Section */}
      <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-8">
        <h3 className="text-lg font-extrabold text-[#0f172a] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Betaling</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bank Details */}
          <div>
            <p className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-4">Bankgegevens voor overschrijving</p>
            <div className="bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#1e3a8a]" />
                <div>
                  <p className="text-xs text-[#94a3b8]">Bank</p>
                  <p className="font-bold text-[#0f172a]">{data.bank_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#1e3a8a]" />
                <div>
                  <p className="text-xs text-[#94a3b8]">Rekeningnummer</p>
                  <p className="font-bold text-[#0f172a] text-lg">{data.bank_account}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#1e3a8a]" />
                <div>
                  <p className="text-xs text-[#94a3b8]">Omschrijving</p>
                  <p className="font-bold text-[#0f172a] text-lg">{data.bank_reference}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-[#e2e8f0]">
                <p className="text-xs text-[#94a3b8]">Bedrag</p>
                <p className="font-extrabold text-[#0f172a] text-2xl">{fmt(data.subscription_price)}</p>
              </div>
            </div>
          </div>

          {/* Upload Proof */}
          <div>
            <p className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-4">Bankafschrift uploaden</p>
            <div className="bg-[#f8fafc] rounded-2xl border-2 border-dashed border-[#cbd5e1] p-8 text-center">
              <Upload className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" />
              <p className="text-[#0f172a] font-bold mb-2">Upload uw bankafschrift</p>
              <p className="text-sm text-[#94a3b8] mb-6">
                Bewijs van betaling (afbeelding of PDF, max 10MB)
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleUpload}
                className="hidden"
                data-testid="upload-proof-input"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="upload-proof-btn"
                className="kiosk-btn-primary h-14 px-8 text-base mx-auto"
              >
                {uploading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Uploaden...</>
                ) : (
                  <><Upload className="w-5 h-5 mr-2" />Bankafschrift uploaden</>
                )}
              </button>
              <p className="text-xs text-[#94a3b8] mt-4">
                Na upload wordt uw abonnement automatisch geactiveerd voor 30 dagen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {data.payment_proofs?.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-8">
          <h3 className="text-lg font-extrabold text-[#0f172a] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Betalingsgeschiedenis</h3>
          <div className="space-y-3">
            {data.payment_proofs.map((p) => (
              <div key={p.proof_id} className="flex items-center justify-between bg-[#f8fafc] rounded-xl px-5 py-3 border border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-bold text-sm text-[#0f172a]">{p.filename}</p>
                    <p className="text-xs text-[#94a3b8]">{fmtDate(p.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#0f172a]">{fmt(p.amount)}</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Goedgekeurd</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
