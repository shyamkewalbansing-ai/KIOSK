import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Shield, LogOut, Building2, BarChart3, FileText, Users, CheckCircle, XCircle,
  Clock, Gift, Loader2, CreditCard, AlertTriangle, Zap
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ax = axios.create({ withCredentials: true });

const STATUS_LABELS = {
  trial: { label: 'Proefperiode', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Actief', color: 'bg-green-100 text-green-700' },
  expired: { label: 'Verlopen', color: 'bg-yellow-100 text-yellow-700' },
  deactivated: { label: 'Gedeactiveerd', color: 'bg-red-100 text-red-700' },
  free: { label: 'Gratis', color: 'bg-purple-100 text-purple-700' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.color}`}>{s.label}</span>;
}

function fmt(val) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'SRD' }).format(val || 0);
}

function fmtDate(val) {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payDialog, setPayDialog] = useState(null);
  const [payAmount, setPayAmount] = useState('3500');
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, c, i] = await Promise.all([
        ax.get(`${API}/superadmin/stats`),
        ax.get(`${API}/superadmin/companies`),
        ax.get(`${API}/superadmin/invoices`),
      ]);
      setStats(s.data);
      setCompanies(c.data);
      setInvoices(i.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/superadmin/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    await ax.post(`${API}/superadmin/logout`);
    navigate('/superadmin/login', { replace: true });
  };

  const handleAction = async (companyId, action) => {
    setProcessing(true);
    try {
      if (action === 'activate') await ax.put(`${API}/superadmin/companies/${companyId}/activate`);
      else if (action === 'deactivate') await ax.put(`${API}/superadmin/companies/${companyId}/deactivate`);
      else if (action === 'free') await ax.put(`${API}/superadmin/companies/${companyId}/free-subscription`);
      await loadData();
    } catch {} finally { setProcessing(false); }
  };

  const handleGenerateInvoice = async (companyId) => {
    setProcessing(true);
    try {
      await ax.post(`${API}/superadmin/invoices/generate/${companyId}`);
      await loadData();
    } catch {} finally { setProcessing(false); }
  };

  const handleRegisterPayment = async () => {
    if (!payDialog) return;
    setProcessing(true);
    try {
      await ax.post(`${API}/superadmin/invoices/${payDialog.invoice_id}/register-payment`, {
        paid_amount: parseFloat(payAmount)
      });
      setPayDialog(null);
      await loadData();
    } catch {} finally { setProcessing(false); }
  };

  if (loading) {
    return <div className="fixed inset-0 flex items-center justify-center bg-[#0f172a]"><div className="kiosk-spinner" /></div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overzicht', icon: BarChart3 },
    { id: 'companies', label: 'Bedrijven', icon: Building2 },
    { id: 'invoices', label: 'Facturen', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-[#f1f5f9] flex flex-col" data-testid="superadmin-dashboard">
      {/* Header */}
      <div className="bg-[#0f172a] px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#f97316] rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>Super Admin</h1>
            <p className="text-[#94a3b8] text-xs">Facturatie & Abonnementsbeheer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <p className="text-white text-sm font-medium">admin@facturatie.sr</p>
            <p className="text-[#94a3b8] text-xs">Prijs: {fmt(stats?.subscription_price)} p/m</p>
          </div>
          <button onClick={handleLogout} data-testid="sa-logout-btn"
            className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#e2e8f0] px-8 py-2 flex gap-2 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`sa-tab-${t.id}`}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t.id ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f8fafc]'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Totaal bedrijven', value: stats.total_companies, icon: Building2, color: 'bg-blue-50 text-blue-600' },
                { label: 'Actief', value: stats.active_companies, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
                { label: 'Proefperiode', value: stats.trial_companies, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
                { label: 'Gratis', value: stats.free_companies, icon: Gift, color: 'bg-purple-50 text-purple-600' },
                { label: 'Verlopen', value: stats.expired_companies, icon: AlertTriangle, color: 'bg-orange-50 text-orange-600' },
                { label: 'Gedeactiveerd', value: stats.deactivated_companies, icon: XCircle, color: 'bg-red-50 text-red-600' },
                { label: 'Totale omzet', value: fmt(stats.total_revenue), icon: CreditCard, color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Openstaande facturen', value: stats.pending_invoices, icon: FileText, color: 'bg-slate-50 text-slate-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-[#e2e8f0] p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-[#94a3b8] font-medium">{s.label}</p>
                    <p className="text-lg font-extrabold text-[#0f172a]">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
              <h3 className="font-bold text-[#0f172a] mb-3">Bankgegevens voor klanten</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-[#94a3b8]">Bank:</span> <strong>{stats.bank_name}</strong></div>
                <div><span className="text-[#94a3b8]">Rekening:</span> <strong>{stats.bank_account}</strong></div>
                <div><span className="text-[#94a3b8]">Omschrijving:</span> <strong>{stats.bank_reference}</strong></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'companies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-[#0f172a]">{companies.length} Bedrijven</h2>
            </div>
            {companies.map(c => (
              <div key={c.company_id} className="bg-white rounded-2xl border border-[#e2e8f0] p-6" data-testid={`sa-company-${c.company_id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1e3a8a] rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {c.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0f172a]">{c.name}</h3>
                      <p className="text-sm text-[#94a3b8]">{c.email}</p>
                      {c.address && <p className="text-xs text-[#94a3b8]">{c.address}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={c.subscription_status} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <div><span className="text-[#94a3b8]">Aangemeld:</span> <strong>{fmtDate(c.created_at)}</strong></div>
                  <div><span className="text-[#94a3b8]">Trial eindigt:</span> <strong>{fmtDate(c.trial_end)}</strong></div>
                  <div><span className="text-[#94a3b8]">Abonnement tot:</span> <strong>{fmtDate(c.subscription_end)}</strong></div>
                  <div><span className="text-[#94a3b8]">Kiosk URL:</span> <strong className="text-xs">/kiosk/{c.company_id}</strong></div>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {c.subscription_status !== 'active' && c.subscription_status !== 'free' && (
                    <button onClick={() => handleAction(c.company_id, 'activate')} disabled={processing} data-testid={`sa-activate-${c.company_id}`}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />Activeren (30d)
                    </button>
                  )}
                  {c.subscription_status !== 'deactivated' && (
                    <button onClick={() => handleAction(c.company_id, 'deactivate')} disabled={processing} data-testid={`sa-deactivate-${c.company_id}`}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />Deactiveren
                    </button>
                  )}
                  {c.subscription_status !== 'free' && (
                    <button onClick={() => handleAction(c.company_id, 'free')} disabled={processing} data-testid={`sa-free-${c.company_id}`}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5" />Gratis abonnement
                    </button>
                  )}
                  <button onClick={() => handleGenerateInvoice(c.company_id)} disabled={processing} data-testid={`sa-invoice-${c.company_id}`}
                    className="px-4 py-2 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-[#1e293b] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />Factuur genereren
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'invoices' && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-[#0f172a] mb-4">{invoices.length} Facturen</h2>
            {invoices.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center text-[#94a3b8]">
                Geen facturen. Genereer een factuur bij een bedrijf.
              </div>
            ) : invoices.map(inv => (
              <div key={inv.invoice_id} className="bg-white rounded-2xl border border-[#e2e8f0] p-6" data-testid={`sa-inv-${inv.invoice_id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-[#0f172a]">{inv.invoice_number}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inv.status === 'paid' ? 'Betaald' : 'Openstaand'}
                      </span>
                    </div>
                    <p className="text-sm text-[#94a3b8]">{inv.company_name} &middot; {inv.company_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-[#0f172a]">{fmt(inv.amount)}</p>
                    <p className="text-xs text-[#94a3b8]">{inv.description}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                  <div><span className="text-[#94a3b8]">Periode:</span> <strong>{fmtDate(inv.period_start)} - {fmtDate(inv.period_end)}</strong></div>
                  <div><span className="text-[#94a3b8]">Bank:</span> <strong>{inv.bank_name}</strong></div>
                  <div><span className="text-[#94a3b8]">Rekening:</span> <strong>{inv.bank_account}</strong></div>
                  <div><span className="text-[#94a3b8]">Omschrijving:</span> <strong>{inv.bank_reference}</strong></div>
                </div>
                {inv.status === 'paid' && (
                  <div className="mt-3 text-sm text-green-700 font-medium">
                    Betaald: {fmt(inv.paid_amount)} op {fmtDate(inv.paid_at)}
                  </div>
                )}
                {inv.status === 'pending' && (
                  <button onClick={() => { setPayDialog(inv); setPayAmount('3500'); }} data-testid={`sa-pay-${inv.invoice_id}`}
                    className="mt-4 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />Betaling registreren
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Betaling registreren</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="bg-[#f8fafc] rounded-xl p-4 text-sm space-y-1">
                <p><strong>Factuur:</strong> {payDialog.invoice_number}</p>
                <p><strong>Bedrijf:</strong> {payDialog.company_name}</p>
                <p><strong>Bedrag:</strong> {fmt(payDialog.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Ontvangen bedrag (SRD)</label>
                <input data-testid="sa-pay-amount" type="number" value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="kiosk-input" min="0" step="0.01" />
              </div>
              <button onClick={handleRegisterPayment} disabled={processing || !payAmount} data-testid="sa-pay-confirm"
                className="w-full h-12 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Betaling bevestigen
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
