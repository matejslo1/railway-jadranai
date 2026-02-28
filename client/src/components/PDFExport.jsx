export function exportToPDF(itinerary) {
  if (!itinerary) return;

  const days = itinerary.days || [];

  const weatherRow = (d) => {
    const w = d.weather || {};
    return `${w.condition || ''} • ${w.temp || '?'}°C • ${w.wind || '?'} • Val: ${w.waves || '?'}`;
  };

  const dayHTML = days.map(d => {
    const marina = typeof d.marina === 'object' ? d.marina : { name: d.marina };
    const anchorage = typeof d.anchorage === 'object' ? d.anchorage : { name: d.anchorage };
    const restaurant = typeof d.restaurant === 'object' ? d.restaurant : { name: d.restaurant };

    return `
    <div class="day-block">
      <div class="day-header">
        <div class="day-number">Dan ${d.day}</div>
        <div class="day-title">${d.title || ''}</div>
        <div class="day-meta">${d.distance || ''} • ${d.sailTime || ''} • Odhod: ${d.departureTime || '?'}</div>
      </div>
      <table class="info-table">
        <tr>
          <td class="label">🌤 Vreme</td>
          <td>${weatherRow(d)}</td>
          <td class="label">⚓ Privez</td>
          <td>${marina?.name || '—'}${marina?.price ? ` (${marina.price})` : ''}</td>
        </tr>
        <tr>
          <td class="label">🏖 Sidrišče</td>
          <td>${anchorage?.name || '—'}</td>
          <td class="label">🍽 Večerja</td>
          <td>${restaurant?.name || '—'}${restaurant?.dish ? ` — ${restaurant.dish}` : ''}</td>
        </tr>
      </table>
      ${d.highlights?.length ? `
        <div class="section-title">Zanimivosti</div>
        <div class="chips">${d.highlights.map(h => `<span class="chip">${h}</span>`).join('')}</div>
      ` : ''}
      ${d.tip ? `<div class="tip">⚓ Kapetanov nasvet: ${d.tip}</div>` : ''}
    </div>
  `}).join('');

  const packingHTML = itinerary.packingTips?.length
    ? `<div class="section"><div class="section-title" style="font-size:14px;margin-bottom:8px">🎒 Ne pozabite zapakirati</div>
        <div class="chips">${itinerary.packingTips.map(t => `<span class="chip">🎒 ${t}</span>`).join('')}</div></div>`
    : '';

  const warningsHTML = itinerary.warnings?.length
    ? `<div class="warnings">${itinerary.warnings.map(w => `<div>⚠️ ${w}</div>`).join('')}</div>`
    : '';

  const budget = itinerary.estimatedBudget;
  const budgetStr = budget
    ? (typeof budget === 'string' ? budget : `${budget.low} – ${budget.high}`)
    : '—';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${itinerary.tripTitle || 'Jadran AI — Itinerar'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; color: #1a2a3a; background: #fff; padding: 32px; font-size: 13px; }
    .header { border-bottom: 3px solid #3b9ece; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 11px; color: #3b9ece; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
    .trip-title { font-size: 24px; font-weight: 700; color: #0a1628; }
    .trip-summary { font-size: 13px; color: #4a6a80; margin-top: 6px; line-height: 1.5; max-width: 500px; }
    .meta-grid { display: flex; gap: 20px; font-size: 12px; }
    .meta-item { text-align: center; }
    .meta-label { color: #888; font-size: 10px; text-transform: uppercase; }
    .meta-val { font-weight: 700; color: #1a2a3a; font-size: 14px; }
    .day-block { margin-bottom: 20px; border: 1px solid #d0dde8; border-radius: 8px; overflow: hidden; break-inside: avoid; }
    .day-header { background: #0a1628; color: white; padding: 12px 16px; }
    .day-number { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #3b9ece; margin-bottom: 2px; }
    .day-title { font-size: 16px; font-weight: 700; }
    .day-meta { font-size: 11px; color: #a0b8c8; margin-top: 4px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 12px; vertical-align: top; }
    .info-table tr:last-child td { border-bottom: none; }
    .label { font-weight: 600; color: #4a6a80; width: 90px; background: #f7fafc; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #4a6a80; padding: 8px 12px 4px; }
    .chips { padding: 0 12px 10px; display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { background: #edf6ff; border: 1px solid #bde0f5; border-radius: 20px; padding: 3px 10px; font-size: 11px; color: #2a6080; }
    .tip { margin: 0 12px 12px; padding: 8px 12px; background: #fffbeb; border-left: 3px solid #d4a840; font-size: 12px; color: #7a5a20; border-radius: 0 4px 4px 0; }
    .warnings { background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #c53030; line-height: 1.8; }
    .section { margin-bottom: 20px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #d0dde8; display: flex; justify-content: space-between; font-size: 10px; color: #888; }
    @media print { body { padding: 16px; } .day-block { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">⛵ Jadran AI — Jadranski Potovalni Planer</div>
      <div class="trip-title">${itinerary.tripTitle || 'Moja Jadranaka Plovba'}</div>
      <div class="trip-summary">${itinerary.summary || ''}</div>
    </div>
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">Dni</div><div class="meta-val">${days.length}</div></div>
      <div class="meta-item"><div class="meta-label">Razdalja</div><div class="meta-val">${itinerary.totalDistance || '—'}</div></div>
      <div class="meta-item"><div class="meta-label">Težavnost</div><div class="meta-val">${itinerary.difficulty || '—'}</div></div>
      <div class="meta-item"><div class="meta-label">Proračun</div><div class="meta-val">${budgetStr}</div></div>
    </div>
  </div>

  ${warningsHTML}
  ${dayHTML}
  ${packingHTML}

  <div class="footer">
    <span>Jadran AI — jadran-ai.vercel.app</span>
    <span>Generirano z AI • Vreme: Open-Meteo • ${new Date().toLocaleDateString('sl-SI')}</span>
  </div>
</body>
</html>`;

  // Open in new window and trigger print
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

export default function PDFExportButton({ itinerary }) {
  if (!itinerary) return null;

  return (
    <button
      onClick={() => exportToPDF(itinerary)}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(212,168,64,0.08)',
        border: '1px solid rgba(212,168,64,0.25)',
        borderRadius: 12,
        color: '#d4a840',
        cursor: 'pointer',
        fontFamily: 'Outfit, sans-serif',
        fontSize: 14,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,64,0.15)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,168,64,0.08)'}
    >
      📄 Izvozi kot PDF / Natisni
    </button>
  );
}
