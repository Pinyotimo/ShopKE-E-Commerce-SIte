import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export const THEMES = {
  emerald: { label: 'Emerald', brand: '#059669', accent: '#0d9488' },
  ocean: { label: 'Ocean', brand: '#2563eb', accent: '#0891b2' },
  violet: { label: 'Violet', brand: '#7c3aed', accent: '#c026d3' },
  rose: { label: 'Rose', brand: '#e11d48', accent: '#f97316' },
  sunset: { label: 'Sunset', brand: '#ea580c', accent: '#d97706' },
  slate: { label: 'Slate', brand: '#334155', accent: '#64748b' },
} as const;
type Color = keyof typeof THEMES;
type Mode = 'light' | 'dark' | 'system';
const Ctx = createContext<any>(null);
const read = () => { try { return JSON.parse(localStorage.getItem('theme') || '{}'); } catch { return {}; } };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const init = read();
  const [color, setColor] = useState<Color>(init.color in THEMES ? init.color : 'emerald');
  const [mode, setMode] = useState<Mode>(init.mode || 'system');
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mq.matches);
      const el = document.documentElement;
      el.classList.toggle('dark', dark);
      el.style.colorScheme = dark ? 'dark' : 'light';
      el.style.setProperty('--brand', THEMES[color].brand);
      el.style.setProperty('--accent2', THEMES[color].accent);
    };
    apply();
    mq.addEventListener('change', apply);
    localStorage.setItem('theme', JSON.stringify({ color, mode }));
    return () => mq.removeEventListener('change', apply);
  }, [color, mode]);
  return <Ctx.Provider value={{ color, setColor, mode, theme: mode, setMode, brand: THEMES[color].brand }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx) as {
  color: Color; setColor: (c: Color) => void; mode: Mode; theme: Mode; setMode: (m: Mode) => void; brand: string;
};

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

  const modes: [Mode, any, string][] = [['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'Auto']];
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label="Theme" aria-expanded={open} onClick={() => setOpen(o => !o)}
        className="grid h-9 w-9 place-items-center rounded-lg text-foreground transition hover:bg-muted">
        <Palette className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-64 space-y-4 rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Color</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(THEMES) as Color[]).map(k => (
                <button key={k} type="button" onClick={() => setColor(k)}
                  className={cn('flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition hover:bg-muted', color === k && 'border-foreground')}>
                  <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: `linear-gradient(135deg, ${THEMES[k].brand}, ${THEMES[k].accent})` }}>
                    {color === k && <Check className="h-4 w-4" />}
                  </span>{THEMES[k].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mode</p>
            <div className="grid grid-cols-3 gap-2">
              {modes.map(([m, I, l]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={cn('flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition',
                    mode === m ? 'border-transparent bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                  <I className="h-3.5 w-3.5" />{l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}