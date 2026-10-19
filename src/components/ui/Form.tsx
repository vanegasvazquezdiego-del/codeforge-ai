import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const FIELD_BASE =
  'w-full rounded-md border border-line bg-bg-deep px-3 text-ink placeholder:text-faint ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ' +
  'hover:border-line-strong focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-accent/25 ' +
  'disabled:opacity-50';

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
  actions,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.8rem] font-medium text-muted">
          {label}
        </label>
        {actions}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[0.78rem] text-err">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-[0.78rem] leading-snug text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  mono?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, invalid, mono, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        'h-10 text-[0.875rem]',
        mono && 'font-mono text-[0.82rem]',
        invalid && 'border-err focus:border-err focus:ring-err/25',
        className,
      )}
      {...rest}
    />
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(FIELD_BASE, 'min-h-20 py-2.5 font-mono text-[0.82rem] leading-relaxed resize-y', className)}
        {...rest}
      />
    );
  },
);

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string; disabled?: boolean }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          FIELD_BASE,
          "h-10 cursor-pointer appearance-none pr-9 text-[0.85rem]",
          className,
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-surface text-ink">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-faint"
      />
    </div>
  );
});

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <label htmlFor={id} className={cn('block text-[0.875rem] font-medium text-ink', disabled && 'opacity-60')}>
          {label}
        </label>
        {description && <p className="mt-0.5 text-[0.78rem] leading-snug text-faint">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200',
          'disabled:opacity-45',
          checked ? 'border-accent-line bg-accent-soft' : 'border-line bg-elev',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full transition-transform duration-200 ease-out',
            'shadow-e1',
            checked ? 'translate-x-[1.45rem] bg-accent' : 'translate-x-[0.15rem] bg-faint',
          )}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex w-full gap-1 rounded-md border border-line bg-bg-deep p-1',
        size === 'sm' ? 'text-[0.78rem]' : 'text-[0.82rem]',
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2.5 transition-all duration-150',
              'font-medium whitespace-nowrap',
              size === 'sm' ? 'h-7' : 'h-8',
              active
                ? 'bg-accent text-accent-ink shadow-e1'
                : 'text-muted hover:bg-elev hover:text-ink',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  format?: (value: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[0.8rem] font-medium text-muted">
          {label}
        </label>
        <span className="font-mono text-[0.8rem] text-ink tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className={cn(
          'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-elev',
            '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent',
            '[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:transition-transform',
            'hover:[&::-webkit-slider-thumb]:scale-110',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-accent',
        )}
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--elev) ${pct}%)`,
        }}
      />
    </div>
  );
}

export function CheckCard({
  checked,
  onChange,
  title,
  description,
  swatch,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description?: string;
  swatch?: string[];
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-start gap-3 rounded-md border p-3 text-left',
        'transition-[border-color,background-color,transform] duration-150',
        checked ? 'border-accent-line bg-accent-soft/40' : 'border-line bg-bg-deep hover:border-line-strong',
      )}
    >
      {swatch && (
        <span aria-hidden="true" className="flex shrink-0 gap-1 pt-0.5">
          {swatch.map((color) => (
            <span key={color} className="h-5 w-2 rounded-[3px] border border-black/20" style={{ background: color }} />
          ))}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[0.85rem] font-medium text-ink">
          {title}
          {checked && <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent" />}
        </span>
        {description && <span className="mt-0.5 block text-[0.76rem] leading-snug text-faint">{description}</span>}
      </span>
    </button>
  );
}