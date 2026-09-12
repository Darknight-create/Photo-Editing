'use client';

import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import ThemeSwitch from './theme-switch';
import { centerColor, photoMetadata } from './ticket-art';
import { drawPolaroid, drawPolaroidShare, PHOTO_FRAME, POLAROID_HEIGHT, POLAROID_WIDTH, PolaroidArt, PolaroidFit, PolaroidStyle } from './polaroid-art';

type Language = 'zh' | 'en';
type ExportQuality = 'hd' | 'uhd';
type ExportFormat = 'png' | 'jpeg';

const words = {
  zh: {
    module: '此刻留白', eyebrow: 'PHOTO STUDIO / 05 · POLAROID', headline: '把一个瞬间，留成可以触摸的记忆。', note: '上传照片后，拖动画面调整取景，在下方写下这一刻。',
    project: '项目', inspector: '编辑', live: '实时', upload: '上传照片', replace: '替换照片', uploadHint: 'JPG、PNG · 一次一张', empty: '点击放入一张想留住的照片', image: '照片', style: '相纸风格', first: '初见', firstHint: '清透白边', memory: '旧时光', memoryHint: '奶油旧影', night: '晚安片刻', nightHint: '低饱和灰调',
    text: '写下此刻', message: '留言', placeholder: '比如：把今天，轻轻收好。', date: '日期', place: '地点', placePlaceholder: '可选，比如：上海', phrases: '一句开场', framing: '取景', zoom: '缩放', crop: '铺满画面', contain: '完整显示', recenter: '恢复居中', dragHint: '按住照片区域拖动取景',
    export: '导出', exportPaper: '导出相纸', exportShare: '导出分享画布', png: 'PNG', jpg: 'JPG', hd: '高清', uhd: '超清', expected: '预计处理内存', lastSize: '上次导出', developing: '正在显影…', revealNow: '立即显影', reset: '重置', noImage: '请先上传照片', exportFailed: '导出失败，请换一张照片后重试。', language: '语言', switchLabel: '切换语言', made: '把情绪留在相纸里',
  },
  en: {
    module: 'quiet moment', eyebrow: 'PHOTO STUDIO / 05 · POLAROID', headline: 'Turn one moment into something you can hold.', note: 'Upload a photo, drag to compose it, then leave a note beneath the frame.',
    project: 'projects', inspector: 'edit', live: 'live', upload: 'upload photo', replace: 'replace photo', uploadHint: 'JPG, PNG · one at a time', empty: 'Click to add a moment worth keeping', image: 'photo', style: 'paper style', first: 'first light', firstHint: 'clean white', memory: 'old memory', memoryHint: 'warm faded paper', night: 'afterglow', nightHint: 'quiet muted tone',
    text: 'write this moment', message: 'note', placeholder: 'For example: keep today, gently.', date: 'date', place: 'place', placePlaceholder: 'Optional, e.g. Shanghai', phrases: 'start with a line', framing: 'framing', zoom: 'zoom', crop: 'fill frame', contain: 'show all', recenter: 'recenter', dragHint: 'Hold and drag inside the photo to reframe',
    export: 'export', exportPaper: 'export polaroid', exportShare: 'export share canvas', png: 'PNG', jpg: 'JPG', hd: 'high', uhd: 'ultra', expected: 'estimated working memory', lastSize: 'last export', developing: 'developing…', revealNow: 'reveal now', reset: 'reset', noImage: 'Upload a photo first.', exportFailed: 'Export failed. Please try another photo.', language: 'language', switchLabel: 'Switch language', made: 'keep the feeling on paper',
  },
} as const;

const phraseOptions = {
  zh: ['今天的风，刚刚好。', '这一刻，值得留住。', '把今天，轻轻收好。', '我在这里，也很快乐。'],
  en: ['The light felt just right.', 'A moment worth keeping.', 'Keep today, gently.', 'I was here, and I was happy.'],
};

function clamp(value: number) { return Math.min(100, Math.max(0, value)); }
function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export default function PolaroidModule({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  const t = words[language];
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; positionX: number; positionY: number } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [style, setStyle] = useState<PolaroidStyle>('first');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState<PolaroidFit>('cover');
  const [background, setBackground] = useState('#75879a');
  const [developing, setDeveloping] = useState(false);
  const [quality, setQuality] = useState<ExportQuality>('hd');
  const [format, setFormat] = useState<ExportFormat>('png');
  const [lastSize, setLastSize] = useState<number | null>(null);
  const [error, setError] = useState('');

  const art = useMemo<PolaroidArt | null>(() => image ? ({ image, style, message, date, place, positionX, positionY, zoom, fit }) : null, [image, style, message, date, place, positionX, positionY, zoom, fit]);
  const exportWidth = quality === 'hd' ? 1200 : 2000;
  const exportHeight = Math.round(exportWidth * POLAROID_HEIGHT / POLAROID_WIDTH);
  const estimatedMemory = exportWidth * exportHeight * 4;

  useEffect(() => {
    if (!developing) return;
    const timer = window.setTimeout(() => setDeveloping(false), 2000);
    return () => window.clearTimeout(timer);
  }, [developing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (art) drawPolaroid(context, art, canvas.width, canvas.height);
  }, [art]);

  const upload = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setError('');
    const [src, buffer] = await Promise.all([
      new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }),
      file.arrayBuffer(),
    ]);
    const nextImage = new Image();
    nextImage.onload = () => {
      const metadata = photoMetadata(buffer);
      setImage(nextImage);
      setFileName(file.name);
      setBackground(centerColor(nextImage));
      setDate(metadata.date || new Date().toISOString().slice(0, 10));
      setPositionX(50); setPositionY(50); setZoom(1); setFit('cover');
      setDeveloping(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };
    nextImage.onerror = () => setError(t.exportFailed);
    nextImage.src = src;
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void upload(event.target.files?.[0]);
    event.target.value = '';
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!image || fit === 'contain') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * POLAROID_WIDTH;
    const y = (event.clientY - rect.top) / rect.height * POLAROID_HEIGHT;
    if (x < PHOTO_FRAME.x || x > PHOTO_FRAME.x + PHOTO_FRAME.size || y < PHOTO_FRAME.y || y > PHOTO_FRAME.y + PHOTO_FRAME.size) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, positionX, positionY };
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPositionX(clamp(drag.positionX - (event.clientX - drag.x) / rect.width * 125));
    setPositionY(clamp(drag.positionY - (event.clientY - drag.y) / rect.height * 156));
  };

  const stopDragging = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const reset = () => {
    setImage(null); setFileName(''); setMessage(''); setDate(''); setPlace(''); setStyle('first'); setPositionX(50); setPositionY(50); setZoom(1); setFit('cover'); setDeveloping(false); setLastSize(null); setError('');
  };

  const saveCanvas = (canvas: HTMLCanvasElement, name: string) => new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('blob')); return; }
      setLastSize(blob.size);
      const link = document.createElement('a');
      link.download = `${name}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      link.href = URL.createObjectURL(blob);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      resolve();
    }, format === 'jpeg' ? 'image/jpeg' : 'image/png', .92);
  });

  const exportArt = async (kind: 'paper' | 'share') => {
    if (!art) { setError(t.noImage); return; }
    setError('');
    try {
      const canvas = document.createElement('canvas');
      if (kind === 'paper') {
        canvas.width = exportWidth; canvas.height = exportHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('canvas');
        drawPolaroid(context, art, canvas.width, canvas.height);
      } else {
        canvas.width = quality === 'hd' ? 1600 : 2400;
        canvas.height = Math.round(canvas.width * 1.25);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('canvas');
        drawPolaroidShare(context, art, background, canvas.width, canvas.height);
      }
      await saveCanvas(canvas, kind === 'paper' ? 'quiet-moment-polaroid' : 'quiet-moment-share');
    } catch { setError(t.exportFailed); }
  };

  const styles: { key: PolaroidStyle; title: string; hint: string }[] = [
    { key: 'first', title: t.first, hint: t.firstHint },
    { key: 'memory', title: t.memory, hint: t.memoryHint },
    { key: 'night', title: t.night, hint: t.nightHint },
  ];

  return <>
    <section className="workspace polaroid-workspace">
      <header className="topbar">
        <div className="crumbs"><span>{t.project}</span><b>/</b><strong>{t.module}</strong></div>
        <div className="top-actions"><ThemeSwitch language={language} /><div className="language-switch" aria-label={t.switchLabel}><span>{t.language}</span><button className={language === 'zh' ? 'chosen' : ''} type="button" onClick={() => setLanguage('zh')}>中</button><i>/</i><button className={language === 'en' ? 'chosen' : ''} type="button" onClick={() => setLanguage('en')}>EN</button></div><button className="quiet-button" type="button" onClick={reset}>{t.reset}</button><button className="export-button" type="button" disabled={!image} onClick={() => void exportArt('paper')}><span>{t.export}</span><span className="arrow">↗</span></button></div>
      </header>
      <div className="polaroid-area">
        <div className="polaroid-heading"><div><p className="eyebrow">{t.eyebrow}</p><h1>{t.module}</h1></div><p>{t.headline}</p></div>
        <div className="polaroid-stage" style={{ '--moment-color': background } as React.CSSProperties}>
          {image ? <div className={`polaroid-preview ${developing ? 'developing' : ''}`}>
            <canvas ref={canvasRef} width={600} height={750} aria-label={t.module} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging} />
            {developing && <div className="developing-layer"><span>{t.developing}</span><button type="button" onClick={() => setDeveloping(false)}>{t.revealNow}</button></div>}
          </div> : <button className="polaroid-empty" type="button" onClick={() => inputRef.current?.click()}><span>＋</span><strong>{t.empty}</strong><small>{t.uploadHint}</small></button>}
        </div>
        <div className="polaroid-stage-footer"><span>{image ? t.dragHint : t.note}</span><b>{fileName || '—'}</b></div>
      </div>
    </section>

    <aside className="inspector polaroid-inspector">
      <div className="inspector-header"><span>{t.inspector}</span><span className="status-pill">● {t.live}</span></div>
      <section className="inspector-section"><div className="section-title"><strong>{t.image}</strong></div><button className="upload-card" type="button" onClick={() => inputRef.current?.click()}><span className="upload-card-icon">↑</span><span><strong>{image ? t.replace : t.upload}</strong><small>{t.uploadHint}</small></span><span className="card-arrow">↗</span></button><input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={onFileChange} /></section>
      <section className="inspector-section"><div className="section-title"><strong>{t.style}</strong></div><div className="polaroid-style-grid">{styles.map(option => <button key={option.key} type="button" className={style === option.key ? 'selected' : ''} onClick={() => setStyle(option.key)}><span className={`paper-sample ${option.key}`} /><strong>{option.title}</strong><small>{option.hint}</small></button>)}</div></section>
      <section className="inspector-section"><div className="section-title"><strong>{t.text}</strong></div><label className="field-label" htmlFor="moment-message">{t.message}</label><textarea id="moment-message" className="polaroid-textarea" maxLength={80} value={message} onChange={event => setMessage(event.target.value)} placeholder={t.placeholder} /><div className="phrase-label">{t.phrases}</div><div className="phrase-list">{phraseOptions[language].map(phrase => <button type="button" key={phrase} onClick={() => setMessage(phrase)}>{phrase}</button>)}</div><div className="polaroid-fields"><label><span>{t.date}</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label><span>{t.place}</span><input type="text" maxLength={24} value={place} onChange={event => setPlace(event.target.value)} placeholder={t.placePlaceholder} /></label></div></section>
      <section className="inspector-section"><div className="section-title"><strong>{t.framing}</strong></div><div className="polaroid-fit" role="group" aria-label={t.framing}><button className={fit === 'cover' ? 'selected' : ''} type="button" onClick={() => { setFit('cover'); setZoom(1); }}>{t.crop}</button><button className={fit === 'contain' ? 'selected' : ''} type="button" onClick={() => { setFit('contain'); setZoom(1); setPositionX(50); setPositionY(50); }}>{t.contain}</button></div><label className="field-label polaroid-zoom">{t.zoom}<output>{Math.round(zoom * 100)}%</output><input type="range" min="1" max="2" step=".01" value={zoom} onChange={event => setZoom(Number(event.target.value))} disabled={!image} /></label><button className="add-text" type="button" disabled={!image} onClick={() => { setPositionX(50); setPositionY(50); }}>↺ {t.recenter}</button></section>
      <section className="inspector-section polaroid-export-section"><div className="section-title"><strong>{t.export}</strong></div><div className="polaroid-fit"><button className={format === 'png' ? 'selected' : ''} type="button" onClick={() => setFormat('png')}>{t.png}</button><button className={format === 'jpeg' ? 'selected' : ''} type="button" onClick={() => setFormat('jpeg')}>{t.jpg}</button></div><div className="polaroid-fit"><button className={quality === 'hd' ? 'selected' : ''} type="button" onClick={() => setQuality('hd')}>{t.hd}</button><button className={quality === 'uhd' ? 'selected' : ''} type="button" onClick={() => setQuality('uhd')}>{t.uhd}</button></div><p className="export-memory"><span>{t.expected}</span><b>{formatBytes(estimatedMemory)}</b></p>{lastSize !== null && <p className="export-memory"><span>{t.lastSize}</span><b>{formatBytes(lastSize)}</b></p>}<button className="polaroid-export primary" type="button" disabled={!image} onClick={() => void exportArt('paper')}>{t.exportPaper}<span>↗</span></button><button className="polaroid-export" type="button" disabled={!image} onClick={() => void exportArt('share')}>{t.exportShare}<span>↗</span></button>{error && <p className="polaroid-error" role="alert">{error}</p>}</section>
      <div className="inspector-footer">{t.made} <span>✶</span></div>
    </aside>
  </>;
}
