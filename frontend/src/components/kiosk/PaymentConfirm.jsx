import { useState } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2, User, Home } from 'lucide-react';
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
      setTimeout(() => onSuccess(res.data), 800);
    } catch {
      setError('Betaling mislukt. Probeer opnieuw.');
      setProcessing(false);
    }
  };

  return (
    <div className="kiosk-root bg-white flex flex-col" data-testid="payment-confirm">
      {/* Top bar */}
      <div className="kiosk-topbar">
        <div className="flex items-center gap-4">
          <button data-testid="back-to-payment-select-btn" onClick={onBack} className="kiosk-btn-icon" disabled={processing}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl xl:text-3xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Bevestig betaling
          </h1>
        </div>
      </div>

      {/* Content - centered */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          {/* Summary card */}
          <div className="bg-[#f8fafc] rounded-3xl border-2 border-[#e2e8f0] p-8 space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b border-[#e2e8f0]">
              <div className="w-14 h-14 bg-[#1e3a8a] rounded-2xl flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-[#0f172a]" data-testid="confirm-tenant-name">{tenant.name}</p>
                <p className="text-[#64748b] flex items-center gap-2">
                  <Home className="w-4 h-4" /> Appt. {tenant.apartment_number}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#64748b] text-lg">Type</span>
                <span className="font-bold text-lg text-[#0f172a]">{TYPE_LABELS[paymentData.payment_type]}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748b] text-lg">Methode</span>
                <span className="font-bold text-lg text-[#0f172a] flex items-center gap-2">
                  <Banknote className="w-5 h-5" /> Contant
                </span>
              </div>
            </div>

            <div className="pt-5 border-t-2 border-[#e2e8f0]">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-[#0f172a]">Te betalen</span>
                <span className="text-4xl font-extrabold text-[#f97316]" data-testid="confirm-amount">
                  {formatSRD(paymentData.amount)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl px-6 py-4 text-lg font-medium" data-testid="payment-error">
              {error}
            </div>
          )}

          {/* Confirm button */}
          <button
            data-testid="confirm-cash-payment-btn"
            disabled={processing}
            onClick={handlePayment}
            className={`mt-8 w-full kiosk-btn-confirm ${processing ? 'kiosk-btn-processing' : ''}`}
          >
            {processing ? (
              <>
                <Loader2 className="w-8 h-8 mr-4 animate-spin" />
                <span>Verwerken...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-8 h-8 mr-4" />
                <span>Bevestig contante betaling</span>
              </>
            )}
          </button>

          <p className="text-center text-sm text-[#94a3b8] mt-4">
            Door te bevestigen geeft u aan dat het contante bedrag is ontvangen
          </p>
        </div>
      </div>
    </div>
  );
}
