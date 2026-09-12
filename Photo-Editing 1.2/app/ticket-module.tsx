'use client';

import { useEffect, useRef, useState } from 'react';
import ThemeSwitch from './theme-switch';
import { centerColor, drawPhoto, drawTicket, photoMetadata, TICKET_HEIGHT as H, TICKET_WIDTH as W, type TextRegion, type TicketArt, type TicketField, type TicketStyle, type TicketText } from './ticket-art';

const copy = {
  zh: {
    module: '电子票根', help: '把一张照片，留成一张票。双击票面文字即可修改。', upload: '上传照片', replace: '替换照片', image: '照片', templates: '票根样式', text: '票面文字', title: '标题 / 地点', date: '日期', number: '编号', note: '备注', color: '背景颜色', extract: '重新提取中心色', export: '下载', ticketOnly: '单独下载票根', combined: '下载照片＋票根', layout: '上下顺序', ticketFirst: '票根在上', photoFirst: '照片在上', fit: '照片展示', contain: '完整显示（可能留边）', cover: '居中铺满（推荐）', resetCrop: '恢复居中取景', dragCrop: '在照片区域拖动可调整取景', empty: '上传一张照片，开始制作票根', local: '照片仅在当前浏览器处理', loading: '正在读取照片…', failure: '图片读取失败，请使用 JPG、PNG 或 WebP 图片重试。', exportFailure: '下载失败，请稍后重试。', busy: '正在生成…', metadata: '标题取自文件名；日期优先读取拍摄信息。', missing: '未找到拍摄日期，请手动填写', found: '已读取拍摄日期', hint: '照片与票根各占 50% · 组合图为 3:4', edit: '双击修改，也可在右侧填写', save: '保存', cancel: '取消', decorative: '条码为纪念装饰，不用于验票。', defaultTitle: '我的旅途', defaultNote: 'TICKET STUB', styles: ['复古齿孔', '电影入场券', '旅行登机牌'], styleNotes: ['奶油纸色 · 照片票面', '深色票面 · 电影感', '航程排版 · 旅行记录'],
  },
  en: {
    module: 'Photo ticket', help: 'Keep a photo as a ticket. Double-click its text to edit.', upload: 'Upload photo', replace: 'Replace photo', image: 'Photo', templates: 'Ticket style', text: 'Ticket text', title: 'Title / place', date: 'Date', number: 'Number', note: 'Note', color: 'Background color', extract: 'Resample center color', export: 'Download', ticketOnly: 'Download ticket', combined: 'Download photo + ticket', layout: 'Stack order', ticketFirst: 'Ticket above', photoFirst: 'Photo above', fit: 'Photo fit', contain: 'Show full photo (may add margins)', cover: 'Center and fill (recommended)', resetCrop: 'Reset centered crop', dragCrop: 'Drag inside the photo area to adjust the crop', empty: 'Upload a photo to create your ticket', local: 'Photos stay in your browser', loading: 'Reading photo…', failure: 'Could not read this image. Try JPG, PNG or WebP.', exportFailure: 'Download failed. Please try again.', busy: 'Preparing…', metadata: 'Title comes from the filename; date comes from photo metadata when available.', missing: 'No capture date found. Enter it manually.', found: 'Capture date found', hint: 'Photo 50% + ticket 50% · 3:4 combined image', edit: 'Double-click to edit, or use the text fields', save: 'Save', cancel: 'Cancel', decorative: 'Decorative barcode, not valid for admission.', defaultTitle: 'My journey', defaultNote: 'TICKET STUB', styles: ['Classic stub', 'Cinema ticket', 'Boarding pass'], styleNotes: ['Cream paper · photo inset', 'Dark stock · cinema type', 'Travel layout · your journey'],
  },
};
const styles: TicketStyle[] = ['classic', 'cinema', 'journey'];
const fields: TicketField[] = ['title', 'date', 'number', 'note'];

function TicketThumbnail({ art }: { art: TicketArt }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(240 / W, 0, 0, 160 / H, 0, 0);
    drawTicket(ctx, art);
  }, [art]);
  return <canvas ref={ref} width={240} height={160} aria-hidden="true" />;
}

export default function TicketModule({ language, setLanguage }: { language: 'zh' | 'en'; setLanguage: (value: 'zh' | 'en') => void }) {
  const t = copy[language];
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [style, setStyle] = useState<TicketStyle>('classic');
  const [text, setText] = useState<TicketText>({ title: '', date: '', number: '', note: 'TICKET STUB' });
  const [background, setBackground] = useState('#93a766');
  const [ticketFirst, setTicketFirst] = useState(true);
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const [photoPosition, setPhotoPosition] = useState({ x: 50, y: 50 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [hasDate, setHasDate] = useState(false);
  const [camera, setCamera] = useState('');
  const [regions, setRegions] = useState<TextRegion[]>([]);
  const [editing, setEditing] = useState<TicketField | null>(null);
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const request = useRef(0);
  const photoDrag = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null);
  useEffect(() => () => { request.current++; }, []);
  const art: TicketArt | null = image ? { image, background, style, text } : null;

  useEffect(() => {
    const ctx = preview.current?.getContext('2d');
    if (!ctx || !image) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = background; ctx.fillRect(0, 0, W, H * 2);
    ctx.save(); ctx.translate(0, ticketFirst ? 0 : H);
    setRegions(drawTicket(ctx, { image, background, style, text }));
    ctx.restore();
    drawPhoto(ctx, image, 0, ticketFirst ? H : 0, W, H, fit, photoPosition.x, photoPosition.y);
  }, [image, background, style, text, ticketFirst, fit, photoPosition]);

  const upload = async (file?: File) => {
    if (!file) return;
    const version = ++request.current;
    setLoading(true); setError(''); setEditing(null);
    try {
      const [buffer, src] = await Promise.all([
        file.arrayBuffer(),
        new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }),
      ]);
      const photo = await new Promise<HTMLImageElement>((resolve, reject) => { const next = new Image(); next.onload = () => resolve(next); next.onerror = reject; next.src = src; });
      if (version !== request.current) return;
      const metadata = photoMetadata(buffer);
      const filename = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      let hash = 0; for (const character of file.name + file.size) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
      setText({ title: (filename || t.defaultTitle).slice(0, 60), date: metadata.date || '', number: `NO.${hash.toString().padStart(10, '0')}`, note: metadata.camera?.slice(0, 60) || t.defaultNote });
      setHasDate(Boolean(metadata.date)); setCamera(metadata.camera || '');
      setBackground(centerColor(photo)); setPhotoPosition({ x: 50, y: 50 }); setImage(photo);
    } catch { if (version === request.current) setError(t.failure); }
    finally { if (version === request.current) setLoading(false); }
  };

  const download = async (combined: boolean) => {
    if (!art || exporting) return;
    setExporting(true); setError('');
    try {
      await document.fonts.ready;
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = combined ? H * 2 : H;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = background; ctx.fillRect(0, 0, W, canvas.height);
      ctx.save(); ctx.translate(0, combined && !ticketFirst ? H : 0); drawTicket(ctx, art); ctx.restore();
      if (combined) drawPhoto(ctx, art.image, 0, ticketFirst ? H : 0, W, H, fit, photoPosition.x, photoPosition.y);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Encoding failed')), 'image/png'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `photo-ticket-${style}${combined ? '-combined' : ''}.png`; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(t.exportFailure); }
    finally { setExporting(false); }
  };
  const startEditing = (key: TicketField) => { setDraft(text[key]); setEditing(key); };
  const save = () => { if (editing) setText(current => ({ ...current, [editing]: draft })); setEditing(null); };
  const startPhotoDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!image || fit !== 'cover') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const y = (event.clientY - rect.top) / rect.height;
    const inPhoto = ticketFirst ? y >= .5 : y < .5;
    if (!inPhoto) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    photoDrag.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: photoPosition.x, y: photoPosition.y };
  };
  const movePhoto = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = photoDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPhotoPosition({ x: Math.max(0, Math.min(100, drag.x - (event.clientX - drag.clientX) / rect.width * 100)), y: Math.max(0, Math.min(100, drag.y - (event.clientY - drag.clientY) / (rect.height / 2) * 100)) });
  };
  const endPhotoDrag = (event: React.PointerEvent<HTMLDivElement>) => { if (photoDrag.current?.pointerId === event.pointerId) photoDrag.current = null; };

  return <>
    <section className="workspace ticket-workspace">
      <header className="topbar">
        <div className="crumbs"><strong>{t.module}</strong></div>
        <div className="top-actions"><ThemeSwitch language={language} /><div className="language-switch" aria-label={language === 'zh' ? '切换语言' : 'Language'}><button type="button" className={language === 'zh' ? 'chosen' : ''} onClick={() => setLanguage('zh')}>中</button><button type="button" className={language === 'en' ? 'chosen' : ''} onClick={() => setLanguage('en')}>EN</button></div><button type="button" className="export-button" disabled={!image || loading || exporting} onClick={() => void download(true)}>{exporting ? t.busy : t.combined}</button></div>
      </header>
      <div className="ticket-area">
        <div className="canvas-heading"><div><p className="eyebrow">PHOTO STUDIO / 04</p><h1>{t.module}</h1></div><p className="canvas-note">{t.help}</p></div>
        {error && <p role="alert" className="ticket-error">{error}</p>}
        <div className={`ticket-preview ${photoDrag.current ? 'dragging-photo' : ''}`} aria-busy={loading} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }} onPointerDown={startPhotoDrag} onPointerMove={movePhoto} onPointerUp={endPhotoDrag} onPointerCancel={endPhotoDrag}>
          {image ? <>
            <canvas ref={preview} width={W} height={H * 2} aria-label={`${t.module}: ${text.title}, ${text.date}`} />
            {regions.map(region => <button key={region.key} className="ticket-text-hit" type="button" title={`${t[region.key]} · ${t.edit}`} aria-label={`${t[region.key]}: ${text[region.key] || '—'} · ${t.edit}`} style={{ left: `${region.x / W * 100}%`, top: `${(region.y + (ticketFirst ? 0 : H)) / (H * 2) * 100}%`, width: `${region.w / W * 100}%`, height: `${region.h / (H * 2) * 100}%` }} onDoubleClick={() => startEditing(region.key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); startEditing(region.key); } }} />)}
          </> : <button className="ticket-empty" type="button" onClick={() => input.current?.click()}><span aria-hidden="true">＋</span><strong>{t.empty}</strong><small>JPG · PNG · WebP</small></button>}
          {loading && <div className="ticket-loading" role="status">{t.loading}</div>}
        </div>
        {editing && <form className="ticket-inline-edit" onSubmit={event => { event.preventDefault(); save(); }}><label htmlFor="ticket-draft">{t[editing]}</label><input id="ticket-draft" autoFocus maxLength={60} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setEditing(null); }} /><button type="submit">{t.save}</button><button type="button" onClick={() => setEditing(null)}>{t.cancel}</button></form>}
        <p className="ticket-caption">{t.hint}</p>
      </div>
    </section>
    <aside className="inspector ticket-inspector">
      <div className="inspector-header">{t.module}</div>
      <section className="inspector-section"><div className="section-title"><strong>{t.image}</strong></div><button className="upload-card" type="button" disabled={loading} onClick={() => input.current?.click()}><span className="upload-card-icon">＋</span><span><strong>{image ? t.replace : t.upload}</strong><small>{t.local}</small></span></button><input ref={input} className="sr-only" type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} />{image && <p className="section-copy">{image.naturalWidth} × {image.naturalHeight}{camera ? ` · ${camera}` : ''}</p>}</section>
      <section className="inspector-section"><div className="section-title"><strong>{t.templates}</strong></div><div className="ticket-style-list">{styles.map((value, i) => <button key={value} type="button" className={`ticket-style-option ${style === value ? 'selected' : ''}`} aria-pressed={style === value} onClick={() => { setStyle(value); setEditing(null); }}>{art ? <TicketThumbnail art={{ ...art, style: value }} /> : <span className={`ticket-style-symbol ${value}`} aria-hidden="true">{i === 0 ? '01 / STUB' : i === 1 ? '02 / CINEMA' : '03 / JOURNEY'}</span>}<span><strong>{t.styles[i]}</strong><small>{t.styleNotes[i]}</small></span></button>)}</div></section>
      <section className="inspector-section"><div className="section-title"><strong>{t.text}</strong></div><p className="section-copy">{t.metadata} {image && (hasDate ? t.found : t.missing)}</p>{fields.map(key => <label key={key} className="ticket-field" htmlFor={`ticket-${key}`}><span>{t[key]}</span><input id={`ticket-${key}`} value={text[key]} maxLength={60} placeholder={key === 'date' ? 'YYYY-MM-DD' : t[key]} onChange={event => setText(current => ({ ...current, [key]: event.target.value }))} /></label>)}</section>
      <section className="inspector-section"><label className="ticket-color"><span>{t.color}</span><input type="color" value={background} onChange={event => setBackground(event.target.value)} /></label><button type="button" className="add-text" disabled={!image} onClick={() => { if (image) setBackground(centerColor(image)); }}>{t.extract}</button><label className="ticket-field"><span>{t.layout}</span><select value={ticketFirst ? 'ticket' : 'photo'} onChange={event => setTicketFirst(event.target.value === 'ticket')}><option value="ticket">{t.ticketFirst}</option><option value="photo">{t.photoFirst}</option></select></label><label className="ticket-field"><span>{t.fit}</span><select value={fit} onChange={event => setFit(event.target.value as 'contain' | 'cover')}><option value="cover">{t.cover}</option><option value="contain">{t.contain}</option></select></label><p className="section-copy ticket-crop-help">{t.dragCrop}</p><button type="button" className="add-text" disabled={!image || fit !== 'cover'} onClick={() => setPhotoPosition({ x: 50, y: 50 })}>↺ {t.resetCrop}</button></section>
      <section className="inspector-section"><div className="section-title"><strong>{t.export}</strong></div><button className="ticket-download" type="button" disabled={!image || loading || exporting} onClick={() => void download(false)}>{t.ticketOnly}<small>1600 × 1066 · PNG</small></button><button className="ticket-download primary" type="button" disabled={!image || loading || exporting} onClick={() => void download(true)}>{t.combined}<small>1600 × 2132 · PNG</small></button><p className="section-copy">{t.decorative}</p></section>
    </aside>
  </>;
}
