import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2, LocateFixed, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type Pos = [number, number];

export interface DeliveryInfo {
  ok?: boolean;
  distanceKm?: number;
  fee?: number;
  error?: string;
}

interface Props {
  /** The confirmed delivery point, or null while none is confirmed. */
  value: Pos | null;
  /** Called with the point and its street name on confirm, and with null when the map moves off it. */
  onChange: (pos: Pos | null, label?: string) => void;
  /** Quote for the confirmed point, to show distance and fee under the map. */
  delivery?: DeliveryInfo | null;
  formatMoney?: (n: number) => string;
  /** Where the map opens before anything is picked. */
  center?: Pos;
  className?: string;
}

const NAIROBI: Pos = [-1.2921, 36.8219];
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Street-level name for a point, from OpenStreetMap (Nominatim). */
async function reverseGeocode(lat: number, lng: number, signal: AbortSignal) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`;
  const r = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } });
  if (!r.ok) throw new Error('lookup failed');
  const d = await r.json();
  const a = d.address ?? {};
  const place = d.name || a.building || a.amenity || a.shop;
  const road = a.road || a.pedestrian || a.footway;
  const area = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.city || a.town;
  const parts = [place, road, area].filter((p, i, all) => p && all.indexOf(p) === i);
  return parts.length ? parts.slice(0, 2).join(', ') : String(d.display_name ?? '').split(',').slice(0, 2).join(',');
}

/** Bridges Leaflet's events and map instance to the picker. */
function MapBridge({ onMoveStart, onMoveEnd, onReady }: { onMoveStart: () => void; onMoveEnd: (p: Pos) => void; onReady: (m: ReturnType<typeof useMap>) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map]);
  useMapEvents({
    movestart: onMoveStart,
    moveend: () => { const c = map.getCenter(); onMoveEnd([c.lat, c.lng]); },
    // Tapping the map brings that spot under the pin.
    click: e => map.panTo(e.latlng),
  });
  return null;
}

export default function DeliveryLocationPicker({ value, onChange, delivery, formatMoney = n => `KES ${n.toLocaleString()}`, center = NAIROBI, className }: Props) {
  const reduce = useReducedMotion();
  const mapRef = useRef<ReturnType<typeof useMap> | null>(null);
  const [draft, setDraft] = useState<Pos>(value ?? center);
  const [moving, setMoving] = useState(false);
  const [label, setLabel] = useState<string>('');
  const [looking, setLooking] = useState(false);
  const [locating, setLocating] = useState(false);
  const lookup = useRef<{ timer?: number; ctrl?: AbortController }>({});

  const confirmed = !!value && Math.abs(value[0] - draft[0]) < 1e-6 && Math.abs(value[1] - draft[1]) < 1e-6;


  const describe = (p: Pos) => {
    window.clearTimeout(lookup.current.timer);
    lookup.current.ctrl?.abort();
    setLooking(true);
    // Debounced: Nominatim allows about one request per second.
    lookup.current.timer = window.setTimeout(async () => {
      const ctrl = new AbortController();
      lookup.current.ctrl = ctrl;
      try {
        setLabel(await reverseGeocode(p[0], p[1], ctrl.signal) || 'Unnamed road');
      } catch (e: any) {
        if (e.name !== 'AbortError') setLabel(`${p[0].toFixed(5)}, ${p[1].toFixed(5)}`);
      } finally {
        if (!ctrl.signal.aborted) setLooking(false);
      }
    }, 700);
  };

  // Name the starting spot once, and cancel any lookup on unmount.
  useEffect(() => {
    describe(value ?? center);
    return () => { window.clearTimeout(lookup.current.timer); lookup.current.ctrl?.abort(); };
  }, []);

  const onMoveStart = () => {
    setMoving(true);
    // The confirmed spot no longer matches the pin: ask again.
    if (value) onChange(null);
  };
  const onMoveEnd = (p: Pos) => {
    setMoving(false);
    setDraft(p);
    describe(p);
  };

  const locate = () => {
    if (!navigator.geolocation) return toast.error('Location is not available on this device');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      p => { setLocating(false); mapRef.current?.flyTo([p.coords.latitude, p.coords.longitude], 17, { duration: reduce ? 0 : 1 }); },
      () => { setLocating(false); toast.error('Location denied: drag the map to your spot instead'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const confirm = () => onChange(draft, looking || !label ? undefined : label);
  const lifted = moving && !reduce;

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card', className)}>
      <div className="relative">
        <MapContainer
          center={value ?? center}
          zoom={value ? 17 : 13}
          scrollWheelZoom="center"
          touchZoom="center"
          doubleClickZoom="center"
          className="z-0 h-80 w-full"
        >
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          <MapBridge onMoveStart={onMoveStart} onMoveEnd={onMoveEnd} onReady={m => (mapRef.current = m)} />
        </MapContainer>

        {/* Fixed pin: lifts off its shadow while the map moves, drops when it stops. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[450]">
          <motion.span
            className="absolute left-1/2 top-1/2 h-2 w-5 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/30 blur-[1px]"
            animate={{ scale: lifted ? 0.55 : 1, opacity: lifted ? 0.35 : 0.6 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          />
          <motion.svg
            viewBox="0 0 32 42"
            className="absolute left-1/2 top-1/2 h-11 w-8 -translate-x-1/2 -translate-y-full drop-shadow-md"
            animate={{ y: lifted ? -14 : 0 }}
            transition={lifted ? { duration: 0.18, ease: EASE_OUT } : { type: 'spring', stiffness: 600, damping: 18 }}
          >
            <path d="M16 41C16 41 30 25.5 30 15.5C30 7.5 23.7 1 16 1C8.3 1 2 7.5 2 15.5C2 25.5 16 41 16 41Z" fill="var(--brand)" stroke="white" strokeWidth="2" />
            <circle cx="16" cy="15.5" r="5.5" fill="white" />
            {confirmed && <path d="M13.3 15.6l1.9 1.9 3.6-3.8" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          </motion.svg>
        </div>

        <button
          type="button"
          onClick={locate}
          aria-label="Use my location"
          className="absolute right-3 top-3 z-[500] grid size-10 place-items-center rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-black/5 transition hover:bg-zinc-50 active:scale-95"
        >
          {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
        </button>
      </div>

      <div className="flex items-center gap-3 p-4">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-full transition-colors', confirmed ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground')}>
          {confirmed ? <Check className="size-4" /> : <MapPin className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{confirmed ? 'Delivering to' : 'Pin location'}</p>
          {/* The street name rolls in when the lookup lands. */}
          <div className="relative h-5 overflow-hidden" aria-live="polite">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.p
                key={moving || looking ? '…' : label}
                initial={reduce ? { opacity: 0 } : { y: 14, opacity: 0, filter: 'blur(2px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={reduce ? { opacity: 0 } : { y: -14, opacity: 0, filter: 'blur(2px)' }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className={cn('truncate text-sm font-semibold', (moving || looking) && 'text-muted-foreground')}
              >
                {moving ? 'Moving…' : looking ? 'Finding the street…' : label || 'Drag the map to place the pin'}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <button
          type="button"
          onClick={confirm}
          disabled={moving || confirmed}
          className={cn(
            'h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition',
            confirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50',
          )}
        >
          {confirmed ? 'Confirmed' : 'Deliver here'}
        </button>
      </div>

      {/* Quote for the confirmed point. */}
      <AnimatePresence initial={false}>
        {confirmed && delivery && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className={cn('border-t px-4 py-2.5 text-xs font-medium', delivery.ok ? 'text-emerald-700' : 'bg-rose-50 text-rose-700')}>
              {delivery.ok
                ? `${delivery.distanceKm} km from our store · ${delivery.fee ? `${formatMoney(delivery.fee)} delivery` : 'Free delivery'}`
                : delivery.error || 'We do not deliver to this spot yet'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
