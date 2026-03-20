import { CheckCircle, Printer, RotateCcw } from 'lucide-react';
import ReceiptTicket from '../shared/ReceiptTicket';

export default function ReceiptScreen({ payment, tenant, onDone }) {
  if (!payment) return null;

  const handlePrint = () => window.print();

  return (
    <div className="kiosk-root bg-white flex flex-col" data-testid="receipt-screen">
      {/* Content */}
      <div className="flex-1 flex">
        {/* Left - Success */}
        <div className="flex-1 flex flex-col items-center justify-center px-12">
          <div className="w-28 h-28 bg-[#dcfce7] rounded-full flex items-center justify-center mb-8">
            <CheckCircle className="w-16 h-16 text-[#16a34a]" />
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-[#166534] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Betaling geslaagd!
          </h1>
          <p className="text-lg text-[#64748b] mb-2">
            Bonnummer: <span className="font-mono font-bold text-[#0f172a]">{payment.receipt_number}</span>
          </p>

          <div className="flex gap-4 mt-10 w-full max-w-md">
            <button
              data-testid="print-receipt-btn"
              onClick={handlePrint}
              className="kiosk-btn-primary flex-1"
            >
              <Printer className="w-7 h-7 mr-3" />
              <span>Bon printen</span>
            </button>
            <button
              data-testid="done-btn"
              onClick={onDone}
              className="kiosk-btn-secondary flex-1"
            >
              <RotateCcw className="w-7 h-7 mr-3" />
              <span>Klaar</span>
            </button>
          </div>
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
