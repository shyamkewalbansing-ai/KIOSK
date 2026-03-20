import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import WelcomeScreen from './WelcomeScreen';
import ApartmentSelect from './ApartmentSelect';
import TenantOverview from './TenantOverview';
import PaymentSelect from './PaymentSelect';
import PaymentConfirm from './PaymentConfirm';
import ReceiptScreen from './ReceiptScreen';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const slideVariants = {
  enter: { opacity: 0, scale: 0.98 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

export default function KioskLayout() {
  const { companyId } = useParams();
  const [step, setStep] = useState('welcome');
  const [tenant, setTenant] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (companyId) {
      axios.get(`${API}/kiosk/${companyId}/company`).then(res => {
        setCompanyName(res.data.name);
      }).catch(() => {});
    }
  }, [companyId]);

  const goTo = useCallback((newStep) => setStep(newStep), []);

  const reset = useCallback(() => {
    setTenant(null);
    setPaymentData(null);
    setPaymentResult(null);
    setStep('welcome');
  }, []);

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeScreen onStart={() => goTo('select')} companyName={companyName} companyId={companyId} />;
      case 'select':
        return (
          <ApartmentSelect
            onBack={() => goTo('welcome')}
            onSelect={(t) => { setTenant(t); goTo('overview'); }}
            companyId={companyId}
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
            companyId={companyId}
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
        return <WelcomeScreen onStart={() => goTo('select')} companyName={companyName} companyId={companyId} />;
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden" data-testid="kiosk-layout">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="w-full h-full"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
