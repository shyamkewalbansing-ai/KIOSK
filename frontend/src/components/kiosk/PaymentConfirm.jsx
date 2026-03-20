import { useState } from 'react';
import { ArrowLeft, Banknote, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Volledige huur',
  partial_rent: 'Gedeeltelijke betaling',
  service_costs: 'Servicekosten',
  fines: 'Boetes / Achterstand',
  deposit: 'Borgsom',
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
      // Small delay for UX
      setTimeout(() => onSuccess(res.data), 800);
    } catch {
      setError('Betaling mislukt. Probeer opnieuw.');
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="payment-confirm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button data-testid="back-to-payment-select-btn" variant="ghost" onClick={onBack} className="h-12 w-12 rounded-xl" disabled={processing}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Bevestig betaling
        </h2>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Huurder</span>
          <span className="font-semibold" data-testid="confirm-tenant-name">{tenant.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Appartement</span>
          <span className="font-semibold">{tenant.apartment_number}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Type betaling</span>
          <span className="font-semibold">{TYPE_LABELS[paymentData.payment_type]}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Betaalmethode</span>
          <span className="font-semibold flex items-center gap-1">
            <Banknote className="w-4 h-4" /> Contant
          </span>
        </div>
        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Te betalen</span>
          <span className="text-2xl font-bold text-[#f97316]" data-testid="confirm-amount">
            {formatSRD(paymentData.amount)}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" data-testid="payment-error">
          {error}
        </div>
      )}

      {/* Confirm button */}
      <Button
        data-testid="confirm-cash-payment-btn"
        disabled={processing}
        onClick={handlePayment}
        className={`w-full h-16 text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all ${
          processing
            ? 'bg-green-500 text-white'
            : 'bg-[#f97316] hover:bg-[#ea580c] text-white'
        }`}
      >
        {processing ? (
          <>
            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            Verwerken...
          </>
        ) : (
          <>
            <CheckCircle className="w-6 h-6 mr-3" />
            Bevestig contante betaling
          </>
        )}
      </Button>

      <p className="text-center text-xs text-gray-400">
        Door te bevestigen, geeft u aan dat u het contante bedrag heeft ontvangen.
      </p>
    </div>
  );
}
