'use client';

import { ChangeEvent, PointerEvent, ReactNode, useEffect, useRef, useState } from 'react';
import ThemeSwitch from './theme-switch';

type Language = 'zh' | 'en';
type Props = { language: Language; setLanguage: (language: Language) => void };
type Photo = { src: string; name: string; image: HTMLImageElement };
type PaperStyle = 'quiet' | 'travel' | 'editorial';
type EdgeStyle = 'line' | 'torn' | 'soft';
type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

const PAPER_WIDTH = 1200;
const PAPER_HEIGHT = 1500;
const DEFAULT_POINTS: Point[] = [{ x: .28, y: .3 }, { x: .72, y: .48 }, { x: .48, y: .76 }];

function loadPhotos(files: FileList | File[], limit: number) {
  return Promise.all(Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, limit).map(file => new Promise<Photo>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('image'));
      image.onload = () => resolve({ src: String(reader.result), name: file.name, image });
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  })));
}

function download(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, rect: Rect, point: Point = { x: .5, y: .5 }, zoom = 1) {
  const base = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight) * zoom;
  const sourceWidth = rect.width / base;
  const sourceHeight = rect.height / base;
  const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceWidth, point.x * image.naturalWidth - sourceWidth / 2));
  const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceHeight, point.y * image.naturalHeight - sourceHeight / 2));
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, rect.x, rect.y, rect.width, rect.height);
}

function paperTexture(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#f3efe5';
  ctx.fillRect(0, 0, PAPER_WIDTH, PAPER_HEIGHT);
  ctx.globalAlpha = .07;
  for (let i = 0; i < 850; i += 1) {
    const value = 115 + (i * 47) % 80;
    ctx.fillStyle = `rgb(${value},${value - 7},${value - 15})`;
    ctx.fillRect((i * 83) % PAPER_WIDTH, (i * 151) % PAPER_HEIGHT, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, family = 'sans-serif') {
  let current = size;
  do {
    ctx.font = `600 ${current}px ${family}`;
    current -= 2;
  } while (ctx.measureText(text).width > maxWidth && current > 24);
}

function detailRects(style: PaperStyle, count: number): Rect[] {
  if (style === 'quiet') return Array.from({ length: count }, (_, index) => ({ x: 890, y: 224 + index * 332, width: 220, height: 250 }));
  if (style === 'travel') return Array.from({ length: count }, (_, index) => ({ x: 100 + index * (940 / count), y: 1020 + (index % 2) * 35, width: 270, height: 300 }));
  return Array.from({ length: count }, (_, index) => ({ x: 90 + index * (1020 / count), y: 965, width: 280, height: 280 }));
}

function mainRect(style: PaperStyle): Rect {
  if (style === 'quiet') return { x: 72, y: 145, width: 765, height: 1070 };
  if (style === 'travel') return { x: 72, y: 145, width: 1056, height: 800 };
  return { x: 72, y: 145, width: 1056, height: 720 };
}

function drawPaperJourney(ctx: CanvasRenderingContext2D, photo: Photo, style: PaperStyle, note: string, points: Point[], count: number, selected = -1) {
  paperTexture(ctx);
  ctx.fillStyle = '#22231f';
  ctx.font = '22px ui-monospace, monospace';
  ctx.fillText('FIELD NOTES · 01', 72, 70);

  const main = mainRect(style);
  ctx.save();
  ctx.shadowColor = '#17171424';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(main.x - 16, main.y - 16, main.width + 32, main.height + 32);
  ctx.restore();
  cover(ctx, photo.image, main);

  const rects = detailRects(style, count);
  rects.forEach((rect, index) => {
    ctx.save();
    if (style === 'travel') {
      const angle = (index % 2 ? 2.2 : -2.8) * Math.PI / 180;
      ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
      ctx.rotate(angle);
      rect = { x: -rect.width / 2, y: -rect.height / 2, width: rect.width, height: rect.height };
    }
    ctx.shadowColor = '#1d1c1828';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(rect.x - 12, rect.y - 12, rect.width + 24, rect.height + 48);
    ctx.shadowColor = 'transparent';
    cover(ctx, photo.image, rect, points[index], 2.6);
    ctx.fillStyle = '#25241f';
    ctx.font = '18px ui-monospace, monospace';
    ctx.fillText(String(index + 1).padStart(2, '0'), rect.x, rect.y + rect.height + 28);
    if (selected === index) {
      ctx.strokeStyle = '#e65f35';
      ctx.lineWidth = 7;
      ctx.strokeRect(rect.x - 16, rect.y - 16, rect.width + 32, rect.height + 56);
    }
    ctx.restore();
  });

  ctx.fillStyle = '#1f201c';
  fitText(ctx, note || 'A small moment, carefully kept.', style === 'quiet' ? 740 : 1000, style === 'quiet' ? 47 : 52, 'Georgia, serif');
  const noteX = style === 'quiet' ? 72 : 76;
  const noteY = style === 'quiet' ? 1335 : 1410;
  ctx.fillText(note || 'A small moment, carefully kept.', noteX, noteY);
  ctx.fillStyle = '#74766e';
  ctx.font = '20px ui-monospace, monospace';
  ctx.fillText(photo.name.replace(/\.[^.]+$/, '').toUpperCase(), noteX, noteY + 48);
}

function drawOverlap(ctx: CanvasRenderingContext2D, before: Photo, after: Photo, split: number, edge: EdgeStyle, caption: string) {
  ctx.fillStyle = '#eeeae0';
  ctx.fillRect(0, 0, PAPER_WIDTH, PAPER_HEIGHT);
  const frame: Rect = { x: 70, y: 75, width: 1060, height: 1220 };
  cover(ctx, before.image, frame);
  const divider = frame.x + frame.width * split / 100;
  ctx.save();
  if (edge === 'torn') {
    ctx.beginPath();
    ctx.moveTo(divider, frame.y);
    for (let y = frame.y; y <= frame.y + frame.height; y += 22) ctx.lineTo(divider + Math.sin(y * .053) * 12 + Math.sin(y * .017) * 7, y);
    ctx.lineTo(frame.x + frame.width, frame.y + frame.height);
    ctx.lineTo(frame.x + frame.width, frame.y);
    ctx.closePath();
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(divider, frame.y, frame.x + frame.width - divider, frame.height);
    ctx.clip();
  }
  cover(ctx, after.image, frame);
  ctx.restore();
  if (edge === 'line') {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(divider, frame.y); ctx.lineTo(divider, frame.y + frame.height); ctx.stroke();
  }
  if (edge === 'soft') {
    const gradient = ctx.createLinearGradient(divider - 60, 0, divider + 60, 0);
    gradient.addColorStop(0, 'rgba(238,234,224,0)');
    gradient.addColorStop(.5, 'rgba(238,234,224,.58)');
    gradient.addColorStop(1, 'rgba(238,234,224,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(divider - 60, frame.y, 120, frame.height);
  }
  ctx.fillStyle = '#fff';
  ctx.font = '600 18px ui-monospace, monospace';
  ctx.fillText('THEN', frame.x + 24, frame.y + 38);
  ctx.textAlign = 'right';
  ctx.fillText('NOW', frame.x + frame.width - 24, frame.y + 38);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#22231f';
  fitText(ctx, caption || 'Two moments, one frame.', 990, 42, 'Georgia, serif');
  ctx.fillText(caption || 'Two moments, one frame.', 72, 1392);
  ctx.font = '18px ui-monospace, monospace';
  ctx.fillStyle = '#75776f';
  ctx.fillText(`${String(Math.round(split)).padStart(2, '0')} / ${String(Math.round(100 - split)).padStart(2, '0')}`, 72, 1436);
}

function Shell({ language, setLanguage, title, eyebrow, onExport, disabled, children, inspector }: Props & { title: string; eyebrow: string; onExport: () => void; disabled: boolean; children: ReactNode; inspector: ReactNode }) {
  return <><section className="workspace creative-workspace"><header className="topbar"><div className="crumbs"><span>{language === 'zh' ? '项目' : 'projects'}</span><b>/</b><strong>{title}</strong></div><div className="top-actions"><ThemeSwitch language={language} /><div className="language-switch"><button type="button" className={language === 'zh' ? 'chosen' : ''} onClick={() => setLanguage('zh')}>中</button><button type="button" className={language === 'en' ? 'chosen' : ''} onClick={() => setLanguage('en')}>EN</button></div><button type="button" className="export-button" disabled={disabled} onClick={onExport}>{language === 'zh' ? '导出' : 'export'} <span>↗</span></button></div></header><div className="creative-area"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</div></section><aside className="inspector creative-inspector"><div className="inspector-header"><span>{language === 'zh' ? '编辑' : 'edit'}</span><span className="status-pill">● {language === 'zh' ? '实时' : 'live'}</span></div>{inspector}</aside></>;
}

export function PaperJourneyModule({ language, setLanguage }: Props) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [style, setStyle] = useState<PaperStyle>('quiet');
  const [note, setNote] = useState(language === 'zh' ? '沿途的小事，也值得被认真收藏。' : 'Small things along the way deserve to be kept.');
  const [detailCount, setDetailCount] = useState(3);
  const [points, setPoints] = useState<Point[]>(DEFAULT_POINTS);
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !photo) return;
    drawPaperJourney(ctx, photo, style, note, points, detailCount, selected);
  }, [photo, style, note, points, detailCount, selected]);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) setPhoto((await loadPhotos(event.target.files, 1))[0]);
    event.target.value = '';
  };
  const selectDetail = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width * PAPER_WIDTH;
    const py = (event.clientY - box.top) / box.height * PAPER_HEIGHT;
    const main = mainRect(style);
    if (px < main.x || px > main.x + main.width || py < main.y || py > main.y + main.height) return;
    const x = (px - main.x) / main.width;
    const y = (py - main.y) / main.height;
    setPoints(current => current.map((point, index) => index === selected ? { x, y } : point));
  };
  const exportImage = () => {
    if (!photo) return;
    const output = document.createElement('canvas');
    output.width = PAPER_WIDTH; output.height = PAPER_HEIGHT;
    const ctx = output.getContext('2d');
    if (!ctx) return;
    drawPaperJourney(ctx, photo, style, note, points, detailCount);
    download(output, 'paper-journey.png');
  };
  const styleNames: Record<PaperStyle, [string, string]> = { quiet: ['安静留白', 'quiet'], travel: ['旅行剪贴', 'travel'], editorial: ['杂志注释', 'editorial'] };

  return <Shell language={language} setLanguage={setLanguage} title={language === 'zh' ? '纸上漫游' : 'paper journey'} eyebrow="PHOTO STUDIO / 06 · JOURNAL" onExport={exportImage} disabled={!photo} inspector={<>
    <section className="inspector-section"><div className="section-title"><strong>{language === 'zh' ? '照片' : 'photo'}</strong></div><button type="button" className="upload-card" onClick={() => input.current?.click()}><span className="upload-card-icon">↑</span><span><strong>{photo ? (language === 'zh' ? '替换照片' : 'replace photo') : (language === 'zh' ? '上传照片' : 'upload photo')}</strong><small>{photo?.name || 'JPG · PNG · WebP'}</small></span><span>↗</span></button><input ref={input} className="sr-only" type="file" accept="image/*" onChange={choose} /></section>
    <section className="inspector-section"><label className="field-label">{language === 'zh' ? '版式' : 'layout'}</label><div className="creative-style-list">{(Object.keys(styleNames) as PaperStyle[]).map(key => <button type="button" key={key} className={style === key ? 'active' : ''} onClick={() => setStyle(key)}><i />{language === 'zh' ? styleNames[key][0] : styleNames[key][1]}</button>)}</div></section>
    <section className="inspector-section"><label className="field-label">{language === 'zh' ? '手记' : 'note'}</label><textarea className="creative-textarea" maxLength={46} value={note} onChange={event => setNote(event.target.value)} /><label className="creative-range"><span>{language === 'zh' ? '局部特写' : 'detail crops'} <b>{detailCount}</b></span><input type="range" min="1" max="3" value={detailCount} onChange={event => { setDetailCount(Number(event.target.value)); setSelected(Math.min(selected, Number(event.target.value) - 1)); }} /></label><div className="detail-selector">{Array.from({ length: detailCount }, (_, index) => <button type="button" key={index} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}>{String(index + 1).padStart(2, '0')}</button>)}</div><p className="creative-hint">{language === 'zh' ? '选中一个编号，再点击主画面设置它的取景中心。' : 'Choose a number, then click the main image to set its focal point.'}</p></section>
    <button type="button" className="creative-export" disabled={!photo} onClick={exportImage}>{language === 'zh' ? '导出纸上漫游' : 'export paper journey'} <span>↗</span></button>
  </>}><p className="creative-lead">{language === 'zh' ? '从一张照片里重新发现细节，把主画面、局部与一句话排成一页旅行手记。' : 'Rediscover one photograph through its scene, details and a single line of memory.'}</p><div className="paper-stage">{photo ? <canvas ref={canvas} width={PAPER_WIDTH} height={PAPER_HEIGHT} onPointerDown={selectDetail} /> : <button type="button" className="creative-empty" onClick={() => input.current?.click()}><b>＋</b><span>{language === 'zh' ? '放入一张照片，开始漫游' : 'add a photo to begin'}</span><small>{language === 'zh' ? '自动生成主画面与局部特写' : 'scene and details, composed automatically'}</small></button>}</div></Shell>;
}

export function TimeOverlapModule({ language, setLanguage }: Props) {
  const [photos, setPhotos] = useState<(Photo | null)[]>([null, null]);
  const [split, setSplit] = useState(50);
  const [edge, setEdge] = useState<EdgeStyle>('torn');
  const [caption, setCaption] = useState(language === 'zh' ? '时间经过，画面留下。' : 'Time passes. The frame remains.');
  const inputA = useRef<HTMLInputElement>(null), inputB = useRef<HTMLInputElement>(null), canvas = useRef<HTMLCanvasElement>(null), dragging = useRef(false);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !photos[0] || !photos[1]) return;
    drawOverlap(ctx, photos[0], photos[1], split, edge, caption);
  }, [photos, split, edge, caption]);

  const choose = (slot: number) => async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const loaded = await loadPhotos(event.target.files, 2);
    setPhotos(current => {
      const next = [...current];
      if (loaded.length > 1) return [loaded[0], loaded[1]];
      next[slot] = loaded[0];
      return next;
    });
    event.target.value = '';
  };
  const updateSplit = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    setSplit(Math.max(8, Math.min(92, (event.clientX - box.left) / box.width * 100)));
  };
  const exportImage = () => {
    if (!photos[0] || !photos[1]) return;
    const output = document.createElement('canvas'); output.width = PAPER_WIDTH; output.height = PAPER_HEIGHT;
    const ctx = output.getContext('2d'); if (!ctx) return;
    drawOverlap(ctx, photos[0], photos[1], split, edge, caption);
    download(output, 'time-overlap.png');
  };
  const ready = Boolean(photos[0] && photos[1]);
  const edgeNames: Record<EdgeStyle, [string, string]> = { line: ['细线', 'line'], torn: ['撕纸', 'torn'], soft: ['柔和', 'soft'] };

  return <Shell language={language} setLanguage={setLanguage} title={language === 'zh' ? '时光重叠' : 'time overlap'} eyebrow="PHOTO STUDIO / 07 · OVERLAP" onExport={exportImage} disabled={!ready} inspector={<>
    <section className="inspector-section"><div className="section-title"><strong>{language === 'zh' ? '两张照片' : 'two photos'}</strong><span className="section-count">{photos.filter(Boolean).length}/2</span></div><div className="overlap-upload-list"><button type="button" className="upload-card" onClick={() => inputA.current?.click()}><span className="upload-card-icon">A</span><span><strong>{photos[0] ? (language === 'zh' ? '替换左图' : 'replace left') : (language === 'zh' ? '上传左图' : 'upload left')}</strong><small>{photos[0]?.name || 'THEN'}</small></span><span>↗</span></button><button type="button" className="upload-card" onClick={() => inputB.current?.click()}><span className="upload-card-icon">B</span><span><strong>{photos[1] ? (language === 'zh' ? '替换右图' : 'replace right') : (language === 'zh' ? '上传右图' : 'upload right')}</strong><small>{photos[1]?.name || 'NOW'}</small></span><span>↗</span></button></div><input ref={inputA} className="sr-only" type="file" multiple accept="image/*" onChange={choose(0)} /><input ref={inputB} className="sr-only" type="file" multiple accept="image/*" onChange={choose(1)} />{ready && <button type="button" className="swap-photos" onClick={() => setPhotos([photos[1], photos[0]])}>⇄ {language === 'zh' ? '交换左右照片' : 'swap photos'}</button>}</section>
    <section className="inspector-section"><label className="field-label">{language === 'zh' ? '分界效果' : 'edge style'}</label><div className="creative-segmented">{(Object.keys(edgeNames) as EdgeStyle[]).map(key => <button type="button" key={key} className={edge === key ? 'active' : ''} onClick={() => setEdge(key)}>{language === 'zh' ? edgeNames[key][0] : edgeNames[key][1]}</button>)}</div><label className="creative-range"><span>{language === 'zh' ? '分界位置' : 'divider'} <b>{Math.round(split)}%</b></span><input type="range" min="8" max="92" value={split} onChange={event => setSplit(Number(event.target.value))} /></label></section>
    <section className="inspector-section"><label className="field-label">{language === 'zh' ? '画面注释' : 'caption'}</label><textarea className="creative-textarea" maxLength={42} value={caption} onChange={event => setCaption(event.target.value)} /></section>
    <button type="button" className="creative-export" disabled={!ready} onClick={exportImage}>{language === 'zh' ? '导出重叠画面' : 'export overlap'} <span>↗</span></button>
  </>}><p className="creative-lead">{language === 'zh' ? '把两个时间放进同一个画幅，拖动分界线，让变化自己说话。' : 'Place two moments in one frame and let the moving boundary tell the story.'}</p><div className="overlap-stage">{ready ? <canvas ref={canvas} width={PAPER_WIDTH} height={PAPER_HEIGHT} onPointerDown={event => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); updateSplit(event); }} onPointerMove={updateSplit} onPointerUp={event => { dragging.current = false; event.currentTarget.releasePointerCapture(event.pointerId); }} /> : <div className="overlap-empty"><button type="button" onClick={() => inputA.current?.click()}><b>{photos[0] ? '✓' : 'A'}</b><span>{language === 'zh' ? '过去 / 左侧' : 'then / left'}</span></button><button type="button" onClick={() => inputB.current?.click()}><b>{photos[1] ? '✓' : 'B'}</b><span>{language === 'zh' ? '现在 / 右侧' : 'now / right'}</span></button></div>}</div></Shell>;
}
