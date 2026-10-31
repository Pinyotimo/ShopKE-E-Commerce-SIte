import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from './api';

export type U = { id: number; name: string; email: string; role: 'customer' | 'staff' | 'admin' };
const Ctx = createContext<any>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<U | null>(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const save = (u: U | null) => { setUser(u); u ? localStorage.setItem('user', JSON.stringify(u)) : localStorage.removeItem('user'); };
  const login = (token: string, u: U) => { localStorage.setItem('token', token); save(u); };
  const logout = () => { localStorage.removeItem('token'); save(null); };
  useEffect(() => {
    if (localStorage.getItem('token')) api('/auth/me').then(save).catch(e => e.message === 'Login required' && logout());
  }, []);
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx) as { user: U | null; login: (t: string, u: U) => void; logout: () => void };

export function Guard({ roles, children }: { roles?: string[]; children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}