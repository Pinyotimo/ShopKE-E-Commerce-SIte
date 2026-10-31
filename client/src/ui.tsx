import { Loader2, ShoppingBag, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const tone: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', paid: 'bg-emerald-100 text-emerald-800', packed: 'bg-sky-100 text-sky-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800', delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-slate-200 text-slate-600', refunded: 'bg-rose-100 text-rose-800', requested: 'bg-amber-100 text-amber-800',
  processing: 'bg-sky-100 text-sky-800', rejected: 'bg-slate-200 text-slate-600', failed: 'bg-rose-100 text-rose-800',
};
export const Status = ({ s }: { s: string }) => (
  <Badge variant="outline" className={cn('whitespace-nowrap border-0 capitalize', tone[s])}>{s.replace(/_/g, ' ')}</Badge>
);
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
export const Logo = () => (
  <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white"><ShoppingBag className="h-4 w-4" /></span>
    <span>Shop<span className="text-emerald-600">KE</span></span>
  </span>
);
export const Page = ({ children }: { children: React.ReactNode }) => <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>;
export const Title = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="mb-5 flex items-center justify-between gap-3">
    <h1 className="text-2xl font-extrabold tracking-tight">{children}</h1>{action}
  </div>
);
export const Empty = ({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) => (
  <Card className="items-center gap-2 px-6 py-14 text-center">
    <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Icon className="h-7 w-7" /></div>
    <h2 className="text-lg font-bold">{title}</h2>{children}
  </Card>
);