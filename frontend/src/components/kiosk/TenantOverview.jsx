import { ArrowLeft, User, Home, AlertTriangle, CreditCard } from 'lucide-react';

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;

  return (
    <div className="kiosk-root bg-white flex flex-col" data-testid="tenant-overview">
      {/* Top bar */}
      <div className="kiosk-topbar">
        <div className="flex items-center gap-4">
          <button data-testid="back-to-select-btn" onClick={onBack} className="kiosk-btn-icon">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl xl:text-3xl font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Uw overzicht
          </h1>
        </div>
      </div>

      {/* Content - split layout */}
      <div className="flex-1 flex">
        {/* Left - Tenant info */}
        <div className="flex-1 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-5 mb-8">
            <div className="w-20 h-20 bg-[#1e3a8a] rounded-3xl flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl xl:text-4xl font-extrabold text-[#0f172a]" data-testid="tenant-name"
                style={{ fontFamily: 'Manrope, sans-serif' }}>
                {tenant.name}
              </h2>
              <div className="flex items-center gap-3 text-lg text-[#64748b] mt-1">
                <Home className="w-5 h-5" />
                <span data-testid="tenant-apartment">Appartement {tenant.apartment_number}</span>
                <span className="text-[#cbd5e1]">|</span>
                <span data-testid="tenant-code">{tenant.tenant_code}</span>
              </div>
            </div>
          </div>

          {/* Arrears warning */}
          {tenant.outstanding_rent > tenant.monthly_rent && (
            <div className="bg-[#fef3c7] border-2 border-[#fbbf24] rounded-2xl p-5 flex items-start gap-4 mb-6" data-testid="arrears-warning">
              <AlertTriangle className="w-7 h-7 text-[#d97706] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#92400e] text-lg">Achterstand</p>
                <p className="text-[#a16207] mt-1">
                  U heeft {formatSRD(tenant.outstanding_rent - tenant.monthly_rent)} achterstand.
                </p>
              </div>
            </div>
          )}

          {/* Pay button */}
          {hasDebt ? (
            <button
              data-testid="proceed-to-pay-btn"
              onClick={onPay}
              className="kiosk-btn-primary w-fit mt-4"
            >
              <CreditCard className="w-7 h-7 mr-4" />
              <span>Betalen</span>
            </button>
          ) : (
            <div className="bg-[#dcfce7] border-2 border-[#86efac] rounded-2xl p-8 text-center mt-4">
              <p className="text-2xl font-bold text-[#166534]">Alles is betaald!</p>
              <p className="text-[#15803d] mt-2 text-lg">U heeft geen openstaand saldo.</p>
            </div>
          )}
        </div>

        {/* Right - Financial details */}
        <div className="hidden lg:flex flex-1 bg-[#f8fafc] border-l border-[#e2e8f0] flex-col justify-center px-12 xl:px-16">
          <h3 className="text-sm uppercase tracking-widest text-[#94a3b8] font-bold mb-8">Financieel overzicht</h3>

          <div className="space-y-5">
            <div className="kiosk-fin-row">
              <span className="text-[#64748b] text-lg">Maandhuur</span>
              <span className="font-bold text-xl text-[#0f172a]" data-testid="monthly-rent">{formatSRD(tenant.monthly_rent)}</span>
            </div>
            <div className="kiosk-fin-row">
              <span className="text-[#64748b] text-lg">Openstaande huur</span>
              <span className={`font-extrabold text-xl ${tenant.outstanding_rent > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} data-testid="outstanding-rent">
                {formatSRD(tenant.outstanding_rent)}
              </span>
            </div>
            <div className="kiosk-fin-row">
              <span className="text-[#64748b] text-lg">Servicekosten</span>
              <span className={`font-bold text-xl ${tenant.service_costs > 0 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`} data-testid="service-costs">
                {formatSRD(tenant.service_costs)}
              </span>
            </div>
            <div className="kiosk-fin-row">
              <span className="text-[#64748b] text-lg">Boetes</span>
              <span className={`font-bold text-xl ${tenant.fines > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`} data-testid="fines-amount">
                {formatSRD(tenant.fines)}
              </span>
            </div>

            <div className="border-t-2 border-[#e2e8f0] pt-5">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-[#0f172a]">Totaal te betalen</span>
                <span className="text-3xl font-extrabold text-[#1e3a8a]" data-testid="total-amount">{formatSRD(total)}</span>
              </div>
            </div>

            {tenant.deposit_required > 0 && (
              <div className="pt-4 border-t border-[#e2e8f0]">
                <div className="flex justify-between text-base">
                  <span className="text-[#94a3b8]">Borg betaald</span>
                  <span className="text-[#64748b] font-medium">
                    {formatSRD(tenant.deposit_paid)} / {formatSRD(tenant.deposit_required)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
