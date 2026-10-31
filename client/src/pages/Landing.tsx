import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useInView } from 'framer-motion';
import { ArrowRight, CheckCircle2, MapPin, RotateCcw, ShoppingBag, Smartphone, Truck, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import FlashSale from '../components/FlashSale';
import CategoryGrid from '../components/CategoryGrid';
import Recommended from '../components/Recommended';

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const view = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-60px' } } as const;

const Chip = ({ icon: I, text, className, delay }: { icon: LucideIcon; text: string; className: string; delay: number }) => (
  <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay }}
    className={`absolute flex items-center gap-2 rounded-2xl border bg-white/90 px-3.5 py-2.5 text-sm font-semibold shadow-xl backdrop-blur ${className}`}>
    <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-700"><I className="h-4 w-4" /></span>{text}
  </motion.div>
);

function Count({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: 'easeOut', onUpdate: v => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView]);
  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>;
}

const strip: [LucideIcon, string][] = [[Smartphone, 'Pay with M-Pesa'], [Truck, 'Delivery across Nairobi'], [MapPin, 'Pin your exact location'], [RotateCcw, '7-day refunds'], [Zap, 'Fast checkout']];
const features: [LucideIcon, string, string][] = [
  [Smartphone, 'Pay with M-Pesa', 'Get an STK prompt on your phone and confirm with your PIN.'],
  [MapPin, 'Pin your location', 'Drop a pin on the map or use your GPS. No long address typing.'],
  [Truck, 'Fair delivery fees', 'Priced by distance, and free on bigger baskets.'],
  [RotateCcw, '7-day refunds', 'Request a refund in a tap and get it back on M-Pesa.'],
];

<section className="mx-auto max-w-6xl px-4 pb-4">
  <h2 className="mb-5 text-3xl font-extrabold tracking-tight">Shop by category</h2>
  <CategoryGrid limit={6} />
</section>


const words: [string, string][] = [['Shop', ''], ['smart.', ''], ['Pay', ''], ['with', ''], ['M-Pesa.', ''], ['Delivered', 'bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent'], ['fast.', 'bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent']];

export default function Landing() {
  const [ps, setPs] = useState<any[] | null>(null);
  useEffect(() => { api('/products').then(a => setPs(a.slice(0, 4))).catch(() => setPs([])); }, []);
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(#10b98133 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <motion.div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl" animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-teal-300/40 blur-3xl" animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
              <Zap className="h-3.5 w-3.5" />Made for Kenya
            </motion.span>
            <motion.h1 variants={stagger} initial="hidden" animate="show" className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
              {words.map(([w, c], i) => <motion.span key={i} variants={fade} className={`mr-3 inline-block ${c}`}>{w}</motion.span>)}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-5 max-w-md text-lg text-muted-foreground">
              Browse, pin your location, pay on your phone. We bring it to your door.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="group"><Link to="/shop">Shop now<ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/orders">Track an order</Link></Button>
            </motion.div>
          </div>
          <div className="relative mx-auto h-80 w-80 md:h-[26rem] md:w-[26rem]">
            <motion.div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-300" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
              <span className="absolute -top-2 left-1/2 h-4 w-4 rounded-full bg-emerald-500" />
              <span className="absolute -bottom-2 left-1/3 h-3 w-3 rounded-full bg-teal-400" />
              <span className="absolute right-0 top-1/3 h-3 w-3 rounded-full bg-amber-400" />
            </motion.div>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.3 }}
              className="absolute inset-10 grid place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/30">
              <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, -6, 6, 0] }} transition={{ duration: 5, repeat: Infinity }}><ShoppingBag className="h-24 w-24 text-white" strokeWidth={1.5} /></motion.div>
            </motion.div>
            <Chip icon={Smartphone} text="M-Pesa paid" className="left-0 top-8" delay={0} />
            <Chip icon={Truck} text="Out for delivery" className="right-0 top-1/2" delay={1} />
            <Chip icon={CheckCircle2} text="Delivered" className="bottom-2 left-6" delay={2} />
          </div>
        </div>
      </section>

      <div className="overflow-hidden bg-emerald-600 py-3 text-white">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[...strip, ...strip, ...strip, ...strip].map(([I, t], k) => <span key={k} className="flex items-center gap-2 text-sm font-semibold"><I className="h-4 w-4" />{t}</span>)}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <motion.div variants={stagger} {...view} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([I, t, d]) => (
            <motion.div key={t} variants={fade}>
              <Card className="h-full gap-2 p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><I className="h-5 w-5" /></span>
                <h3 className="mt-2 font-bold">{t}</h3><p className="text-sm text-muted-foreground">{d}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="border-y bg-muted/40 py-12">
        <motion.div variants={stagger} {...view} className="mx-auto grid max-w-4xl gap-6 px-4 text-center sm:grid-cols-3">
          {[[<Count to={7} suffix=" days" />, 'To request a refund'], [<Count to={5000} prefix="KES " />, 'Free delivery over'], [<Count to={25} suffix=" km" />, 'Delivery radius']].map(([n, l], i) => (
            <motion.div key={i} variants={fade}><p className="text-4xl font-extrabold text-emerald-600">{n}</p><p className="text-sm text-muted-foreground">{l as string}</p></motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <motion.div variants={fade} {...view} className="mb-6 flex items-end justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight">Fresh picks</h2>
          <Link to="/shop" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">View all<ArrowRight className="h-4 w-4" /></Link>
        </motion.div>
        <motion.div variants={stagger} {...view} className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {ps === null ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)
            : ps.map(p => <motion.div key={p.id} variants={fade}><ProductCard p={p} /></motion.div>)}
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <motion.div variants={fade} {...view} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-10 text-center text-white md:p-14">
          <motion.div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 6, repeat: Infinity }} />
          <h2 className="relative text-3xl font-extrabold md:text-4xl">Ready to order?</h2>
          <p className="relative mx-auto mt-2 max-w-md text-emerald-50/90">Create an account in under a minute and check out with M-Pesa.</p>
          <Button asChild size="lg" variant="secondary" className="relative mt-6"><Link to="/shop">Start shopping<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </motion.div>
      </section>
    </>
  );
}