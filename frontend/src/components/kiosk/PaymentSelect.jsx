import { useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Droplets, AlertCircle, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_TYPES = [
  { id: 'rent', label: 'Volledige huur', icon: Banknote, desc: 'Betaal het volledige openstaande huurbedrag' },
  { id: 'partial_rent', label: 'Gedeeltelijke betaling', icon: Wallet, desc: 'Betaal een deel van de huur' },
  { id: 'service_costs', label: 'Servicekosten', icon: Droplets, desc: 'Water, stroom en overige kosten' },
  { id: 'fines', label: 'Boetes / Achterstand', icon: AlertCircle, desc: 'Betaal openstaande boetes' },
];

export default function PaymentSelect({ tenant, onBack, onConfirm }) {
  const [selectedType, setSelectedType] = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  if (!tenant) return null;

  const getAmountForType = (type) => {
    switch (type) {
      case 'rent': return tenant.outstanding_rent || 0;
      case 'service_costs': return tenant.service_costs || 0;
      case 'fines': return tenant.fines || 0;
      default: return 0;
    }
  };

  const isTypeDisabled = (type) => {
    if (type === 'partial_rent') return (tenant.outstanding_rent || 0) <= 0;
    return getAmountForType(type) <= 0;
  };

  const handleConfirm = () => {
    let amount = 0;
    let description = '';

    if (selectedType === 'rent') {
      amount = tenant.outstanding_rent;
      description = 'Volledige huurbetaling';
    } else if (selectedType === 'partial_rent') {
      amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0 || amount > tenant.outstanding_rent) return;
      description = 'Gedeeltelijke huurbetaling';
    } else if (selectedType === 'service_costs') {
      amount = tenant.service_costs;
      description = 'Servicekosten betaling';
    } else if (selectedType === 'fines') {
      amount = tenant.fines;
      description = 'Boetes betaling';
    }

    onConfirm({
      payment_type: selectedType === 'partial_rent' ? 'partial_rent' : selectedType,
      amount,
      description,
      payment_method: 'cash',
    });
  };

  const canProceed = selectedType && (selectedType !== 'partial_rent' || (customAmount && parseFloat(customAmount) > 0 && parseFloat(customAmount) <= tenant.outstanding_rent));

  return (
    <div className="space-y-6" data-testid="payment-select">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button data-testid="back-to-overview-btn" variant="ghost" onClick={onBack} className="h-12 w-12 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Wat wilt u betalen?
        </h2>
      </div>

      {/* Payment options */}
      <div className="space-y-3">
        {PAYMENT_TYPES.map((type) => {
          const disabled = isTypeDisabled(type.id);
          const isSelected = selectedType === type.id;
          const amount = getAmountForType(type.id);
          const Icon = type.icon;

          return (
            <button
              key={type.id}
              data-testid={`payment-type-${type.id}`}
              disabled={disabled}
              onClick={() => setSelectedType(type.id)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] flex items-center gap-4 ${
                disabled
                  ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                  : isSelected
                  ? 'bg-blue-50 border-[#1e3a8a] shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'bg-[#1e3a8a] text-white' : disabled ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-base ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>{type.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
              </div>
              {type.id !== 'partial_rent' && (
                <span className={`font-bold text-sm whitespace-nowrap ${disabled ? 'text-gray-400' : 'text-[#1e3a8a]'}`}>
                  {formatSRD(amount)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom amount for partial */}
      {selectedType === 'partial_rent' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-3" data-testid="partial-payment-section">
          <p className="text-sm text-gray-600">
            Maximaal: <span className="font-bold text-[#1e3a8a]">{formatSRD(tenant.outstanding_rent)}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-500">SRD</span>
            <Input
              data-testid="custom-amount-input"
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.00"
              max={tenant.outstanding_rent}
              min={0}
              step="0.01"
              className="h-14 text-xl font-bold text-center rounded-xl border-2"
            />
          </div>
        </div>
      )}

      {/* Confirm */}
      <Button
        data-testid="confirm-payment-type-btn"
        disabled={!canProceed}
        onClick={handleConfirm}
        className="w-full h-16 text-xl font-bold bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Volgende
        <ArrowRight className="w-6 h-6 ml-3" />
      </Button>
    </div>
  );
}
