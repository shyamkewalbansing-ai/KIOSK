import { useEffect, useRef } from 'react';
import { CheckCircle, Printer } from 'lucide-react';
import ReceiptTicket from '../shared/ReceiptTicket';

export default function ReceiptScreen({ payment, tenant, onDone }) {
  const hasPrinted = useRef(false);

  useEffect(() => {
    if (!payment || hasPrinted.current) return;
    hasPrinted.current = true;

    // Auto-print after short delay, then go to welcome
    const timer = setTimeout(() => {
      window.print();
      // Return to welcome after print dialog
      setTimeout(() => onDone(), 1500);
    }, 1200);

    // Fallback: auto-return after 10 seconds regardless
    const fallback = setTimeout(() => onDone(), 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallback);
    };
  }, [payment, onDone]);

  if (!payment) return null;

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
          <p className="text-xl text-[#64748b] mb-2">
            Bonnummer: <span className="font-mono font-extrabold text-[#0f172a]">{payment.receipt_number}</span>
          </p>
          <p className="text-base text-[#94a3b8] mt-2 flex items-center gap-2">
            <Printer className="w-5 h-5" /> Bon wordt automatisch geprint...
          </p>

          <div className="mt-10 flex gap-4">
            <button
              data-testid="print-receipt-btn"
              onClick={() => window.print()}
              className="kiosk-btn-secondary"
            >
              <Printer className="w-6 h-6 mr-3" />
              <span>Opnieuw printen</span>
            </button>
            <button
              data-testid="done-btn"
              onClick={onDone}
              className="kiosk-btn-primary"
            >
              <span>Klaar</span>
            </button>
          </div>

          <p className="text-sm text-[#94a3b8] mt-6">
            U wordt automatisch teruggeleid naar het welkomscherm...
          </p>
        </div>

        {/* Right - Receipt preview */}
        <div className="hidden lg:flex w-[400px] bg-[#f8fafc] border-l border-[#e2e8f0] flex-col items-center justify-center p-8">
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] font-bold mb-6">Bon voorbeeld</p>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 w-full max-w-[300px]">
            <ReceiptTicket payment={payment} tenant={tenant} preview />
          </div>
        </div>
      </div>

      {/* Hidden receipt for printing */}
      <div className="receipt-only">
        <ReceiptTicket payment={payment} tenant={tenant} />
      </div>
    </div>
  );
}
