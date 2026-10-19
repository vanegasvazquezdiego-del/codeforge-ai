import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'subtle' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink font-semibold hover:brightness-110 active:brightness-95 shadow-e1 disabled:hover:brightness-100',
  outline:
    'border border-line-strong bg-transparent text-ink hover:bg-elev hover:border-accent-line disabled:hover:bg-transparent',
  ghost: 'bg-transparent text-muted hover:bg-elev hover:text-ink disabled:hover:bg-transparent',
  subtle: 'bg-elev text-ink border border-line-soft hover:border-line-strong hover:bg-surface',
  danger: 'bg-err-soft text-err border border-err/30 hover:brightness-110',
};

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-micro gap-1.5 rounded-sm',
  sm: 'h-8 px-3 text-[0.8rem] gap-1.5 rounded-sm',
  md: 'h-10 px-4 text-[0.875rem] gap-2 rounded-md',
  lg: 'h-11 px-5 text-[0.95rem] gap-2 rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'subtle', size = 'md', loading, icon, iconRight, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap',
        'transition-[transform,background-color,border-color,color,filter,opacity] duration-150 ease-out',
        'active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent anim-spin"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: los botones sin texto necesitan nombre accesible. */
  label: string;
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

const ICON_SIZES: Record<Size, string> = {
  xs: 'h-7 w-7 rounded-sm',
  sm: 'h-8 w-8 rounded-sm',
  md: 'h-10 w-10 rounded-md',
  lg: 'h-11 w-11 rounded-md',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'sm', active, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        'transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out',
        'active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        ICON_SIZES[size],
        active && 'bg-accent-soft text-accent border-accent-line',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});