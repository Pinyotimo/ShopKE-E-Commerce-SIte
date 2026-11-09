import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform, type Variants } from 'framer-motion';
import { ArrowRight, CheckCircle2, MapPin, RotateCcw, ShoppingBag, Smartphone, Truck, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import FlashSale from '../components/FlashSale';
import CategoryGrid from '../components/CategoryGrid';
import Recommended from '../components/Recommended';
import PageCards from '../components/PageCards';
import { useTheme } from '../theme';

// three.js is heavy: load the 3D scene in its own chunk, after first paint.
const HeroScene = lazy(() => import('../components/three/HeroScene'));

const fade: Variants = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } };
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } };
const view = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-100px' } } as const;

const Chip = ({ icon: I, text, className, delay }: { icon: LucideIcon; text: string; className: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay, opacity: { delay: 0.5 } }}
    className={`absolute flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 px-4 py-2.5 text-sm font-bold shadow-2xl backdrop-blur-md ${className}`}>
    <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-700"><I className="h-4 w-4" /></span>
    <span className="text-foreground">{text}</span>
  </motion.div>
);

function Count({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 2, ease: 'easeOut', onUpdate: v => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView]);
  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>;
}

const strip: [LucideIcon, string][] = [[Smartphone, 'Pay with M-Pesa'], [Truck, 'Delivery across Nairobi'], [MapPin, 'Pin your exact location'], [RotateCcw, '7-day refunds'], [Zap, 'Fast checkout']];
const features: [LucideIcon, string, string][] = [
  [Smartphone, 'Seamless M-Pesa', 'Instant STK prompts for a frictionless checkout experience.'],
  [MapPin, 'Precision Delivery', 'Pin your location on the map for pinpoint accuracy.'],
  [Truck, 'Smart Logistics', 'Optimized routing for fairer fees and faster arrival.'],
  [RotateCcw, 'Easy Returns', 'Hassle-free refund requests processed directly to your phone.'],
];

const words: [string, string][] = [['Shop', ''], ['smart.', ''], ['Pay', ''], ['with', ''], ['M-Pesa.', ''], ['Delivered', 'bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent'], ['fast.', 'bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent']];

export default function Landing() {
  const [ps, setPs] = useState<any[] | null>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const reduceMotion = useReducedMotion() ?? false;
  // Current palette colours (dark-mode aware) for the 3D scene.
  const { brand, accent } = useTheme();

  useEffect(() => { api('/products').then(a => setPs(a.slice(0, 4))).catch(() => setPs([])); }, []);

  return (
    <div className="selection:bg-emerald-200 selection:text-emerald-800">
      {/* Scroll progress bar */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600"
      />
      {/* HERO SECTION */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative overflow-hidden bg-background py-16 md:py-24 lg:py-32"
      >
        {/* Animated Background Elements */}
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#064e3b22 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <motion.div
          className="absolute -left-24 -top-24 h-[30rem] w-[30rem] rounded-full bg-emerald-200/30 blur-[100px]"
          animate={{ x: [0, 80, 0], y: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-teal-200/30 blur-[100px]"
          animate={{ x: [0, -80, 0], y: [0, -50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
          <div className="z-10">
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 fill-emerald-700" /> Built for the Kenyan Spirit
            </motion.span>

            <motion.h1
              variants={stagger}
              initial="hidden"
              animate="show"
              className="mt-6 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl lg:text-8xl"
            >
              {words.map(([w, c], i) => (
                <motion.span key={i} variants={fade} className={`mr-3 inline-block ${c}`}>
                  {w}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
            >
              Experience the future of shopping in Nairobi. Pin your location,
              browse curated picks, and pay instantly with M-Pesa. We handle the rest.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button asChild size="lg" className="h-14 px-8 text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-emerald-200 group">
                <Link to="/shop" className="flex items-center gap-2">
                  Explore Shop <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold backdrop-blur-sm hover:bg-card/50">
                <Link to="/orders">Track Delivery</Link>
              </Button>
            </motion.div>
          </div>

          <div className="relative mx-auto h-[22rem] w-full max-w-[35rem] sm:h-[30rem] lg:h-[35rem]">
            {/* Soft glow behind the 3D scene */}
            <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-emerald-300/40 to-teal-300/40 blur-3xl" />
            {/* Ornamental Ring */}
            <motion.div
              className="absolute inset-4 rounded-full border-[1px] border-dashed border-emerald-300/50"
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            />

            {/* 3D scene; the old gradient bag shows while it loads */}
            <Suspense
              fallback={
                <div className="absolute inset-16 grid place-items-center rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 shadow-[0_20px_50px_rgba(6,78,59,0.3)]">
                  <ShoppingBag className="h-32 w-32 text-white" strokeWidth={1.2} />
                </div>
              }
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
              >
                <HeroScene brand={brand} accent={accent} reduceMotion={reduceMotion} />
              </motion.div>
            </Suspense>

            {/* Floating Chips */}
            <Chip icon={Smartphone} text="M-Pesa Verified" className="left-0 top-1/4" delay={0} />
            <Chip icon={Truck} text="Express Nairobi" className="right-0 top-1/3" delay={1} />
            <Chip icon={CheckCircle2} text="Secure Arrival" className="bottom-1/4 left-4" delay={2} />
          </div>
        </div>
      </motion.section>

      {/* Wave divider into the marquee */}
      <div aria-hidden className="relative -mt-px bg-background">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="block h-10 w-full md:h-14">
          <motion.path
            className="fill-emerald-900"
            animate={reduceMotion ? undefined : {
              d: [
                'M0 40 C 240 0, 480 60, 720 30 S 1200 0, 1440 30 L1440 60 L0 60 Z',
                'M0 30 C 240 60, 480 0, 720 35 S 1200 60, 1440 25 L1440 60 L0 60 Z',
                'M0 40 C 240 0, 480 60, 720 30 S 1200 0, 1440 30 L1440 60 L0 60 Z',
              ],
            }}
            d="M0 40 C 240 0, 480 60, 720 30 S 1200 0, 1440 30 L1440 60 L0 60 Z"
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      {/* MODERN MARQUEE */}
      <div className="relative z-20 overflow-hidden bg-emerald-900 py-4 text-white">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap px-4">
          {[...strip, ...strip, ...strip, ...strip].map(([I, t], k) => (
            <span key={k} className="flex items-center gap-3 text-sm font-bold tracking-wide opacity-90">
              <I className="h-4 w-4 text-teal-400" /> {t}
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES GRID */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <motion.div
          variants={stagger}
          {...view}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map(([I, t, d]) => (
            <motion.div key={t} variants={fade}>
              <Card className="group relative h-full overflow-hidden border-none bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-100">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-50 transition-colors group-hover:bg-emerald-100" />
                <div className="relative z-10">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition-transform group-hover:scale-110">
                    <I className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-xl font-bold text-foreground">{t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* EXPLORE THE STORE: page cards */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" style={{ backgroundImage: 'linear-gradient(to right, color-mix(in oklab, var(--brand) 10%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--brand) 10%, transparent) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div variants={fade} {...view} className="mb-12 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Explore the store</span>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-foreground md:text-5xl">Everything, one tap away</h2>
            <p className="mt-3 text-lg text-muted-foreground">Jump straight to what you came for.</p>
          </motion.div>
          <PageCards />
        </div>
      </section>

      {/* TRUST STATS */}
      <section className="border-y border-emerald-100 bg-emerald-50/30 py-20">
        <motion.div
          variants={stagger}
          {...view}
          className="mx-auto grid max-w-5xl gap-12 px-6 text-center sm:grid-cols-3"
        >
          {[[<Count to={7} suffix=" days" />, 'Fast-track refunds'], [<Count to={5000} prefix="KES " />, 'Free delivery over'], [<Count to={25} suffix=" km" />, 'Operational radius']].map(([n, l], i) => (
            <motion.div key={i} variants={fade} className="flex flex-col gap-2">
              <p className="text-5xl font-black tracking-tight text-emerald-800">{n}</p>
              <p className="text-sm font-medium uppercase tracking-widest text-emerald-600/70">{l as string}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <motion.div
          variants={fade}
          {...view}
          className="mb-12 flex items-end justify-between"
        >
          <div>
            <h2 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">Curated Collection</h2>
            <p className="mt-3 text-lg text-muted-foreground">Hand-picked quality, delivered to your doorstep.</p>
          </div>
          <Link to="/shop" className="hidden items-center gap-2 text-sm font-bold text-emerald-700 transition-all hover:gap-3 sm:flex">
            Browse All <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div
          variants={stagger}
          {...view}
          className="grid grid-cols-2 gap-4 md:gap-8 lg:grid-cols-4"
        >
          {ps === null ? (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-80 w-full rounded-3xl" />)
          ) : (
            ps.map(p => (
              <motion.div key={p.id} variants={fade} className="transition-transform hover:scale-[1.02]">
                <ProductCard p={p} />
              </motion.div>
            ))
          )}
        </motion.div>

        <div className="mt-12 flex justify-center">
          <Button asChild variant="ghost" className="text-lg font-semibold text-muted-foreground hover:text-emerald-600">
            <Link to="/shop">See more products</Link>
          </Button>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <motion.div
          variants={fade}
          {...view}
          className="relative overflow-hidden rounded-[3rem] bg-emerald-900 px-8 py-16 text-center text-white md:px-20 md:py-24"
        >
          {/* Background Blobs */}
          <motion.div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          />

          <div className="relative z-10">
            <h2 className="text-4xl font-black tracking-tight md:text-6xl">Ready to elevate your shop?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-emerald-100/80 md:text-xl">
              Join thousands of shoppers in Nairobi experiencing the convenience of precision delivery and M-Pesa payments.
            </p>
            <Button asChild size="lg" variant="secondary" className="relative mt-10 h-16 px-10 text-lg font-bold transition-all hover:scale-110">
              <Link to="/shop" className="flex items-center gap-2">
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
