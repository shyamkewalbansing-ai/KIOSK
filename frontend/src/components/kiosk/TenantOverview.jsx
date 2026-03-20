import { ArrowLeft, User, Home, AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/button';

function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TenantOverview({ tenant, onBack, onPay }) {
  if (!tenant) return null;

  const total = (tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0);
  const hasDebt = total > 0;

  return (
    <div className="space-y-6" data-testid="tenant-overview">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          data-testid="back-to-select-btn"
          variant="ghost"
          onClick={onBack}
          className="h-12 w-12 rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a8a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Overzicht
        </h2>
      </div>

      {/* Tenant info card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-[#1e3a8a] rounded-xl flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900" data-testid="tenant-name">{tenant.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Home className="w-4 h-4" />
              <span data-testid="tenant-apartment">Appartement {tenant.apartment_number}</span>
              <span className="text-gray-300">|</span>
              <span data-testid="tenant-code">Code: {tenant.tenant_code}</span>
            </div>
          </div>
        </div>

        {/* Financial overview */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Maandhuur</span>
            <span className="font-semibold" data-testid="monthly-rent">{formatSRD(tenant.monthly_rent)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Openstaande huur</span>
            <span className={`font-bold ${tenant.outstanding_rent > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="outstanding-rent">
              {formatSRD(tenant.outstanding_rent)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Servicekosten</span>
            <span className={`font-semibold ${tenant.service_costs > 0 ? 'text-orange-600' : 'text-green-600'}`} data-testid="service-costs">
              {formatSRD(tenant.service_costs)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Boetes</span>
            <span className={`font-semibold ${tenant.fines > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="fines-amount">
              {formatSRD(tenant.fines)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="text-lg font-bold text-gray-900">Totaal te betalen</span>
            <span className="text-lg font-bold text-[#1e3a8a]" data-testid="total-amount">{formatSRD(total)}</span>
          </div>
        </div>

        {/* Deposit info */}
        {tenant.deposit_required > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Borg betaald</span>
            <span className="text-gray-700">
              {formatSRD(tenant.deposit_paid)} / {formatSRD(tenant.deposit_required)}
            </span>
          </div>
        )}
      </div>

      {/* Arrears warning */}
      {tenant.outstanding_rent > tenant.monthly_rent && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3" data-testid="arrears-warning">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Achterstand gedetecteerd</p>
            <p className="text-xs text-amber-700 mt-1">
              U heeft een achterstand van {formatSRD(tenant.outstanding_rent - tenant.monthly_rent)} boven de huidige maandhuur.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      {hasDebt ? (
        <Button
          data-testid="proceed-to-pay-btn"
          onClick={onPay}
          className="w-full h-16 text-xl font-bold bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl shadow-md active:scale-95 transition-transform"
        >
          <CreditCard className="w-6 h-6 mr-3" />
          Betalen
        </Button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-green-700 font-bold">Alles is betaald!</p>
          <p className="text-green-600 text-sm mt-1">U heeft geen openstaand saldo.</p>
        </div>
      )}
    </div>
  );
}
