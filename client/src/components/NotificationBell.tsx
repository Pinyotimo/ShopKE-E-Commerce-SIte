import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Package, Truck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';
import { useOutside } from './useOutside';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

    if (last.current !== null) {
      const newNotifs = d.filter((n: any) => n.id > last.current!).reverse();
      newNotifs.forEach((n: any) => {
        toast(n.title, {
          description: n.body,
          icon: <Zap className="h-4 w-4 text-emerald-600" />,
        });
      });
    }
    last.current = d[0]?.id ?? last.current ?? 0;
    setList(d);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const unread = list.filter(n => !n.read).length;
  const toggle = () => {
    setOpen(o => !o);
    if (!open && unread) {
      api('/notifications/read', { method: 'POST' })
        .then(() => setList(l => l.map(n => ({ ...n, read: true }))))
        .catch(() => {});
    }
  };

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('delivered')) return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    if (t.includes('delivery') || t.includes('out')) return <Truck className="h-4 w-4 text-blue-600" />;
    return <Package className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={toggle}
        className="group relative grid h-10 w-10 place-items-center rounded-xl transition-all duration-300 hover:bg-emerald-100 hover:text-emerald-700 active:scale-90"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 grid min-w-5 h-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
          >
            {unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute right-0 top-full z-[100] mt-3 w-85 max-w-[90vw] overflow-hidden rounded-2xl border border-emerald-100 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-xl"
          >
            <div className="border-b bg-muted/30 px-4 py-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Notifications
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {!list.length && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                </div>
              )}
              <div className="space-y-1">
                {list.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); n.link && nav(n.link); }}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 hover:bg-emerald-50",
                      !n.read && "bg-emerald-50/30"
                    )}
                  >
                    <div className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors",
                      !n.read ? "bg-emerald-100 border-emerald-200" : "bg-muted border-border"
                    )}>
                      {getIcon(n.title)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm font-bold truncate", !n.read && "text-emerald-800")}>{n.title}</p>
                        {!n.read && <div className="h-2 w-2 rounded-full bg-emerald-600" />}
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {new Date(n.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); nav('/notifications'); }}
              className="flex w-full items-center justify-center gap-1 border-t px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              View all notifications
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}