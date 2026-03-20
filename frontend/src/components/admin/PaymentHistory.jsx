import { useState, useEffect } from 'react';
import { CreditCard, Search } from 'lucide-react';
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
    p.receipt_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);

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
            placeholder="Zoek op naam, appartement, bonnummer..."
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
          {filtered.map((p) => (
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
              <div className="flex items-center gap-6">
                <span className="text-xs font-mono text-[#94a3b8] bg-[#f8fafc] px-3 py-1.5 rounded-lg">
                  {p.receipt_number}
                </span>
                <div className="text-right min-w-[120px]">
                  <p className="text-lg font-extrabold text-[#166534]">{formatSRD(p.amount)}</p>
                  <p className="text-xs text-[#94a3b8]">
                    {new Date(p.created_at).toLocaleDateString('nl-NL')} {new Date(p.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
