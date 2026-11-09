import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, CheckCircle2, ChevronRight, CreditCard, Package, RotateCcw, Trash2, Truck, X, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import NotificationStack, { type StackNotification } from '@/components/kokonutui/notification-stack';
import { cn } from '@/lib/utils';
import { api } from '../api';
import { Empty, Page, Title } from '../ui';

type N = { id: number; title: string; body: string; link: string | null; read: boolean; created_at: string };
type Kind = 'delivered' | 'delivery' | 'payment' | 'refund' | 'order';
type Filter = 'all' | 'unread' | 'orders' | 'payments';

/** Notifications have no type column, so the kind is read from the title. */
function kindOf(title: string): Kind {
  const t = title.toLowerCase();
  if (t.includes('refund')) return 'refund';
  if (t.includes('delivered')) return 'delivered';
  if (t.includes('delivery') || t.includes('out for') || t.includes('on the way')) return 'delivery';
  if (t.includes('pay') || t.includes('paid') || t.includes('m-pesa') || t.includes('receipt')) return 'payment';
  return 'order';
}

const KIND: Record<Kind, { icon: LucideIcon; tone: string; app: string }> = {
  delivered: { icon: CheckCircle2, tone: 'bg-emerald-600', app: 'Delivery' },
  delivery: { icon: Truck, tone: 'bg-blue-600', app: 'Delivery' },
  payment: { icon: CreditCard, tone: 'bg-violet-600', app: 'Payments' },
  refund: { icon: RotateCcw, tone: 'bg-amber-500', app: 'Refunds' },
  order: { icon: Package, tone: 'bg-zinc-700', app: 'Orders' },
};

const KindIcon = ({ kind, className }: { kind: Kind; className?: string }) => {
  const { icon: I, tone } = KIND[kind];
  return <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg text-white', tone, className)}><I className="size-4" /></span>;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });

function groupOf(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000;
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return 'Earlier';
}

const toStack = (n: N): StackNotification => {
  const kind = kindOf(n.title);
  return { id: String(n.id), app: KIND[kind].app, title: n.title, body: n.body || '', time: groupOf(n.created_at) === 'Today' ? time(n.created_at) : new Date(n.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }), icon: <KindIcon kind={kind} /> };
};

export default function Notifications() {
  const nav = useNavigate();
  const [list, setList] = useState<N[] | null>(null);
  const [fresh, setFresh] = useState<N[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  // Unread when the page opened. The server marks them read straight away,
  // but they stay highlighted (and in the Unread tab) for this visit.
  const unseen = useRef(new Set<number>());

  const markRead = () => api('/notifications/read', { method: 'POST' }).catch(() => {});

  useEffect(() => {
    let alive = true;
    api<N[]>('/notifications?limit=200')
      .then(d => {
        if (!alive) return;
        d.filter(n => !n.read).forEach(n => unseen.current.add(n.id));
        setList(d);
        setFresh(d.filter(n => !n.read).slice(0, 6));
        if (unseen.current.size) markRead();
      })
      .catch(e => { toast.error(e.message); setList([]); });

    // Pick up new notifications while the page is open.
    const t = setInterval(async () => {
      const d = await api<N[]>('/notifications?limit=30').catch(() => null);
      if (!d || !alive) return;
      setList(prev => {
        if (!prev) return prev;
        const top = prev[0]?.id ?? 0;
        const added = d.filter(n => n.id > top);
        if (!added.length) return prev;
        added.forEach(n => unseen.current.add(n.id));
        toast(added.length === 1 ? added[0].title : `${added.length} new notifications`);
        markRead();
        return [...added, ...prev];
      });
    }, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const dismiss = (id: number) => {
    setList(l => l?.filter(n => n.id !== id) ?? l);
    api('/notifications/' + id, { method: 'DELETE' }).catch(e => toast.error(e.message));
  };

  const clearAll = () => {
    setList([]); setFresh([]);
    api('/notifications', { method: 'DELETE' }).then(() => toast.success('Notifications cleared')).catch(e => toast.error(e.message));
  };

  const shown = useMemo(() => (list ?? []).filter(n => {
    const k = kindOf(n.title);
    if (filter === 'unread') return unseen.current.has(n.id);
    if (filter === 'orders') return k === 'order' || k === 'delivery' || k === 'delivered';
    if (filter === 'payments') return k === 'payment' || k === 'refund';
    return true;
  }), [list, filter]);

  const groups = useMemo(() => {
    const out: [string, N[]][] = [];
    for (const n of shown) {
      const g = groupOf(n.created_at);
      const last = out[out.length - 1];
      last && last[0] === g ? last[1].push(n) : out.push([g, [n]]);
    }
    return out;
  }, [shown]);

  // The stack only shows cards that still exist (dismissed in the list = gone here too).
  const stackItems = useMemo(() => {
    const ids = new Set((list ?? []).map(n => n.id));
    return fresh.filter(n => ids.has(n.id)).map(toStack);
  }, [fresh, list]);

  const unreadCount = (list ?? []).filter(n => unseen.current.has(n.id)).length;
  const tabs: [Filter, string][] = [['all', 'All'], ['unread', `Unread${unreadCount ? ` (${unreadCount})` : ''}`], ['orders', 'Orders'], ['payments', 'Payments']];

  if (list === null) return <Page><Title>Notifications</Title><div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div></Page>;

  return (
    <Page>
      <Title action={list.length > 0 && (
        <div className="flex gap-2">
          {unreadCount > 0 && <Button variant="outline" size="sm" onClick={() => { unseen.current.clear(); setFresh([]); setList(l => l && [...l]); }}><CheckCheck className="mr-1.5 h-4 w-4" />Mark all read</Button>}
          <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setConfirmClear(true)}><Trash2 className="mr-1.5 h-4 w-4" />Clear all</Button>
        </div>
      )}>Notifications</Title>

      {!list.length ? (
        <Empty icon={Bell} title="You're all caught up"><p className="text-sm text-muted-foreground">Order, delivery and payment updates will show up here.</p></Empty>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
          {/* New since last visit: swipe a card away to dismiss it. */}
          <div className="lg:sticky lg:top-20">
            {stackItems.length > 0 ? (
              <Card className="gap-0 p-5">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-600">New since your last visit</p>
                <p className="mb-4 text-sm text-muted-foreground">Hover or tap to fan out. Swipe a card away to dismiss it.</p>
                <NotificationStack key={fresh.map(n => n.id).join('|')} notifications={stackItems} onDismiss={id => dismiss(Number(id))} className="max-w-none" />
              </Card>
            ) : (
              <Card className="items-center gap-2 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCheck className="size-6" /></span>
                <p className="font-semibold">No new notifications</p>
                <p className="text-sm text-muted-foreground">Your history is on the right.</p>
              </Card>
            )}
          </div>

          <div>
            <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
              {tabs.map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={cn('relative flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', filter === k ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {filter === k && <motion.span layoutId="notif-tab" className="absolute inset-0 rounded-lg bg-background shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>

            {!shown.length && <p className="py-12 text-center text-sm text-muted-foreground">Nothing here.</p>}

            {groups.map(([group, items]) => (
              <section key={group} className="mb-6">
                <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{group}</h2>
                <Card className="gap-0 overflow-hidden py-0">
                  <ul className="divide-y">
                    <AnimatePresence initial={false}>
                      {items.map(n => {
                        const kind = kindOf(n.title);
                        const isNew = unseen.current.has(n.id);
                        return (
                          <motion.li key={n.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, height: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="group relative">
                            <button type="button" disabled={!n.link} onClick={() => n.link && nav(n.link)} className={cn('flex w-full items-start gap-3 px-4 py-3.5 pr-12 text-left transition-colors', n.link && 'hover:bg-muted/60', isNew && 'bg-emerald-50/60')}>
                              <KindIcon kind={kind} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={cn('truncate text-sm', isNew ? 'font-bold' : 'font-semibold')}>{n.title}</p>
                                  {isNew && <span className="size-2 shrink-0 rounded-full bg-emerald-600" aria-label="New" />}
                                </div>
                                {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>}
                                <p className="mt-1 text-xs text-muted-foreground/80">{group === 'Today' || group === 'Yesterday' ? time(n.created_at) : new Date(n.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                              </div>
                              {n.link && <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" />}
                            </button>
                            <button type="button" aria-label={`Dismiss ${n.title}`} onClick={() => dismiss(n.id)} className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                              <X className="size-3.5" />
                            </button>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>This deletes your whole notification history. Your orders are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearAll}>Clear all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
