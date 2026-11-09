import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Monitor, Moon, Palette, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import SwitchButton from '@/components/kokonutui/switch-button';

/* ---------------------------------------------------------------------------
 * Palettes. The real colours live in index.css ([data-theme="…"] blocks, with
 * light and dark pairs); these hex values are the light pair, used for the
 * picker swatches. Keep the two in sync when adding a palette.
 * ------------------------------------------------------------------------ */
export const THEMES = {
  emerald: { label: 'Emerald', brand: '#064e3b', accent: '#14b8a6' },
  ocean: { label: 'Ocean', brand: '#2563eb', accent: '#0891b2' },
  violet: { label: 'Violet', brand: '#7c3aed', accent: '#c026d3' },
  rose: { label: 'Rose', brand: '#e11d48', accent: '#f97316' },
  sunset: { label: 'Sunset', brand: '#ea580c', accent: '#d97706' },
  slate: { label: 'Slate', brand: '#334155', accent: '#64748b' },
} as const;

export type Color = keyof typeof THEMES;
export type Mode = 'light' | 'dark' | 'system';
export type Resolved = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DEFAULT_COLOR: Color = 'emerald';
const isColor = (c: unknown): c is Color => typeof c === 'string' && c in THEMES;
const isMode = (m: unknown): m is Mode => m === 'light' || m === 'dark' || m === 'system';

function readStored(): { color: Color; mode: Mode } {
  try {
    const t = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { color: isColor(t.color) ? t.color : DEFAULT_COLOR, mode: isMode(t.mode) ? t.mode : 'system' };
  } catch {
    return { color: DEFAULT_COLOR, mode: 'system' };
  }
}

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');
const resolve = (mode: Mode): Resolved => (mode === 'system' ? (darkQuery().matches ? 'dark' : 'light') : mode);

/** Briefly animates colours so a palette change fades instead of snapping. */
function animateNextChange() {
  const root = document.documentElement;
  // The dark-mode switch runs its own circular reveal; don't stack on it.
  if (root.hasAttribute('data-theme-reveal')) return;
  root.classList.add('theme-animating');
  window.setTimeout(() => root.classList.remove('theme-animating'), 350);
}

/** Puts a palette and mode on <html>. Mirrors the inline script in index.html. */
function applyToDocument(color: Color, resolved: Resolved) {
  const root = document.documentElement;
  root.dataset.theme = color;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  // Older code set these inline; the CSS palettes own them now.
  root.style.removeProperty('--brand');
  root.style.removeProperty('--accent2');

  const css = getComputedStyle(root);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', css.getPropertyValue('--background').trim() || (resolved === 'dark' ? '#111' : '#fff'));
  return { brand: css.getPropertyValue('--brand').trim(), accent: css.getPropertyValue('--accent2').trim() };
}

interface ThemeContext {
  /** Selected palette. */
  color: Color;
  setColor: (c: Color) => void;
  /** Selected mode, including 'system'. */
  mode: Mode;
  /** Alias of `mode`, kept for older callers. */
  theme: Mode;
  setMode: (m: Mode) => void;
  /** The mode actually on screen. */
  resolved: Resolved;
  /** The palette's colours as currently applied (dark-mode aware), e.g. for three.js. */
  brand: string;
  accent: string;
}

const Ctx = createContext<ThemeContext | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [{ color, mode }, setState] = useState(readStored);
  const [resolved, setResolved] = useState<Resolved>(() => resolve(mode));
  const [colors, setColors] = useState(() => ({ brand: THEMES[color].brand as string, accent: THEMES[color].accent as string }));
  const first = useRef(true);

  // Follow the OS while in 'system' mode.
  useEffect(() => {
    setResolved(resolve(mode));
    if (mode !== 'system') return;
    const mq = darkQuery();
    const onChange = () => { animateNextChange(); setResolved(mq.matches ? 'dark' : 'light'); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  // Apply before paint, so there's no flash of the old palette.
  useLayoutEffect(() => {
    setColors(applyToDocument(color, resolved));
  }, [color, resolved]);

  // Persist, and pick up changes made in other tabs.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ color, mode }));
  }, [color, mode]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) { animateNextChange(); setState(readStored()); } };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setColor = useCallback((c: Color) => { animateNextChange(); setState(s => ({ ...s, color: c })); }, []);
  const setMode = useCallback((m: Mode) => {
    animateNextChange();
    // Resolve right away so the class flips in the same frame (the switch's reveal snapshots it).
    setResolved(resolve(m));
    setState(s => ({ ...s, mode: m }));
  }, []);

  return (
    <Ctx.Provider value={{ color, setColor, mode, theme: mode, setMode, resolved, brand: colors.brand, accent: colors.accent }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/* ---------------------------------------------------------------------------
 * Header control: quick light/dark switch + palette and mode menu.
 * ------------------------------------------------------------------------ */
const MODES: [Mode, LucideIcon, string][] = [['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'Auto']];

export function ThemeSwitcher() {
  const { color, setColor, mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  return (
    <div ref={box} className="relative flex items-center gap-2">
      {/* Sun/moon morph; the new theme spreads from the button as a circle.
          It reads the applied theme from <html>, so it also flips correctly from "Auto". */}
      <SwitchButton
        size="lg"
        showLabel={false}
        onThemeChange={setMode}
        title="Toggle light / dark"
        className="rounded-xl border-0 bg-muted text-foreground shadow-none hover:bg-emerald-100 hover:text-emerald-700 dark:border-0 dark:bg-muted dark:text-foreground dark:hover:bg-emerald-100 dark:hover:text-emerald-700"
      />

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Colours and mode"
        className={cn(
          'grid h-10 w-10 place-items-center rounded-xl transition-all duration-300',
          open ? 'bg-primary text-primary-foreground shadow-lg shadow-emerald-200 dark:shadow-none' : 'bg-muted text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700 active:scale-90',
        )}
      >
        <Palette className="h-5 w-5" />
      </button>

      {open && (
        <div role="dialog" aria-label="Theme" className="absolute right-0 top-full z-[100] mt-3 w-72 space-y-5 rounded-2xl border bg-popover/95 p-5 text-popover-foreground shadow-2xl backdrop-blur-xl">
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Colour</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(THEMES) as Color[]).map(k => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={color === k}
                  onClick={() => setColor(k)}
                  className={cn(
                    'group flex flex-col items-center gap-2 rounded-xl border p-2 text-[11px] font-medium transition-all duration-200 hover:bg-muted',
                    color === k ? 'border-primary bg-accent ring-1 ring-primary' : 'border-transparent',
                  )}
                >
                  <span
                    className="relative grid h-8 w-8 place-items-center rounded-full text-white shadow-md transition-transform group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${THEMES[k].brand}, ${THEMES[k].accent})` }}
                  >
                    {color === k && <Check className="h-4 w-4" />}
                  </span>
                  <span className={color === k ? 'font-bold text-foreground' : 'text-muted-foreground'}>{THEMES[k].label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="border-t pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Mode</p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(([m, I, label]) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-bold transition-all duration-200',
                    mode === m
                      ? 'border-transparent bg-primary text-primary-foreground shadow-md shadow-emerald-200 dark:shadow-none'
                      : 'bg-card text-muted-foreground hover:border-emerald-200 hover:bg-accent hover:text-foreground',
                  )}
                >
                  <I className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
