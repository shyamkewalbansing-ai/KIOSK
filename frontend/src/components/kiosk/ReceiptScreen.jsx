import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Printer } from 'lucide-react';
import ReceiptTicket from '../shared/ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReceiptScreen({ payment, tenant, companyId, onDone }) {
  const [countdown, setCountdown] = useState(8);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (companyId) {
      setSignatureUrl(`${API}/kiosk/${companyId}/company/signature`);
    }
  }, [companyId]);

  useEffect(() => {
    if (!payment) return;

    // Countdown timer - auto redirect after 8 seconds
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [payment, onDone]);

  if (!payment) return null;

  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';

  const handlePrint = () => {
    // Stop countdown during print
    clearInterval(timerRef.current);
    window.print();
    // Restart countdown after print dialog closes
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setCountdown(5);
  };

  return (
    <div className="kiosk-root bg-white" data-testid="receipt-screen">
      {/* Full screen success */}
      <div className="flex-1 flex">
        {/* Left - Success message */}
        <div className="flex-1 flex flex-col items-center justify-center px-12">
          <div className="w-32 h-32 bg-[#dcfce7] rounded-full flex items-center justify-center mb-8 animate-bounce-slow">
            <CheckCircle className="w-20 h-20 text-[#16a34a]" />
          </div>
          <h1 className="text-4xl xl:text-6xl font-extrabold text-[#166534] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Betaling geslaagd!
          </h1>
          <p className="text-xl text-[#64748b] mb-6">
            Kwitantie: <span className="font-mono font-extrabold text-[#0f172a]">{kwNr}</span>
          </p>

          <div className="flex gap-4">
            <button
              data-testid="print-receipt-btn"
              onClick={handlePrint}
              className="kiosk-btn-primary"
            >
              <Printer className="w-7 h-7 mr-3" />
              <span>Kwitantie printen</span>
            </button>
            <button
              data-testid="done-btn"
              onClick={onDone}
              className="kiosk-btn-secondary"
            >
              <span>Klaar</span>
            </button>
          </div>

          {/* Countdown */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full border-4 border-[#e2e8f0] flex items-center justify-center relative">
              <span className="text-2xl font-extrabold text-[#1e3a8a]">{countdown}</span>
              <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32" cy="32" r="28"
                  fill="none" stroke="#1e3a8a" strokeWidth="4"
                  strokeDasharray={`${(countdown / 8) * 176} 176`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              </svg>
            </div>
            <p className="text-sm text-[#94a3b8]">
              Automatisch terug naar welkomscherm
            </p>
          </div>
        </div>

        {/* Right - Kwitantie preview */}
        <div className="hidden lg:flex w-[440px] bg-[#f8fafc] border-l border-[#e2e8f0] flex-col items-center justify-center p-6 overflow-auto">
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] font-bold mb-4 flex-shrink-0">Kwitantie voorbeeld</p>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden w-full max-w-[380px] flex-shrink-0">
            <ReceiptTicket payment={payment} tenant={tenant} preview signatureUrl={signatureUrl} />
          </div>
        </div>
      </div>

      {/* Hidden A4 kwitantie for printing */}
      <div className="receipt-only">
        <ReceiptTicket payment={payment} tenant={tenant} signatureUrl={signatureUrl} />
      </div>
    </div>
  );
}
