import { Building2, LogIn, UserPlus, ArrowRight, Shield, BarChart3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-auto" data-testid="landing-page">
      {/* Top bar */}
      <div className="kiosk-topbar flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#f97316] rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Appartement Kiosk
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/login')}
            data-testid="landing-login-btn"
            className="kiosk-tab kiosk-tab-active"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Inloggen
          </button>
          <button
            onClick={() => navigate('/register')}
            data-testid="landing-register-btn"
            className="kiosk-btn-primary h-12 text-base px-6"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Registreren
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col justify-center px-16 xl:px-24">
          <div className="inline-flex items-center gap-2 bg-[#eff6ff] text-[#1e3a8a] text-sm font-bold px-4 py-2 rounded-full w-fit mb-6">
            <Shield className="w-4 h-4" />
            SaaS Platform voor Vastgoedbeheer
          </div>
          <h1
            className="text-5xl xl:text-7xl font-extrabold text-[#0f172a] leading-tight tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Huur Betalings<br />
            <span className="text-[#f97316]">Kiosk</span>
          </h1>
          <p className="text-xl xl:text-2xl text-[#64748b] mt-6 max-w-lg leading-relaxed">
            Zelfbedieningskiosk voor uw huurders. Beheer meerdere panden, huurders en betalingen vanuit één platform.
          </p>

          <div className="flex gap-4 mt-10">
            <button
              onClick={() => navigate('/register')}
              data-testid="hero-register-btn"
              className="kiosk-btn-primary"
            >
              <span>Gratis starten</span>
              <ArrowRight className="w-6 h-6 ml-3" />
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              data-testid="hero-login-btn"
              className="kiosk-btn-secondary h-16 px-8 text-lg"
            >
              Inloggen
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="hidden lg:flex flex-1 bg-[#1e3a8a] rounded-tl-[60px] items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 right-20 w-80 h-80 bg-white rounded-full" />
            <div className="absolute bottom-10 left-10 w-60 h-60 bg-[#f97316] rounded-full" />
          </div>
          <div className="relative z-10 text-center text-white px-12">
            <Building2 className="w-24 h-24 mx-auto mb-8 opacity-90" />
            <h2 className="text-3xl xl:text-4xl font-bold mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Uw eigen kiosk
            </h2>
            <p className="text-lg opacity-80 max-w-sm mx-auto mb-8">
              Elk bedrijf krijgt een unieke kiosk-URL voor hun huurders
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 text-left max-w-xs mx-auto">
              <p className="text-xs opacity-60 mb-1">Uw kiosk URL</p>
              <p className="font-mono text-sm opacity-90">/kiosk/uw-bedrijf-id</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-16 py-8 flex-shrink-0">
        <div className="flex gap-6">
          {[
            { icon: Building2, label: 'Multi-Pand Beheer', desc: 'Beheer al uw gebouwen vanuit één dashboard' },
            { icon: Users, label: 'Huurder Kiosk', desc: 'Zelfbediening voor huur en servicekosten' },
            { icon: BarChart3, label: 'Realtime Overzicht', desc: 'Direct inzicht in betalingen en achterstand' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 bg-white rounded-2xl border border-[#e2e8f0] px-6 py-5 flex-1"
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
