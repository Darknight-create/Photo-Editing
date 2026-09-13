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
  showMessage: boolean;
  showMeta: boolean;
  showMark: boolean;
  backMessage: string;
  recipient: string;
  shareRotation: number;
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

function fittedMessage(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  let fontSize = 58;
  let lines: string[] = [];
  while (fontSize >= 38) {
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    lines = wrappedLines(ctx, value, maxWidth, maxLines);
    const visible = lines.join('').replace(/…$/, '').length;
    if (visible >= [...value.trim()].filter(character => character !== '\n').length || fontSize === 38) break;
    fontSize -= 2;
  }
  return { fontSize, lines };
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
  if (art.showMessage && art.message.trim()) {
    const { fontSize, lines } = fittedMessage(ctx, art.message, 920, 3);
    ctx.font = `${art.style === 'memory' ? 'italic 500' : '600'} ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    const lineHeight = fontSize * 1.28;
    lines.forEach((line, index) => ctx.fillText(line, 112, 1168 + index * lineHeight));
  }

  ctx.font = '500 27px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillStyle = art.style === 'first' ? '#70736d' : token.ink;
  ctx.globalAlpha = .72;
  if (art.showMeta) {
    const meta = [art.date, art.place].filter(Boolean).join('  ·  ');
    if (meta) ctx.fillText(meta, 114, 1402);
  }
  if (art.showMark) {
    ctx.textAlign = 'right';
    ctx.fillText(art.style === 'memory' ? 'MEMORY / 01' : art.style === 'night' ? 'AFTERGLOW' : 'NOW', 1084, 1402);
  }
  ctx.restore();
}

export function drawPolaroidBack(ctx: CanvasRenderingContext2D, art: PolaroidArt, width = POLAROID_WIDTH, height = POLAROID_HEIGHT, reveal = 1) {
  const token = styleTokens[art.style];
  ctx.save();
  ctx.scale(width / POLAROID_WIDTH, height / POLAROID_HEIGHT);
  ctx.clearRect(0, 0, POLAROID_WIDTH, POLAROID_HEIGHT);
  ctx.fillStyle = token.paper;
  ctx.fillRect(0, 0, POLAROID_WIDTH, POLAROID_HEIGHT);
  drawPaperTexture(ctx, art.style);
  ctx.fillStyle = token.ink;
  ctx.textBaseline = 'top';
  ctx.font = '500 26px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.globalAlpha = .58;
  ctx.fillText(art.recipient.trim() ? `TO / ${art.recipient.trim()}` : 'TO /', 112, 118);
  ctx.textAlign = 'right';
  ctx.fillText(art.date || '', 1088, 118);
  ctx.globalAlpha = .22;
  ctx.fillRect(112, 184, 976, 2);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  const value = art.backMessage.trim();
  if (value) {
    ctx.font = '500 49px Georgia, "Songti SC", "STSong", serif';
    const lines = wrappedLines(ctx, value, 930, 10);
    const visibleLines = Math.max(0, Math.ceil(lines.length * Math.min(1, Math.max(0, reveal))));
    lines.slice(0, visibleLines).forEach((line, index) => {
      const lineStart = index / Math.max(1, lines.length);
      const lineProgress = Math.min(1, Math.max(0, (reveal - lineStart) * lines.length));
      ctx.globalAlpha = lineProgress;
      ctx.fillText(line, 128, 260 + index * 82);
    });
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = .52;
  ctx.font = '500 23px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('A NOTE FROM THIS MOMENT', 112, 1378);
  ctx.textAlign = 'right';
  ctx.fillText(art.place || '', 1088, 1378);
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
  const targetWidth = width * .69;
  const targetHeight = targetWidth * POLAROID_HEIGHT / POLAROID_WIDTH;
  paper.width = Math.max(POLAROID_WIDTH, Math.round(targetWidth));
  paper.height = Math.max(POLAROID_HEIGHT, Math.round(targetHeight));
  const paperContext = paper.getContext('2d');
  if (!paperContext) return;
  drawPolaroid(paperContext, art, paper.width, paper.height);
  ctx.save();
  ctx.translate(width / 2, height / 2 + height * .018);
  ctx.rotate(art.shareRotation * Math.PI / 180);
  ctx.shadowColor = '#19202636';
  ctx.shadowBlur = width * .035;
  ctx.shadowOffsetY = width * .025;
  ctx.drawImage(paper, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();
}

export function drawPolaroidPair(ctx: CanvasRenderingContext2D, art: PolaroidArt, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#eceae4';
  ctx.fillRect(0, 0, width, height);
  const gap = Math.round(width * .035);
  const paperHeight = Math.floor((height - gap) / 2);
  drawPolaroid(ctx, art, width, paperHeight);
  ctx.save();
  ctx.translate(0, paperHeight + gap);
  drawPolaroidBack(ctx, art, width, paperHeight);
  ctx.restore();
}

export function drawPolaroidLiveFrame(ctx: CanvasRenderingContext2D, art: PolaroidArt, background: string, progress: number, width: number, height: number) {
  const p = Math.min(1, Math.max(0, progress));
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(width * .36, height * .22, 0, width * .5, height * .5, height * .82);
  gradient.addColorStop(0, mixWithWhite(background, .56));
  gradient.addColorStop(1, mixWithWhite(background, .84));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const flipStart = .30, flipEnd = .54;
  const flipProgress = Math.min(1, Math.max(0, (p - flipStart) / (flipEnd - flipStart)));
  const angle = flipProgress * Math.PI;
  const frontVisible = angle <= Math.PI / 2;
  const horizontalScale = Math.max(.025, Math.abs(Math.cos(angle)));
  const lift = p < flipStart ? Math.sin(p / flipStart * Math.PI) * .012 : flipProgress < 1 ? Math.sin(flipProgress * Math.PI) * .045 : 0;
  const breath = p < flipStart ? 1 + Math.sin(p / flipStart * Math.PI) * .012 : 1;
  const targetWidth = width * .70;
  const targetHeight = targetWidth * POLAROID_HEIGHT / POLAROID_WIDTH;
  const paper = document.createElement('canvas');
  paper.width = Math.max(900, Math.round(targetWidth));
  paper.height = Math.max(1125, Math.round(targetHeight));
  const paperContext = paper.getContext('2d');
  if (!paperContext) return;
  const reveal = Math.min(1, Math.max(0, (p - .58) / .22));
  if (frontVisible) drawPolaroid(paperContext, art, paper.width, paper.height);
  else drawPolaroidBack(paperContext, art, paper.width, paper.height, reveal);

  ctx.save();
  ctx.translate(width / 2, height / 2 - height * lift);
  ctx.scale(horizontalScale * breath, breath);
  ctx.shadowColor = `rgba(25, 32, 38, ${.16 + lift * 4})`;
  ctx.shadowBlur = width * (.025 + lift * .65);
  ctx.shadowOffsetY = width * (.018 + lift * .45);
  ctx.drawImage(paper, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();

  ctx.fillStyle = '#28303878';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `500 ${Math.max(12, Math.round(width * .018))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(frontVisible ? 'THE MOMENT' : 'THE WORDS BEHIND IT', width / 2, height * .965);
}
