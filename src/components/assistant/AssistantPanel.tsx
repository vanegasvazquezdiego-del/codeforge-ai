import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bug,
  Eraser,
  Gauge,
  MessageSquarePlus,
  Send,
  Sparkles,
  Square,
  TextCursorInput,
  Wand2,
  X,
} from 'lucide-react';
import type { AiActionId } from '@/lib/types';
import { useAssistant } from '@/store/assistant';
import { useWorkspace } from '@/store/workspace';
import { useSettings } from '@/store/settings';
import { useProfile } from '@/store/profile';
import { PROVIDER_NEEDS_KEY } from '@/lib/ai';
import { getLanguage } from '@/lib/languages';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui/Button';
import { Badge, Dot } from '@/components/ui/Primitives';
import { MessageItem, WelcomeCard } from './MessageItem';
import { toast } from '@/store/toasts';

const QUICK: { id: AiActionId | 'exercise'; label: string; hint: string; icon: typeof Sparkles }[] = [
  { id: 'explain', label: 'Explicar', hint: 'Selecciona codigo y desglosalo', icon: TextCursorInput },
  { id: 'debug', label: 'Depurar', hint: 'Diagnostica la salida con errores', icon: Bug },
  { id: 'optimize', label: 'Optimizar', hint: 'Coste, velocidad y legibilidad', icon: Gauge },
  { id: 'teach', label: 'Concepto', hint: 'Pregunta por cualquier tema', icon: Wand2 },
  { id: 'exercise', label: 'Ejercicio', hint: 'Genera un reto con tests', icon: Sparkles },
];

export function AssistantPanel({
  onClose,
  onGenerateExercise,
  onOpenSettings,
}: {
  onClose: () => void;
  onGenerateExercise: () => void;
  onOpenSettings: () => void;
}) {
  const messages = useAssistant((s) => s.messages);
  const busy = useAssistant((s) => s.busy);
  const send = useAssistant((s) => s.send);
  const clear = useAssistant((s) => s.clear);
  const stop = useAssistant((s) => s.stop);

  const languageId = useWorkspace((s) => s.languageId);
  const selection = useWorkspace((s) => s.selection);
  const runs = useWorkspace((s) => s.runs);
  const updateContent = useWorkspace((s) => s.updateContent);
  const activeId = useWorkspace((s) => s.activeId);

  const level = useProfile((s) => s.level);
  const ai = useSettings((s) => s.ai);
  const allowWrites = useSettings((s) => s.allowEditorWrites);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastCount = useRef(messages.length);

  const lang = getLanguage(languageId);
  const hasKey = !PROVIDER_NEEDS_KEY[ai.provider] || Boolean(ai.apiKey);
  const lastRun = runs[0] ?? null;

  // Autodesplazamiento: solo cuando llega contenido nuevo, no en cada re-render.
  useEffect(() => {
    if (messages.length === lastCount.current) return;
    lastCount.current = messages.length;
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node && messages.length <= 1) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const contextChips = useMemo(() => {
    const chips: { label: string; tone: 'accent' | 'ok' | 'err' | 'neutral' | 'warn' }[] = [];
    if (selection.text.trim()) {
      chips.push({
        label: `seleccion · L${selection.startLine}-${selection.endLine}`,
        tone: 'accent',
      });
    } else {
      chips.push({ label: 'sin seleccion', tone: 'neutral' });
    }
    if (lastRun) {
      chips.push({
        label: lastRun.status === 'ok' ? 'ultima ejecucion OK' : 'ultima ejecucion con error',
        tone: lastRun.status === 'ok' ? 'ok' : 'err',
      });
    }
    return chips;
  }, [selection, lastRun]);

  const submit = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void send('freeform', text);
  };

  const applyCode = (code: string) => {
    updateContent(activeId, `${code}\n`);
    toast.ok('Codigo aplicado', 'El archivo activo fue reemplazado por el bloque de la respuesta.');
  };

  return (
    <aside
      aria-label="Asistente IA"
      className="flex h-full min-h-0 flex-col border-l border-line bg-surface anim-slide-left"
    >
      <header className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-accent-line bg-accent-soft text-accent">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[0.88rem] font-semibold tracking-tight text-ink">Copiloto</h2>
          <p className="truncate text-[0.72rem] text-faint">{lang.label} · nivel {level.toLowerCase()}</p>
        </div>
        <IconButton label="Borrar conversacion" onClick={clear} disabled={messages.length === 0}>
          <Eraser className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Cerrar asistente" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </IconButton>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-line-soft bg-bg-deep/50 px-3 py-2">
        {contextChips.map((chip) => (
          <Badge key={chip.label} tone={chip.tone} mono>
            {chip.tone !== 'neutral' && <Dot tone={chip.tone === 'accent' ? 'accent' : chip.tone} />}
            {chip.label}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5 border-b border-line-soft px-3 py-2.5">
        {QUICK.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              disabled={busy}
              title={action.hint}
              onClick={() => {
                if (action.id === 'exercise') {
                  onGenerateExercise();
                  return;
                }
                // "Concepto" necesita texto: abrimos el compositor con foco puesto.
                if (action.id === 'teach') {
                  inputRef.current?.focus();
                  return;
                }
                void send(action.id);
              }}
              className={cn(
                'group flex items-center gap-2 rounded-md border border-line bg-bg-deep px-2.5 py-2 text-left',
                'transition-[border-color,background-color,transform] duration-150',
                'hover:border-accent-line hover:bg-accent-soft/40 active:translate-y-px',
                'disabled:pointer-events-none disabled:opacity-45',
                action.id === 'exercise' && 'col-span-2 sm:col-span-1',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-accent" />
              <span className="min-w-0">
                <span className="block truncate text-[0.78rem] font-medium text-ink">{action.label}</span>
                <span className="hidden truncate text-[0.68rem] text-faint min-[24rem]:block">{action.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeCard languageId={languageId} hasKey={hasKey} onConfigure={onOpenSettings} />
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              languageId={languageId}
              canApply={allowWrites}
              onApplyCode={applyCode}
            />
          ))
        )}
      </div>

      <footer className="border-t border-line-soft px-3 py-2.5">
        <div
          className={cn(
            'rounded-md border bg-bg-deep transition-[border-color,box-shadow] duration-150',
            'focus-within:border-accent-line focus-within:ring-2 focus-within:ring-accent/20',
          )}
        >
          <label htmlFor="copilot-input" className="sr-only">
            Escribe una pregunta al asistente
          </label>
          <textarea
            id="copilot-input"
            ref={inputRef}
            value={draft}
            rows={3}
            placeholder={hasKey ? 'Pregunta sobre el codigo, un error o un concepto…' : 'Configura un modelo en Ajustes para chatear'}
            disabled={!hasKey}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="w-full resize-none bg-transparent px-3 py-2.5 font-sans text-[0.85rem] leading-relaxed text-ink placeholder:text-faint focus:outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between gap-2 border-t border-line-soft px-2 py-1.5">
            <span className="pl-1 text-[0.68rem] text-faint">
              <kbd className="rounded border border-line px-1 font-mono text-[0.62rem]">Enter</kbd> envia ·{' '}
              <kbd className="rounded border border-line px-1 font-mono text-[0.62rem]">Shift</kbd>+<kbd className="rounded border border-line px-1 font-mono text-[0.62rem]">Enter</kbd> salto
            </span>
            {busy ? (
              <button
                type="button"
                onClick={stop}
                className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-err-soft px-2.5 text-[0.76rem] font-medium text-err transition-transform duration-150 hover:brightness-110 active:translate-y-px"
              >
                <Square className="h-3 w-3 fill-current" />
                Parar
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!draft.trim() || !hasKey}
                aria-label="Enviar mensaje"
                className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-accent px-2.5 text-[0.76rem] font-semibold text-accent-ink transition-[filter,transform] duration-150 hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-45"
              >
                <Send className="h-3 w-3" />
                Enviar
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] leading-snug text-faint">
          <MessageSquarePlus className="h-3 w-3 shrink-0" />
          Las respuestas del modelo pueden equivocarse. Verifica el codigo antes de usarlo.
        </p>
      </footer>
    </aside>
  );
}