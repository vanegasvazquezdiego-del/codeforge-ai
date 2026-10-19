import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import type { LanguageId, ThemeId, ViewId } from '@/lib/types';
import { LANGUAGES } from '@/lib/languages';
import { useWorkspace } from '@/store/workspace';
import { useSettings } from '@/store/settings';
import { useAssistant } from '@/store/assistant';
import { THEME_META } from '@/store/settings';
import { cn } from '@/lib/cn';

export interface Command {
  id: string;
  label: string;
  hint: string;
  group: string;
  keywords: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  navigate,
  onGenerateExercise,
}: {
  open: boolean;
  onClose: () => void;
  navigate: (view: ViewId) => void;
  onGenerateExercise: () => void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setLanguage = useWorkspace((s) => s.setLanguage);
  const run = useWorkspace((s) => s.run);
  const toggleAssistant = useAssistant((s) => s.toggle);
  const setTheme = useSettings((s) => s.setTheme);

  const commands = useMemo<Command[]>(() => {
    const views: { id: ViewId; label: string; hint: string }[] = [
      { id: 'editor', label: 'Ir al editor', hint: 'Practica libre con consola' },
      { id: 'exercises', label: 'Ir a ejercicios', hint: 'Catalogo con casos de prueba' },
      { id: 'profile', label: 'Ir al perfil', hint: 'Estadisticas y progreso' },
      { id: 'settings', label: 'Ir a ajustes', hint: 'Tema, editor, IA y motor' },
    ];

    const list: Command[] = [
      ...views.map((v) => ({
        id: `view-${v.id}`,
        label: v.label,
        hint: v.hint,
        group: 'Navegacion',
        keywords: `${v.id} vista ${v.hint}`,
        run: () => navigate(v.id),
      })),
      {
        id: 'run',
        label: 'Ejecutar el codigo',
        hint: 'Compila y ejecuta en Piston',
        group: 'Acciones',
        keywords: 'run ejecutar play compilar',
        run: () => void run(),
      },
      {
        id: 'assistant',
        label: 'Mostrar u ocultar el copiloto',
        hint: 'Panel lateral de IA',
        group: 'Acciones',
        keywords: 'ia asistente copiloto chat panel',
        run: () => toggleAssistant(),
      },
      {
        id: 'exercise-new',
        label: 'Generar un ejercicio con IA',
        hint: 'Enunciado + arranque + tests',
        group: 'Acciones',
        keywords: 'ia generar reto ejercicio crear',
        run: () => onGenerateExercise(),
      },
      ...LANGUAGES.map((lang) => ({
        id: `lang-${lang.id}`,
        label: `Cambiar a ${lang.label}`,
        hint: lang.blurb,
        group: 'Lenguajes',
        keywords: `lenguaje ${lang.id} ${lang.label}`,
        run: () => setLanguage(lang.id as LanguageId),
      })),
      ...(['void', 'slate', 'cyber', 'paper'] as ThemeId[]).map((theme) => ({
        id: `theme-${theme}`,
        label: `Tema ${THEME_META[theme].label}`,
        hint: THEME_META[theme].hint,
        group: 'Apariencia',
        keywords: `tema theme ${theme} ${THEME_META[theme].label}`,
        run: () => setTheme(theme),
      })),
    ];
    return list;
  }, [navigate, onGenerateExercise, run, setLanguage, setTheme, toggleAssistant]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands.slice(0, 12);
    return commands
      .filter((c) => `${c.label} ${c.hint} ${c.group} ${c.keywords}`.toLowerCase().includes(needle))
      .slice(0, 14);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  const commit = (command: Command | undefined) => {
    if (!command) return;
    command.run();
    onClose();
  };

  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Cerrar paleta de comandos"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-bg-deep/70 backdrop-blur-sm anim-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="anim-scale-in relative flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-e3"
      >
        <div className="flex items-center gap-2.5 border-b border-line-soft px-3.5 py-3">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                commit(results[cursor]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Busca una accion, un lenguaje, un tema…"
            aria-label="Buscar comandos"
            aria-controls="command-results"
            className="flex-1 bg-transparent text-[0.92rem] text-ink placeholder:text-faint focus:outline-none"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[0.65rem] text-faint sm:inline">
            Esc
          </kbd>
        </div>

        <ul id="command-results" ref={listRef} role="listbox" className="scroll-thin max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[0.85rem] text-faint">
              Nada coincide con “{query}”. Prueba con un lenguaje, un tema o una vista.
            </li>
          ) : (
            results.map((command, index) => {
              const showGroup = command.group !== lastGroup;
              lastGroup = command.group;
              return (
                <li key={command.id}>
                  {showGroup && (
                    <p className="px-2.5 pt-2.5 pb-1 text-micro font-medium uppercase tracking-widest text-faint">
                      {command.group}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === cursor}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => commit(command)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left',
                      'transition-colors duration-100',
                      index === cursor ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-elev',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.88rem]">{command.label}</span>
                      <span className="block truncate text-[0.74rem] text-faint">{command.hint}</span>
                    </span>
                    {index === cursor && (
                      <CornerDownLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}