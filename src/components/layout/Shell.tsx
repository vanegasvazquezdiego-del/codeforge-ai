import { useEffect, useState } from 'react';
import { Command, Flame, Menu, Sparkles, UserRound, X } from 'lucide-react';
import type { ViewId } from '@/lib/types';
import { LANGUAGES, getLanguage } from '@/lib/languages';
import { useWorkspace } from '@/store/workspace';
import { useProfile } from '@/store/profile';
import { useActivity } from '@/store/activity';
import { computeStats } from '@/lib/stats';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Primitives';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const NAV: { id: ViewId; label: string; hint: string; shortcut: string }[] = [
  { id: 'editor', label: 'Editor', hint: 'Practica libre', shortcut: '1' },
  { id: 'exercises', label: 'Ejercicios', hint: 'Retos con tests', shortcut: '2' },
  { id: 'profile', label: 'Perfil', hint: 'Progreso', shortcut: '3' },
  { id: 'settings', label: 'Ajustes', hint: 'Tema, editor, IA', shortcut: '4' },
];

export function SideNav({
  view,
  navigate,
  open,
  onClose,
}: {
  view: ViewId;
  navigate: (view: ViewId) => void;
  open: boolean;
  onClose: () => void;
}) {
  const languageId = useWorkspace((s) => s.languageId);
  const lang = getLanguage(languageId);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menu"
          tabIndex={-1}
          onClick={onClose}
          className="fixed inset-0 z-30 cursor-default bg-bg-deep/60 backdrop-blur-sm anim-fade-in lg:hidden"
        />
      )}

      <nav
        aria-label="Navegacion principal"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface',
          'transition-transform duration-300 ease-out lg:static lg:translate-x-0',
          open ? 'translate-x-0 shadow-e3' : '-translate-x-full lg:shadow-none',
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <IconButton label="Cerrar menu" onClick={onClose} className="lg:hidden">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <ul className="flex flex-1 flex-col gap-1 px-2.5 py-2">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    navigate(item.id);
                    onClose();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left',
                    'transition-[background-color,color,transform] duration-150 active:translate-y-px',
                    active ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-elev hover:text-ink',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-transform duration-200',
                      active ? 'scale-y-100' : 'scale-y-0',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.88rem] font-medium">{item.label}</span>
                    <span className="block truncate text-[0.72rem] text-faint">{item.hint}</span>
                  </span>
                  <kbd
                    className={cn(
                      'rounded border border-line px-1 font-mono text-[0.62rem] transition-opacity duration-150',
                      active ? 'text-accent' : 'text-faint opacity-60 group-hover:opacity-100',
                    )}
                  >
                    {item.shortcut}
                  </kbd>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line-soft p-3">
          <p className="text-micro font-medium uppercase tracking-widest text-faint">Sesion actual</p>
          <p className="mt-2 flex items-center gap-2 text-[0.82rem] text-muted">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: lang.tint }}
            />
            {lang.label}
            <span className="ml-auto font-mono text-[0.7rem] text-faint">
              {lang.kind === 'preview' ? 'preview' : lang.kind === 'sql' ? 'sqlite' : 'remoto'}
            </span>
          </p>
          <p className="mt-1.5 text-[0.74rem] leading-snug text-faint">{lang.blurb}</p>
          <p className="mt-3 flex items-center gap-1.5 text-[0.72rem] text-faint">
            <Sparkles className="h-3 w-3" />
            {LANGUAGES.length} lenguajes · ejecucion real
          </p>
        </div>
      </nav>
    </>
  );
}

export function TopBar({
  view,
  onOpenNav,
  onOpenPalette,
  onToggleAssistant,
  assistantOpen,
  navigate,
}: {
  view: ViewId;
  onOpenNav: () => void;
  onOpenPalette: () => void;
  onToggleAssistant: () => void;
  assistantOpen: boolean;
  navigate: (view: ViewId) => void;
}) {
  const profile = useProfile();
  const logs = useActivity((s) => s.logs);
  const [scrolled, setScrolled] = useState(false);

  const streak = computeStats(logs, []).streak;
  const current = NAV.find((n) => n.id === view) ?? NAV[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'glass sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 transition-[border-color,box-shadow] duration-300 sm:px-4',
        scrolled ? 'border-line-strong shadow-e2' : 'border-line-soft',
      )}
    >
      <IconButton label="Abrir menu" onClick={onOpenNav} className="lg:hidden">
        <Menu className="h-4.5 w-4.5" />
      </IconButton>

      <div className="lg:hidden">
        <Logo size="sm" />
      </div>

      <nav aria-label="Migas de pan" className="hidden min-w-0 lg:block">
        <ol className="flex items-center gap-1.5 text-[0.82rem]">
          <li className="text-faint">CodeForge</li>
          <li aria-hidden="true" className="text-faint">
            /
          </li>
          <li className="font-medium text-ink">{current.label}</li>
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(
            'hidden h-9 items-center gap-2 rounded-md border border-line bg-bg-deep pl-3 pr-2 sm:flex',
            'text-[0.82rem] text-faint transition-[border-color,background-color,color] duration-150',
            'hover:border-line-strong hover:bg-elev hover:text-muted',
          )}
        >
          <Command className="h-3.5 w-3.5" />
          Buscar accion
          <kbd className="rounded border border-line px-1 font-mono text-[0.62rem]">⌘K</kbd>
        </button>

        <IconButton label="Abrir paleta de comandos (⌘K)" onClick={onOpenPalette} className="sm:hidden">
          <Command className="h-4 w-4" />
        </IconButton>

        {streak > 0 && (
          <Badge tone="warn" mono className="max-sm:hidden">
            <Flame className="h-3 w-3" />
            {streak}d
          </Badge>
        )}

        <IconButton
          label={assistantOpen ? 'Ocultar el copiloto' : 'Mostrar el copiloto'}
          onClick={onToggleAssistant}
          active={assistantOpen}
        >
          <Sparkles className="h-4 w-4" />
        </IconButton>

        <button
          type="button"
          onClick={() => navigate('profile')}
          className="flex h-9 items-center gap-2 rounded-md border border-line bg-bg-deep pl-1 pr-2.5 transition-[border-color,background-color] duration-150 hover:border-line-strong hover:bg-elev"
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="h-7 w-7 rounded-[5px] object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-[5px] border border-accent-line bg-accent-soft text-[0.7rem] font-semibold text-accent"
            >
              <UserRound className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="hidden max-w-24 truncate text-[0.82rem] text-muted md:block">
            {profile.name || 'Tu perfil'}
          </span>
        </button>
      </div>
    </header>
  );
}