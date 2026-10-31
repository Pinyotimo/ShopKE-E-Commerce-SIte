import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Item = { id: number; name: string; price: number; was?: number; qty: number; image_url?: string };

const Ctx = createContext<any>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, set] = useState<Item[]>(() => JSON.parse(localStorage.getItem('cart') || '[]'));
  
  useEffect(() => localStorage.setItem('cart', JSON.stringify(items)), [items]);
  
  const add = (p: any, n = 1) =>
    set(s => s.some(i => i.id === p.id) 
      ? s.map(i => i.id === p.id ? { ...i, qty: i.qty + n } : i)
      : [...s, { id: p.id, name: p.name, price: p.price_now ?? p.price, was: p.price, image_url: p.image_url, qty: n }]
    );
    
  const setQty = (id: number, q: number) =>
    set(s => q < 1 ? s.filter(i => i.id !== id) : s.map(i => i.id === id ? { ...i, qty: q } : i));
    
  const clear = () => set([]);
  
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  
  return <Ctx.Provider value={{ items, add, setQty, clear, subtotal }}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx) as {
  items: Item[]; 
  add: (p: any, n?: number) => void; 
  setQty: (id: number, q: number) => void; 
  clear: () => void; 
  subtotal: number;
};