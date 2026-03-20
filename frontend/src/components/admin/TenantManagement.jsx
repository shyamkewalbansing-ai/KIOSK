import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
          name: form.name,
          phone: form.phone,
          email: form.email,
          deposit_required: parseFloat(form.deposit_required) || 0,
          deposit_paid: parseFloat(form.deposit_paid) || 0,
        }, { withCredentials: true });
        toast.success('Huurder bijgewerkt');
      } else {
        await axios.post(`${API}/tenants`, {
          name: form.name,
          apartment_id: form.apartment_id,
          phone: form.phone,
          email: form.email,
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
    } catch (err) {
      toast.error('Fout bij verwijderen');
    }
  };

  const handleAddRent = async (tenant) => {
    try {
      await axios.put(`${API}/tenants/${tenant.tenant_id}`, {
        outstanding_rent: (tenant.outstanding_rent || 0) + tenant.monthly_rent,
        service_costs: (tenant.service_costs || 0) + (apartments.find(a => a.apartment_id === tenant.apartment_id)?.service_costs || 0),
      }, { withCredentials: true });
      toast.success(`Maandhuur toegevoegd voor ${tenant.name}`);
      fetchData();
    } catch {
      toast.error('Fout bij toevoegen huur');
    }
  };

  const vacantApartments = apartments.filter(a => a.status === 'vacant');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tenant-management">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{tenants.length} huurder(s)</p>
        <Button data-testid="add-tenant-btn" onClick={openCreate} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white rounded-xl h-10">
          <Plus className="w-4 h-4 mr-2" /> Nieuwe huurder
        </Button>
      </div>

      <div className="grid gap-3">
        {tenants.map((t) => (
          <Card key={t.tenant_id} className="border border-gray-200 shadow-sm rounded-2xl" data-testid={`tenant-card-${t.tenant_id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{t.name}</h3>
                  <p className="text-xs text-gray-500">
                    Appt. {t.apartment_number} | Code: {t.tenant_code} | Status: {t.status}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1">
                    {t.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{t.phone}</span>}
                    {t.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)} data-testid={`edit-tenant-${t.tenant_id}`}>
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.tenant_id)} data-testid={`delete-tenant-${t.tenant_id}`}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Openstaande huur</p>
                  <p className={`text-sm font-bold ${t.outstanding_rent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatSRD(t.outstanding_rent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Servicekosten</p>
                  <p className={`text-sm font-bold ${t.service_costs > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatSRD(t.service_costs)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Boetes</p>
                  <p className={`text-sm font-bold ${t.fines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatSRD(t.fines)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddRent(t)}
                  className="text-xs"
                  data-testid={`add-rent-${t.tenant_id}`}
                >
                  + Maandhuur toevoegen
                </Button>
                {t.outstanding_rent > t.monthly_rent && (
                  <span className="flex items-center text-xs text-amber-600 gap-1">
                    <AlertTriangle className="w-3 h-3" /> Achterstand
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl" data-testid="tenant-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editTenant ? 'Huurder bewerken' : 'Nieuwe huurder'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Naam</Label>
              <Input data-testid="tenant-name-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </div>
            {!editTenant && (
              <div>
                <Label>Appartement</Label>
                <Select value={form.apartment_id} onValueChange={(v) => setForm({...form, apartment_id: v})}>
                  <SelectTrigger data-testid="tenant-apartment-select">
                    <SelectValue placeholder="Kies appartement" />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantApartments.map(a => (
                      <SelectItem key={a.apartment_id} value={a.apartment_id}>
                        {a.number} - {formatSRD(a.monthly_rent)}/mnd
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefoon</Label>
                <Input data-testid="tenant-phone-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input data-testid="tenant-email-input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Borg vereist (SRD)</Label>
                <Input data-testid="deposit-required-input" type="number" value={form.deposit_required} onChange={(e) => setForm({...form, deposit_required: e.target.value})} />
              </div>
              <div>
                <Label>Borg betaald (SRD)</Label>
                <Input data-testid="deposit-paid-input" type="number" value={form.deposit_paid} onChange={(e) => setForm({...form, deposit_paid: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button data-testid="save-tenant-btn" onClick={handleSave} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white">
              {editTenant ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
