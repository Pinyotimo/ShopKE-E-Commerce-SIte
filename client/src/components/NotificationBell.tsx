import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';
import { useOutside } from './useOutside';

export default function NotificationBell() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const last = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  useOutside(box, open, () => setOpen(false));

  const load = async () => {
    const d = await api('/notifications').catch(() => null);
    if (!d) return;
    if (last.current !== null) d.filter((n: any) => n.id > last.current!).reverse().forEach((n: any) => toast(n.title, { description: n.body }));
    last.current = d[0]?.id ?? last.current ?? 0;
    setList(d);
  };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const unread = list.filter(n => !n.read).length;
  const toggle = () => {
    setOpen(o => !o);
    if (!open && unread) api('/notifications/read', { method: 'POST' }).then(() => setList(l => l.map(n => ({ ...n, read: true })))).catch(() => {});
  };
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label="Notifications" onClick={toggle} className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl">
          <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {!list.length && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>}
            {list.map(n => (
              <button key={n.id} onClick={() => { setOpen(false); n.link && nav(n.link); }} className="block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-muted/60">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground/70">{new Date(n.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}