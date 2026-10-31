import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, Crown, Eye, EyeOff, Lock, Mail, MapPin, ShoppingBag, Smartphone, Truck, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '../api';
import { useAuth } from '../auth';
import { ThemeSwitcher } from '../theme';
import { Spinner } from '../ui';

type Portal = 'shopper' | 'staff' | 'admin';
const PORTALS: [Portal, any, string, string][] = [
  ['shopper', ShoppingBag, 'Shopper', 'Browse & buy'],
  ['staff', Briefcase, 'Staff', 'Orders & products'],
  ['admin', Crown, 'Owner', 'Run the store'],
];
const COPY: Record<Portal, [string, string]> = {
  shopper: ['Welcome back', 'Log in to track orders and check out faster.'],
  staff: ['Staff sign in', 'Manage products and fulfil orders.'],
  admin: ['Owner sign in', 'Analytics, refunds and your team.'],
};

function Field({ icon: I, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="relative">
      <I className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      {children}
    </div>
  );
}
const input = 'h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15';

export default function Auth() {
  const [portal, setPortal] = useState<Portal>('shopper');
  const [reg, setReg] = useState(false);
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as any)?.from;

  const pick = (p: Portal) => { setPortal(p); if (p !== 'shopper') setReg(false); setErr(''); };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const d = await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body: f });
      const r = d.user.role;
      if (portal === 'staff' && !['staff', 'admin'].includes(r)) throw new Error('This account is not a staff account. Ask the owner to promote you.');
      if (portal === 'admin' && r !== 'admin') throw new Error('This account is not the owner account.');
      login(d.token, d.user);
      toast.success(`Welcome, ${d.user.name.split(' ')[0]}`);
      nav(portal === 'admin' ? '/admin' : portal === 'staff' ? (r === 'admin' ? '/admin' : '/staff') : from || '/shop', { replace: true });
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 p-12 text-white lg:flex">
        <motion.div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10" animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-white/10" animate={{ scale: [1, 1.15, 1], y: [0, -30, 0] }} transition={{ duration: 12, repeat: Infinity }} />
        <Link to="/" className="relative flex items-center gap-2 text-xl font-extrabold"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white/20"><ShoppingBag className="h-5 w-5" /></span>ShopKE</Link>
        <div className="relative">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-4xl font-extrabold leading-tight">Shop local. Pay with M-Pesa. Delivered to your door.</motion.h2>
          <ul className="mt-8 space-y-4">
            {[[Smartphone, 'Pay securely with an M-Pesa prompt'], [MapPin, 'Pin your exact delivery location'], [Truck, 'Fair, distance-based delivery fees']].map(([I, t]: any, i) => (
              <motion.li key={t} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15 }} className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><I className="h-5 w-5" /></span>{t}
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/70">© ShopKE · Nairobi, Kenya</p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to store</Link>
          <ThemeSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <motion.form key={portal + reg} onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-5">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{reg ? 'Create your account' : COPY[portal][0]}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{reg ? 'Start shopping in under a minute.' : COPY[portal][1]}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sign in as</p>
              <div className="grid grid-cols-3 gap-2">
                {PORTALS.map(([k, I, l, d]) => (
                  <button key={k} type="button" onClick={() => pick(k)}
                    className={cn('flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition',
                      portal === k ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-600/10' : 'hover:bg-muted')}>
                    <I className="h-5 w-5" /><span className="text-sm font-semibold">{l}</span>
                    <span className="hidden text-[11px] leading-tight text-muted-foreground sm:block">{d}</span>
                  </button>
                ))}
              </div>
            </div>

            {reg && <Field icon={User}><input className={input} placeholder="Full name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>}
            <Field icon={Mail}><input className={input} type="email" placeholder="Email address" autoComplete="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
            <Field icon={Lock}>
              <input className={cn(input, 'pr-11')} type={show ? 'text' : 'password'} placeholder="Password (8+ characters)" autoComplete={reg ? 'new-password' : 'current-password'} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
              <button type="button" aria-label="Toggle password" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            {err && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{err}</p>}

            <button disabled={busy} className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[.98] disabled:opacity-60">
              {busy ? <Spinner /> : reg ? 'Create account' : 'Sign in'}
            </button>

            {portal === 'shopper'
              ? <p className="text-center text-sm text-muted-foreground">{reg ? 'Already have an account?' : 'New here?'}{' '}
                  <button type="button" className="font-semibold text-emerald-700 hover:underline" onClick={() => { setReg(!reg); setErr(''); }}>{reg ? 'Sign in' : 'Create an account'}</button></p>
              : <p className="rounded-xl bg-muted/60 p-3 text-center text-xs text-muted-foreground">Staff accounts are set up by the owner. Register as a shopper first, then ask the owner to promote you in Team.</p>}
          </motion.form>
        </div>
      </div>
    </div>
  );
}