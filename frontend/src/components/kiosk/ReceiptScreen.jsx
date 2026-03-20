import { CheckCircle, Printer, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import ReceiptTicket from '../shared/ReceiptTicket';

export default function ReceiptScreen({ payment, tenant, onDone }) {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" data-testid="receipt-screen">
      {/* Success banner */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-green-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Betaling geslaagd!
        </h2>
        <p className="text-gray-500 text-sm">Bonnummer: <span className="font-mono font-bold">{payment.receipt_number}</span></p>
      </div>

      {/* Receipt preview (visible on screen) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-dashed border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Bon voorbeeld</p>
        </div>
        <div className="p-6">
          <ReceiptTicket payment={payment} tenant={tenant} preview />
        </div>
      </div>

      {/* Hidden receipt for printing */}
      <div className="receipt-only">
        <ReceiptTicket payment={payment} tenant={tenant} />
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          data-testid="print-receipt-btn"
          onClick={handlePrint}
          className="w-full h-16 text-xl font-bold bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white rounded-xl shadow-md active:scale-95 transition-transform"
        >
          <Printer className="w-6 h-6 mr-3" />
          Bon printen
        </Button>
        <Button
          data-testid="done-btn"
          onClick={onDone}
          variant="outline"
          className="w-full h-16 text-xl font-bold border-2 border-gray-200 text-gray-700 rounded-xl active:scale-95 transition-transform hover:bg-gray-50"
        >
          <RotateCcw className="w-6 h-6 mr-3" />
          Nieuwe betaling
        </Button>
      </div>
    </div>
  );
}
