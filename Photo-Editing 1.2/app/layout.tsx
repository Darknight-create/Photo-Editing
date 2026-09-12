import type { Metadata } from 'next';
import './globals.css';
import './studio.css';
import './ticket.css';
import './polaroid.css';

export const metadata: Metadata = {
  title: 'Photo-Editing 1.2',
  description: 'Create nine-grid stories, adaptive frames, split collages, photo tickets and Polaroid keepsakes.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
