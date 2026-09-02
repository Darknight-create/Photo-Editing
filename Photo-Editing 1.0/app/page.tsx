'use client';

import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

type Language = 'zh' | 'en';
type Slot = {
  src: string;
  name: string;
  caption: string;
  captionVisible: boolean;
  fontSize: number;
  captionColor: string;
};
type Upload = Pick<Slot, 'src' | 'name'>;
type GalleryImage = Upload & { width: number; height: number; dotColor: string };
type ExportQuality = 'hd' | 'uhd' | 'original';

const emptySlot = (index: number): Slot => ({ src: '', name: `第 ${index + 1} 格`, caption: '', captionVisible: true, fontSize: 32, captionColor: '#f4dd63' });
const emptySlots = () => Array.from({ length: 9 }, (_, index) => emptySlot(index));
const copy = {
  zh: { project: '夏日片段', editor: '编辑器', projects: '项目', composition: '构图 01', diary: '九张图片，一本小小的视觉日记。', headline: '给快乐留一点\n空间。', reset: '重置', export: '导出', local: '本地项目', nineGrid: '九宫格', galleryModule: '画幅漫游', type: '文字', border: '边框', filter: '滤镜', inspector: '检查器', live: '实时', images: '图片', imageHelp: '点击任意分区独立添加图片，也可以直接拖入。', upload: '上传图片', uploadHint: 'JPG、PNG · 最多 9 张', replace: '替换这一格', addImage: '添加图片', dropImages: '上传 9 张图片', clickTile: '点击任意分区单独替换', uploaded: '张已添加', empty: '等待添加图片', caption: '当前分区文字', placeholder: '输入这一格要显示的文字…', size: '字号', color: '颜色', addText: '添加文字图层', details: '详情', canvas: '画布', spacing: '间距', quality: '质量', made: '为小故事而做', square: '正方形 · 1:1', none: '无', high: '高清 · 1800px', selected: '当前分区', tile: '第', tileSuffix: '格', language: '语言', chinese: '中', english: 'EN', switchLabel: '切换语言', replaceAria: '点击上传并替换这一格', hideText: '隐藏当前文字', showText: '显示当前文字', yellow: '黄色', ink: '墨绿色', white: '米白色', zoomOut: '缩小', zoomIn: '放大', ariaCanvas: '九宫格编辑画布', galleryKicker: '根据图片比例自动适配', galleryHeadline: '让每一帧，都有自己的空间。', galleryHelp: '上传图片后，画布会根据原始尺寸自动调整展示比例。', galleryUpload: '上传图片', galleryTitle: 'what i’m binging atm', galleryEmpty: '双击或点击上传图片', galleryPrevious: '上一张', galleryNext: '下一张', galleryRatio: '当前比例', galleryAdded: '张图片', galleryExport: '导出当前图片', galleryArrowExport: '导出左右箭头', galleryExportQuality: '导出质量', galleryHigh: '高清', galleryUltra: '超清', galleryOriginal: '原图', galleryMemory: '预计占用内存',
  },
  en: { project: 'SUMMER NOTES', editor: 'editor', projects: 'projects', composition: 'composition 01', diary: 'Nine images, one small visual diary.', headline: 'make a little\nroom for joy.', reset: 'reset', export: 'export', local: 'local project', nineGrid: 'nine grid', galleryModule: 'frame roam', type: 'type', border: 'border', filter: 'filter', inspector: 'inspector', live: 'live', images: 'images', imageHelp: 'Click any tile to add its own image, or drop one in.', upload: 'upload images', uploadHint: 'JPG, PNG · up to 9 files', replace: 'replace image', addImage: 'add image', dropImages: 'drop 9 images', clickTile: 'click a tile to replace', uploaded: 'added', empty: 'waiting for images', caption: 'selected tile text', placeholder: 'Add text to this tile...', size: 'size', color: 'color', addText: 'add text layer', details: 'details', canvas: 'canvas', spacing: 'spacing', quality: 'quality', made: 'made for small stories', square: 'square · 1:1', none: 'none', high: 'high · 1800px', selected: 'selected tile', tile: 'tile', tileSuffix: '', language: 'language', chinese: '中', english: 'EN', switchLabel: 'Switch language', replaceAria: 'Click to upload and replace this tile', hideText: 'Hide selected text', showText: 'Show selected text', yellow: 'yellow', ink: 'ink green', white: 'warm white', zoomOut: 'Zoom out', zoomIn: 'Zoom in', ariaCanvas: 'Nine grid editing canvas', galleryKicker: 'auto-fit to image ratio', galleryHeadline: 'Give every frame its own room.', galleryHelp: 'Upload an image and the stage will adapt to its original dimensions.', galleryUpload: 'upload images', galleryTitle: 'what i’m binging atm', galleryEmpty: 'Click to upload an image', galleryPrevious: 'Previous image', galleryNext: 'Next image', galleryRatio: 'current ratio', galleryAdded: 'images', galleryExport: 'export current image', galleryArrowExport: 'export left / right arrows', galleryExportQuality: 'export quality', galleryHigh: 'high', galleryUltra: 'ultra', galleryOriginal: 'original', galleryMemory: 'estimated memory',
  },
} as const;

function readFile(file: File): Promise<Upload> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ src: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  });
}

function getDominantImageColor(image: HTMLImageElement): string {
  const size = 40;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return '#28446b';
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const colors = new Map<string, { count: number; score: number; r: number; g: number; b: number }>();
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const index = (y * size + x) * 4;
    const alpha = pixels[index + 3];
    if (alpha < 160) continue;
    const r = Math.min(255, Math.round(pixels[index] / 32) * 32);
    const g = Math.min(255, Math.round(pixels[index + 1] / 32) * 32);
    const b = Math.min(255, Math.round(pixels[index + 2] / 32) * 32);
    const brightest = Math.max(r, g, b);
    const darkest = Math.min(r, g, b);
    if (brightest > 240 && darkest > 220) continue;
    if (brightest < 20) continue;
    const saturation = brightest - darkest;
    const centerWeight = x >= size * 0.2 && x <= size * 0.8 && y >= size * 0.2 && y <= size * 0.8 ? 3 : 0.65;
    const key = `${r},${g},${b}`;
    const existing = colors.get(key);
    const score = centerWeight * (1 + saturation / 255 * 1.2);
    if (existing) {
      existing.count += 1;
      existing.score += score;
    } else {
      colors.set(key, { count: 1, score, r, g, b });
    }
  }
  const vivid = [...colors.values()].filter((color) => Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b) >= 32);
  const dominant = (vivid.length ? vivid : [...colors.values()]).sort((a, b) => b.score - a.score)[0];
  if (!dominant) return '#28446b';
  return `#${[dominant.r, dominant.g, dominant.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function readGalleryFile(file: File): Promise<GalleryImage> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      image.onload = () => resolve({ src, name: file.name, width: image.naturalWidth, height: image.naturalHeight, dotColor: getDominantImageColor(image) });
      image.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function getGalleryExportSpec(image: GalleryImage, quality: ExportQuality) {
  const maxLongEdge = quality === 'hd' ? 1600 : quality === 'uhd' ? 2400 : Infinity;
  const scale = Number.isFinite(maxLongEdge) ? Math.min(1, maxLongEdge / Math.max(image.width, image.height)) : 1;
  const imageWidth = Math.max(1, Math.round(image.width * scale));
  const imageHeight = Math.max(1, Math.round(image.height * scale));
  const bannerHeight = image.height > image.width
    ? Math.max(420, Math.min(980, Math.round(imageHeight * 0.18)))
    : Math.max(300, Math.min(680, Math.round(imageHeight * 0.16)));
  const width = imageWidth;
  const height = imageHeight + bannerHeight;
  return { imageWidth, imageHeight, bannerHeight, width, height, memoryBytes: width * height * 4 };
}

function formatMemory(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return megabytes < 1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${megabytes.toFixed(1)} MB`;
}

function GalleryModule({ t, language, setLanguage }: { t: (typeof copy)[Language]; language: Language; setLanguage: (language: Language) => void }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [title, setTitle] = useState<string>(t.galleryTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  const [includeArrows, setIncludeArrows] = useState(true);
  const [exportQuality, setExportQuality] = useState<ExportQuality>('hd');
  const activeImage = images[activeIndex];
  const ratio = activeImage ? activeImage.width / activeImage.height : 16 / 9;
  const isPortrait = Boolean(activeImage && activeImage.height > activeImage.width);
  const exportSpec = activeImage ? getGalleryExportSpec(activeImage, exportQuality) : null;

  useEffect(() => {
    const frame = frameRef.current;
    const area = frame?.parentElement;
    if (!frame || !area) return;
    const updateFrameWidth = () => {
      const styles = window.getComputedStyle(area);
      const availableWidth = area.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight);
      const maxStageHeight = Math.min(window.innerHeight * 0.66, 760);
      const targetWidth = activeImage ? maxStageHeight * ratio : availableWidth;
      setFrameWidth(Math.max(280, Math.min(availableWidth, targetWidth)));
    };
    updateFrameWidth();
    window.addEventListener('resize', updateFrameWidth);
    return () => window.removeEventListener('resize', updateFrameWidth);
  }, [activeImage, ratio]);

  const addImages = async (files: FileList | File[]) => {
    const next = await Promise.all(Array.from(files).filter((file) => file.type.startsWith('image/')).map(readGalleryFile));
    if (!next.length) return;
    setImages((current) => [...current, ...next]);
    setActiveIndex((current) => current || 0);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void addImages(event.target.files);
    event.target.value = '';
  };

  const step = (direction: number) => {
    if (!images.length) return;
    setActiveIndex((current) => (current + direction + images.length) % images.length);
  };

  const exportCurrentImage = () => {
    if (!activeImage) return;
    const image = new Image();
    image.onload = () => {
      const spec = getGalleryExportSpec(activeImage, exportQuality);
      const bannerHeight = spec.bannerHeight;
      const canvas = document.createElement('canvas');
      canvas.width = spec.width;
      canvas.height = spec.height;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, bannerHeight);
      context.drawImage(image, 0, bannerHeight, spec.imageWidth, spec.imageHeight);

      const radius = Math.max(14, Math.min(34, Math.round(canvas.width / Math.max(44, images.length * 3.8))));
      const gap = Math.max(6, Math.round(radius * 1.7));
      const dotsWidth = images.length * radius * 2 + Math.max(0, images.length - 1) * gap;
      const drawDots = (startX: number, centerY: number) => {
        images.forEach((galleryImage, index) => {
          const x = startX + radius + index * (radius * 2 + gap);
          context.beginPath();
          context.fillStyle = galleryImage.dotColor;
          context.arc(x, centerY, radius, 0, Math.PI * 2);
          context.fill();
          if (index === activeIndex) {
            context.beginPath();
            context.strokeStyle = '#1f2a27';
            context.lineWidth = Math.max(3, Math.round(radius * 0.12));
            context.arc(x, centerY, radius + Math.max(5, Math.round(radius * 0.35)), 0, Math.PI * 2);
            context.stroke();
          }
        });
      };

      const drawArrow = (centerX: number, centerY: number, direction: -1 | 1) => {
        const arrowRadius = Math.max(36, Math.min(64, Math.round(canvas.width * 0.06)));
        context.beginPath();
        context.fillStyle = 'rgba(255, 255, 255, 0.86)';
        context.arc(centerX, centerY, arrowRadius, 0, Math.PI * 2);
        context.fill();
        const tip = centerX + direction * Math.round(arrowRadius * 0.34);
        const back = centerX - direction * Math.round(arrowRadius * 0.18);
        context.beginPath();
        context.strokeStyle = '#68716b';
        context.lineWidth = Math.max(5, Math.round(arrowRadius * 0.1));
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.moveTo(back, centerY - Math.round(arrowRadius * 0.28));
        context.lineTo(tip, centerY);
        context.lineTo(back, centerY + Math.round(arrowRadius * 0.28));
        context.stroke();
      };

      context.fillStyle = '#000000';
      context.font = `500 ${isPortrait ? Math.max(64, Math.min(220, Math.round(canvas.width * 0.085))) : Math.max(54, Math.min(150, Math.round(canvas.width * 0.055)))}px Arial, Helvetica, sans-serif`;
      if (isPortrait) {
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        drawDots((canvas.width - dotsWidth) / 2, Math.round(bannerHeight * 0.28));
        context.fillStyle = '#000000';
        context.fillText(title || t.galleryTitle, canvas.width / 2, Math.round(bannerHeight * 0.7));
      } else {
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillText(title || t.galleryTitle, 72, bannerHeight / 2);
        drawDots(canvas.width - dotsWidth - 72, bannerHeight / 2);
      }
      if (includeArrows && images.length > 1) {
        const imageCenterY = bannerHeight + spec.imageHeight / 2;
        drawArrow(Math.round(canvas.width * 0.11), imageCenterY, -1);
        drawArrow(Math.round(canvas.width * 0.89), imageCenterY, 1);
      }
      const link = document.createElement('a');
      link.download = `${activeImage.name.replace(/\.[^/.]+$/, '') || `frame-roam-${activeIndex + 1}`}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    image.src = activeImage.src;
  };

  return (
    <>
      <section className="workspace gallery-workspace">
        <header className="topbar"><div className="crumbs"><span>{t.projects}</span><b>/</b><strong>{t.galleryModule}</strong></div><div className="top-actions"><div className="language-switch" aria-label={t.switchLabel}><span>{t.language}</span><button className={language === 'zh' ? 'chosen' : ''} type="button" onClick={() => setLanguage('zh')}>{t.chinese}</button><i>/</i><button className={language === 'en' ? 'chosen' : ''} type="button" onClick={() => setLanguage('en')}>{t.english}</button></div><button className="export-button" type="button" onClick={() => inputRef.current?.click()}><span>{t.galleryUpload}</span><span className="arrow">↗</span></button></div></header>
        <div className="gallery-area">
          <div className="gallery-heading"><div><p className="eyebrow">{t.galleryKicker}</p><h1>{t.galleryHeadline}</h1></div><p className="canvas-note">{t.galleryHelp}</p></div>
          <div ref={frameRef} className={`gallery-frame ${isPortrait ? 'portrait' : 'landscape'}`} style={{ '--gallery-ratio': ratio, width: frameWidth ? `${frameWidth}px` : undefined } as React.CSSProperties}>
            <div className="gallery-frame-header"><input className="gallery-title" value={title} onChange={(event) => setTitle(event.target.value)} aria-label={t.galleryTitle} /><div className="gallery-dots">{images.length ? images.map((image, index) => <button key={`${image.name}-${index}`} className={index === activeIndex ? 'active' : ''} style={{ '--dot-color': image.dotColor } as React.CSSProperties} type="button" aria-label={`${t.galleryTitle} ${index + 1}`} onClick={() => setActiveIndex(index)} />) : Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div></div>
            <div className="gallery-stage" style={{ '--gallery-ratio': ratio } as React.CSSProperties}>
              {activeImage ? <img src={activeImage.src} alt={activeImage.name} className="gallery-image" /> : <button className="gallery-empty" type="button" onClick={() => inputRef.current?.click()}><span>＋</span><strong>{t.galleryEmpty}</strong></button>}
              {images.length > 1 && <><button className="gallery-arrow left" type="button" aria-label={t.galleryPrevious} onClick={() => step(-1)}>‹</button><button className="gallery-arrow right" type="button" aria-label={t.galleryNext} onClick={() => step(1)}>›</button></>}
            </div>
            <div className="gallery-frame-footer"><span>{activeImage ? `${activeImage.width} × ${activeImage.height}` : '—'}</span><div className="gallery-footer-actions"><span>{images.length ? `${images.length} ${t.galleryAdded}` : t.empty}</span><button className="gallery-export" type="button" disabled={!activeImage} onClick={exportCurrentImage}>{t.galleryExport} <span>↗</span></button></div></div>
          </div>
          <input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={onFileChange} />
        </div>
      </section>
      <aside className="inspector gallery-inspector"><div className="inspector-header"><span>{t.galleryModule}</span><span className="status-pill">● {t.live}</span></div><section className="inspector-section"><div className="section-title"><span>01</span><strong>{t.images}</strong><span className="section-count">{images.length}</span></div><p className="section-copy">{t.galleryHelp}</p><button className="upload-card" type="button" onClick={() => inputRef.current?.click()}><span className="upload-card-icon">↥</span><span><strong>{t.galleryUpload}</strong><small>{t.uploadHint}</small></span><span className="card-arrow">↗</span></button></section><section className="inspector-section"><div className="section-title"><span>02</span><strong>title</strong></div><label className="field-label" htmlFor="gallery-title">{t.caption}</label><input id="gallery-title" className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} /><div className="detail-row gallery-detail"><span>{t.galleryRatio}</span><b>{activeImage ? `${activeImage.width / activeImage.height > 1 ? 'landscape' : 'portrait'}` : 'auto'}</b></div></section><section className="inspector-section export-settings"><div className="section-title"><span>03</span><strong>{t.galleryExportQuality}</strong></div><div className="export-option-row"><span>{t.galleryArrowExport}</span><button className={`toggle ${includeArrows ? 'on' : ''}`} type="button" aria-pressed={includeArrows} onClick={() => setIncludeArrows((value) => !value)}><span /></button></div><span className="field-label export-quality-label">{t.galleryExportQuality}</span><div className="quality-buttons"><button className={exportQuality === 'hd' ? 'selected' : ''} type="button" aria-pressed={exportQuality === 'hd'} onClick={() => setExportQuality('hd')}>{t.galleryHigh}</button><button className={exportQuality === 'uhd' ? 'selected' : ''} type="button" aria-pressed={exportQuality === 'uhd'} onClick={() => setExportQuality('uhd')}>{t.galleryUltra}</button><button className={exportQuality === 'original' ? 'selected' : ''} type="button" aria-pressed={exportQuality === 'original'} onClick={() => setExportQuality('original')}>{t.galleryOriginal}</button></div><p className="export-memory">{t.galleryMemory}: <b>{exportSpec ? formatMemory(exportSpec.memoryBytes) : '—'}</b></p></section><div className="inspector-footer">{t.made} <span>✦</span></div></aside>
    </>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>('zh');
  const [activeModule, setActiveModule] = useState<'grid' | 'gallery'>('grid');
  const t = copy[language];
  const [slots, setSlots] = useState<Slot[]>(emptySlots);
  const [selectedSlot, setSelectedSlot] = useState(4);
  const [zoom, setZoom] = useState(82);
  const [isDragging, setIsDragging] = useState(false);
  const [dragReadyIndex, setDragReadyIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const activeSlot = slots[selectedSlot];
  const filledCount = useMemo(() => slots.filter((slot) => Boolean(slot.src)).length, [slots]);
  const draggedIndexRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const updateSlot = (patch: Partial<Slot>) => {
    setSlots((current) => current.map((slot, index) => index === selectedSlot ? { ...slot, ...patch } : slot));
  };

  const openUpload = (index: number | null = null) => {
    replaceIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | File[]) => {
    const images = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 9);
    if (!images.length) return;
    const next = await Promise.all(images.map(readFile));
    const replaceIndex = replaceIndexRef.current;
    setSlots((current) => {
      const updated = [...current];
      if (replaceIndex !== null) {
        updated[replaceIndex] = { ...updated[replaceIndex], ...next[0] };
      } else {
        next.forEach((image, index) => { updated[index] = { ...updated[index], ...image }; });
      }
      return updated;
    });
    replaceIndexRef.current = null;
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void handleFiles(event.target.files);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    setIsDragging(false);
    const draggedIndex = draggedIndexRef.current;
    if (event.dataTransfer.files.length) {
      draggedIndexRef.current = null;
      replaceIndexRef.current = index;
      void handleFiles(event.dataTransfer.files);
      return;
    }
    if (draggedIndex !== null && draggedIndex !== index) {
      setSlots((current) => {
        const next = [...current];
        const [moved] = next.splice(draggedIndex, 1);
        next.splice(index, 0, moved);
        return next;
      });
      setSelectedSlot((current) => current === draggedIndex ? index : current > draggedIndex && current <= index ? current - 1 : current < draggedIndex && current >= index ? current + 1 : current);
    }
    draggedIndexRef.current = null;
  };

  const onSlotDragStart = (event: DragEvent<HTMLButtonElement>, index: number) => {
    if (!slots[index].src || dragReadyIndex !== index) {
      event.preventDefault();
      return;
    }
    draggedIndexRef.current = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    setIsDragging(true);
  };

  const onSlotDragEnd = () => {
    draggedIndexRef.current = null;
    setDragReadyIndex(null);
    setIsDragging(false);
  };

  const startLongPress = (index: number) => {
    if (!slots[index].src) return;
    if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setDragReadyIndex(index);
      setIsDragging(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (draggedIndexRef.current === null) {
      setDragReadyIndex(null);
      setIsDragging(false);
    }
  };

  const onSlotPointerDown = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startLongPress(index);
  };

  const exportGrid = async () => {
    const canvas = document.createElement('canvas');
    const size = 1800;
    const cell = size / 3;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    await Promise.all(slots.map(async (slot, index) => {
      const x = (index % 3) * cell;
      const y = Math.floor(index / 3) * cell;
      if (slot.src) {
        const image = new Image();
        image.src = slot.src;
        await new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve(); });
        const ratio = Math.max(cell / image.width, cell / image.height);
        const drawWidth = image.width * ratio;
        const drawHeight = image.height * ratio;
        context.drawImage(image, x + (cell - drawWidth) / 2, y + (cell - drawHeight) / 2, drawWidth, drawHeight);
      }
      if (slot.captionVisible && slot.caption.trim()) {
        context.save();
        context.fillStyle = slot.captionColor;
        context.font = `italic ${slot.fontSize * 3}px Georgia, serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'rgba(0,0,0,0.14)';
        context.shadowBlur = 12;
        context.fillText(slot.caption, x + cell / 2, y + cell / 2);
        context.restore();
      }
    }));
    const link = document.createElement('a');
    link.download = 'nine-grid-edit.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <main className="editor-shell">
      <aside className="sidebar">
        <div className="brand-mark">n/9</div>
        <div className="project-name">{t.project}<br /><span>{t.editor}</span></div>
        <div className="sidebar-rule" />
        <nav className="tool-list" aria-label={t.inspector}>
          <button className={`tool-button ${activeModule === 'grid' ? 'active' : ''}`} type="button" onClick={() => setActiveModule('grid')}>
            <span className="tool-icon">▦</span><span>{t.nineGrid}</span>
          </button>
          <button className={`tool-button ${activeModule === 'gallery' ? 'active' : ''}`} type="button" onClick={() => setActiveModule('gallery')}>
            <span className="tool-icon">◌</span><span>{t.galleryModule}</span>
          </button>
        </nav>
        <div className="sidebar-footer"><span className="tiny-dot" /><span>{t.local}</span></div>
      </aside>

      {activeModule === 'grid' ? <>
      <section className="workspace">
        <header className="topbar">
          <div className="crumbs"><span>{t.projects}</span><b>/</b><strong>{t.project}</strong></div>
          <div className="top-actions"><div className="language-switch" aria-label={t.switchLabel}><span>{t.language}</span><button className={language === 'zh' ? 'chosen' : ''} type="button" onClick={() => setLanguage('zh')}>{t.chinese}</button><i>/</i><button className={language === 'en' ? 'chosen' : ''} type="button" onClick={() => setLanguage('en')}>{t.english}</button></div><button className="quiet-button" type="button" onClick={() => setSlots(emptySlots())}>{t.reset}</button><button className="export-button" type="button" onClick={() => void exportGrid()}><span>{t.export}</span><span className="arrow">↗</span></button></div>
        </header>
        <div className="canvas-area">
          <div className="canvas-heading"><div><p className="eyebrow">{t.composition} <span>·</span> 3 × 3</p><h1>{t.headline.split('\n')[0]}<br /><em>{t.headline.split('\n')[1]}</em></h1></div><p className="canvas-note">{t.diary}</p></div>
          <div className="canvas-wrap" style={{ '--zoom': `${zoom / 100}` } as React.CSSProperties}>
            <div className="grid-canvas" aria-label={t.ariaCanvas}>
              {slots.map((slot, index) => (
                <button className={`grid-cell ${selectedSlot === index ? 'selected' : ''} ${dragReadyIndex === index ? 'drag-ready' : ''} ${isDragging ? 'dragging' : ''}`} key={`${index}-${slot.src.slice(-20)}`} type="button" draggable={dragReadyIndex === index} aria-label={`${t.tile} ${index + 1}${t.tileSuffix}, ${slot.src ? t.replaceAria : t.addImage}`} onPointerDown={(event) => onSlotPointerDown(event, index)} onPointerUp={() => { cancelLongPress(); if (draggedIndexRef.current === null) setSelectedSlot(index); }} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onClick={() => setSelectedSlot(index)} onDoubleClick={() => openUpload(index)} onDragStart={(event) => onSlotDragStart(event, index)} onDragEnd={onSlotDragEnd} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => onDrop(event, index)}>
                  {slot.src ? <span className="image-fill" style={{ backgroundImage: `url(${slot.src})` }} /> : <span className="empty-cell"><span className="plus-glyph">＋</span><small>{t.addImage}</small></span>}
                  {slot.captionVisible && slot.caption.trim() && <span className="tile-caption" style={{ color: slot.captionColor, fontSize: `${slot.fontSize}px` }}>{slot.caption}</span>}
                  {selectedSlot === index && <span className="cell-corner-label">{slot.src ? t.replace : t.addImage}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="canvas-controls"><div className="zoom-control"><button type="button" aria-label={t.zoomOut} onClick={() => setZoom((value) => Math.max(50, value - 5))}>−</button><span>{zoom}%</span><button type="button" aria-label={t.zoomIn} onClick={() => setZoom((value) => Math.min(110, value + 5))}>＋</button></div><div className="upload-hint"><span className="upload-icon">＋</span><span><button type="button" onClick={() => openUpload(null)}>{t.dropImages}</button> · {t.clickTile}</span></div><span className="image-count">{filledCount ? `${filledCount}/9 ${t.uploaded}` : t.empty}</span></div>
        </div>
      </section>

      <aside className="inspector">
        <div className="inspector-header"><span>{t.inspector}</span><span className="status-pill">● {t.live}</span></div>
        <section className="inspector-section"><div className="section-title"><span>01</span><strong>{t.images}</strong><span className="section-count">{filledCount}/9</span></div><p className="section-copy">{t.imageHelp}</p><button className="upload-card" type="button" onClick={() => openUpload(null)}><span className="upload-card-icon">↥</span><span><strong>{t.upload}</strong><small>{t.uploadHint}</small></span><span className="card-arrow">↗</span></button><div className="selected-tile"><span>{t.selected}</span><b>{t.tile} {selectedSlot + 1}{t.tileSuffix}</b></div><input ref={fileInputRef} className="sr-only" type="file" accept="image/*" multiple onChange={onFileChange} /></section>
        <section className="inspector-section text-section"><div className="section-title"><span>02</span><strong>{t.type}</strong><button className={`toggle ${activeSlot.captionVisible ? 'on' : ''}`} type="button" onClick={() => updateSlot({ captionVisible: !activeSlot.captionVisible })} aria-label={activeSlot.captionVisible ? t.hideText : t.showText}><span /></button></div><label className="field-label" htmlFor="overlay-text">{t.caption}</label><input id="overlay-text" className="text-input" value={activeSlot.caption} onChange={(event) => updateSlot({ caption: event.target.value })} placeholder={t.placeholder} /><div className="control-row"><label className="field-label">{t.size} <output>{activeSlot.fontSize}px</output></label><input className="range" type="range" min="18" max="58" value={activeSlot.fontSize} onChange={(event) => updateSlot({ fontSize: Number(event.target.value) })} /></div><div className="control-row color-row"><span className="field-label">{t.color}</span><div className="color-swatches"><button className={`swatch yellow ${activeSlot.captionColor === '#f4dd63' ? 'chosen' : ''}`} type="button" aria-label={t.yellow} onClick={() => updateSlot({ captionColor: '#f4dd63' })} /><button className={`swatch ink ${activeSlot.captionColor === '#1f2a27' ? 'chosen' : ''}`} type="button" aria-label={t.ink} onClick={() => updateSlot({ captionColor: '#1f2a27' })} /><button className={`swatch white ${activeSlot.captionColor === '#f8f4e9' ? 'chosen' : ''}`} type="button" aria-label={t.white} onClick={() => updateSlot({ captionColor: '#f8f4e9' })} /></div></div><button className="add-text" type="button" onClick={() => updateSlot({ caption: language === 'zh' ? '新的文字' : 'new note', captionVisible: true })}>＋ {t.addText}</button></section>
        <section className="inspector-section details-section"><div className="section-title"><span>03</span><strong>{t.details}</strong></div><div className="detail-row"><span>{t.canvas}</span><b>{t.square}</b></div><div className="detail-row"><span>{t.spacing}</span><b>{t.none}</b></div><div className="detail-row"><span>{t.quality}</span><b>{t.high}</b></div></section>
        <div className="inspector-footer">{t.made} <span>✦</span></div>
      </aside>
      </> : <GalleryModule t={t} language={language} setLanguage={setLanguage} />}
    </main>
  );
}
