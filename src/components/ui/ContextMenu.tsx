import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export interface ContextState {
  x: number;
  y: number;
  payload: unknown;
}

/**
 * Menu contextual tipo explorador: se abre con clic derecho, se cierra con
 * click fuera, Esc o al redimensionar, y se mantiene dentro del viewport.
 */
export function ContextMenu({
  state,
  onClose,
  children,
}: {
  state: ContextState | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: state?.x ?? 0, top: state?.y ?? 0 });

  useLayoutEffect(() => {
    if (!state || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const margin = 8;
    setPos({
      left: Math.min(state.x, window.innerWidth - rect.width - margin),
      top: Math.min(state.y, window.innerHeight - rect.height - margin),
    });
    // Las siguientes lineas hacen que el menu tome el foco al abrirse.
    ref.current.querySelector<HTMLElement>('button:not([disabled])')?.focus();
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onScroll);
    window.addEventListener('blur', onScroll);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('blur', onScroll);
    };
  }, [state, onClose]);

  if (!state) return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Acciones del archivo"
      style={{ left: pos.left, top: pos.top }}
      className="anim-scale-in fixed z-[80] min-w-52 rounded-lg border border-line bg-surface p-1 shadow-e3"
    >
      {children}
    </div>,
    document.body,
  );
}

export function ContextItem({
  children,
  onClick,
  icon,
  danger,
  shortcut,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
  shortcut?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-[0.83rem]',
        'transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40',
        danger ? 'text-err hover:bg-err-soft' : 'text-muted hover:bg-elev hover:text-ink',
      )}
    >
      {icon && <span className={cn('shrink-0', danger ? 'text-err' : 'text-faint')}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut && <span className="shrink-0 font-mono text-[0.68rem] text-faint">{shortcut}</span>}
    </button>
  );
}

export function ContextSeparator() {
  return <div role="separator" className="my-1 h-px bg-line-soft" />;
}