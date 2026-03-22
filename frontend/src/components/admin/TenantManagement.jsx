import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail, AlertTriangle, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [form, setForm] = useState({ name: '', apartment_id: '', phone: '', email: '', deposit_required: 0, deposit_paid: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        axios.get(`${API}/tenants`, { withCredentials: true }),
        axios.get(`${API}/apartments`, { withCredentials: true })
      ]);
      setTenants(tRes.data);
      setApartments(aRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditTenant(null);
    setForm({ name: '', apartment_id: '', phone: '', email: '', deposit_required: 0, deposit_paid: 0 });
    setDialogOpen(true);
  };

  const openEdit = (tenant) => {
    setEditTenant(tenant);
    setForm({
      name: tenant.name,
      apartment_id: tenant.apartment_id,
      phone: tenant.phone || '',
      email: tenant.email || '',
      deposit_required: tenant.deposit_required || 0,
      deposit_paid: tenant.deposit_paid || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editTenant) {
        await axios.put(`${API}/tenants/${editTenant.tenant_id}`, {
          name: form.name, phone: form.phone, email: form.email,
          deposit_required: parseFloat(form.deposit_required) || 0,
          deposit_paid: parseFloat(form.deposit_paid) || 0,
        }, { withCredentials: true });
        toast.success('Huurder bijgewerkt');
      } else {
        await axios.post(`${API}/tenants`, {
          name: form.name, apartment_id: form.apartment_id, phone: form.phone, email: form.email,
          deposit_required: parseFloat(form.deposit_required) || 0,
          deposit_paid: parseFloat(form.deposit_paid) || 0,
        }, { withCredentials: true });
        toast.success('Huurder aangemaakt');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Weet u zeker dat u deze huurder wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/tenants/${tenantId}`, { withCredentials: true });
      toast.success('Huurder verwijderd');
      fetchData();
    } catch {
      toast.error('Fout bij verwijderen');
    }
  };

  const handleAddRent = async (tenant) => {
    try {
      const aptServiceCosts = apartments.find(a => a.apartment_id === tenant.apartment_id)?.service_costs || 0;
      await axios.put(`${API}/tenants/${tenant.tenant_id}`, {
        outstanding_rent: (tenant.outstanding_rent || 0) + tenant.monthly_rent,
        service_costs: (tenant.service_costs || 0) + aptServiceCosts,
      }, { withCredentials: true });
      toast.success(`Maandhuur toegevoegd voor ${tenant.name}`);
      fetchData();
    } catch {
      toast.error('Fout bij toevoegen huur');
    }
  };

  const vacantApartments = apartments.filter(a => a.status === 'vacant');

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="kiosk-spinner" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="tenant-management">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg text-[#64748b] font-medium">{tenants.length} huurder(s) geregistreerd</p>
          <p className="text-sm text-[#94a3b8]" data-testid="current-month-label">
            Huurmaand: {new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button data-testid="add-tenant-btn" onClick={openCreate} className="kiosk-tab kiosk-tab-active">
          <Plus className="w-5 h-5 mr-2" /> Nieuwe huurder
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {tenants.map((t) => {
          const total = (t.outstanding_rent || 0) + (t.service_costs || 0) + (t.fines || 0);
          return (
            <div
              key={t.tenant_id}
              className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-6 hover:border-[#cbd5e1] transition-colors"
              data-testid={`tenant-card-${t.tenant_id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#1e3a8a] rounded-2xl flex items-center justify-center text-white font-extrabold text-xl">
                    {t.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0f172a]">{t.name}</h3>
                    <p className="text-sm text-[#94a3b8]">
                      Appt. {t.apartment_number} &middot; {t.tenant_code} &middot;
                      <span className={t.status === 'active' ? 'text-[#16a34a] font-bold' : 'text-[#94a3b8]'}> {t.status === 'active' ? 'Actief' : 'Inactief'}</span>
                    </p>
                    <div className="flex gap-4 text-sm text-[#94a3b8] mt-1">
                      {t.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{t.phone}</span>}
                      {t.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{t.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="kiosk-btn-icon w-10 h-10" onClick={() => openEdit(t)} data-testid={`edit-tenant-${t.tenant_id}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="kiosk-btn-icon w-10 h-10 text-[#dc2626] border-red-200 hover:bg-red-50" onClick={() => handleDelete(t.tenant_id)} data-testid={`delete-tenant-${t.tenant_id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Financial grid */}
              <div className="grid grid-cols-5 gap-3 pt-4 border-t border-[#f1f5f9]">
                <div className="bg-[#eff6ff] rounded-xl p-3 text-center">
                  <p className="text-xs text-[#94a3b8]">Maand</p>
                  <p className="text-xs font-bold text-[#1e3a8a]" data-testid={`rent-month-${t.tenant_id}`}>
                    {new Date().toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-[#f8fafc] rounded-xl p-3 text-center">
                  <p className="text-xs text-[#94a3b8]">Huur</p>
                  <p className={`text-sm font-extrabold ${t.outstanding_rent > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                    {formatSRD(t.outstanding_rent)}
                  </p>
                </div>
                <div className="bg-[#f8fafc] rounded-xl p-3 text-center">
                  <p className="text-xs text-[#94a3b8]">Service</p>
                  <p className={`text-sm font-extrabold ${t.service_costs > 0 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`}>
                    {formatSRD(t.service_costs)}
                  </p>
                </div>
                <div className="bg-[#f8fafc] rounded-xl p-3 text-center">
                  <p className="text-xs text-[#94a3b8]">Boetes</p>
                  <p className={`text-sm font-extrabold ${t.fines > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                    {formatSRD(t.fines)}
                  </p>
                </div>
                <div className="bg-[#1e3a8a]/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-[#94a3b8]">Totaal</p>
                  <p className="text-sm font-extrabold text-[#1e3a8a]">{formatSRD(total)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => handleAddRent(t)}
                  className="kiosk-tab text-sm h-10"
                  data-testid={`add-rent-${t.tenant_id}`}
                >
                  <DollarSign className="w-4 h-4 mr-1" /> + Maandhuur
                </button>
                {t.outstanding_rent > t.monthly_rent && (
                  <span className="flex items-center text-sm text-[#d97706] font-bold gap-1">
                    <AlertTriangle className="w-4 h-4" /> Achterstand
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl max-w-lg" data-testid="tenant-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editTenant ? 'Huurder bewerken' : 'Nieuwe huurder'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-bold text-[#64748b] mb-1 block">Naam</label>
              <input data-testid="tenant-name-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                className="kiosk-input" placeholder="Volledige naam" />
            </div>
            {!editTenant && (
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Appartement</label>
                <Select value={form.apartment_id} onValueChange={(v) => setForm({...form, apartment_id: v})}>
                  <SelectTrigger data-testid="tenant-apartment-select" className="h-14 rounded-xl border-2 text-base">
                    <SelectValue placeholder="Kies appartement" />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantApartments.map(a => (
                      <SelectItem key={a.apartment_id} value={a.apartment_id}>
                        {a.number} — {formatSRD(a.monthly_rent)}/mnd
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Telefoon</label>
                <input data-testid="tenant-phone-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="kiosk-input" placeholder="+597 ..." />
              </div>
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">E-mail</label>
                <input data-testid="tenant-email-input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                  className="kiosk-input" placeholder="email@..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Borg vereist (SRD)</label>
                <input data-testid="deposit-required-input" type="number" value={form.deposit_required}
                  onChange={(e) => setForm({...form, deposit_required: e.target.value})} className="kiosk-input" />
              </div>
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Borg betaald (SRD)</label>
                <input data-testid="deposit-paid-input" type="number" value={form.deposit_paid}
                  onChange={(e) => setForm({...form, deposit_paid: e.target.value})} className="kiosk-input" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setDialogOpen(false)} className="kiosk-btn-secondary h-14 px-8 text-base">Annuleren</button>
            <button data-testid="save-tenant-btn" onClick={handleSave} className="kiosk-btn-primary h-14 px-8 text-base">
              {editTenant ? 'Bijwerken' : 'Aanmaken'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
