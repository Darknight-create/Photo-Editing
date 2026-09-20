'use client';

import { ChangeEvent, ReactNode, useMemo, useRef, useState } from 'react';
import ThemeSwitch from './theme-switch';

type Language = 'zh' | 'en';
type Props = { language: Language; setLanguage: (language: Language) => void };
type Photo = { src: string; name: string; image: HTMLImageElement };

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
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sw = width / scale, sh = height / scale;
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, width, height);
}

function palette(image: HTMLImageElement) {
  const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 48;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return ['#61778a', '#d6c7aa', '#222a2b', '#f2eee4'];
  ctx.drawImage(image, 0, 0, 48, 48);
  const pixels = ctx.getImageData(0, 0, 48, 48).data, buckets = new Map<string, number>();
  for (let i = 0; i < pixels.length; i += 32) {
    const r = Math.round(pixels[i] / 40) * 40, g = Math.round(pixels[i + 1] / 40) * 40, b = Math.round(pixels[i + 2] / 40) * 40;
    const key = `${Math.min(240, r)},${Math.min(240, g)},${Math.min(240, b)}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([rgb]) => `rgb(${rgb})`);
}

function Shell({ language, setLanguage, title, eyebrow, onExport, disabled, children, inspector }: Props & { title: string; eyebrow: string; onExport: () => void; disabled: boolean; children: ReactNode; inspector: ReactNode }) {
  return <><section className="workspace creative-workspace"><header className="topbar"><div className="crumbs"><span>{language === 'zh' ? '项目' : 'projects'}</span><b>/</b><strong>{title}</strong></div><div className="top-actions"><ThemeSwitch language={language} /><div className="language-switch"><button className={language === 'zh' ? 'chosen' : ''} onClick={() => setLanguage('zh')}>中</button><button className={language === 'en' ? 'chosen' : ''} onClick={() => setLanguage('en')}>EN</button></div><button className="export-button" disabled={disabled} onClick={onExport}>{language === 'zh' ? '导出' : 'export'} <span>↗</span></button></div></header><div className="creative-area"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</div></section><aside className="inspector creative-inspector"><div className="inspector-header"><span>{language === 'zh' ? '编辑' : 'edit'}</span><span className="status-pill">● {language === 'zh' ? '实时' : 'live'}</span></div>{inspector}</aside></>;
}

export function FilmstripModule({ language, setLanguage }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]), [caption, setCaption] = useState(language === 'zh' ? '今天，也有值得留下的光。' : 'Light worth keeping, from today.');
  const input = useRef<HTMLInputElement>(null);
  const exportFilm = () => { if (!photos.length) return; const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 420 + photos.length * 760; const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.fillStyle = '#191b1a'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#f4ead0'; ctx.font = '600 54px Georgia'; ctx.fillText(caption, 110, 150); photos.forEach((photo, index) => { const y = 290 + index * 760; ctx.fillStyle = '#eee7d7'; ctx.fillRect(110, y, 1180, 650); cover(ctx, photo.image, 160, y + 50, 1080, 520); ctx.fillStyle = '#242725'; ctx.font = '28px monospace'; ctx.fillText(`${String(index + 1).padStart(2, '0')}  /  ${photo.name.replace(/\.[^.]+$/, '')}`, 160, y + 615); }); download(canvas, 'day-filmstrip.png'); };
  const choose = async (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) setPhotos(await loadPhotos(event.target.files, 6)); event.target.value = ''; };
  return <Shell language={language} setLanguage={setLanguage} title={language === 'zh' ? '一日底片' : 'day film'} eyebrow="PHOTO STUDIO / 06 · FILM" onExport={exportFilm} disabled={!photos.length} inspector={<><section className="inspector-section"><div className="section-title"><strong>{language === 'zh' ? '照片' : 'photos'}</strong><span className="section-count">{photos.length}/6</span></div><button className="upload-card" onClick={() => input.current?.click()}><span className="upload-card-icon">↑</span><span><strong>{language === 'zh' ? '上传 3—6 张照片' : 'upload 3—6 photos'}</strong><small>JPG · PNG · WebP</small></span><span>↗</span></button><input ref={input} className="sr-only" type="file" multiple accept="image/*" onChange={choose} /></section><section className="inspector-section"><label className="field-label">{language === 'zh' ? '片头旁白' : 'opening line'}</label><textarea className="creative-textarea" value={caption} maxLength={60} onChange={e => setCaption(e.target.value)} /></section><button className="creative-export" disabled={!photos.length} onClick={exportFilm}>{language === 'zh' ? '导出长幅底片' : 'export filmstrip'} <span>↗</span></button></>}><p className="creative-lead">{language === 'zh' ? '把一天里零散的光，收进一卷可以向下阅读的底片。' : 'Gather the scattered light of a day into one continuous roll.'}</p><div className="film-preview">{photos.length ? photos.map((photo, index) => <figure key={photo.src}><img src={photo.src} alt={photo.name} /><figcaption>{String(index + 1).padStart(2, '0')} / {photo.name.replace(/\.[^.]+$/, '')}</figcaption></figure>) : <button onClick={() => input.current?.click()}><b>＋</b><span>{language === 'zh' ? '放入 3—6 个瞬间' : 'add 3—6 moments'}</span></button>}</div></Shell>;
}

export function MoodPaletteModule({ language, setLanguage }: Props) {
  const [photo, setPhoto] = useState<Photo | null>(null), [line, setLine] = useState(language === 'zh' ? '今天的颜色，是安静的蓝。' : 'Today feels like a quiet blue.');
  const input = useRef<HTMLInputElement>(null), colors = useMemo(() => photo ? palette(photo.image) : ['#61778a', '#d6c7aa', '#222a2b', '#f2eee4'], [photo]);
  const choose = async (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files?.[0]) setPhoto((await loadPhotos(event.target.files, 1))[0]); event.target.value = ''; };
  const exportMood = () => { if (!photo) return; const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 2000; const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.fillStyle = '#f5f1e8'; ctx.fillRect(0, 0, 1600, 2000); cover(ctx, photo.image, 120, 120, 1360, 1020); ctx.fillStyle = '#1f2524'; ctx.font = '600 68px Georgia'; ctx.fillText(line, 120, 1310, 1360); colors.forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(120 + i * 340, 1510, 300, 250); ctx.fillStyle = '#252a28'; ctx.font = '24px monospace'; ctx.fillText(String(i + 1).padStart(2, '0'), 120 + i * 340, 1815); }); download(canvas, 'mood-sampling.png'); };
  return <Shell language={language} setLanguage={setLanguage} title={language === 'zh' ? '情绪采样' : 'mood sampling'} eyebrow="PHOTO STUDIO / 07 · PALETTE" onExport={exportMood} disabled={!photo} inspector={<><section className="inspector-section"><div className="section-title"><strong>{language === 'zh' ? '照片' : 'photo'}</strong></div><button className="upload-card" onClick={() => input.current?.click()}><span className="upload-card-icon">↑</span><span><strong>{photo ? (language === 'zh' ? '替换照片' : 'replace photo') : (language === 'zh' ? '上传照片' : 'upload photo')}</strong><small>{photo?.name || 'JPG · PNG · WebP'}</small></span><span>↗</span></button><input ref={input} className="sr-only" type="file" accept="image/*" onChange={choose} /></section><section className="inspector-section"><label className="field-label">{language === 'zh' ? '这一刻的注释' : 'note for this moment'}</label><textarea className="creative-textarea" value={line} maxLength={48} onChange={e => setLine(e.target.value)} /><div className="palette-row">{colors.map(color => <i key={color} style={{ background: color }} />)}</div></section><button className="creative-export" disabled={!photo} onClick={exportMood}>{language === 'zh' ? '导出情绪色卡' : 'export mood card'} <span>↗</span></button></>}><p className="creative-lead">{language === 'zh' ? '从画面中心提取四种颜色，让照片多一种被记住的方式。' : 'Four colors sampled from the image, held beside one line of memory.'}</p><div className="mood-preview">{photo ? <><img src={photo.src} alt={photo.name} /><h2>{line}</h2><div>{colors.map(color => <i key={color} style={{ background: color }} />)}</div></> : <button onClick={() => input.current?.click()}><b>＋</b><span>{language === 'zh' ? '放入一张照片' : 'add one photo'}</span></button>}</div></Shell>;
}
