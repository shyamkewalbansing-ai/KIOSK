function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Volledige huur',
  partial_rent: 'Gedeeltelijke betaling',
  service_costs: 'Servicekosten',
  fines: 'Boetes',
  deposit: 'Borgsom',
};

export default function ReceiptTicket({ payment, tenant, preview = false }) {
  if (!payment) return null;

  const date = new Date(payment.created_at);
  const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`${preview ? '' : 'receipt-only'}`}
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', lineHeight: '1.4', width: preview ? '100%' : '80mm' }}
      data-testid="receipt-ticket"
    >
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: '8px', marginBottom: '8px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>APPARTEMENT KIOSK</div>
        <div style={{ fontSize: '10px', color: '#666' }}>Huurbetalingssysteem</div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
          {dateStr} {timeStr}
        </div>
      </div>

      {/* Receipt number */}
      <div style={{ textAlign: 'center', padding: '6px 0', borderBottom: '1px dashed #ccc', marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', color: '#666' }}>BONNUMMER</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{payment.receipt_number}</div>
      </div>

      {/* Tenant info */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Huurder:</span>
          <span style={{ fontWeight: 'bold' }}>{payment.tenant_name || tenant?.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Appart.:</span>
          <span style={{ fontWeight: 'bold' }}>{payment.apartment_number || tenant?.apartment_number}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Code:</span>
          <span>{payment.tenant_code || tenant?.tenant_code}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

      {/* Payment details */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Type:</span>
          <span>{TYPE_LABELS[payment.payment_type] || payment.payment_type}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Methode:</span>
          <span>Contant</span>
        </div>
        {payment.description && (
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
            {payment.description}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2px solid #000', margin: '8px 0' }} />

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
        <span>TOTAAL:</span>
        <span>{formatSRD(payment.amount)}</span>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2px solid #000', margin: '8px 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', paddingTop: '8px' }}>
        <div>Bedankt voor uw betaling!</div>
        <div style={{ marginTop: '4px' }}>Bewaar deze bon als bewijs</div>
        <div style={{ marginTop: '8px', fontSize: '9px' }}>--- Einde bon ---</div>
      </div>
    </div>
  );
}
