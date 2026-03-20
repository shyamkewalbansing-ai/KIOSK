import { useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Wallet, Droplets, AlertCircle } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_TYPES = [
  { id: 'rent', label: 'Volledige huur', icon: Banknote, desc: 'Betaal het volledige openstaande huurbedrag' },
  { id: 'partial_rent', label: 'Gedeeltelijk', icon: Wallet, desc: 'Betaal een deel van de huur' },
  { id: 'service_costs', label: 'Servicekosten', icon: Droplets, desc: 'Water, stroom en overige kosten' },
  { id: 'fines', label: 'Boetes', icon: AlertCircle, desc: 'Openstaande boetes betalen' },
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
    onConfirm({ payment_type: selectedType, amount, description, payment_method: 'cash' });
  };

  const canProceed = selectedType && (selectedType !== 'partial_rent' || (customAmount && parseFloat(customAmount) > 0 && parseFloat(customAmount) <= tenant.outstanding_rent));

  const handleKeypadPress = (val) => {
    if (val === 'DEL') {
      setCustomAmount(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!customAmount.includes('.')) setCustomAmount(prev => prev + '.');
    } else {
      setCustomAmount(prev => prev + val);
    }
  };

  return (
    <div className="kiosk-root bg-white flex flex-col" data-testid="payment-select">
      {/* Top bar */}
      <div className="kiosk-topbar">
        <div className="flex items-center gap-4">
          <button data-testid="back-to-overview-btn" onClick={onBack} className="kiosk-btn-icon">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl xl:text-3xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Wat wilt u betalen?
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#94a3b8]">{tenant.name}</p>
          <p className="text-sm font-bold text-[#1e3a8a]">Appt. {tenant.apartment_number}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Left - Options */}
        <div className="flex-1 p-8 flex flex-col">
          <div className="grid grid-cols-2 gap-4 flex-1">
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
                  className={`kiosk-option-card ${
                    disabled ? 'kiosk-option-disabled' :
                    isSelected ? 'kiosk-option-selected' : 'kiosk-option-default'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${
                    isSelected ? 'bg-[#1e3a8a] text-white' : disabled ? 'bg-gray-100 text-gray-300' : 'bg-[#eff6ff] text-[#1e3a8a]'
                  }`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <span className="text-lg font-bold">{type.label}</span>
                  <span className="text-sm opacity-60 mt-1">{type.desc}</span>
                  {type.id !== 'partial_rent' && (
                    <span className={`text-xl font-extrabold mt-3 ${disabled ? 'text-gray-300' : 'text-[#1e3a8a]'}`}>
                      {formatSRD(amount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Confirm button */}
          <div className="mt-6">
            <button
              data-testid="confirm-payment-type-btn"
              disabled={!canProceed}
              onClick={handleConfirm}
              className={`kiosk-btn-primary w-full ${!canProceed ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span>Volgende</span>
              <ArrowRight className="w-7 h-7 ml-4" />
            </button>
          </div>
        </div>

        {/* Right - Custom amount (only for partial) */}
        {selectedType === 'partial_rent' && (
          <div className="w-[400px] bg-[#f8fafc] border-l border-[#e2e8f0] p-8 flex flex-col" data-testid="partial-payment-section">
            <h3 className="text-lg font-bold text-[#0f172a] mb-2">Bedrag invoeren</h3>
            <p className="text-sm text-[#94a3b8] mb-4">Max: {formatSRD(tenant.outstanding_rent)}</p>

            <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-5 text-center mb-4">
              <span className="text-sm text-[#94a3b8]">SRD</span>
              <div className="text-4xl font-extrabold text-[#0f172a] font-mono mt-1" data-testid="custom-amount-display">
                {customAmount || '0.00'}
              </div>
            </div>

            <div className="keypad-grid gap-2 flex-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  data-testid={`amount-key-${key}`}
                  onClick={() => handleKeypadPress(key)}
                  className={`kiosk-keypad-btn text-lg ${
                    key === 'DEL' ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-white text-[#0f172a]'
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
