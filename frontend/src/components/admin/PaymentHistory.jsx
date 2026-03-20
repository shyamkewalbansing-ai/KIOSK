import { useState, useEffect } from 'react';
import { CreditCard, Search, FileText, X, Printer } from 'lucide-react';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import ReceiptTicket from '../shared/ReceiptTicket';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Huur',
  partial_rent: 'Deel huur',
  service_costs: 'Servicekosten',
  fines: 'Boetes',
  deposit: 'Borgsom',
};

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await axios.get(`${API}/payments`, { withCredentials: true });
        setPayments(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchPayments();
  }, []);

  const filtered = payments.filter(p =>
    p.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.apartment_number?.toLowerCase().includes(search.toLowerCase()) ||
    (p.kwitantie_nummer || p.receipt_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);

  const handlePrintKwitantie = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="kiosk-spinner" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="payment-history">
      {/* Search & summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
          <input
            data-testid="payment-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam, appartement, kwitantienummer..."
            className="kiosk-input pl-12"
          />
        </div>
        <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] px-6 py-3 text-right">
          <p className="text-xs text-[#94a3b8]">{filtered.length} betalingen</p>
          <p className="text-xl font-extrabold text-[#166534]">{formatSRD(totalAmount)}</p>
        </div>
      </div>

      {/* Payment list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-12 text-center">
          <p className="text-[#94a3b8] text-lg">Geen betalingen gevonden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const kwNr = p.kwitantie_nummer || p.receipt_number || '';
            return (
              <div
                key={p.payment_id}
                className="bg-white rounded-2xl border-2 border-[#e2e8f0] px-6 py-4 flex items-center justify-between hover:border-[#cbd5e1] transition-colors"
                data-testid={`payment-row-${p.payment_id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#eff6ff] rounded-xl flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-[#1e3a8a]" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#0f172a]">{p.tenant_name}</p>
                    <p className="text-sm text-[#94a3b8]">
                      Appt. {p.apartment_number} &middot; {TYPE_LABELS[p.payment_type] || p.payment_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-[#94a3b8] bg-[#f8fafc] px-3 py-1.5 rounded-lg">
                    {kwNr}
                  </span>
                  <div className="text-right min-w-[120px]">
                    <p className="text-lg font-extrabold text-[#166534]">{formatSRD(p.amount)}</p>
                    <p className="text-xs text-[#94a3b8]">
                      {new Date(p.created_at).toLocaleDateString('nl-NL')} {new Date(p.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {/* View kwitantie button */}
                  <button
                    data-testid={`view-kwitantie-${p.payment_id}`}
                    onClick={() => setSelectedPayment(p)}
                    className="kiosk-btn-icon w-11 h-11"
                    title="Kwitantie bekijken"
                  >
                    <FileText className="w-5 h-5 text-[#1e3a8a]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kwitantie Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="rounded-3xl max-w-md p-0 overflow-hidden" data-testid="kwitantie-dialog">
          {/* Header */}
          <div className="bg-[#1e3a8a] text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>Kwitantie</h3>
                <p className="text-xs text-white/60">{selectedPayment?.kwitantie_nummer || selectedPayment?.receipt_number}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                data-testid="print-kwitantie-admin-btn"
                onClick={handlePrintKwitantie}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Kwitantie printen"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Kwitantie content */}
          <div className="p-6">
            {selectedPayment && (
              <ReceiptTicket payment={selectedPayment} preview />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden kwitantie for printing from admin */}
      {selectedPayment && (
        <div className="receipt-only">
          <ReceiptTicket payment={selectedPayment} />
        </div>
      )}
    </div>
  );
}
