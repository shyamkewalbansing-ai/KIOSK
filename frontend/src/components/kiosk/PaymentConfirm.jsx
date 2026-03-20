import { useState } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User, Home, ShieldAlert } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Volledige huur',
  partial_rent: 'Gedeeltelijke betaling',
  service_costs: 'Servicekosten',
  fines: 'Boetes',
};

export default function PaymentConfirm({ tenant, paymentData, onBack, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!tenant || !paymentData) return null;

  const handlePayment = async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await axios.post(`${API}/payments`, {
        tenant_id: tenant.tenant_id,
        amount: paymentData.amount,
        payment_type: paymentData.payment_type,
        payment_method: paymentData.payment_method,
        description: paymentData.description,
      });
      setTimeout(() => onSuccess(res.data), 600);
    } catch {
      setError('Betaling mislukt. Probeer opnieuw.');
      setProcessing(false);
    }
  };

  return (
    <div className="kiosk-root bg-[#f8fafc]" data-testid="payment-confirm">
      {/* Top bar */}
      <div className="kiosk-topbar bg-white">
        <div className="flex items-center gap-4">
          <button data-testid="back-to-payment-select-btn" onClick={onBack} className="kiosk-btn-icon" disabled={processing}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl xl:text-3xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Bevestig betaling
          </h1>
        </div>
      </div>

      {/* Content - full kiosk split */}
      <div className="flex-1 flex">
        {/* Left - Amount display */}
        <div className="flex-1 flex flex-col items-center justify-center px-12 bg-white border-r border-[#e2e8f0]">
          <div className="w-20 h-20 bg-[#fff7ed] rounded-3xl flex items-center justify-center mb-6">
            <Banknote className="w-10 h-10 text-[#f97316]" />
          </div>
          <p className="text-sm uppercase tracking-widest text-[#94a3b8] font-bold mb-2">Te betalen bedrag</p>
          <p className="text-6xl xl:text-7xl font-extrabold text-[#f97316] tracking-tight" data-testid="confirm-amount"
            style={{ fontFamily: 'Manrope, sans-serif' }}>
            {formatSRD(paymentData.amount)}
          </p>
          <p className="text-lg text-[#94a3b8] mt-4">{TYPE_LABELS[paymentData.payment_type]}</p>

          <div className="flex items-center gap-3 mt-8 bg-[#f8fafc] rounded-2xl px-6 py-3">
            <Banknote className="w-5 h-5 text-[#16a34a]" />
            <span className="text-base font-bold text-[#0f172a]">Betaalmethode: Contant</span>
          </div>
        </div>

        {/* Right - Details + Confirm */}
        <div className="flex-1 flex flex-col items-center justify-center px-12">
          {/* Tenant mini card */}
          <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-6 w-full max-w-md mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#1e3a8a] rounded-2xl flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-[#0f172a]" data-testid="confirm-tenant-name">{tenant.name}</p>
                <p className="text-[#94a3b8] flex items-center gap-2 text-sm">
                  <Home className="w-4 h-4" /> Appt. {tenant.apartment_number} &middot; {tenant.tenant_code}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="w-full max-w-md mb-6 bg-[#fee2e2] border-2 border-[#fca5a5] text-[#dc2626] rounded-2xl px-6 py-4 text-lg font-bold flex items-center gap-3" data-testid="payment-error">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Confirm button */}
          <button
            data-testid="confirm-cash-payment-btn"
            disabled={processing}
            onClick={handlePayment}
            className={`w-full max-w-md kiosk-btn-confirm ${processing ? 'kiosk-btn-processing' : ''}`}
          >
            {processing ? (
              <>
                <Loader2 className="w-8 h-8 mr-4 animate-spin" />
                <span>Verwerken...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-8 h-8 mr-4" />
                <span>Bevestig betaling</span>
              </>
            )}
          </button>

          <p className="text-sm text-[#94a3b8] mt-4 text-center max-w-sm">
            Door te bevestigen geeft u aan dat het contante bedrag is ontvangen
          </p>
        </div>
      </div>
    </div>
  );
}
