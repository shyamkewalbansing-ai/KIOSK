import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ApartmentManagement() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editApt, setEditApt] = useState(null);
  const [form, setForm] = useState({ number: '', floor: 0, monthly_rent: 0, service_costs: 0, description: '' });

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/apartments`, { withCredentials: true });
      setApartments(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditApt(null);
    setForm({ number: '', floor: 0, monthly_rent: 0, service_costs: 0, description: '' });
    setDialogOpen(true);
  };

  const openEdit = (apt) => {
    setEditApt(apt);
    setForm({ number: apt.number, floor: apt.floor || 0, monthly_rent: apt.monthly_rent, service_costs: apt.service_costs, description: apt.description || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { number: form.number, floor: parseInt(form.floor) || 0, monthly_rent: parseFloat(form.monthly_rent) || 0, service_costs: parseFloat(form.service_costs) || 0, description: form.description };
      if (editApt) {
        await axios.put(`${API}/apartments/${editApt.apartment_id}`, payload, { withCredentials: true });
        toast.success('Appartement bijgewerkt');
      } else {
        await axios.post(`${API}/apartments`, payload, { withCredentials: true });
        toast.success('Appartement aangemaakt');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Fout bij opslaan'); }
  };

  const handleDelete = async (aptId) => {
    if (!window.confirm('Weet u zeker dat u dit appartement wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/apartments/${aptId}`, { withCredentials: true });
      toast.success('Appartement verwijderd');
      fetchData();
    } catch { toast.error('Fout bij verwijderen'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="kiosk-spinner" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="apartment-management">
      <div className="flex items-center justify-between">
        <p className="text-lg text-[#64748b] font-medium">{apartments.length} appartement(en)</p>
        <button data-testid="add-apartment-btn" onClick={openCreate} className="kiosk-tab kiosk-tab-active">
          <Plus className="w-5 h-5 mr-2" /> Nieuw appartement
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {apartments.map((apt) => (
          <div
            key={apt.apartment_id}
            className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-6 hover:border-[#cbd5e1] transition-colors"
            data-testid={`apt-card-${apt.apartment_id}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-3xl font-extrabold text-[#1e3a8a]">{apt.number}</h3>
                <p className="text-sm text-[#94a3b8]">Verdieping {apt.floor}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                apt.status === 'occupied' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#f1f5f9] text-[#94a3b8]'
              }`}>
                {apt.status === 'occupied' ? 'Bewoond' : 'Leeg'}
              </span>
            </div>

            {apt.description && <p className="text-sm text-[#94a3b8] mb-3">{apt.description}</p>}

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#f1f5f9]">
              <div className="bg-[#f8fafc] rounded-xl p-3 text-center">
                <p className="text-xs text-[#94a3b8]">Maandhuur</p>
                <p className="text-base font-extrabold text-[#0f172a]">{formatSRD(apt.monthly_rent)}</p>
              </div>
              <div className="bg-[#f8fafc] rounded-xl p-3 text-center">
                <p className="text-xs text-[#94a3b8]">Service</p>
                <p className="text-base font-extrabold text-[#0f172a]">{formatSRD(apt.service_costs)}</p>
              </div>
            </div>

            <div className="flex gap-1 mt-3">
              <button className="kiosk-btn-icon w-10 h-10" onClick={() => openEdit(apt)} data-testid={`edit-apt-${apt.apartment_id}`}>
                <Pencil className="w-4 h-4" />
              </button>
              <button className="kiosk-btn-icon w-10 h-10 text-[#dc2626] border-red-200 hover:bg-red-50" onClick={() => handleDelete(apt.apartment_id)} data-testid={`delete-apt-${apt.apartment_id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl max-w-lg" data-testid="apartment-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editApt ? 'Appartement bewerken' : 'Nieuw appartement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Nummer</label>
                <input data-testid="apt-number-input" value={form.number} onChange={(e) => setForm({...form, number: e.target.value})}
                  className="kiosk-input" placeholder="bijv. A101" />
              </div>
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Verdieping</label>
                <input data-testid="apt-floor-input" type="number" value={form.floor} onChange={(e) => setForm({...form, floor: e.target.value})}
                  className="kiosk-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Maandhuur (SRD)</label>
                <input data-testid="apt-rent-input" type="number" value={form.monthly_rent} onChange={(e) => setForm({...form, monthly_rent: e.target.value})}
                  className="kiosk-input" />
              </div>
              <div>
                <label className="text-sm font-bold text-[#64748b] mb-1 block">Servicekosten (SRD)</label>
                <input data-testid="apt-service-input" type="number" value={form.service_costs} onChange={(e) => setForm({...form, service_costs: e.target.value})}
                  className="kiosk-input" />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-[#64748b] mb-1 block">Omschrijving</label>
              <input data-testid="apt-desc-input" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                className="kiosk-input" placeholder="bijv. 3-kamer met balkon" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setDialogOpen(false)} className="kiosk-btn-secondary h-14 px-8 text-base">Annuleren</button>
            <button data-testid="save-apt-btn" onClick={handleSave} className="kiosk-btn-primary h-14 px-8 text-base">
              {editApt ? 'Bijwerken' : 'Aanmaken'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
