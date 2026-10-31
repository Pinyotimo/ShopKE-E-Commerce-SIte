import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Menu, ShoppingCart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ count, onMenu }: { count: number; onMenu: () => void }) {
  const cls = ({ isActive }: { isActive: boolean }) =>
    cn('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-emerald-700' : 'text-muted-foreground');
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <NavLink to="/" end className={cls}><Home className="h-5 w-5" />Home</NavLink>
      <NavLink to="/categories" className={cls}><LayoutGrid className="h-5 w-5" />Categories</NavLink>
      <NavLink to="/deals" className={cls}><Zap className="h-5 w-5" />Deals</NavLink>
      <NavLink to="/cart" className={cls}>
        <ShoppingCart className="h-5 w-5" />Cart
        {count > 0 && <span className="absolute right-1/4 top-1 grid min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{count}</span>}
      </NavLink>
      <button type="button" onClick={onMenu} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"><Menu className="h-5 w-5" />Menu</button>
    </nav>
  );
}