import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LayoutDashboard, LogOut, Package, User } from 'lucide-react';
import { useAuth } from '../auth';
import { useOutside } from './useOutside';

export const roleLabel = (r: string) => (r === 'admin' ? 'Owner' : r === 'staff' ? 'Staff' : 'Shopper');
export const dashPath = (r: string) => (r === 'admin' ? '/admin' : r === 'staff' ? '/staff' : null);

export default function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, open, () => setOpen(false));
  if (!user) return <Link to="/login" className="ml-2 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Login</Link>;
  const go = (to: string) => { setOpen(false); nav(to); };
  const dash = dashPath(user.role);
  const item = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted';
  return (
    <div ref={ref} className="relative ml-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
        <User className="h-4 w-4" />{user.name.split(' ')[0]}<ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-56 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
          <div className="px-3 py-2"><p className="font-semibold">{user.name}</p><p className="text-xs text-muted-foreground">{user.email} · {roleLabel(user.role)}</p></div>
          <div className="my-1 h-px bg-border" />
          {dash && <button className={item} onClick={() => go(dash)}><LayoutDashboard className="h-4 w-4" />{user.role === 'admin' ? 'Owner dashboard' : 'Staff dashboard'}</button>}
          <button className={item} onClick={() => go('/orders')}><Package className="h-4 w-4" />My orders</button>
          <button className={item} onClick={() => go('/notifications')}><Bell className="h-4 w-4" />Notifications</button>
          <div className="my-1 h-px bg-border" />
          <button className={`${item} text-rose-600`} onClick={() => { setOpen(false); logout(); nav('/'); }}><LogOut className="h-4 w-4" />Logout</button>
        </div>
      )}
    </div>
  );
}