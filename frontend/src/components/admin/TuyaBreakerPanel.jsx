import { useState, useEffect } from 'react';
import { Zap, ZapOff, Loader2 } from 'lucide-react';
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
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchBreakers();
  }, []);

  const handleToggle = async (breaker) => {
    const newStatus = breaker.status === 'on' ? 'off' : 'on';
    setToggling(breaker.breaker_id);
    try {
      const res = await axios.post(`${API}/breakers/toggle`, {
        breaker_id: breaker.breaker_id, status: newStatus,
      }, { withCredentials: true });
      setBreakers(prev => prev.map(b => b.breaker_id === breaker.breaker_id ? res.data : b));
      toast.success(`${breaker.name} ${newStatus === 'on' ? 'ingeschakeld' : 'uitgeschakeld'}`);
    } catch { toast.error('Fout bij schakelen'); }
    finally { setToggling(null); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="kiosk-spinner" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="tuya-breaker-panel">
      <div className="bg-[#fef3c7] border-2 border-[#fbbf24] rounded-2xl p-5 flex items-start gap-4">
        <Zap className="w-6 h-6 text-[#d97706] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#92400e] text-base">Demo modus</p>
          <p className="text-[#a16207] text-sm mt-1">Dit is een simulatie van de Tuya stroombreker-besturing. De daadwerkelijke integratie wordt later gekoppeld.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {breakers.map((b) => {
          const isOn = b.status === 'on';
          const isToggling = toggling === b.breaker_id;

          return (
            <div
              key={b.breaker_id}
              className={`bg-white rounded-2xl border-3 p-6 transition-colors ${
                isOn ? 'border-[#86efac]' : 'border-[#fca5a5]'
              }`}
              style={{ borderWidth: '3px' }}
              data-testid={`breaker-card-${b.breaker_id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isOn ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-[#dc2626]'
                  }`}>
                    {isOn ? <Zap className="w-7 h-7" /> : <ZapOff className="w-7 h-7" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-[#0f172a]">{b.name}</h3>
                    <p className="text-sm text-[#94a3b8]">Appt. {b.apartment_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-base font-extrabold ${isOn ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                    {isOn ? 'AAN' : 'UIT'}
                  </span>
                  {isToggling ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[#94a3b8]" />
                  ) : (
                    <Switch
                      data-testid={`breaker-toggle-${b.breaker_id}`}
                      checked={isOn}
                      onCheckedChange={() => handleToggle(b)}
                      className="scale-125"
                    />
                  )}
                </div>
              </div>
              {b.last_toggled && (
                <p className="text-xs text-[#94a3b8] mt-3 pt-3 border-t border-[#f1f5f9]">
                  Laatst geschakeld: {new Date(b.last_toggled).toLocaleString('nl-NL')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
