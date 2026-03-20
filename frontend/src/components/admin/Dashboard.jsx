import { useState, useEffect } from 'react';
import { Building2, Users, CreditCard, TrendingUp, AlertTriangle, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-500 text-center py-10">Kon statistieken niet laden.</p>;
  }

  const statCards = [
    { label: 'Totale inkomsten', value: formatSRD(stats.total_revenue), icon: TrendingUp, color: 'bg-green-50 text-green-700' },
    { label: 'Openstaande huur', value: formatSRD(stats.outstanding_rent), icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
    { label: 'Appartementen', value: `${stats.occupied_apartments}/${stats.total_apartments}`, icon: Building2, color: 'bg-blue-50 text-[#1e3a8a]' },
    { label: 'Actieve huurders', value: stats.total_tenants, icon: Users, color: 'bg-purple-50 text-purple-700' },
    { label: 'Betalingen', value: stats.total_payments, icon: CreditCard, color: 'bg-orange-50 text-orange-700' },
    { label: 'Openstaande kosten', value: formatSRD(stats.outstanding_services + stats.outstanding_fines), icon: Banknote, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border border-gray-200 shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="text-lg font-bold text-gray-900" data-testid={`stat-${card.label.replace(/\s/g, '-').toLowerCase()}`}>
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent payments */}
      <Card className="border border-gray-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Recente betalingen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent_payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Nog geen betalingen</p>
          ) : (
            <div className="space-y-2">
              {stats.recent_payments.map((p) => (
                <div
                  key={p.payment_id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`recent-payment-${p.payment_id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1e3a8a]/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-[#1e3a8a]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.tenant_name}</p>
                      <p className="text-xs text-gray-500">
                        {p.apartment_number} - {TYPE_LABELS[p.payment_type] || p.payment_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-700">{formatSRD(p.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('nl-NL')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
