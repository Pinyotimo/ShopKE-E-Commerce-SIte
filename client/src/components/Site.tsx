import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Home, Info, LayoutDashboard, LayoutGrid, LogIn, LogOut, Menu, Package, Search as SearchIcon, ShoppingCart, Store, Truck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { ThemeSwitcher } from '../theme';
import { Logo } from '../ui';
import BottomNav from './BottomNav';
import Drawer from './Drawer';
import Footer from './Footer';
import NotificationBell from './NotificationBell';
import UserMenu, { dashPath, roleLabel } from './UserMenu';

function SearchBox({ className }: { className?: string }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form className={className} onSubmit={e => { e.preventDefault(); nav('/shop?search=' + encodeURIComponent(q)); }}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products…" className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15" />
      </div>
    </form>
  );
}

export default function Site() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const count = items.reduce((a, i) => a + i.qty, 0);
  const dash = user ? dashPath(user.role) : null;

  const groups: [string, { to: string; label: string; icon: any; end?: boolean; badge?: number }[]][] = [
    ['Browse', [
      { to: '/', label: 'Home', icon: Home, end: true }, { to: '/shop', label: 'Shop', icon: Store },
      { to: '/categories', label: 'Categories', icon: LayoutGrid }, { to: '/deals', label: 'Deals & flash sales', icon: Zap },
    ]],
    ['My account', [
      { to: '/cart', label: 'Cart', icon: ShoppingCart, badge: count },
      ...(user ? [{ to: '/orders', label: 'My orders', icon: Package }, { to: '/notifications', label: 'Notifications', icon: Bell }] : []),
      { to: '/track', label: 'Track an order', icon: Truck },
      ...(dash ? [{ to: dash, label: user!.role === 'admin' ? 'Owner dashboard' : 'Staff dashboard', icon: LayoutDashboard }] : []),
    ]],
    ['Info', [
      { to: '/about', label: 'About us', icon: Info }, { to: '/delivery', label: 'Delivery', icon: Truck },
      { to: '/returns', label: 'Returns & refunds', icon: Package }, { to: '/faq', label: 'FAQ', icon: Info }, { to: '/contact', label: 'Contact', icon: Info },
    ]],
  ];
  const lk = ({ isActive }: { isActive: boolean }) =>
    cn('hidden rounded-lg px-3 py-1.5 text-sm font-medium transition md:block', isActive ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-muted');
  const dl = ({ isActive }: { isActive: boolean }) =>
    cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-emerald-50 text-emerald-700' : 'text-foreground hover:bg-muted');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4">
          <button type="button" aria-label="Open menu" onClick={() => setMenu(true)} className="mr-1 grid h-9 w-9 place-items-center rounded-lg hover:bg-muted md:hidden"><Menu className="h-5 w-5" /></button>
          <Link to="/" className="mr-2"><Logo /></Link>
          <SearchBox className="mx-3 hidden max-w-xs flex-1 lg:block" />
          <span className="flex-1" />
          <NavLink to="/shop" className={lk}>Shop</NavLink>
          <NavLink to="/categories" className={lk}>Categories</NavLink>
          <NavLink to="/deals" className={lk}>Deals</NavLink>
          <NavLink to="/track" className={lk}>Track</NavLink>
          <ThemeSwitcher />
          <Link to="/cart" aria-label="Cart" className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{count}</span>}
          </Link>
          {user && <NotificationBell />}
          <div className="hidden md:block"><UserMenu /></div>
        </nav>
        <div className="px-4 pb-2 lg:hidden"><SearchBox /></div>
      </header>

      <Drawer open={menu} onClose={() => setMenu(false)}>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {groups.map(([h, ls]) => (
            <div key={h}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</p>
              {ls.map(l => (
                <NavLink key={l.to + l.label} to={l.to} end={l.end} className={dl} onClick={() => setMenu(false)}>
                  <l.icon className="h-5 w-5" />{l.label}
                  {!!l.badge && <span className="ml-auto rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">{l.badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t p-4">
          {user ? (
            <>
              <p className="font-semibold">{user.name}</p>
              <p className="mb-3 text-xs text-muted-foreground">{user.email} · {roleLabel(user.role)}</p>
              <button type="button" onClick={() => { setMenu(false); logout(); nav('/'); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />Logout</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenu(false)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"><LogIn className="h-4 w-4" />Login / Sign up</Link>
          )}
        </div>
      </Drawer>

      <main className="flex-1 pb-16 md:pb-0"><Outlet /></main>
      <div className="pb-14 md:pb-0"><Footer /></div>
      <BottomNav count={count} onMenu={() => setMenu(true)} />
    </div>
  );
}