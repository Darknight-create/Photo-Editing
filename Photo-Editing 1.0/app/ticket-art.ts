export type TicketStyle = 'classic' | 'cinema' | 'journey';
export type TicketField = 'title' | 'date' | 'number' | 'note';
export type TicketText = Record<TicketField, string>;
export type TextRegion = { key: TicketField; x: number; y: number; w: number; h: number };
export const TICKET_WIDTH = 1600;
export const TICKET_HEIGHT = 1066;
export type TicketArt = {
  image: HTMLImageElement;
  background: string;
  style: TicketStyle;
  text: TicketText;
};

export function centerColor(image: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return '#8c9e72';
  // The middle 50% is sampled; frequent, visible colors win over edge scenery.
  context.drawImage(image, image.naturalWidth * .25, image.naturalHeight * .25, image.naturalWidth * .5, image.naturalHeight * .5, 0, 0, 64, 64);
  const pixels = context.getImageData(0, 0, 64, 64).data;
  const bins = new Map<string, { score: number; r: number; g: number; b: number; count: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = [r, g, b].map(value => Math.floor(value / 24)).join(',');
    const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const weight = 1 + chroma;
    const bin = bins.get(key) || { score: 0, r: 0, g: 0, b: 0, count: 0 };
    bin.score += weight; bin.r += r; bin.g += g; bin.b += b; bin.count++;
    bins.set(key, bin);
  }
  const top = [...bins.values()].sort((a, b) => b.score - a.score)[0];
  return top ? '#' + [top.r, top.g, top.b].map(value => Math.round(value / top.count).toString(16).padStart(2, '0')).join('') : '#8c9e72';
}

export function photoMetadata(buffer: ArrayBuffer): { date?: string; camera?: string } {
  // Read bounded JPEG EXIF IFDs. Missing or malformed metadata is non-fatal.
  const result: { date?: string; camera?: string } = {};
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return result;
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > view.byteLength) break;
      if (marker === 0xe1 && length >= 16 && view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
        const base = offset + 10;
        const end = offset + 2 + length;
        const little = view.getUint16(base) === 0x4949;
        if ((!little && view.getUint16(base) !== 0x4d4d) || view.getUint16(base + 2, little) !== 42) break;
        const visited = new Set<number>();
        const read = (relative: number, depth: number) => {
          const at = base + relative;
          if (depth > 2 || visited.has(at) || at < base || at + 2 > end) return;
          visited.add(at);
          const count = Math.min(view.getUint16(at, little), 256);
          for (let i = 0; i < count; i++) {
            const entry = at + 2 + i * 12;
            if (entry + 12 > end) break;
            const tag = view.getUint16(entry, little);
            const type = view.getUint16(entry + 2, little);
            const size = view.getUint32(entry + 4, little);
            if (tag === 0x8769 && type === 4 && size === 1) read(view.getUint32(entry + 8, little), depth + 1);
            if (type !== 2 || size < 1 || size > 512 || ![0x9003, 0x0132, 0x0110].includes(tag)) continue;
            const start = size <= 4 ? entry + 8 : base + view.getUint32(entry + 8, little);
            if (start < base || start + size > end) continue;
            const value = new TextDecoder().decode(new Uint8Array(buffer, start, size)).replace(/\0/g, '').trim();
            if (tag === 0x0110) result.camera = value;
            else if (/^\d{4}:\d{2}:\d{2}/.test(value) && (tag === 0x9003 || !result.date)) result.date = value.slice(0, 10).replace(/:/g, '-');
          }
        };
        read(view.getUint32(base + 4, little), 0);
        return result;
      }
      offset += 2 + length;
    }
  } catch { return result; }
  return result;
}

export function drawPhoto(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number, fit: 'cover' | 'contain' = 'cover') {
  const scale = (fit === 'cover' ? Math.max : Math.min)(w / image.naturalWidth, h / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(image, x + (w - width) / 2, y + (h - height) / 2, width, height);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

function barcode(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, w: number, h: number, color: string) {
  // A decorative souvenir barcode, not a scannable admission credential.
  let seed = 5381;
  for (const character of value) seed = ((seed * 33) ^ character.charCodeAt(0)) >>> 0;
  const units = Array.from({ length: 70 }, (_, i) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return i % 2 ? 1 : 1 + seed % 3; });
  const unit = w / units.reduce((a, b) => a + b, 0);
  let cursor = x;
  ctx.fillStyle = color;
  units.forEach((size, i) => { if (i % 2 === 0) ctx.fillRect(cursor, y, size * unit, h); cursor += size * unit; });
}

export function drawTicket(ctx: CanvasRenderingContext2D, art: TicketArt): TextRegion[] {
  const { image, background, text, style } = art;
  ctx.save();
  ctx.fillStyle = background; ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT);
  const regions: TextRegion[] = [];
  const ink = style === 'cinema' ? '#f4efdf' : '#292c25';
  const paper = style === 'cinema' ? '#222820' : '#f7f3e2';
  const label = (value: string, x: number, y: number, size = 22, color = ink) => {
    ctx.fillStyle = color; ctx.font = `500 ${size}px Arial, "PingFang SC", sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y);
  };
  const field = (key: TicketField, x: number, y: number, w: number, h: number, fontSize: number, align: CanvasTextAlign = 'left') => {
    let size = fontSize;
    const value = text[key] || '—';
    ctx.font = `600 ${size}px Arial, "PingFang SC", sans-serif`;
    while (size > 12 && ctx.measureText(value).width > w - 12) { size -= 1; ctx.font = `600 ${size}px Arial, "PingFang SC", sans-serif`; }
    ctx.fillStyle = ink; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillText(value, align === 'center' ? x + w / 2 : x + 6, y + h / 2);
    ctx.restore();
    regions.push({ key, x, y, w, h });
  };
  ctx.shadowColor = '#00000028'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 16;
  roundRect(ctx, 100, 254, 1400, 558, style === 'journey' ? 16 : 54, paper);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  if (style === 'classic') {
    for (const x of [100, 1500]) for (const y of [394, 534, 674]) { ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fillStyle = background; ctx.fill(); }
    for (const y of [254, 812]) { ctx.beginPath(); ctx.arc(1040, y, 32, 0, Math.PI * 2); ctx.fillStyle = background; ctx.fill(); }
    ctx.strokeStyle = '#8c8d77'; ctx.lineWidth = 3; ctx.setLineDash([16, 14]); ctx.beginPath(); ctx.moveTo(1040, 290); ctx.lineTo(1040, 776); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.beginPath(); ctx.roundRect(162, 322, 810, 416, 36); ctx.clip(); drawPhoto(ctx, image, 162, 322, 810, 416); ctx.restore();
    field('title', 1080, 330, 360, 108, 64, 'center');
    field('date', 1080, 438, 360, 78, 40, 'center');
    field('number', 1080, 552, 360, 50, 25, 'center');
    field('note', 1080, 605, 360, 46, 24, 'center');
    barcode(ctx, text.number, 1100, 675, 320, 72, ink);
  } else if (style === 'cinema') {
    ctx.strokeStyle = '#e8deb6'; ctx.lineWidth = 2; ctx.strokeRect(130, 284, 1340, 498);
    drawPhoto(ctx, image, 160, 326, 475, 356);
    label('ADMIT ONE  /  PHOTO ARCHIVE', 685, 326, 23);
    field('title', 679, 364, 720, 120, 72);
    field('note', 679, 502, 720, 68, 32);
    field('date', 679, 603, 350, 64, 38);
    field('number', 1046, 603, 375, 64, 27);
    barcode(ctx, text.number, 688, 700, 715, 48, ink);
    label('MEMORY / 01', 170, 731, 26);
    for (const y of [254, 812]) { ctx.fillStyle = background; ctx.beginPath(); ctx.arc(660, y, 25, 0, Math.PI * 2); ctx.fill(); }
  } else {
    roundRect(ctx, 100, 254, 1400, 92, 16, '#303c34');
    label('BOARDING PASS  /  MEMORY AIR', 152, 301, 26, '#fff');
    label('ONE WAY', 1270, 301, 24, '#fff');
    label('DESTINATION / TITLE', 158, 403, 22);
    field('title', 152, 428, 870, 110, 74);
    label('DATE', 158, 578, 20); label('FLIGHT / NO.', 604, 578, 20);
    field('date', 152, 605, 416, 64, 38);
    field('number', 598, 605, 420, 64, 32);
    field('note', 152, 720, 870, 48, 27);
    ctx.strokeStyle = '#aaa998'; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(1060, 355); ctx.lineTo(1060, 780); ctx.stroke(); ctx.setLineDash([]);
    drawPhoto(ctx, image, 1100, 386, 340, 230);
    barcode(ctx, text.number, 1100, 659, 340, 72, ink);
    label('KEEP THIS MOMENT', 1100, 764, 21);
  }
  ctx.restore();
  return regions;
}
