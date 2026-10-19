import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Popover sin dependencias: se cierra con click fuera, Esc y al perder el foco
 * dentro del panel. Mantiene el foco en un elemento único por teclado.
 */
export function Popover({
  trigger,
  children,
  align = 'start',
  width = 'w-64',
  panelClassName,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  width?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), id })}
      {open && (
        <div
          ref={panelRef}
          id={`${id}-panel`}
          className={cn(
            'anim-scale-in absolute z-40 mt-2 rounded-lg border border-line bg-surface p-1.5 shadow-e3',
            align === 'end' ? 'right-0' : 'left-0',
            width,
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  selected,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[0.85rem]',
        'transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40',
        selected ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-elev hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}