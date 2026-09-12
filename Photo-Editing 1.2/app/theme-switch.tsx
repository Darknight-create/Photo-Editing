'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
const storageKey = 'photo-studio-theme';

export default function ThemeSwitch({ language }: { language: 'zh' | 'en' }) {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const read = (): Theme => {
      try {
        const value = localStorage.getItem(storageKey);
        return value === 'light' || value === 'dark' ? value : 'system';
      } catch { return 'system'; }
    };
    let current = read();
    const apply = () => {
      document.documentElement.dataset.theme = current === 'system' ? (media.matches ? 'dark' : 'light') : current;
      setTheme(current);
    };
    const sync = () => { current = read(); apply(); };
    const select = (event: Event) => { current = (event as CustomEvent<Theme>).detail; apply(); };
    apply();
    media.addEventListener('change', apply);
    window.addEventListener('storage', sync);
    window.addEventListener('photo-theme-change', select);
    return () => {
      media.removeEventListener('change', apply);
      window.removeEventListener('storage', sync);
      window.removeEventListener('photo-theme-change', select);
    };
  }, []);

  const choose = (value: Theme) => {
    try { localStorage.setItem(storageKey, value); } catch { /* Theme remains usable when storage is unavailable. */ }
    window.dispatchEvent(new CustomEvent('photo-theme-change', { detail: value }));
  };
  const labels = language === 'zh' ? ['日间', '夜间', '跟随系统'] : ['Light', 'Dark', 'System'];
  return <div className="theme-switch" role="group" aria-label={language === 'zh' ? '界面主题' : 'Appearance'}>
    {(['light', 'dark', 'system'] as const).map((value, index) => <button key={value} type="button" title={labels[index]} aria-label={labels[index]} aria-pressed={theme === value} className={theme === value ? 'chosen' : ''} onClick={() => choose(value)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {value === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" /></> : value === 'dark' ? <path d="M20.5 13.2A8.7 8.7 0 0 1 10.8 3.5a8.7 8.7 0 1 0 9.7 9.7Z" /> : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}
      </svg>
    </button>)}
  </div>;
}
