import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function Countdown({ to, className }: { to: string; className?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((+new Date(to) - now) / 1000));
  if (!s) return <span className={className}>Ended</span>;
  const p = (n: number) => String(n).padStart(2, '0');
  const d = Math.floor(s / 86400);
  return <span className={cn('font-mono tabular-nums', className)}>{d > 0 && `${d}d `}{p(Math.floor((s % 86400) / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</span>;
}