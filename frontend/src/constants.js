export const RESTAURANT = {
  nameTh: 'ร้านอาหารสยาม',
  nameEn: 'Siam Restaurant',
  taglineTh: 'อาหารไทยต้นตำรับ สู่ใจคุณ',
  taglineEn: 'Authentic Thai cuisine, served with heart',
  address: '123 ถ.สุขุมวิท กรุงเทพฯ 10110',
  phone: '0 2123 4567',
  hoursTh: 'เปิดบริการทุกวัน 10:00 - 21:00 น.',
  hoursEn: 'Open daily 10:00 AM - 9:00 PM',
  promptpay: '0812345678',
  bank: 'ธ.ไทยพาณิชย์',
  account: '123-4-56789-0',
  accountName: 'ร้านอาหารสยาม',
};

export const CATEGORY_ICONS = {
  '': 'bi-grid-3x3-gap-fill',
  appetizer: 'bi-egg-fried',
  main: 'bi-basket3',
  dessert: 'bi-cake2',
  drink: 'bi-cup-straw',
  side: 'bi-nut',
};

export const CATEGORY_COLORS = {
  appetizer: '#e8590c',
  main: '#2b8a3e',
  dessert: '#a61e4d',
  drink: '#1971c2',
  side: '#5f3dc4',
};

export const CATEGORY_ORDER = ['appetizer', 'main', 'side', 'dessert', 'drink'];

export const STICKER_CSS = `html,body{margin:0;padding:0;font-family:'Segoe UI',Tahoma,'Sukhumvit Set',sans-serif}
@page{size:A4 portrait;margin:8mm}
.flex{display:flex;flex-wrap:wrap;gap:2mm}
.qr-card{width:70mm;height:96mm;border-radius:3mm;border:.5mm solid #999;background:#fff;display:flex;flex-direction:column;align-items:center;overflow:hidden;text-align:center;break-inside:avoid}
.qr-card-head{width:100%;background:linear-gradient(135deg,#e11d2e 0%,#8b0f1a 100%);color:#fff;padding:2.2mm 1mm 1.8mm}
.qr-card-head-name{font-size:4.6mm;font-weight:800;letter-spacing:.2mm;line-height:1.2}
.qr-card-head-tagline{font-size:2.5mm;opacity:.85;margin-top:.5mm;line-height:1.3}
.qr-card-welcome{margin-top:1.8mm;font-size:3.1mm;color:#5f6368;font-weight:600;line-height:1.3}
.qr-card-table{margin-top:1.6mm;width:15mm;height:15mm;border-radius:50%;background:linear-gradient(135deg,#e11d2e,#8b0f1a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:6.2mm;font-weight:800;box-shadow:0 1mm 2mm rgba(0,0,0,.18)}
.qr-card-scan{margin-top:1.7mm;font-size:4mm;font-weight:800;color:#b00d1c;line-height:1.2}
.qr-card-scan-sub{font-size:2.6mm;color:#5f6368;margin-top:.2mm}
.qr-card-qr{margin-top:1.6mm;line-height:0}
.qr-card-qr img{width:37mm;height:37mm;border:.4mm solid #e9ecef;border-radius:2mm;box-sizing:border-box}
.qr-card-steps{margin-top:1.8mm;display:flex;align-items:center;gap:2mm}
.qr-card-step{display:flex;align-items:center;flex-direction:column;gap:.5mm}
.qr-card-step-num{width:5.4mm;height:5.4mm;border-radius:50%;background:#1f2937;color:#fff;font-size:3mm;font-weight:700;display:flex;align-items:center;justify-content:center}
.qr-card-step-label{font-size:2.4mm;color:#374151;font-weight:600}
.qr-card-step-arrow{color:#9ca3af;font-size:3.4mm;line-height:1}
.qr-card-hours{margin-top:1.6mm;font-size:2.2mm;color:#6b7280;line-height:1.3}
.qr-card-url{margin-top:.8mm;font-size:1.8mm;color:#9ca3af;word-break:break-all;text-align:center;line-height:1.2;padding:0 2mm}`;

export function buildStickerHtml({ tableNumber, qrDataUrl, name, tagline, welcome, scanCta, scanCtaSub, steps, hours, url }) {
  const stepItems = steps
    .map((label, i) => {
      const arrow = i < steps.length - 1 ? '<span class="qr-card-step-arrow">&#8250;</span>' : '';
      return `<div class="qr-card-step"><span class="qr-card-step-num">${i + 1}</span><span class="qr-card-step-label">${label}</span></div>${arrow}`;
    })
    .join('');
  const qr = qrDataUrl ? `<div class="qr-card-qr"><img src="${qrDataUrl}" alt="Table ${tableNumber} QR"></div>` : '';
  return `<div class="qr-card">
    <div class="qr-card-head">
      <div class="qr-card-head-name">${name}</div>
      <div class="qr-card-head-tagline">${tagline}</div>
    </div>
    <div class="qr-card-welcome">${welcome}</div>
    <div class="qr-card-table">${tableNumber}</div>
    <div class="qr-card-scan">${scanCta}</div>
    <div class="qr-card-scan-sub">${scanCtaSub}</div>
    ${qr}
    <div class="qr-card-steps">${stepItems}</div>
    <div class="qr-card-hours">${hours}</div>
    <div class="qr-card-url">${url}</div>
  </div>`;
}