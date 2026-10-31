import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, LogIn, LogOut, Menu, Package, ShoppingCart, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { ThemeSwitcher } from '../theme';
import { Logo } from '../ui';
import Drawer from './Drawer';
import NotificationBell from './NotificationBell';
import UserMenu, { dashPath, roleLabel } from './UserMenu';

export default function Site() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const count = items.reduce((a, i) => a + i.qty, 0);
  const dash = user ? dashPath(user.role) : null;

  const links = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/shop', label: 'Shop', icon: Store },
    { to: '/cart', label: 'Cart', icon: ShoppingCart, badge: count },
    ...(user ? [{ to: '/orders', label: 'My orders', icon: Package }] : []),
    ...(dash ? [{ to: dash, label: user!.role === 'admin' ? 'Owner dashboard' : 'Staff dashboard', icon: LayoutDashboard }] : []),
  ] as { to: string; label: string; icon: any; end?: boolean; badge?: number }[];

  const lk = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-lg px-3 py-1.5 text-sm font-medium transition', isActive ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-muted');
  const dl = ({ isActive }: { isActive: boolean }) =>
    cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-emerald-50 text-emerald-700' : 'text-foreground hover:bg-muted');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4">
          <button type="button" aria-label="Open menu" onClick={() => setMenu(true)} className="mr-1 grid h-9 w-9 place-items-center rounded-lg hover:bg-muted md:hidden"><Menu className="h-5 w-5" /></button>
          <Link to="/" className="mr-auto"><Logo /></Link>
          <NavLink to="/shop" className={cn(lk as any, 'hidden md:block')}>{({ isActive }: any) => 'Shop'}</NavLink>
          <ThemeSwitcher />
          <Link to="/cart" aria-label="Cart" className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{count}</span>}
          </Link>
          {user && <NotificationBell />}
          <div className="hidden md:block"><UserMenu /></div>
        </nav>
      </header>

      <Drawer open={menu} onClose={() => setMenu(false)}>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className={dl} onClick={() => setMenu(false)}>
              <l.icon className="h-5 w-5" />{l.label}
              {!!l.badge && <span className="ml-auto rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">{l.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4">
          {user ? (
            <>
              <p className="font-semibold">{user.name}</p>
              <p className="mb-3 text-xs text-muted-foreground">{user.email} · {roleLabel(user.role)}</p>
              <button type="button" onClick={() => { setMenu(false); logout(); nav('/'); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                <LogOut className="h-4 w-4" />Logout
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenu(false)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
              <LogIn className="h-4 w-4" />Login / Sign up
            </Link>
          )}
        </div>
      </Drawer>

      <main className="flex-1"><Outlet /></main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">© ShopKE · Pay with M-Pesa · Delivery across Nairobi</footer>
    </div>
  );
}