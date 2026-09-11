import type { Metadata } from 'next';
import './globals.css';
import './studio.css';
import './ticket.css';

export const metadata: Metadata = {
  title: 'Nine Grid Editor',
  description: 'Create a quiet nine-image visual diary with type.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
