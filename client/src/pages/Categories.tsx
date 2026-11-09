import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ShapeHero, { type HeroShape } from '@/components/kokonutui/shape-hero';
import { cn } from '@/lib/utils';
import { api } from '../api';
import CategoryGrid from '../components/CategoryGrid';
import { Page } from '../ui';

const PILL = 'h-11 px-5 text-base font-semibold tracking-tight sm:h-14 sm:px-7 sm:text-lg';
const SOLID = 'bg-primary text-primary-foreground';
const OUTLINE = 'border border-border bg-background text-foreground';
const ACCENT = 'bg-[var(--accent2)] text-white';
const STYLES = [SOLID, OUTLINE, ACCENT, OUTLINE];
const DOTS = ['size-12', 'size-16', 'size-10', 'size-14'];

export default function Categories() {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => { api('/categories').then((cs: any[]) => setNames(cs.map(c => c.name))).catch(() => {}); }, []);

  // Category pills with a few plain dots mixed in.
  const shapes = useMemo<HeroShape[]>(() => names.flatMap((name, i) => {
    const pill: HeroShape = { id: `c-${name}`, content: name, className: cn(PILL, STYLES[i % STYLES.length]) };
    return i % 3 === 2 ? [pill, { id: `dot-${i}`, className: cn(DOTS[i % DOTS.length], i % 2 ? SOLID : ACCENT) }] : [pill];
  }), [names]);

  return (
    <Page>
      {names.length > 0 && (
        <ShapeHero
          as="h1"
          className="mb-8 min-h-[420px] rounded-3xl border bg-card px-4 pt-14 pb-14 text-foreground sm:min-h-[480px] sm:pt-20"
          eyebrow={<span className="rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">{names.length} categories</span>}
          title="Browse by category"
          description="Grab a category and throw it around, or pick one below."
          shapes={shapes}
          fill={0.32}
          actions={
            <>
              <Link to="/shop" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                Shop everything <ArrowRight className="size-4" />
              </Link>
              <Link to="/deals" className="inline-flex h-10 items-center rounded-full border bg-background px-5 text-sm font-semibold transition hover:bg-muted">
                Today's deals
              </Link>
            </>
          }
        />
      )}
      {names.length === 0 && <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Categories</h1>}
      <CategoryGrid />
    </Page>
  );
}
