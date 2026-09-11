'use client';

import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import ThemeSwitch from './theme-switch';
import TicketModule from './ticket-module';

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

const collageCopy = {
  zh: {
    collageModule: '切片拼贴',
    collageKicker: '构图 02 · 16:9',
    collageHeadline: '把两个瞬间，\n接成一段。',
    collageHelp: '上传两张图片，拖动画面即可独立调整上下取景。',
    collageUpper: '上画幅',
    collageLower: '下画幅',
    collageUpload: '上传图片',
    collageUploadBoth: '同时上传两张',
    collageUploadBothHint: '一次选择两张图片，第一张在上，第二张在下',
    collageSwap: '上下画幅互换',
    collageReplace: '替换图片',
    collageDrag: '按住并拖动图片调整取景',
    collageSelected: '当前画幅',
    collageResetPosition: '恢复居中',
    collageExport: '导出拼贴',
    collageExportHint: '两张图片上传后即可导出 1600 × 900 PNG',
    collageEmpty: '添加图片',
    collageReady: '已就绪',
    collageWaiting: '等待图片',
    collagePatch: '正方形取景贴片',
    collagePatchHelp: '选择来源画幅，拖动即可生成固定 1:1 正方形贴片。',
    collagePatchStart: '开始正方形框选',
    collagePatchCancel: '取消框选',
    collagePatchActive: '请在当前画幅拖动，选框会自动保持 1:1',
    collagePatchDelete: '删除选中贴片',
    collagePatchEmpty: '还没有贴片',
  },
  en: {
    collageModule: 'slice collage',
    collageKicker: 'composition 02 · 16:9',
    collageHeadline: 'Join two moments\ninto one frame.',
    collageHelp: 'Upload two images, then drag each one to set its own crop.',
    collageUpper: 'upper frame',
    collageLower: 'lower frame',
    collageUpload: 'upload image',
    collageUploadBoth: 'upload two images',
    collageUploadBothHint: 'Choose two at once: first goes above, second below',
    collageSwap: 'swap upper / lower',
    collageReplace: 'replace image',
    collageDrag: 'hold and drag to adjust the crop',
    collageSelected: 'selected frame',
    collageResetPosition: 'recenter',
    collageExport: 'export collage',
    collageExportHint: 'Upload both images to export a 1600 × 900 PNG',
    collageEmpty: 'add image',
    collageReady: 'ready',
    collageWaiting: 'waiting',
    collagePatch: 'square crop patch',
    collagePatchHelp: 'Choose a source frame and drag to create a locked 1:1 square patch.',
    collagePatchStart: 'draw a square patch',
    collagePatchCancel: 'cancel selection',
    collagePatchActive: 'Drag on the selected frame; the crop stays 1:1',
    collagePatchDelete: 'delete selected patch',
    collagePatchEmpty: 'no patches yet',
  },
} as const;

type AppCopy = (typeof copy)[Language] & (typeof collageCopy)[Language];
type CollagePane = 'upper' | 'lower';
type CollageImage = Upload & { width: number; height: number; positionX: number; positionY: number };
type PatchSelection = { pane: CollagePane; x: number; y: number; width: number; height: number };
type CollagePatch = PatchSelection & { id: number; src: string; targetPane: CollagePane; centerX: number; centerY: number };

const emptyCollageImage = (): CollageImage => ({ src: '', name: '', width: 0, height: 0, positionX: 50, positionY: 50 });

function readCollageFile(file: File): Promise<CollageImage> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      image.onload = () => resolve({ src, name: file.name, width: image.naturalWidth, height: image.naturalHeight, positionX: 50, positionY: 50 });
      image.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, targetY: number, targetWidth: number, targetHeight: number, positionX: number, positionY: number) {
  const scale = Math.max(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight);
  const sourceWidth = targetWidth / scale;
  const sourceHeight = targetHeight / scale;
  const maxSourceX = Math.max(0, image.naturalWidth - sourceWidth);
  const maxSourceY = Math.max(0, image.naturalHeight - sourceHeight);
  const sourceX = maxSourceX * (positionX / 100);
  const sourceY = maxSourceY * (positionY / 100);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, targetY, targetWidth, targetHeight);
}

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

function GalleryModule({ t, language, setLanguage }: { t: AppCopy; language: Language; setLanguage: (language: Language) => void }) {
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
        <header className="topbar"><div className="crumbs"><span>{t.projects}</span><b>/</b><strong>{t.galleryModule}</strong></div><div className="top-actions"><ThemeSwitch language={language} /><div className="language-switch" aria-label={t.switchLabel}><span>{t.language}</span><button className={language === 'zh' ? 'chosen' : ''} type="button" onClick={() => setLanguage('zh')}>{t.chinese}</button><i>/</i><button className={language === 'en' ? 'chosen' : ''} type="button" onClick={() => setLanguage('en')}>{t.english}</button></div><button className="export-button" type="button" onClick={() => inputRef.current?.click()}><span>{t.galleryUpload}</span><span className="arrow">↗</span></button></div></header>
        <div className="gallery-area">
          <div className="gallery-heading"><div><p className="eyebrow">PHOTO STUDIO / 02</p><h1>{t.galleryModule}</h1></div><p className="canvas-note">{t.galleryHelp}</p></div>
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

function CollageModule({ t, language, setLanguage }: { t: AppCopy; language: Language; setLanguage: (language: Language) => void }) {
  const [images, setImages] = useState<Record<CollagePane, CollageImage>>({ upper: emptyCollageImage(), lower: emptyCollageImage() });
  const [selectedPane, setSelectedPane] = useState<CollagePane>('upper');
  const [patches, setPatches] = useState<CollagePatch[]>([]);
  const [selectedPatchId, setSelectedPatchId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<PatchSelection | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<CollagePane>('upper');
  const uploadModeRef = useRef<'single' | 'both'>('single');
  const dragRef = useRef<{ pane: CollagePane; pointerId: number; clientX: number; clientY: number; positionX: number; positionY: number } | null>(null);
  const selectionStartRef = useRef<{ pane: CollagePane; pointerId: number; x: number; y: number } | null>(null);
  const patchDragRef = useRef<{ id: number; pointerId: number; clientX: number; clientY: number; centerX: number; centerY: number } | null>(null);
  const readyCount = Number(Boolean(images.upper.src)) + Number(Boolean(images.lower.src));

  const openUpload = (pane: CollagePane, mode: 'single' | 'both' = 'single') => {
    uploadTargetRef.current = pane;
    uploadModeRef.current = mode;
    setSelectedPane(pane);
    inputRef.current?.click();
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/')).slice(0, 2);
    event.target.value = '';
    if (!files.length) return;
    const uploaded = await Promise.all(files.map(readCollageFile));
    if (uploadModeRef.current === 'both' && uploaded.length > 1) {
      setImages({ upper: uploaded[0], lower: uploaded[1] });
      setSelectedPane('upper');
      setPatches([]);
      setSelectedPatchId(null);
      return;
    }
    const pane = uploadTargetRef.current;
    setImages((current) => ({ ...current, [pane]: uploaded[0] }));
    setPatches((current) => current.filter((patch) => patch.pane !== pane));
  };

  const swapImages = () => {
    setImages((current) => ({ upper: current.lower, lower: current.upper }));
    setPatches((current) => current.map((patch) => ({ ...patch, pane: patch.pane === 'upper' ? 'lower' : 'upper', targetPane: patch.targetPane === 'upper' ? 'lower' : 'upper' })));
    setSelectedPane((current) => current === 'upper' ? 'lower' : 'upper');
    setSelection(null);
  };

  const updatePosition = (pane: CollagePane, positionX: number, positionY: number) => {
    setImages((current) => ({
      ...current,
      [pane]: { ...current[pane], positionX: Math.max(0, Math.min(100, positionX)), positionY: Math.max(0, Math.min(100, positionY)) },
    }));
  };

  const pointInPane = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const selectionFromPoints = (pane: CollagePane, startX: number, startY: number, endX: number, endY: number): PatchSelection => {
    const frameWidth = 1600;
    const frameHeight = 450;
    const directionX = endX >= startX ? 1 : -1;
    const directionY = endY >= startY ? 1 : -1;
    const draggedWidth = (Math.abs(endX - startX) / 100) * frameWidth;
    const draggedHeight = (Math.abs(endY - startY) / 100) * frameHeight;
    const availableWidth = (directionX > 0 ? 100 - startX : startX) / 100 * frameWidth;
    const availableHeight = (directionY > 0 ? 100 - startY : startY) / 100 * frameHeight;
    const squareSize = Math.min(Math.max(draggedWidth, draggedHeight), availableWidth, availableHeight);
    const squareEndX = startX + directionX * (squareSize / frameWidth) * 100;
    const squareEndY = startY + directionY * (squareSize / frameHeight) * 100;
    return {
      pane,
      x: Math.min(startX, squareEndX),
      y: Math.min(startY, squareEndY),
      width: (squareSize / frameWidth) * 100,
      height: (squareSize / frameHeight) * 100,
    };
  };

  const createPatch = async (crop: PatchSelection) => {
    const source = images[crop.pane];
    if (!source.src || crop.width < 3 || crop.height < 3) return;
    const sourceImage = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source.src;
    });
    const frameWidth = 1600;
    const frameHeight = 450;
    const scale = Math.max(frameWidth / source.width, frameHeight / source.height);
    const renderedWidth = source.width * scale;
    const renderedHeight = source.height * scale;
    const renderedX = -(renderedWidth - frameWidth) * (source.positionX / 100);
    const renderedY = -(renderedHeight - frameHeight) * (source.positionY / 100);
    const cropX = (crop.x / 100) * frameWidth;
    const cropY = (crop.y / 100) * frameHeight;
    const cropWidth = (crop.width / 100) * frameWidth;
    const cropHeight = (crop.height / 100) * frameHeight;
    const sourceX = Math.max(0, Math.min(source.width, (cropX - renderedX) / scale));
    const sourceY = Math.max(0, Math.min(source.height, (cropY - renderedY) / scale));
    const sourceWidth = Math.max(1, Math.min(source.width - sourceX, cropWidth / scale));
    const sourceHeight = Math.max(1, Math.min(source.height - sourceY, cropHeight / scale));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth));
    canvas.height = Math.max(1, Math.round(sourceHeight));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(sourceImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    const targetPane: CollagePane = crop.pane === 'upper' ? 'lower' : 'upper';
    const patch: CollagePatch = { ...crop, id: Date.now(), src: canvas.toDataURL('image/png'), targetPane, centerX: 50, centerY: 50 };
    setPatches((current) => [...current, patch]);
    setSelectedPane(targetPane);
    setSelectedPatchId(patch.id);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>, pane: CollagePane) => {
    const image = images[pane];
    setSelectedPane(pane);
    if (!image.src || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (selectionMode && pane === selectedPane) {
      const point = pointInPane(event);
      selectionStartRef.current = { pane, pointerId: event.pointerId, ...point };
      setSelection({ pane, ...point, width: 0, height: 0 });
      return;
    }
    dragRef.current = { pane, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, positionX: image.positionX, positionY: image.positionY };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>, pane: CollagePane) => {
    const selectionStart = selectionStartRef.current;
    if (selectionStart && selectionStart.pane === pane && selectionStart.pointerId === event.pointerId) {
      const point = pointInPane(event);
      setSelection(selectionFromPoints(pane, selectionStart.x, selectionStart.y, point.x, point.y));
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pane !== pane || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.clientX) / rect.width) * 100;
    const deltaY = ((event.clientY - drag.clientY) / rect.height) * 100;
    updatePosition(pane, drag.positionX - deltaX, drag.positionY - deltaY);
  };

  const endPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const selectionStart = selectionStartRef.current;
    if (selectionStart?.pointerId === event.pointerId) {
      const point = pointInPane(event);
      const finished = selectionFromPoints(selectionStart.pane, selectionStart.x, selectionStart.y, point.x, point.y);
      selectionStartRef.current = null;
      setSelection(null);
      setSelectionMode(false);
      void createPatch(finished);
      return;
    }
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const onPatchPointerDown = (event: PointerEvent<HTMLButtonElement>, patch: CollagePatch) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedPatchId(patch.id);
    setSelectedPane(patch.targetPane);
    patchDragRef.current = { id: patch.id, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, centerX: patch.centerX, centerY: patch.centerY };
  };

  const onPatchPointerMove = (event: PointerEvent<HTMLButtonElement>, pane: CollagePane) => {
    const drag = patchDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const deltaX = ((event.clientX - drag.clientX) / rect.width) * 100;
    const deltaY = ((event.clientY - drag.clientY) / rect.height) * 100;
    setPatches((current) => current.map((patch) => {
      if (patch.id !== drag.id) return patch;
      const halfWidth = patch.width / 2;
      const halfHeight = patch.height / 2;
      return {
        ...patch,
        centerX: Math.max(halfWidth, Math.min(100 - halfWidth, drag.centerX + deltaX)),
        centerY: Math.max(halfHeight, Math.min(100 - halfHeight, drag.centerY + deltaY)),
        targetPane: pane,
      };
    }));
  };

  const endPatchDrag = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (patchDragRef.current?.pointerId === event.pointerId) patchDragRef.current = null;
  };

  const exportCollage = async () => {
    if (!images.upper.src || !images.lower.src) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    const context = canvas.getContext('2d');
    if (!context) return;
    const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
    try {
      const [upperImage, lowerImage] = await Promise.all([loadImage(images.upper.src), loadImage(images.lower.src)]);
      drawCoverImage(context, upperImage, 0, 1600, 450, images.upper.positionX, images.upper.positionY);
      drawCoverImage(context, lowerImage, 450, 1600, 450, images.lower.positionX, images.lower.positionY);
      const patchImages = await Promise.all(patches.map(async (patch) => ({ patch, image: await loadImage(patch.src) })));
      patchImages.forEach(({ patch, image }) => {
        const width = (patch.width / 100) * 1600;
        const height = (patch.height / 100) * 450;
        const x = (patch.centerX / 100) * 1600 - width / 2;
        const y = (patch.targetPane === 'upper' ? 0 : 450) + (patch.centerY / 100) * 450 - height / 2;
        context.drawImage(image, x, y, width, height);
      });
      context.fillStyle = '#f4dd63';
      context.fillRect(0, 448, 1600, 4);
      const link = document.createElement('a');
      link.download = 'slice-collage.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      return;
    }
  };

  const renderPane = (pane: CollagePane) => {
    const image = images[pane];
    const label = pane === 'upper' ? t.collageUpper : t.collageLower;
    return (
      <div
        className={`collage-pane ${selectedPane === pane ? 'selected' : ''} ${image.src ? 'filled' : ''} ${selectionMode && selectedPane === pane ? 'selecting-patch' : ''}`}
        onClick={() => { setSelectedPane(pane); setSelectedPatchId(null); }}
        onDoubleClick={() => { if (!selectionMode) openUpload(pane); }}
        onPointerDown={(event) => onPointerDown(event, pane)}
        onPointerMove={(event) => onPointerMove(event, pane)}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        role="button"
        tabIndex={0}
        aria-label={`${label} · ${image.src ? t.collageDrag : t.collageEmpty}`}
      >
        {image.src ? (
          <img src={image.src} alt={image.name} draggable={false} style={{ objectPosition: `${image.positionX}% ${image.positionY}%` }} />
        ) : (
          <button className="collage-empty" type="button" onClick={(event) => { event.stopPropagation(); openUpload(pane); }}>
            <span>＋</span><strong>{label}</strong><small>{t.collageEmpty}</small>
          </button>
        )}
        {patches.filter((patch) => patch.targetPane === pane).map((patch) => (
          <button
            key={patch.id}
            className={`collage-patch ${selectedPatchId === patch.id ? 'selected' : ''}`}
            type="button"
            style={{ left: `${patch.centerX}%`, top: `${patch.centerY}%`, width: `${patch.width}%`, height: `${patch.height}%` }}
            onClick={(event) => { event.stopPropagation(); setSelectedPatchId(patch.id); setSelectedPane(pane); }}
            onPointerDown={(event) => onPatchPointerDown(event, patch)}
            onPointerMove={(event) => onPatchPointerMove(event, pane)}
            onPointerUp={endPatchDrag}
            onPointerCancel={endPatchDrag}
            aria-label={t.collagePatch}
          ><img src={patch.src} alt="" draggable={false} /></button>
        ))}
        {selection?.pane === pane && <span className="collage-selection" style={{ left: `${selection.x}%`, top: `${selection.y}%`, width: `${selection.width}%`, height: `${selection.height}%` }} />}
        <span className="collage-pane-label">{label}</span>
        {image.src && <span className="collage-drag-hint">{selectionMode && selectedPane === pane ? `＋ ${t.collagePatch}` : `↔ ${t.collageDrag}`}</span>}
      </div>
    );
  };

  return (
    <>
      <section className="workspace collage-workspace">
        <header className="topbar"><div className="crumbs"><span>{t.projects}</span><b>/</b><strong>{t.collageModule}</strong></div><div className="top-actions"><ThemeSwitch language={language} /><div className="language-switch" aria-label={t.switchLabel}><span>{t.language}</span><button className={language === 'zh' ? 'chosen' : ''} type="button" onClick={() => setLanguage('zh')}>{t.chinese}</button><i>/</i><button className={language === 'en' ? 'chosen' : ''} type="button" onClick={() => setLanguage('en')}>{t.english}</button></div><button className="export-button" type="button" disabled={readyCount < 2} onClick={() => void exportCollage()}><span>{t.collageExport}</span><span className="arrow">↗</span></button></div></header>
        <div className="collage-area">
          <div className="canvas-heading collage-heading"><div><p className="eyebrow">PHOTO STUDIO / 03 · 16:9</p><h1>{t.collageModule}</h1></div><p className="canvas-note">{t.collageHelp}</p></div>
          <div className="collage-frame" aria-label={t.collageModule}>
            {renderPane('upper')}
            <div className="collage-seam"><span /></div>
            {renderPane('lower')}
          </div>
          <div className="collage-meta"><span>16:9 · 1600 × 900</span><span>{readyCount}/2 {readyCount === 2 ? t.collageReady : t.collageWaiting}</span></div>
        </div>
      </section>
      <aside className="inspector collage-inspector">
        <div className="inspector-header"><span>{t.collageModule}</span><span className="status-pill">● {t.live}</span></div>
        <section className="inspector-section">
          <div className="section-title"><span>01</span><strong>{t.images}</strong><span className="section-count">{readyCount}/2</span></div>
          <p className="section-copy">{t.collageHelp}</p>
          <button className="collage-batch-upload" type="button" onClick={() => openUpload('upper', 'both')}><span>↥</span><strong>{t.collageUploadBoth}</strong><small>{t.collageUploadBothHint}</small></button>
          {(['upper', 'lower'] as CollagePane[]).map((pane) => {
            const image = images[pane];
            const label = pane === 'upper' ? t.collageUpper : t.collageLower;
            return <button key={pane} className={`collage-upload-card ${selectedPane === pane ? 'selected' : ''}`} type="button" onClick={() => openUpload(pane)}><span>{pane === 'upper' ? '↑' : '↓'}</span><span><strong>{label}</strong><small>{image.src ? image.name : t.collageUpload}</small></span><b>{image.src ? '↻' : '＋'}</b></button>;
          })}
          <button className="collage-swap" type="button" disabled={readyCount < 2} onClick={swapImages}>⇅ {t.collageSwap}</button>
          <input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={onFileChange} />
        </section>
        <section className="inspector-section"><div className="section-title"><span>02</span><strong>{t.collageSelected}</strong></div><div className="selected-tile"><span>{t.collageSelected}</span><b>{selectedPane === 'upper' ? t.collageUpper : t.collageLower}</b></div><p className="section-copy collage-position-copy">{images[selectedPane].src ? t.collageDrag : t.collageWaiting}</p><button className="add-text" type="button" disabled={!images[selectedPane].src} onClick={() => updatePosition(selectedPane, 50, 50)}>↺ {t.collageResetPosition}</button></section>
        <section className="inspector-section">
          <div className="section-title"><span>03</span><strong>{t.collagePatch}</strong><span className="section-count">{patches.length}</span></div>
          <p className="section-copy">{selectionMode ? t.collagePatchActive : t.collagePatchHelp}</p>
          <button className={`collage-patch-action ${selectionMode ? 'active' : ''}`} type="button" disabled={!images[selectedPane].src} onClick={() => { setSelectionMode((current) => !current); setSelection(null); setSelectedPatchId(null); }}>{selectionMode ? `× ${t.collagePatchCancel}` : `▱ ${t.collagePatchStart}`}</button>
          {selectionMode && <p className="collage-mode-note">{t.collagePatchActive}</p>}
          <button className="collage-patch-delete" type="button" disabled={selectedPatchId === null} onClick={() => { setPatches((current) => current.filter((patch) => patch.id !== selectedPatchId)); setSelectedPatchId(null); }}>− {t.collagePatchDelete}</button>
        </section>
        <section className="inspector-section details-section"><div className="section-title"><span>04</span><strong>{t.export}</strong></div><div className="detail-row"><span>{t.canvas}</span><b>16:9</b></div><div className="detail-row"><span>{t.quality}</span><b>1600 × 900 PNG</b></div><p className="section-copy collage-export-copy">{t.collageExportHint}</p><button className="collage-export-wide" type="button" disabled={readyCount < 2} onClick={() => void exportCollage()}>{t.collageExport}<span>↗</span></button></section>
        <div className="inspector-footer">{t.made} <span>✦</span></div>
      </aside>
    </>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>('zh');
  const [activeModule, setActiveModule] = useState<'grid' | 'gallery' | 'collage' | 'ticket'>('grid');
  const t = { ...copy[language], ...collageCopy[language] } as AppCopy;
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
        <div className="sidebar-rule" />
        <nav className="tool-list" aria-label={t.inspector}>
          <button className={`tool-button ${activeModule === 'grid' ? 'active' : ''}`} type="button" onClick={() => setActiveModule('grid')}>
            <span className="tool-icon">▦</span><span>{t.nineGrid}</span>
          </button>
          <button className={`tool-button ${activeModule === 'gallery' ? 'active' : ''}`} type="button" onClick={() => setActiveModule('gallery')}>
            <span className="tool-icon">◌</span><span>{t.galleryModule}</span>
          </button>
          <button className={`tool-button ${activeModule === 'collage' ? 'active' : ''}`} type="button" onClick={() => setActiveModule('collage')}>
            <span className="tool-icon">▤</span><span>{t.collageModule}</span>
          </button>
          <button className={`tool-button ${activeModule === 'ticket' ? 'active' : ''}`} type="button" onClick={() => setActiveModule('ticket')}>
            <span className="tool-icon">▱</span><span>{language === 'zh' ? '电子票根' : 'Photo ticket'}</span>
          </button>
        </nav>
        <div className="sidebar-footer"><span className="tiny-dot" /><span>{t.local}</span></div>
      </aside>

      {activeModule === 'grid' ? <>
      <section className="workspace">
        <header className="topbar">
          <div className="crumbs"><span>{t.projects}</span><b>/</b><strong>{t.nineGrid}</strong></div>
          <div className="top-actions"><ThemeSwitch language={language} /><div className="language-switch" aria-label={t.switchLabel}><span>{t.language}</span><button className={language === 'zh' ? 'chosen' : ''} type="button" onClick={() => setLanguage('zh')}>{t.chinese}</button><i>/</i><button className={language === 'en' ? 'chosen' : ''} type="button" onClick={() => setLanguage('en')}>{t.english}</button></div><button className="quiet-button" type="button" onClick={() => setSlots(emptySlots())}>{t.reset}</button><button className="export-button" type="button" onClick={() => void exportGrid()}><span>{t.export}</span><span className="arrow">↗</span></button></div>
        </header>
        <div className="canvas-area">
          <div className="canvas-heading"><div><p className="eyebrow">PHOTO STUDIO / 01 · 3 × 3</p><h1>{t.nineGrid}</h1></div><p className="canvas-note">{language === 'zh' ? '单击选中 · 双击上传 · 长按拖动排序' : 'Click to select · Double-click to upload · Hold to reorder'}</p></div>
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
      </> : activeModule === 'gallery' ? <GalleryModule t={t} language={language} setLanguage={setLanguage} /> : activeModule === 'ticket' ? <TicketModule language={language} setLanguage={setLanguage} /> : <CollageModule t={t} language={language} setLanguage={setLanguage} />}
    </main>
  );
}
