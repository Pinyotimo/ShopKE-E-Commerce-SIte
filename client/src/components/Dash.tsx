import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Menu, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../auth';
import { ThemeSwitcher } from '../theme';
import { Logo } from '../ui';
import Drawer from './Drawer';
import NotificationBell from './NotificationBell';
import { roleLabel } from './UserMenu';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

export default function Dash({ title, nav }: { title: string; nav: NavItem[] }) {
  const { user, logout } = useAuth();
  const go = useNavigate();
  const [menu, setMenu] = useState(false);
  const out = () => { setMenu(false); logout(); go('/'); };
  const lk = ({ isActive }: { isActive: boolean }) =>
    cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-muted hover:text-foreground');

  const links = nav.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={lk} onClick={() => setMenu(false)}><n.icon className="h-4 w-4" />{n.label}</NavLink>);
  const footer = (
    <div className="space-y-2 border-t p-4">
      <Link to="/shop" onClick={() => setMenu(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to store</Link>
      <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">{user?.name[0]?.toUpperCase()}</span>
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="text-xs text-muted-foreground">{roleLabel(user?.role || '')}</p></div>
      </div>
      <button type="button" onClick={out} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
        <LogOut className="h-4 w-4" />Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center justify-between border-b px-4"><Logo /><span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">{title}</span></div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{links}</nav>
        {footer}
      </aside>

      <Drawer open={menu} onClose={() => setMenu(false)}>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{links}</nav>
        {footer}
      </Drawer>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b bg-background/90 px-4 backdrop-blur">
          <button type="button" aria-label="Open menu" onClick={() => setMenu(true)} className="mr-1 grid h-9 w-9 place-items-center rounded-lg hover:bg-muted md:hidden"><Menu className="h-5 w-5" /></button>
          <div className="flex-1 text-sm text-muted-foreground"><span className="hidden md:inline">Signed in as </span><b className="text-foreground">{user?.name}</b></div>
          <ThemeSwitcher />
          <NotificationBell />
          <button type="button" onClick={out} className="ml-1 flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium hover:bg-muted"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span></button>
        </header>
        <main className="p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}