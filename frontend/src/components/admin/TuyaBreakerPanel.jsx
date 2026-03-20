import { useState, useEffect } from 'react';
import { Zap, ZapOff, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TuyaBreakerPanel() {
  const [breakers, setBreakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const fetchBreakers = async () => {
      try {
        const res = await axios.get(`${API}/breakers`, { withCredentials: true });
        setBreakers(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBreakers();
  }, []);

  const handleToggle = async (breaker) => {
    const newStatus = breaker.status === 'on' ? 'off' : 'on';
    setToggling(breaker.breaker_id);
    try {
      const res = await axios.post(`${API}/breakers/toggle`, {
        breaker_id: breaker.breaker_id,
        status: newStatus,
      }, { withCredentials: true });
      setBreakers(prev => prev.map(b => b.breaker_id === breaker.breaker_id ? res.data : b));
      toast.success(`${breaker.name} ${newStatus === 'on' ? 'ingeschakeld' : 'uitgeschakeld'}`);
    } catch {
      toast.error('Fout bij schakelen');
    } finally {
      setToggling(null);
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
    <div className="space-y-4" data-testid="tuya-breaker-panel">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Demo modus:</strong> Dit is een simulatie van de Tuya stroombreker-besturing. 
        De daadwerkelijke Tuya-integratie wordt later gekoppeld.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {breakers.map((b) => {
          const isOn = b.status === 'on';
          const isToggling = toggling === b.breaker_id;

          return (
            <Card key={b.breaker_id} className={`border-2 shadow-sm rounded-2xl transition-colors ${
              isOn ? 'border-green-200 bg-white' : 'border-red-200 bg-red-50/30'
            }`} data-testid={`breaker-card-${b.breaker_id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isOn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{b.name}</h3>
                      <p className="text-xs text-gray-500">Appt. {b.apartment_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${isOn ? 'text-green-700' : 'text-red-700'}`}>
                      {isOn ? 'AAN' : 'UIT'}
                    </span>
                    {isToggling ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                      <Switch
                        data-testid={`breaker-toggle-${b.breaker_id}`}
                        checked={isOn}
                        onCheckedChange={() => handleToggle(b)}
                      />
                    )}
                  </div>
                </div>
                {b.last_toggled && (
                  <p className="text-xs text-gray-400 mt-2">
                    Laatst geschakeld: {new Date(b.last_toggled).toLocaleString('nl-NL')}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
