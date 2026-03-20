function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Huurbetaling',
  partial_rent: 'Gedeeltelijke huurbetaling',
  service_costs: 'Servicekosten',
  fines: 'Boetes / Achterstand',
  deposit: 'Borgsom',
};

export default function KwitantieTicket({ payment, tenant, preview = false }) {
  if (!payment) return null;

  const date = new Date(payment.created_at);
  const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';

  return (
    <div
      className={preview ? '' : 'receipt-only'}
      style={{
        fontFamily: "'Manrope', sans-serif",
        width: preview ? '100%' : '80mm',
        color: '#0f172a',
        lineHeight: 1.5,
        fontSize: preview ? '11px' : '12px',
      }}
      data-testid="kwitantie-ticket"
    >
      {/* === HEADER === */}
      <div style={{ textAlign: 'center', paddingBottom: 12, borderBottom: '2px solid #0f172a' }}>
        <div style={{ fontSize: preview ? 16 : 18, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Appartement Kiosk
        </div>
        <div style={{ fontSize: preview ? 9 : 10, color: '#64748b', marginTop: 2 }}>
          Huurbetalingssysteem &middot; Suriname
        </div>
      </div>

      {/* === KWITANTIE TITEL === */}
      <div style={{ textAlign: 'center', padding: '14px 0', borderBottom: '1px dashed #94a3b8' }}>
        <div style={{ fontSize: preview ? 20 : 22, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          KWITANTIE
        </div>
        <div style={{ fontSize: preview ? 10 : 11, color: '#64748b', marginTop: 4 }}>
          Nr: <span style={{ fontWeight: 700, color: '#0f172a' }}>{kwNr}</span>
        </div>
        <div style={{ fontSize: preview ? 9 : 10, color: '#94a3b8', marginTop: 2 }}>
          {dateStr} om {timeStr}
        </div>
      </div>

      {/* === ONTVANGEN VAN === */}
      <div style={{ padding: '12px 0', borderBottom: '1px dashed #94a3b8' }}>
        <div style={{ fontSize: preview ? 8 : 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Ontvangen van
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 0', color: '#64748b', width: '40%' }}>Naam:</td>
              <td style={{ padding: '3px 0', fontWeight: 700, textAlign: 'right' }}>{payment.tenant_name || tenant?.name}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', color: '#64748b' }}>Appartement:</td>
              <td style={{ padding: '3px 0', fontWeight: 700, textAlign: 'right' }}>{payment.apartment_number || tenant?.apartment_number}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', color: '#64748b' }}>Huurderscode:</td>
              <td style={{ padding: '3px 0', fontWeight: 600, textAlign: 'right' }}>{payment.tenant_code || tenant?.tenant_code}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* === BETALING DETAILS === */}
      <div style={{ padding: '12px 0', borderBottom: '1px dashed #94a3b8' }}>
        <div style={{ fontSize: preview ? 8 : 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Betaling
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 0', color: '#64748b' }}>Type:</td>
              <td style={{ padding: '3px 0', fontWeight: 600, textAlign: 'right' }}>{TYPE_LABELS[payment.payment_type] || payment.payment_type}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', color: '#64748b' }}>Methode:</td>
              <td style={{ padding: '3px 0', fontWeight: 600, textAlign: 'right' }}>Contant</td>
            </tr>
            {payment.description && (
              <tr>
                <td colSpan={2} style={{ padding: '3px 0', color: '#64748b', fontSize: preview ? 9 : 10 }}>
                  {payment.description}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === BEDRAG === */}
      <div style={{ padding: '14px 0', borderBottom: '2px solid #0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: preview ? 14 : 16, fontWeight: 800, textTransform: 'uppercase' }}>Totaal bedrag</span>
          <span style={{ fontSize: preview ? 18 : 20, fontWeight: 800 }}>{formatSRD(payment.amount)}</span>
        </div>
      </div>

      {/* === BEDRIJFSSTEMPEL === */}
      <div style={{ padding: '16px 0 12px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          border: '3px solid #1e3a8a',
          borderRadius: 12,
          padding: '10px 20px',
          position: 'relative',
          transform: 'rotate(-3deg)',
        }}>
          <div style={{ fontSize: preview ? 12 : 14, fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.05em' }}>
            APPARTEMENT KIOSK
          </div>
          <div style={{ fontSize: preview ? 8 : 9, color: '#1e3a8a', fontWeight: 600, marginTop: 2 }}>
            BETAALD &middot; VOLDAAN
          </div>
          <div style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: preview ? 20 : 24,
            height: preview ? 20 : 24,
            background: '#16a34a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: preview ? 12 : 14,
            fontWeight: 800,
          }}>
            &#10003;
          </div>
        </div>
      </div>

      {/* === FOOTER === */}
      <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px dashed #94a3b8' }}>
        <div style={{ fontSize: preview ? 9 : 10, color: '#64748b', fontWeight: 600 }}>
          Bedankt voor uw betaling!
        </div>
        <div style={{ fontSize: preview ? 8 : 9, color: '#94a3b8', marginTop: 4 }}>
          Bewaar deze kwitantie als bewijs van betaling
        </div>
        <div style={{ fontSize: preview ? 7 : 8, color: '#cbd5e1', marginTop: 8 }}>
          &mdash; Einde kwitantie &mdash;
        </div>
      </div>
    </div>
  );
}
