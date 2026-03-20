import { Building2, ArrowRight, Banknote, Droplets, Receipt, Settings } from 'lucide-react';

export default function WelcomeScreen({ onStart, companyName, companyId }) {
  return (
    <div className="kiosk-root bg-white" data-testid="welcome-screen">
      <div className="kiosk-topbar">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f97316] rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {companyName || 'Appartement Kiosk'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-base text-[#94a3b8]">
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <a
            href="/admin/login"
            data-testid="admin-login-link"
            className="kiosk-btn-icon w-11 h-11 opacity-40 hover:opacity-100 transition-opacity"
            title="Beheerder"
          >
            <Settings className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col justify-center px-16 xl:px-24">
          <h1
            className="text-5xl xl:text-7xl font-extrabold text-[#0f172a] leading-tight tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Welkom
          </h1>
          <p className="text-xl xl:text-2xl text-[#64748b] mt-4 max-w-lg leading-relaxed">
            Betaal uw huur, servicekosten en meer via deze zelfbedieningskiosk.
          </p>

          <button
            data-testid="start-payment-btn"
            onClick={onStart}
            className="mt-10 kiosk-btn-primary w-fit"
          >
            <span>Start</span>
            <ArrowRight className="w-8 h-8 ml-4" />
          </button>
        </div>

        <div className="hidden lg:flex flex-1 bg-[#1e3a8a] rounded-tl-[60px] items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 right-20 w-80 h-80 bg-white rounded-full" />
            <div className="absolute bottom-10 left-10 w-60 h-60 bg-[#f97316] rounded-full" />
          </div>
          <div className="relative z-10 text-center text-white px-12">
            <Building2 className="w-24 h-24 mx-auto mb-8 opacity-90" />
            <h2 className="text-3xl xl:text-4xl font-bold mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {companyName || 'Huurbetalingen'}
            </h2>
            <p className="text-lg opacity-80 max-w-sm mx-auto">
              Snel, eenvoudig en veilig uw huur betalen
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-16 py-6 flex-shrink-0">
        <p className="text-sm text-[#94a3b8] uppercase tracking-widest font-bold mb-4">Beschikbare diensten</p>
        <div className="flex gap-4">
          {[
            { icon: Banknote, label: 'Maandhuur', desc: 'Volledige of gedeeltelijke huur' },
            { icon: Droplets, label: 'Servicekosten', desc: 'Water, stroom & overige' },
            { icon: Receipt, label: 'Boetes & Achterstand', desc: 'Openstaande bedragen' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 bg-white rounded-2xl border border-[#e2e8f0] px-6 py-4 flex-1"
            >
              <div className="w-12 h-12 bg-[#eff6ff] rounded-xl flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-[#1e3a8a]" />
              </div>
              <div>
                <p className="font-bold text-[#0f172a] text-sm">{item.label}</p>
                <p className="text-xs text-[#94a3b8]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
