import { useMemo, useState } from 'react';
import { Bot, Check, Copy, FileCode2, Sparkles, TriangleAlert, User } from 'lucide-react';
import type { AiMessage } from '@/lib/types';
import { parseMarkdown, highlightKeywords, type CodeBlock } from '@/lib/markdown';
import { cn } from '@/lib/cn';
import { getLanguage } from '@/lib/languages';
import { IconButton } from '@/components/ui/Button';
import { Badge, Dot, Spinner } from '@/components/ui/Primitives';

export function MessageItem({
  message,
  languageId,
  canApply,
  onApplyCode,
}: {
  message: AiMessage;
  languageId: string;
  canApply: boolean;
  onApplyCode: (code: string, language: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const lang = getLanguage(languageId as never);

  const { nodes } = useMemo(
    () => parseMarkdown(message.content, renderCodeBlock(lang.id, canApply, onApplyCode)),
    [message.content, lang.id, canApply, onApplyCode],
  );

  const isUser = message.role === 'user';

  return (
    <article
      className={cn(
        'anim-fade-up group/message flex gap-2.5 px-3 py-3',
        isUser && 'flex-row-reverse',
      )}
      aria-label={isUser ? 'Mensaje tuyo' : 'Respuesta del asistente'}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border',
          isUser ? 'border-line bg-elev text-muted' : 'border-accent-line bg-accent-soft text-accent',
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </span>

      <div className={cn('min-w-0 flex-1', isUser && 'flex flex-col items-end')}>
        <header className="mb-1 flex items-center gap-2">
          <span className="text-micro font-medium uppercase tracking-widest text-faint">
            {isUser ? 'Tu' : 'Copiloto'}
          </span>
          {!isUser && message.pending && (
            <span className="inline-flex items-center gap-1.5 text-[0.72rem] text-accent">
              <Spinner className="h-3 w-3" />
              pensando
            </span>
          )}
        </header>

        {message.error ? (
          <div className="flex items-start gap-2 rounded-md border border-err/35 bg-err-soft px-3 py-2.5">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-err" />
            <div className="min-w-0">
              <p className="text-[0.82rem] leading-snug text-err">{message.error}</p>
              <p className="mt-1 text-[0.75rem] leading-snug text-muted">
                Revisa proveedor, modelo y clave en Ajustes → Asistente IA.
              </p>
            </div>
          </div>
        ) : isUser ? (
          <p className="max-w-[85%] rounded-lg rounded-tr-sm border border-line bg-elev px-3 py-2 text-[0.86rem] leading-relaxed break-words text-ink">
            {message.content}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">{nodes}</div>
        )}

        {message.content && !message.pending && !message.error && (
          <footer className="mt-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 focus-within:opacity-100">
            <IconButton
              label="Copiar respuesta"
              onClick={() => {
                void navigator.clipboard?.writeText(message.content).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                });
              }}
            >
              {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
            </IconButton>
          </footer>
        )}
      </div>
    </article>
  );
}

function renderCodeBlock(languageId: string, canApply: boolean, onApply: (code: string, lang: string) => void) {
  return function CodeBlockWithActions(block: CodeBlock, index: number) {
    const lang = block.language || languageId;
    return (
      <div key={`blk${index}`} className="overflow-hidden rounded-md border border-line bg-code-bg">
        <div className="flex items-center gap-2 border-b border-line-soft px-2.5 py-1.5">
          <span className="font-mono text-micro uppercase tracking-widest text-faint">{lang}</span>
          {canApply && (
            <button
              type="button"
              onClick={() => onApply(block.code.replace(/\s+$/, ''), lang)}
              className={cn(
                'ml-auto inline-flex items-center gap-1.5 rounded-sm border border-line bg-elev px-2 py-1',
                'text-[0.72rem] text-muted transition-[background-color,color,border-color,transform] duration-150',
                'hover:border-accent-line hover:text-accent active:translate-y-px',
              )}
            >
              <FileCode2 className="h-3 w-3" />
              Reemplazar archivo
            </button>
          )}
        </div>
        <pre className="scroll-thin max-h-96 overflow-x-auto px-3 py-2.5">
          <code className="font-mono text-[0.8rem] leading-relaxed text-ink">
            {highlightKeywords(block.code, lang)}
          </code>
        </pre>
      </div>
    );
  };
}

export function WelcomeCard({ languageId, hasKey, onConfigure }: { languageId: string; hasKey: boolean; onConfigure: () => void }) {
  const lang = getLanguage(languageId as never);

  return (
    <div className="px-4 py-5">
      <div className="anim-fade-up flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent-line bg-accent-soft text-accent">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[0.98rem] font-semibold tracking-tight text-ink">Copiloto CodeForge</h2>
          <p className="text-[0.78rem] text-faint">Contexto automatico · {lang.label}</p>
        </div>
      </div>

      <p className="anim-fade-up stagger mt-4 text-[0.86rem] leading-relaxed text-muted" style={{ ['--i' as string]: 1 }}>
        El copiloto ve lo que estas escribiendo: el archivo activo, lo que tengas seleccionado y la salida de la ultima
        ejecucion. No hace falta que le describas el contexto.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {[
          ['Selecciona codigo', 'y pulsa Explicar: te desglosa ese fragmento.'],
          ['Ejecuta y falla', 'pulsa Depurar: busca la causa raiz, no los sintomas.'],
          ['Pide un reto', 'elige nivel y lenguaje y te genera un ejercicio con tests.'],
        ].map(([title, detail], i) => (
          <li
            key={title}
            className="anim-fade-up stagger flex items-start gap-2.5 rounded-md border border-line bg-bg-deep px-3 py-2.5"
            style={{ ['--i' as string]: i + 2 }}
          >
            <Dot tone="accent" />
            <span className="text-[0.82rem] leading-snug">
              <span className="font-medium text-ink">{title}</span>{' '}
              <span className="text-muted">{detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {!hasKey && (
        <div className="anim-fade-up stagger mt-4 rounded-md border border-warn/35 bg-warn-soft px-3 py-3" style={{ ['--i' as string]: 5 }}>
          <div className="flex items-start gap-2">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.84rem] font-medium text-ink">Falta conectar un modelo de IA</p>
              <p className="mt-1 text-[0.78rem] leading-snug text-muted">
                Puedes usar Ollama en local sin clave, o pegar una API key de Gemini u OpenAI. Todo se queda en tu
                navegador.
              </p>
              <button
                type="button"
                onClick={onConfigure}
                className="mt-2.5 rounded-md border border-warn/40 bg-warn px-3 py-1.5 text-[0.78rem] font-medium text-bg-deep transition-transform duration-150 hover:brightness-110 active:translate-y-px"
              >
                Abrir ajustes de IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ThinkingCard() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4 text-[0.82rem] text-muted">
      <Spinner className="text-accent" />
      Redactando respuesta…
    </div>
  );
}

export function ActionBadge({ label }: { label: string }) {
  return (
    <Badge tone="accent">
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}