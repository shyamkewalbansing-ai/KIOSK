import { useState, useEffect } from 'react';
import { Building2, Users, CreditCard, TrendingUp, AlertTriangle, Banknote } from 'lucide-react';
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API}/dashboard/stats`, { withCredentials: true });
        setStats(res.data);
      } catch (err) {
        console.error('Dashboard stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="kiosk-spinner" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-[#94a3b8] text-center py-10 text-lg">Kon statistieken niet laden.</p>;
  }

  const statCards = [
    { label: 'Totale inkomsten', value: formatSRD(stats.total_revenue), icon: TrendingUp, bg: 'bg-[#dcfce7]', color: 'text-[#166534]' },
    { label: 'Openstaande huur', value: formatSRD(stats.outstanding_rent), icon: AlertTriangle, bg: 'bg-[#fee2e2]', color: 'text-[#dc2626]' },
    { label: 'Appartementen', value: `${stats.occupied_apartments} / ${stats.total_apartments}`, icon: Building2, bg: 'bg-[#eff6ff]', color: 'text-[#1e3a8a]' },
    { label: 'Actieve huurders', value: stats.total_tenants, icon: Users, bg: 'bg-[#f3e8ff]', color: 'text-[#7c3aed]' },
    { label: 'Betalingen', value: stats.total_payments, icon: CreditCard, bg: 'bg-[#fff7ed]', color: 'text-[#ea580c]' },
    { label: 'Open kosten & boetes', value: formatSRD(stats.outstanding_services + stats.outstanding_fines), icon: Banknote, bg: 'bg-[#fef3c7]', color: 'text-[#d97706]' },
  ];

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-6 flex items-center gap-5 transition-all hover:border-[#cbd5e1] hover:shadow-sm"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
                <Icon className={`w-8 h-8 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-[#94a3b8] font-medium">{card.label}</p>
                <p className="text-2xl font-extrabold text-[#0f172a]" data-testid={`stat-${card.label.replace(/\s/g, '-').toLowerCase()}`}>
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent payments */}
      <div>
        <h2 className="text-xl font-extrabold text-[#0f172a] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Recente betalingen
        </h2>
        {stats.recent_payments.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-12 text-center">
            <p className="text-[#94a3b8] text-lg">Nog geen betalingen</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recent_payments.map((p) => (
              <div
                key={p.payment_id}
                className="bg-white rounded-2xl border-2 border-[#e2e8f0] px-6 py-4 flex items-center justify-between hover:border-[#cbd5e1] transition-colors"
                data-testid={`recent-payment-${p.payment_id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#eff6ff] rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-[#1e3a8a]" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#0f172a]">{p.tenant_name}</p>
                    <p className="text-sm text-[#94a3b8]">
                      Appt. {p.apartment_number} &middot; {TYPE_LABELS[p.payment_type] || p.payment_type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-[#166534]">{formatSRD(p.amount)}</p>
                  <p className="text-xs text-[#94a3b8] font-mono">{p.kwitantie_nummer || p.receipt_number}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
