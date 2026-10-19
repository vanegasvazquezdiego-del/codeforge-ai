import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useToasts } from '@/store/toasts';
import { cn } from '@/lib/cn';

const TONE = {
  info: { icon: Info, cls: 'border-info/30', accent: 'text-info' },
  ok: { icon: CheckCircle2, cls: 'border-ok/30', accent: 'text-ok' },
  warn: { icon: AlertTriangle, cls: 'border-warn/30', accent: 'text-warn' },
  err: { icon: XCircle, cls: 'border-err/40', accent: 'text-err' },
} as const;

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  useEffect(() => {
    if (!toasts.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(toasts.at(-1)!.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toasts, dismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="region"
      aria-label="Notificaciones"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
    >
      {toasts.map((item, i) => {
        const tone = TONE[item.tone];
        const Icon = tone.icon;
        return (
          <div
            key={item.id}
            style={{ animationDelay: `${i * 45}ms` }}
            className={cn(
              'anim-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface/95 px-3.5 py-3 shadow-e2 backdrop-blur-md',
              tone.cls,
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.accent)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.85rem] leading-snug font-medium text-ink">{item.title}</p>
              {item.detail && <p className="mt-0.5 text-[0.78rem] leading-snug text-muted">{item.detail}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Descartar notificacion"
              className="-mt-0.5 -mr-1 shrink-0 rounded-sm p-1 text-faint transition-colors hover:text-ink"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}