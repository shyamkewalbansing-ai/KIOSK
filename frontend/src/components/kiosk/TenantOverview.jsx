import { ArrowLeft, User, AlertTriangle, CreditCard, Home, Wallet, FileText, ShieldCheck } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;
  const hasArrears = tenant.outstanding_rent > tenant.monthly_rent;

  return (
    <div className="kiosk-root bg-[#f8fafc]" data-testid="tenant-overview">
      {/* Top bar */}
      <div className="kiosk-topbar bg-white">
        <div className="flex items-center gap-4">
          <button data-testid="back-to-select-btn" onClick={onBack} className="kiosk-btn-icon">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl xl:text-3xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Uw overzicht
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Left - Tenant profile + action */}
        <div className="flex flex-col w-[420px] flex-shrink-0 gap-5">
          {/* Profile card */}
          <div className="bg-[#1e3a8a] rounded-3xl p-8 text-white">
            <div className="flex items-center gap-5 mb-5">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl xl:text-3xl font-extrabold" data-testid="tenant-name"
                  style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {tenant.name}
                </h2>
                <div className="flex items-center gap-2 text-white/70 text-base mt-1">
                  <Home className="w-5 h-5" />
                  <span data-testid="tenant-apartment">Appt. {tenant.apartment_number}</span>
                  <span className="opacity-40">|</span>
                  <span data-testid="tenant-code">{tenant.tenant_code}</span>
                </div>
              </div>
            </div>
            {/* Total prominent */}
            <div className="bg-white/10 rounded-2xl p-5 text-center">
              <p className="text-sm text-white/60 uppercase tracking-wide font-bold">Totaal te betalen</p>
              <p className="text-4xl xl:text-5xl font-extrabold mt-2" data-testid="total-amount">
                {formatSRD(total)}
              </p>
            </div>
          </div>

          {/* Arrears warning */}
          {hasArrears && (
            <div className="bg-[#fef3c7] border-2 border-[#fbbf24] rounded-2xl p-5 flex items-start gap-4" data-testid="arrears-warning">
              <AlertTriangle className="w-7 h-7 text-[#d97706] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-[#92400e] text-base">Achterstand</p>
                <p className="text-[#a16207] text-sm mt-1">
                  {formatSRD(tenant.outstanding_rent - tenant.monthly_rent)} boven huidige maandhuur
                </p>
              </div>
            </div>
          )}

          {/* Deposit status */}
          {tenant.deposit_required > 0 && (
            <div className="bg-white rounded-2xl border-2 border-[#e2e8f0] p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#f3e8ff] rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#7c3aed]" />
              </div>
              <div>
                <p className="text-sm text-[#94a3b8]">Borgsom</p>
                <p className="font-bold text-[#0f172a]">{formatSRD(tenant.deposit_paid)} / {formatSRD(tenant.deposit_required)}</p>
              </div>
            </div>
          )}

          {/* Pay button */}
          {hasDebt ? (
            <button
              data-testid="proceed-to-pay-btn"
              onClick={onPay}
              className="kiosk-btn-primary w-full mt-auto"
            >
              <CreditCard className="w-7 h-7 mr-4" />
              <span>Betalen</span>
            </button>
          ) : (
            <div className="bg-[#dcfce7] border-2 border-[#86efac] rounded-2xl p-8 text-center mt-auto">
              <p className="text-2xl font-extrabold text-[#166534]">Alles is betaald!</p>
              <p className="text-[#15803d] mt-2 text-lg">Geen openstaand saldo.</p>
            </div>
          )}
        </div>

        {/* Right - Financial breakdown */}
        <div className="flex-1 flex flex-col gap-4">
          <h3 className="text-sm uppercase tracking-widest text-[#94a3b8] font-bold">Financieel overzicht</h3>

          {/* Breakdown cards */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Monthly rent info */}
            <div className="kiosk-fin-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#eff6ff] rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-[#1e3a8a]" />
                </div>
                <p className="font-bold text-[#64748b]">Maandhuur</p>
              </div>
              <p className="text-3xl font-extrabold text-[#0f172a]" data-testid="monthly-rent">{formatSRD(tenant.monthly_rent)}</p>
              <p className="text-sm text-[#94a3b8] mt-2">per maand</p>
            </div>

            {/* Outstanding rent */}
            <div className={`kiosk-fin-card ${tenant.outstanding_rent > 0 ? 'border-[#fca5a5]' : 'border-[#86efac]'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tenant.outstanding_rent > 0 ? 'bg-[#fee2e2]' : 'bg-[#dcfce7]'}`}>
                  <FileText className={`w-6 h-6 ${tenant.outstanding_rent > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} />
                </div>
                <p className="font-bold text-[#64748b]">Openstaande huur</p>
              </div>
              <p className={`text-3xl font-extrabold ${tenant.outstanding_rent > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} data-testid="outstanding-rent">
                {formatSRD(tenant.outstanding_rent)}
              </p>
            </div>

            {/* Service costs */}
            <div className={`kiosk-fin-card ${tenant.service_costs > 0 ? 'border-[#fdba74]' : 'border-[#86efac]'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tenant.service_costs > 0 ? 'bg-[#fff7ed]' : 'bg-[#dcfce7]'}`}>
                  <Wallet className={`w-6 h-6 ${tenant.service_costs > 0 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`} />
                </div>
                <p className="font-bold text-[#64748b]">Servicekosten</p>
              </div>
              <p className={`text-3xl font-extrabold ${tenant.service_costs > 0 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`} data-testid="service-costs">
                {formatSRD(tenant.service_costs)}
              </p>
              <p className="text-sm text-[#94a3b8] mt-2">water, stroom, overig</p>
            </div>

            {/* Fines */}
            <div className={`kiosk-fin-card ${tenant.fines > 0 ? 'border-[#fca5a5]' : 'border-[#86efac]'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tenant.fines > 0 ? 'bg-[#fee2e2]' : 'bg-[#dcfce7]'}`}>
                  <AlertTriangle className={`w-6 h-6 ${tenant.fines > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} />
                </div>
                <p className="font-bold text-[#64748b]">Boetes</p>
              </div>
              <p className={`text-3xl font-extrabold ${tenant.fines > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} data-testid="fines-amount">
                {formatSRD(tenant.fines)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
