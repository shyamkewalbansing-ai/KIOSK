import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="text-center space-y-8 py-8" data-testid="welcome-screen">
      {/* Hero */}
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-[#1e3a8a] rounded-2xl flex items-center justify-center shadow-lg">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1e3a8a] tracking-tight"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Welkom
        </h1>
        <p className="text-base md:text-lg text-gray-500 max-w-sm mx-auto">
          Betaal uw huur, servicekosten en meer via deze zelfbedieningskiosk
        </p>
      </div>

      {/* Action */}
      <div className="space-y-4">
        <Button
          data-testid="start-payment-btn"
          onClick={onStart}
          className="h-16 px-12 text-xl font-bold uppercase tracking-wide bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl shadow-md active:scale-95 transition-transform duration-100"
        >
          Start Betaling
          <ArrowRight className="ml-3 w-6 h-6" />
        </Button>
        <p className="text-sm text-gray-400">Druk op de knop om te beginnen</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3 pt-4">
        {[
          { label: 'Huur', desc: 'Maandhuur betalen' },
          { label: 'Kosten', desc: 'Water & stroom' },
          { label: 'Boetes', desc: 'Achterstand betalen' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-200 p-4 text-center"
          >
            <p className="font-bold text-[#1e3a8a] text-sm">{item.label}</p>
            <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
