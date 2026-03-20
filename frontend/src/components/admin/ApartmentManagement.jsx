import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditApt(null);
    setForm({ number: '', floor: 0, monthly_rent: 0, service_costs: 0, description: '' });
    setDialogOpen(true);
  };

  const openEdit = (apt) => {
    setEditApt(apt);
    setForm({
      number: apt.number,
      floor: apt.floor || 0,
      monthly_rent: apt.monthly_rent,
      service_costs: apt.service_costs,
      description: apt.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        number: form.number,
        floor: parseInt(form.floor) || 0,
        monthly_rent: parseFloat(form.monthly_rent) || 0,
        service_costs: parseFloat(form.service_costs) || 0,
        description: form.description,
      };
      if (editApt) {
        await axios.put(`${API}/apartments/${editApt.apartment_id}`, payload, { withCredentials: true });
        toast.success('Appartement bijgewerkt');
      } else {
        await axios.post(`${API}/apartments`, payload, { withCredentials: true });
        toast.success('Appartement aangemaakt');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fout bij opslaan');
    }
  };

  const handleDelete = async (aptId) => {
    if (!window.confirm('Weet u zeker dat u dit appartement wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/apartments/${aptId}`, { withCredentials: true });
      toast.success('Appartement verwijderd');
      fetchData();
    } catch (err) {
      toast.error('Fout bij verwijderen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="apartment-management">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{apartments.length} appartement(en)</p>
        <Button data-testid="add-apartment-btn" onClick={openCreate} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white rounded-xl h-10">
          <Plus className="w-4 h-4 mr-2" /> Nieuw appartement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {apartments.map((apt) => (
          <Card key={apt.apartment_id} className="border border-gray-200 shadow-sm rounded-2xl" data-testid={`apt-card-${apt.apartment_id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#1e3a8a]">{apt.number}</h3>
                  <p className="text-xs text-gray-500">Verdieping {apt.floor}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  apt.status === 'occupied' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {apt.status === 'occupied' ? 'Bewoond' : 'Leeg'}
                </span>
              </div>
              {apt.description && <p className="text-xs text-gray-500 mt-2">{apt.description}</p>}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Maandhuur</p>
                  <p className="text-sm font-bold text-gray-900">{formatSRD(apt.monthly_rent)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Servicekosten</p>
                  <p className="text-sm font-bold text-gray-900">{formatSRD(apt.service_costs)}</p>
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                <Button variant="ghost" size="sm" onClick={() => openEdit(apt)} data-testid={`edit-apt-${apt.apartment_id}`}>
                  <Pencil className="w-4 h-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(apt.apartment_id)} data-testid={`delete-apt-${apt.apartment_id}`}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl" data-testid="apartment-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editApt ? 'Appartement bewerken' : 'Nieuw appartement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nummer</Label>
                <Input data-testid="apt-number-input" value={form.number} onChange={(e) => setForm({...form, number: e.target.value})} placeholder="bijv. A101" />
              </div>
              <div>
                <Label>Verdieping</Label>
                <Input data-testid="apt-floor-input" type="number" value={form.floor} onChange={(e) => setForm({...form, floor: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Maandhuur (SRD)</Label>
                <Input data-testid="apt-rent-input" type="number" value={form.monthly_rent} onChange={(e) => setForm({...form, monthly_rent: e.target.value})} />
              </div>
              <div>
                <Label>Servicekosten (SRD)</Label>
                <Input data-testid="apt-service-input" type="number" value={form.service_costs} onChange={(e) => setForm({...form, service_costs: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Omschrijving</Label>
              <Input data-testid="apt-desc-input" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="bijv. 3-kamer met balkon" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button data-testid="save-apt-btn" onClick={handleSave} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white">
              {editApt ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
