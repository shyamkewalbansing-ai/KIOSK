import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeScreen from './WelcomeScreen';
import ApartmentSelect from './ApartmentSelect';
import TenantOverview from './TenantOverview';
import PaymentSelect from './PaymentSelect';
import PaymentConfirm from './PaymentConfirm';
import ReceiptScreen from './ReceiptScreen';

const STEPS = ['welcome', 'select', 'overview', 'payment', 'confirm', 'receipt'];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

export default function KioskLayout() {
  const [step, setStep] = useState('welcome');
  const [direction, setDirection] = useState(1);
  const [tenant, setTenant] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  const goTo = useCallback((newStep) => {
    const currentIdx = STEPS.indexOf(step);
    const newIdx = STEPS.indexOf(newStep);
    setDirection(newIdx > currentIdx ? 1 : -1);
    setStep(newStep);
  }, [step]);

  const reset = useCallback(() => {
    setTenant(null);
    setPaymentData(null);
    setPaymentResult(null);
    setDirection(-1);
    setStep('welcome');
  }, []);

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeScreen onStart={() => goTo('select')} />;
      case 'select':
        return (
          <ApartmentSelect
            onBack={() => goTo('welcome')}
            onSelect={(t) => { setTenant(t); goTo('overview'); }}
          />
        );
      case 'overview':
        return (
          <TenantOverview
            tenant={tenant}
            onBack={() => goTo('select')}
            onPay={() => goTo('payment')}
          />
        );
      case 'payment':
        return (
          <PaymentSelect
            tenant={tenant}
            onBack={() => goTo('overview')}
            onConfirm={(data) => { setPaymentData(data); goTo('confirm'); }}
          />
        );
      case 'confirm':
        return (
          <PaymentConfirm
            tenant={tenant}
            paymentData={paymentData}
            onBack={() => goTo('payment')}
            onSuccess={(result) => { setPaymentResult(result); goTo('receipt'); }}
          />
        );
      case 'receipt':
        return (
          <ReceiptScreen
            payment={paymentResult}
            tenant={tenant}
            onDone={reset}
          />
        );
      default:
        return <WelcomeScreen onStart={() => goTo('select')} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col" data-testid="kiosk-layout">
      {/* Top brand bar */}
      <div className="bg-[#1e3a8a] text-white py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f97316] rounded-lg flex items-center justify-center font-bold text-sm">AK</div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Appartement Kiosk
          </span>
        </div>
        <span className="text-sm opacity-80">
          {new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Step indicator */}
      {step !== 'welcome' && (
        <div className="bg-white border-b px-6 py-2">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            {STEPS.slice(1, -1).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  STEPS.indexOf(step) >= STEPS.indexOf(s)
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                {i < 3 && <div className={`w-8 h-0.5 ${STEPS.indexOf(step) > STEPS.indexOf(s) ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.25 }}
            className="w-full max-w-xl"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
