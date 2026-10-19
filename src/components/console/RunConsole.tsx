import { useState } from 'react';
import { AlertTriangle, Check, Clock, Copy, History, Trash2 } from 'lucide-react';
import type { RunResult, RunStatus } from '@/lib/types';
import { getLanguage } from '@/lib/languages';
import { formatMs } from '@/lib/cn';
import { useWorkspace } from '@/store/workspace';
import { Badge, Dot } from '@/components/ui/Primitives';
import { IconButton } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Form';
import { toast } from '@/store/toasts';

const STATUS_META: Record<RunStatus, { label: string; tone: 'ok' | 'err' | 'warn' | 'info' | 'accent'; dot: 'ok' | 'err' | 'warn' | 'accent' }> = {
  ok: { label: 'OK', tone: 'ok', dot: 'ok' },
  error: { label: 'Error', tone: 'err', dot: 'err' },
  timeout: { label: 'Timeout', tone: 'warn', dot: 'warn' },
  running: { label: 'Ejecutando', tone: 'info', dot: 'accent' },
};

export function RunConsole({ running }: { running: boolean }) {
  const runs = useWorkspace((s) => s.runs);
  const clearRuns = useWorkspace((s) => s.clearRuns);
  const [tab, setTab] = useState<'out' | 'err'>('out');
  const [showHistory, setShowHistory] = useState(false);

  const latest = runs[0] ?? null;

  if (running) {
    return (
      <section
        aria-label="Consola de ejecucion"
        className="flex items-center gap-3 border-t border-line bg-surface px-4 py-3"
      >
        <Dot tone="accent" pulse />
        <p className="text-[0.85rem] text-muted">Ejecutando en el motor remoto…</p>
        <span className="relative ml-auto h-1 w-24 overflow-hidden rounded-full bg-elev">
          <span className="absolute inset-y-0 w-1/3 rounded-full bg-accent cf-shimmer" />
        </span>
      </section>
    );
  }

  if (!latest) {
    return (
      <section aria-label="Consola de ejecucion" className="border-t border-line bg-surface px-4 py-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-line bg-elev text-faint">
            <Clock className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <p className="text-[0.9rem] font-semibold text-ink">Todavia no has ejecutado nada</p>
            <p className="max-w-prose text-[0.8rem] leading-relaxed text-muted">
              Pulsa Ejecutar o <kbd className="rounded border border-line px-1 font-mono text-[0.7rem]">Ctrl/Cmd</kbd> +{' '}
              <kbd className="rounded border border-line px-1 font-mono text-[0.7rem]">Enter</kbd>. Aqui veras stdout, stderr
              y el codigo de salida.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const meta = STATUS_META[latest.status];
  const lang = getLanguage(latest.languageId);
  const stream = tab === 'out' ? latest.stdout : latest.stderr || latest.output;
  const isEmptyStream = !stream.trim();

  return (
    <section aria-label="Consola de ejecucion" className="flex min-h-0 flex-col border-t border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3 py-2">
        <div className="flex items-center gap-2">
          <Dot tone={meta.dot} />
          <h2 className="text-[0.82rem] font-semibold tracking-tight text-ink">Consola</h2>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="font-mono text-[0.72rem] text-faint">
            {lang.label}
            {latest.exitCode !== null && ` · exit ${latest.exitCode}`}
            {` · ${formatMs(latest.wallMs)}`}
            {latest.cpuMs !== null && latest.cpuMs > 0 && ` · cpu ${formatMs(latest.cpuMs)}`}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Segmented
            size="sm"
            label="Flujo de salida"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'out', label: 'stdout' },
              { value: 'err', label: 'stderr' },
            ]}
          />
          <IconButton
            label="Copiar salida"
            onClick={() => {
              void navigator.clipboard?.writeText(latest.output || latest.stdout).then(() =>
                toast.ok('Salida copiada al portapapeles'),
              );
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          {runs.length > 1 && (
            <IconButton
              label={showHistory ? 'Ocultar historial' : `Ver historial (${runs.length})`}
              onClick={() => setShowHistory((v) => !v)}
              active={showHistory}
            >
              <History className="h-3.5 w-3.5" />
            </IconButton>
          )}
          <IconButton label="Limpiar consola" onClick={clearRuns}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </header>

      <div className="scroll-thin max-h-64 min-h-24 overflow-auto px-3 py-2.5">
        {latest.engineError ? (
          // Fallos de infraestructura: el motivo se lee sin cambiar de pestaña.
          <div className="flex items-start gap-2.5 rounded-md border border-warn/35 bg-warn-soft px-3 py-2.5">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <div className="min-w-0">
              <p className="text-[0.85rem] font-medium text-ink">No se pudo ejecutar el programa</p>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">{latest.engineError}</p>
            </div>
          </div>
        ) : isEmptyStream ? (
          <p className="py-3 text-center text-[0.82rem] text-faint">
            {tab === 'out' ? 'El programa no escribio nada en stdout.' : 'Sin errores: stderr vacio.'}
          </p>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-[0.8rem] leading-relaxed break-words text-ink">
            {stream}
          </pre>
        )}
      </div>

      {showHistory && (
        <ul className="scroll-thin max-h-44 divide-y divide-line-soft overflow-auto border-t border-line-soft">
          {runs.slice(1).map((run) => {
            const runMeta = STATUS_META[run.status];
            return (
              <li key={run.id} className="flex items-center gap-3 px-3 py-2">
                <Dot tone={runMeta.dot} />
                <span className="font-mono text-[0.75rem] text-muted">
                  {getLanguage(run.languageId).label}
                </span>
                <span className="font-mono text-[0.72rem] text-faint">
                  {formatMs(run.wallMs)}
                  {run.exitCode !== null && ` · exit ${run.exitCode}`}
                </span>
                <span className="ml-auto max-w-[50%] truncate font-mono text-[0.72rem] text-faint">
                  {(run.output || run.stdout || 'sin salida').split('\n')[0]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Resumen inline que aparece junto al boton Ejecutar. */
export function RunStatusChip({ run }: { run: RunResult | null }) {
  if (!run) return null;
  const meta = STATUS_META[run.status];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.72rem] text-faint">
      <Dot tone={meta.dot} pulse={run.status === 'error' && !!run.engineError} />
      {meta.label === 'OK' ? (
        <Check aria-hidden="true" className="h-3 w-3 text-ok" />
      ) : run.status === 'timeout' ? (
        <AlertTriangle aria-hidden="true" className="h-3 w-3 text-warn" />
      ) : null}
      {formatMs(run.wallMs)}
    </span>
  );
}