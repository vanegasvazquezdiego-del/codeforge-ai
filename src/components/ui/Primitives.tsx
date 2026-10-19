import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------- Panel */

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'aside';
}

export function Panel({ as: Tag = 'div', className, ...rest }: PanelProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-line bg-surface shadow-e1 transition-[border-color,box-shadow] duration-200',
        className,
      )}
      {...rest}
    />
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="shrink-0 text-accent">{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate text-[0.95rem] font-semibold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="truncate text-[0.78rem] text-faint">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------- Badge */

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'err' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-elev text-muted',
  accent: 'border-accent-line bg-accent-soft text-accent',
  ok: 'border-ok/30 bg-ok-soft text-ok',
  warn: 'border-warn/30 bg-warn-soft text-warn',
  err: 'border-err/30 bg-err-soft text-err',
  info: 'border-info/30 bg-info-soft text-info',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  mono,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5',
        'text-micro font-medium',
        mono ? 'font-mono normal-case tracking-normal' : 'uppercase tracking-wider',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- Dot status */

export function Dot({ tone = 'neutral', pulse }: { tone?: Tone; pulse?: boolean }) {
  const color = {
    neutral: 'bg-faint',
    accent: 'bg-accent',
    ok: 'bg-ok',
    warn: 'bg-warn',
    err: 'bg-err',
    info: 'bg-info',
  }[tone];
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
      {pulse && <span className={cn('absolute inset-0 rounded-full', color, 'cf-pulse-ring')} />}
      <span className={cn('relative h-2 w-2 rounded-full', color)} />
    </span>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <span className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-elev text-faint">
          {icon}
        </span>
      )}
      <div className="max-w-sm space-y-1.5">
        <p className="text-[0.95rem] font-semibold text-ink">{title}</p>
        {description && <p className="text-[0.85rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------- Stat */

export function Stat({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group flex flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-4',
        'transition-[border-color,transform] duration-200 hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-faint transition-colors group-hover:text-accent">{icon}</span>}
        <p className="text-micro font-medium uppercase tracking-widest text-faint">{label}</p>
      </div>
      <div>
        <p className="font-mono text-[1.9rem] leading-none font-semibold tracking-tight text-ink tabular-nums">
          {value}
        </p>
        {hint && <p className="mt-1.5 text-[0.78rem] leading-snug text-muted">{hint}</p>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Skeleton/Loader */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        'inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent anim-spin',
        className,
      )}
    />
  );
}

export function Bar({ value, max, tone = 'accent' }: { value: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bg = { neutral: 'bg-faint', accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', err: 'bg-err', info: 'bg-info' }[tone];
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-elev"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn('h-full rounded-full transition-transform duration-500 ease-out', bg)} style={{ transform: `scaleX(${pct / 100})`, transformOrigin: 'left' }} />
    </div>
  );
}