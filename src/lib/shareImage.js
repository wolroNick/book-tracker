// Rysuje grafikę „Mój rok w książkach” (1080×1920, format relacji) i zwraca ją jako PNG.

const W = 1080;
const H = 1920;
const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Inter', system-ui, sans-serif";

function hueOf(title) {
  return [...(title || '?')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
}

function roundRect(ctx, x, y, w, h, r) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

// Obrazek okładki z innej domeny – tylko jeśli serwer na to pozwala (CORS),
// inaczej zwracamy null i rysujemy okładkę zastępczą.
function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    const timer = setTimeout(() => resolve(null), 4000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

async function drawCover(ctx, book, x, y, w) {
  const h = w * 1.5;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, x, y, w, h, [8, 18, 18, 8]);
  ctx.fillStyle = '#333';
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, [8, 18, 18, 8]);
  ctx.clip();
  const img = await loadImage(book.okladka_url);
  if (img) {
    const scale = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, x + (w - img.width * scale) / 2, y + (h - img.height * scale) / 2, img.width * scale, img.height * scale);
  } else {
    const hue = hueOf(book.tytul);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, `hsl(${hue} 40% 48%)`);
    g.addColorStop(1, `hsl(${hue} 44% 26%)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `600 ${Math.round(w / 7)}px ${SERIF}`;
    const lines = wrapLines(ctx, book.tytul, w - 30, 4);
    const lh = w / 6;
    lines.forEach((l, i) => ctx.fillText(l, x + w / 2 + 6, y + h / 2 - ((lines.length - 1) * lh) / 2 + i * lh));
  }
  // „Grzbiet” książki.
  const spine = ctx.createLinearGradient(x, 0, x + 18, 0);
  spine.addColorStop(0, 'rgba(0,0,0,0.25)');
  spine.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  spine.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spine;
  ctx.fillRect(x, y, 18, h);
  ctx.restore();
}

function chip(ctx, text, x, y, gold) {
  ctx.font = `500 34px ${SANS}`;
  const w = ctx.measureText(text).width + 56;
  roundRect(ctx, x, y, w, 72, 36);
  ctx.fillStyle = gold ? 'rgba(255,213,107,0.22)' : 'rgba(255,255,255,0.14)';
  ctx.fill();
  if (gold) {
    ctx.strokeStyle = 'rgba(255,213,107,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 28, y + 48);
  return w;
}

// labels: przetłumaczone teksty przygotowane przez komponent.
export async function renderShareImage(summary, labels) {
  try {
    await Promise.all([
      document.fonts.load(`600 100px Fraunces`),
      document.fonts.load(`500 34px Inter`),
    ]);
  } catch { /* brak czcionek – użyjemy zastępczych */ }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2b2340');
  bg.addColorStop(0.55, '#6a3b5c');
  bg.addColorStop(1, '#c2683f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `600 36px ${SANS}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.globalAlpha = 0.8;
  ctx.fillText(labels.heading.toUpperCase(), W / 2, 170);
  ctx.globalAlpha = 1;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.font = `600 250px ${SERIF}`;
  ctx.fillText(String(summary.year), W / 2, 420);

  // Trzy liczby.
  const stats = labels.stats;
  const colW = W / stats.length;
  stats.forEach((s, i) => {
    const cx = colW * i + colW / 2;
    ctx.font = `600 120px ${SERIF}`;
    ctx.fillText(s.value, cx, 640);
    ctx.font = `400 36px ${SANS}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(s.label, cx, 700);
    ctx.globalAlpha = 1;
  });

  // Top 3 (zwycięzca na środku, większy).
  if (summary.top3.length) {
    ctx.font = `600 34px ${SANS}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
    ctx.globalAlpha = 0.8;
    ctx.fillText(labels.top3.toUpperCase(), W / 2, 830);
    ctx.globalAlpha = 1;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const [first, second, third] = summary.top3;
    const slots = [
      second && { book: second, w: 220 },
      { book: first, w: 270 },
      third && { book: third, w: 200 },
    ].filter(Boolean);
    const gap = 40;
    const total = slots.reduce((s, x) => s + x.w, 0) + gap * (slots.length - 1);
    let x = (W - total) / 2;
    const base = 900 + 270 * 1.5;
    for (const s of slots) {
      await drawCover(ctx, s.book, x, base - s.w * 1.5, s.w);
      x += s.w + gap;
    }
  }

  // Ciekawostki jako „pigułki”, zawijane do kolejnych wierszy.
  let y = 1430;
  let row = [];
  const rows = [];
  ctx.font = `500 34px ${SANS}`;
  let rowW = 0;
  for (const c of labels.chips) {
    const w = ctx.measureText(c.text).width + 56;
    if (rowW + w > W - 120 && row.length) {
      rows.push({ row, rowW });
      row = [];
      rowW = 0;
    }
    row.push({ ...c, w });
    rowW += w + 20;
  }
  if (row.length) rows.push({ row, rowW });
  for (const r of rows) {
    let x = (W - (r.rowW - 20)) / 2;
    for (const c of r.row) x += chip(ctx, c.text, x, y, c.gold) + 20;
    y += 96;
  }

  ctx.textAlign = 'center';
  ctx.font = `500 32px ${SANS}`;
  ctx.globalAlpha = 0.6;
  ctx.fillText(labels.footer, W / 2, H - 90);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('IMAGE'))), 'image/png'));
}
