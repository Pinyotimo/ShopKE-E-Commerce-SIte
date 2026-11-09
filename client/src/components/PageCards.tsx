import { type ReactNode, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight, LayoutGrid, MapPin, Package, ShoppingBag, ShoppingCart, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Card that tilts towards the cursor and lights up under it. */
function TiltCard({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-7, 7]), { stiffness: 200, damping: 20 });
  const px = useTransform(mx, v => `${v * 100}%`);
  const py = useTransform(my, v => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${px} ${py}, color-mix(in oklab, var(--accent2) 22%, transparent), transparent 60%)`;

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { mx.set(0.5); my.set(0.5); };

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }}
      className={cn('[perspective:1200px]', className)}
    >
      <motion.div style={reduce ? undefined : { rotateX: rx, rotateY: ry }} className="h-full [transform-style:preserve-3d]">
        <Link
          ref={ref}
          to={to}
          onPointerMove={onMove}
          onPointerLeave={reset}
          className="group relative flex h-full min-h-56 flex-col overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-sm transition-shadow duration-300 hover:shadow-2xl hover:shadow-emerald-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:shadow-black/40"
        >
          <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: spotlight }} />
          {children}
        </Link>
      </motion.div>
    </motion.div>
  );
}

function Head({ icon: I, title, text, big }: { icon: LucideIcon; title: string; text: string; big?: boolean }) {
  return (
    <div className="relative z-10 [transform:translateZ(40px)]">
      <div className="flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 dark:shadow-none">
          <I className="h-5 w-5" />
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-300 group-hover:rotate-45 group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <h3 className={cn('mt-5 font-black tracking-tight text-foreground', big ? 'text-3xl md:text-4xl' : 'text-xl')}>{title}</h3>
      <p className={cn('mt-2 leading-relaxed text-muted-foreground', big ? 'max-w-sm text-base' : 'text-sm')}>{text}</p>
    </div>
  );
}

/* ---- Small animated graphics, one per card ---- */

const ShopGraphic = () => (
  <div aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 h-64 w-64 md:h-80 md:w-80">
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="absolute rounded-3xl border border-white/40 shadow-xl"
        style={{
          inset: `${18 + i * 14}%`,
          background: `linear-gradient(135deg, color-mix(in oklab, var(--brand) ${85 - i * 25}%, white), color-mix(in oklab, var(--accent2) ${70 - i * 15}%, white))`,
        }}
        animate={{ rotate: [i * 8 - 8, i * 8 + 4, i * 8 - 8], y: [0, -8, 0] }}
        transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
    <ShoppingBag className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-lg transition-transform duration-500 group-hover:scale-125" strokeWidth={1.4} />
  </div>
);

const DealsGraphic = () => (
  <div aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-36 w-36">
    <motion.svg viewBox="0 0 100 100" className="h-full w-full" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}>
      <path
        d="M50 2 61 14 77 9 80 25 96 31 89 46 97 61 82 69 80 86 63 84 50 97 37 84 20 86 18 69 3 61 11 46 4 31 20 25 23 9 39 14Z"
        className="fill-orange-500/90"
      />
    </motion.svg>
    <span className="absolute inset-0 grid place-items-center text-center text-sm font-black leading-tight text-white">UP TO<br />50%</span>
  </div>
);

const GridGraphic = () => (
  <div aria-hidden className="pointer-events-none absolute bottom-5 right-5 grid grid-cols-3 gap-1.5 opacity-70">
    {Array.from({ length: 9 }, (_, i) => (
      <motion.span
        key={i}
        className="h-4 w-4 rounded-md bg-emerald-200"
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1, 0.9] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: ((i % 3) + Math.floor(i / 3)) * 0.18 }}
      />
    ))}
  </div>
);

const RouteGraphic = () => (
  <svg aria-hidden viewBox="0 0 300 120" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full">
    <motion.path
      d="M10 100 C 70 100, 70 30, 140 40 S 220 100, 290 20"
      fill="none"
      stroke="var(--accent2)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="1 10"
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 2, ease: 'easeInOut' }}
    />
    <circle cx="10" cy="100" r="6" fill="var(--brand)" />
    <motion.circle cx="290" cy="20" r="8" fill="var(--accent2)" animate={{ r: [6, 10, 6], opacity: [1, 0.6, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
  </svg>
);

const Orbit = ({ icon: I }: { icon: LucideIcon }) => (
  <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40">
    <div className="absolute inset-0 rounded-full border border-dashed border-emerald-300/60" />
    <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}>
      <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400" />
    </motion.div>
    <I className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-emerald-300" strokeWidth={1.4} />
  </div>
);

export default function PageCards() {
  return (
    <motion.div
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className="grid auto-rows-[minmax(14rem,auto)] gap-5 md:grid-cols-4"
    >
      <TiltCard to="/shop" className="md:col-span-2 md:row-span-2">
        <Head big icon={ShoppingBag} title="Shop everything" text="Browse the full catalogue: fresh picks, best sellers and new arrivals every week." />
        <ShopGraphic />
      </TiltCard>
      <TiltCard to="/deals" className="md:col-span-2">
        <Head icon={Zap} title="Flash deals" text="Limited-time prices that disappear when the timer hits zero." />
        <DealsGraphic />
      </TiltCard>
      <TiltCard to="/categories">
        <Head icon={LayoutGrid} title="Categories" text="Find exactly what you need, fast." />
        <GridGraphic />
      </TiltCard>
      <TiltCard to="/track">
        <Head icon={MapPin} title="Track order" text="Follow your parcel live to your door." />
        <RouteGraphic />
      </TiltCard>
      <TiltCard to="/orders" className="md:col-span-2">
        <Head icon={Package} title="My orders" text="Receipts, delivery status and refunds, all in one place." />
        <Orbit icon={Package} />
      </TiltCard>
      <TiltCard to="/cart" className="md:col-span-2">
        <Head icon={ShoppingCart} title="Your cart" text="Pick up where you left off and check out with M-Pesa in seconds." />
        <Orbit icon={ShoppingCart} />
      </TiltCard>
    </motion.div>
  );
}
