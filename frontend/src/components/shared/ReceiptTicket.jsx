function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Huurbetaling',
  partial_rent: 'Gedeeltelijke huurbetaling',
  service_costs: 'Servicekosten (water/stroom)',
  fines: 'Boetes / Achterstand',
  deposit: 'Borgsom',
};

export default function KwitantieTicket({ payment, tenant, preview = false }) {
  if (!payment) return null;

  const date = new Date(payment.created_at);
  const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';

  const s = preview ? 0.52 : 1;

  return (
    <div
      className={preview ? '' : 'receipt-only'}
      data-testid="kwitantie-ticket"
      style={{
        fontFamily: "'Manrope', sans-serif",
        width: preview ? '100%' : '210mm',
        minHeight: preview ? 'auto' : '297mm',
        color: '#0f172a',
        background: '#fff',
        position: 'relative',
        overflow: 'hidden',
        fontSize: `${11 * s}px`,
      }}
    >
      {/* ====== HEADER WITH GEOMETRIC SHAPES ====== */}
      <div style={{ position: 'relative', height: `${140 * s}px`, overflow: 'hidden' }}>
        {/* Dark blue angular shape */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: `${120 * s}px`,
          background: '#1e3a8a',
          clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 100%)',
        }} />
        {/* Orange accent triangle */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: `${200 * s}px`, height: `${140 * s}px`,
          background: '#f97316',
          clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 60%)',
        }} />
        {/* Content over shapes */}
        <div style={{
          position: 'relative', zIndex: 2, padding: `${24 * s}px ${32 * s}px`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          {/* Logo + Company */}
          <div style={{ display: 'flex', alignItems: 'center', gap: `${12 * s}px` }}>
            <div style={{
              width: `${48 * s}px`, height: `${48 * s}px`,
              background: '#f97316', borderRadius: `${14 * s}px`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: `${18 * s}px`,
            }}>AK</div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: `${20 * s}px`, letterSpacing: '0.02em' }}>
                APPARTEMENT KIOSK
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: `${9 * s}px` }}>
                Huurbetalingssysteem &middot; Suriname
              </div>
            </div>
          </div>
          {/* KWITANTIE label */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              color: 'white', fontWeight: 800, fontSize: `${28 * s}px`,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              KWITANTIE
            </div>
          </div>
        </div>
      </div>

      {/* ====== KWITANTIE INFO BAR ====== */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${16 * s}px ${32 * s}px`, background: '#f8fafc',
        borderBottom: `1px solid #e2e8f0`,
      }}>
        <div>
          <div style={{ fontSize: `${8 * s}px`, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            Kwitantie aan
          </div>
          <div style={{ fontWeight: 800, fontSize: `${16 * s}px`, marginTop: `${2 * s}px` }}>
            {payment.tenant_name || tenant?.name}
          </div>
          <div style={{ color: '#64748b', fontSize: `${10 * s}px` }}>
            Appt. {payment.apartment_number || tenant?.apartment_number} &middot; Code: {payment.tenant_code || tenant?.tenant_code}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: `${24 * s}px` }}>
            <div>
              <div style={{ fontSize: `${8 * s}px`, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                Kwitantie Nr.
              </div>
              <div style={{ fontWeight: 800, fontSize: `${13 * s}px`, marginTop: `${2 * s}px` }}>{kwNr}</div>
            </div>
            <div>
              <div style={{ fontSize: `${8 * s}px`, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                Datum
              </div>
              <div style={{ fontWeight: 600, fontSize: `${11 * s}px`, marginTop: `${2 * s}px` }}>{dateStr}</div>
              <div style={{ color: '#94a3b8', fontSize: `${9 * s}px` }}>{timeStr}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== TABLE ====== */}
      <div style={{ padding: `${20 * s}px ${32 * s}px` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{
                background: '#1e3a8a', color: 'white', fontWeight: 700,
                padding: `${10 * s}px ${14 * s}px`, textAlign: 'left',
                fontSize: `${9 * s}px`, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Omschrijving</th>
              <th style={{
                background: '#1e3a8a', color: 'white', fontWeight: 700,
                padding: `${10 * s}px ${14 * s}px`, textAlign: 'center',
                fontSize: `${9 * s}px`, textTransform: 'uppercase', letterSpacing: '0.05em',
                width: `${100 * s}px`,
              }}>Methode</th>
              <th style={{
                background: '#1e3a8a', color: 'white', fontWeight: 700,
                padding: `${10 * s}px ${14 * s}px`, textAlign: 'right',
                fontSize: `${9 * s}px`, textTransform: 'uppercase', letterSpacing: '0.05em',
                width: `${140 * s}px`,
              }}>Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid #f1f5f9` }}>
              <td style={{ padding: `${12 * s}px ${14 * s}px` }}>
                <div style={{ fontWeight: 700, fontSize: `${12 * s}px` }}>
                  {TYPE_LABELS[payment.payment_type] || payment.payment_type}
                </div>
                {payment.description && (
                  <div style={{ color: '#94a3b8', fontSize: `${9 * s}px`, marginTop: `${2 * s}px` }}>
                    {payment.description}
                  </div>
                )}
              </td>
              <td style={{ padding: `${12 * s}px ${14 * s}px`, textAlign: 'center', color: '#64748b' }}>
                Contant
              </td>
              <td style={{ padding: `${12 * s}px ${14 * s}px`, textAlign: 'right', fontWeight: 700 }}>
                {formatSRD(payment.amount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', marginTop: `${12 * s}px`,
        }}>
          <div style={{ width: `${240 * s}px` }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: `${6 * s}px 0`,
              borderBottom: `1px solid #f1f5f9`, fontSize: `${10 * s}px`, color: '#64748b',
            }}>
              <span>Subtotaal</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatSRD(payment.amount)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: `${6 * s}px 0`,
              borderBottom: `1px solid #f1f5f9`, fontSize: `${10 * s}px`, color: '#64748b',
            }}>
              <span>BTW (0%)</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>SRD 0,00</span>
            </div>
            {/* Grand total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f97316', color: 'white',
              padding: `${10 * s}px ${14 * s}px`, marginTop: `${6 * s}px`,
              borderRadius: `${6 * s}px`,
            }}>
              <span style={{ fontWeight: 800, fontSize: `${11 * s}px`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Totaal bedrag
              </span>
              <span style={{ fontWeight: 800, fontSize: `${16 * s}px` }}>
                {formatSRD(payment.amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ====== STAMP + SIGNATURE ====== */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: `${16 * s}px ${32 * s}px`,
      }}>
        {/* Terms */}
        <div style={{ maxWidth: '50%' }}>
          <div style={{ fontSize: `${8 * s}px`, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: `${6 * s}px` }}>
            Voorwaarden
          </div>
          <div style={{ fontSize: `${9 * s}px`, color: '#64748b', lineHeight: 1.5 }}>
            Bewaar deze kwitantie als bewijs van betaling.
            Betalingen worden direct verwerkt en zijn niet restitueerbaar.
          </div>
        </div>
        {/* Stamp */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            border: `${3 * s}px solid #1e3a8a`,
            borderRadius: `${12 * s}px`,
            padding: `${12 * s}px ${24 * s}px`,
            transform: 'rotate(-4deg)',
            position: 'relative',
          }}>
            <div style={{ fontSize: `${14 * s}px`, fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.05em' }}>
              APPARTEMENT KIOSK
            </div>
            <div style={{ fontSize: `${9 * s}px`, color: '#1e3a8a', fontWeight: 700, marginTop: `${2 * s}px` }}>
              BETAALD &middot; VOLDAAN
            </div>
            <div style={{
              position: 'absolute', top: `${-8 * s}px`, right: `${-8 * s}px`,
              width: `${24 * s}px`, height: `${24 * s}px`,
              background: '#16a34a', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: `${14 * s}px`, fontWeight: 800,
            }}>&#10003;</div>
          </div>
        </div>
      </div>

      {/* ====== FOOTER WITH GEOMETRIC SHAPES ====== */}
      <div style={{
        position: preview ? 'relative' : 'absolute',
        bottom: 0, left: 0, right: 0,
        height: `${90 * s}px`,
        marginTop: preview ? `${20 * s}px` : 0,
      }}>
        {/* Dark blue angular shape */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: `${80 * s}px`,
          background: '#1e3a8a',
          clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)',
        }} />
        {/* Orange accent triangle */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: `${180 * s}px`, height: `${90 * s}px`,
          background: '#f97316',
          clipPath: 'polygon(0 40%, 70% 0, 100% 100%, 0 100%)',
        }} />
        {/* Footer content */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end',
          height: '100%', padding: `${0}px ${32 * s}px ${16 * s}px`,
          gap: `${24 * s}px`,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: `${9 * s}px`, display: 'flex', alignItems: 'center', gap: `${6 * s}px` }}>
            Bedankt voor uw betaling!
          </div>
        </div>
      </div>
    </div>
  );
}
