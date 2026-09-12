export type PolaroidStyle = 'first' | 'memory' | 'night';
export type PolaroidFit = 'cover' | 'contain';
export type PolaroidArt = {
  image: HTMLImageElement;
  style: PolaroidStyle;
  message: string;
  date: string;
  place: string;
  positionX: number;
  positionY: number;
  zoom: number;
  fit: PolaroidFit;
};

export const POLAROID_WIDTH = 1200;
export const POLAROID_HEIGHT = 1500;
export const PHOTO_FRAME = { x: 90, y: 90, size: 1020 } as const;

const styleTokens: Record<PolaroidStyle, { paper: string; ink: string; filter: string; wash: string }> = {
  first: { paper: '#fbfaf5', ink: '#20211e', filter: 'none', wash: 'transparent' },
  memory: { paper: '#f2ead8', ink: '#433b30', filter: 'saturate(.84) contrast(.96) sepia(.12)', wash: '#c8873820' },
  night: { paper: '#deddd7', ink: '#272a2c', filter: 'saturate(.68) contrast(.94) brightness(.94)', wash: '#4052651c' },
};

function drawContainedPhoto(ctx: CanvasRenderingContext2D, art: PolaroidArt) {
  const { image, fit, positionX, positionY, zoom } = art;
  const { x, y, size } = PHOTO_FRAME;
  const baseScale = (fit === 'cover' ? Math.max : Math.min)(size / image.naturalWidth, size / image.naturalHeight);
  const scale = baseScale * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const freeX = size - width;
  const freeY = size - height;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.fillStyle = styleTokens[art.style].paper;
  ctx.fillRect(x, y, size, size);
  ctx.filter = styleTokens[art.style].filter;
  ctx.drawImage(image, x + freeX * (positionX / 100), y + freeY * (positionY / 100), width, height);
  ctx.filter = 'none';
  ctx.fillStyle = styleTokens[art.style].wash;
  ctx.fillRect(x, y, size, size);
  ctx.restore();
}

function wrappedLines(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const text = value.trim();
  if (!text) return [];
  const characters = [...text];
  const lines: string[] = [];
  let line = '';
  for (const character of characters) {
    if (character === '\n') {
      if (line) lines.push(line);
      line = '';
      if (lines.length >= maxLines) break;
      continue;
    }
    const candidate = line + character;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = character.trimStart();
      if (lines.length >= maxLines) break;
    } else line = candidate;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && characters.join('').length > lines.join('').length) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[。，,.!?！？\s]+$/, '')}…`;
  return lines;
}

function drawPaperTexture(ctx: CanvasRenderingContext2D, style: PolaroidStyle) {
  if (style === 'first') return;
  ctx.save();
  ctx.globalAlpha = style === 'memory' ? .09 : .055;
  ctx.fillStyle = style === 'memory' ? '#735f43' : '#26313a';
  for (let y = 20; y < POLAROID_HEIGHT; y += 31) {
    for (let x = 17 + (y % 5); x < POLAROID_WIDTH; x += 37) ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

export function drawPolaroid(ctx: CanvasRenderingContext2D, art: PolaroidArt, width = POLAROID_WIDTH, height = POLAROID_HEIGHT) {
  const scaleX = width / POLAROID_WIDTH;
  const scaleY = height / POLAROID_HEIGHT;
  const token = styleTokens[art.style];
  ctx.save();
  ctx.scale(scaleX, scaleY);
  ctx.clearRect(0, 0, POLAROID_WIDTH, POLAROID_HEIGHT);
  ctx.fillStyle = token.paper;
  ctx.fillRect(0, 0, POLAROID_WIDTH, POLAROID_HEIGHT);
  drawContainedPhoto(ctx, art);
  drawPaperTexture(ctx, art.style);

  ctx.fillStyle = token.ink;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `${art.style === 'memory' ? 'italic 500' : '600'} 58px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
  const lines = wrappedLines(ctx, art.message || '把今天，轻轻收好。', 920, 2);
  lines.forEach((line, index) => ctx.fillText(line, 112, 1178 + index * 78));

  ctx.font = '500 27px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillStyle = art.style === 'first' ? '#70736d' : token.ink;
  ctx.globalAlpha = .72;
  const meta = [art.date, art.place].filter(Boolean).join('  ·  ');
  ctx.fillText(meta || '此刻', 114, 1382);
  ctx.textAlign = 'right';
  ctx.fillText(art.style === 'memory' ? 'MEMORY / 01' : art.style === 'night' ? 'AFTERGLOW' : 'NOW', 1084, 1382);
  ctx.restore();
}

function mixWithWhite(hex: string, amount: number) {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16));
  return `rgb(${Math.round(r + (255 - r) * amount)}, ${Math.round(g + (255 - g) * amount)}, ${Math.round(b + (255 - b) * amount)})`;
}

export function drawPolaroidShare(ctx: CanvasRenderingContext2D, art: PolaroidArt, background: string, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, mixWithWhite(background, .6));
  gradient.addColorStop(1, mixWithWhite(background, .82));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const paper = document.createElement('canvas');
  paper.width = POLAROID_WIDTH;
  paper.height = POLAROID_HEIGHT;
  const paperContext = paper.getContext('2d');
  if (!paperContext) return;
  drawPolaroid(paperContext, art);
  const targetWidth = width * .69;
  const targetHeight = targetWidth * POLAROID_HEIGHT / POLAROID_WIDTH;
  ctx.save();
  ctx.translate(width / 2, height / 2 + height * .018);
  ctx.rotate(-2.1 * Math.PI / 180);
  ctx.shadowColor = '#19202636';
  ctx.shadowBlur = width * .035;
  ctx.shadowOffsetY = width * .025;
  ctx.drawImage(paper, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();
}
