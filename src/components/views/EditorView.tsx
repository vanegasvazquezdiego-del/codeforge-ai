import { Suspense, lazy, useCallback } from 'react';
import { ChevronDown, Play, RotateCcw, Square, Terminal, Wand2 } from 'lucide-react';
import { useWorkspace } from '@/store/workspace';
import { useSettings } from '@/store/settings';
import { getLanguage } from '@/lib/languages';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Form';
import { Popover } from '@/components/ui/Popover';
import { Badge, Spinner } from '@/components/ui/Primitives';
import { LanguagePicker } from '@/components/editor/LanguagePicker';
import { FileTabs } from '@/components/editor/FileTabs';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { RunConsole, RunStatusChip } from '@/components/console/RunConsole';
import { toast } from '@/store/toasts';

// Monaco pesa ~3 MB: se carga solo cuando el usuario entra al editor.
const CodeEditor = lazy(() =>
  import('@/components/editor/CodeEditor').then((m) => ({ default: m.CodeEditor })),
);

export function EditorView({ onToggleAssistant }: { onToggleAssistant: () => void }) {
  const languageId = useWorkspace((s) => s.languageId);
  const files = useWorkspace((s) => s.files);
  const running = useWorkspace((s) => s.running);
  const runs = useWorkspace((s) => s.runs);
  const run = useWorkspace((s) => s.run);
  const cancel = useWorkspace((s) => s.cancel);
  const resetToStarter = useWorkspace((s) => s.resetToStarter);

  const stdin = useSettings((s) => s.stdin);
  const setStdin = useSettings((s) => s.setStdin);

  const lang = getLanguage(languageId);
  const isPreview = lang.kind === 'preview';

  const handleRun = useCallback(() => {
    void run().then((result) => {
      if (result.engineError) toast.err('El motor no pudo ejecutar', result.engineError);
    });
  }, [run]);

  const toggleAssistant = useCallback(() => {
    onToggleAssistant();
  }, [onToggleAssistant]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---------------------------------------------------------- Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <LanguagePicker />

        {lang.kind === 'remote' && lang.stdin && (
          <Popover
            align="start"
            width="w-80"
            trigger={({ toggle, id, open }) => (
              <button
                id={id}
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-bg-deep px-2.5',
                  'font-mono text-[0.78rem] transition-[border-color,background-color] duration-150',
                  'hover:border-line-strong hover:bg-elev',
                  open && 'border-accent-line bg-elev',
                )}
              >
                <Terminal aria-hidden="true" className="h-3.5 w-3.5 text-faint" />
                stdin
                {stdin.trim() && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />}
                <ChevronDown
                  aria-hidden="true"
                  className={cn('h-3 w-3 text-faint transition-transform duration-200', open && 'rotate-180')}
                />
              </button>
            )}
          >
            {() => (
              <div className="p-1.5">
                <label htmlFor="stdin-input" className="mb-1.5 block text-[0.78rem] font-medium text-muted">
                  Entrada estandar
                </label>
                <TextArea
                  id="stdin-input"
                  rows={6}
                  value={stdin}
                  placeholder={'Un valor por linea.\nPor ejemplo:\n4 8 15 16 23 42'}
                  onChange={(e) => setStdin(e.target.value)}
                  className="min-h-28"
                />
                <p className="mt-1.5 text-[0.72rem] leading-snug text-faint">
                  Se envia tal cual. Tu programa decide como interpretarla.
                </p>
              </div>
            )}
          </Popover>
        )}

        {isPreview && (
          <Badge tone="accent" className="hidden sm:inline-flex">
            render en navegador
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <RunStatusChip run={runs[0] ?? null} />

          <IconButton label="Restaurar plantilla inicial" onClick={resetToStarter}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>

          {running ? (
            <Button variant="danger" onClick={cancel} icon={<Square className="h-3.5 w-3.5 fill-current" />}>
              Detener
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleRun}
              icon={isPreview ? <Wand2 className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              iconRight={
                <kbd className="ml-1 hidden rounded border border-current/25 px-1 font-mono text-[0.62rem] opacity-80 sm:inline">
                  ⌘⏎
                </kbd>
              }
            >
              {isPreview ? 'Renderizar' : 'Ejecutar'}
            </Button>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- File tabs */}
      <FileTabs />

      {/* --------------------------------------------------------- Workspace */}
      <div className={cn('flex min-h-0 flex-1', isPreview && 'flex-col xl:flex-row')}>
        <div
          className={cn(
            'min-h-0 min-w-0 flex-1 bg-code-bg',
            isPreview && 'min-h-[180px] flex-[3]',
          )}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center gap-2.5 bg-code-bg text-[0.82rem] text-muted">
                <Spinner className="text-accent" />
                Preparando el editor…
              </div>
            }
          >
            <CodeEditor onRun={handleRun} onToggleAssistant={toggleAssistant} />
          </Suspense>
        </div>

        {isPreview && (
          <div className="h-[42%] min-h-[200px] shrink-0 border-t border-line xl:h-auto xl:w-[26rem] xl:border-t-0 xl:border-l 2xl:w-[32rem]">
            <PreviewPane files={files} />
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------- Console */}
      <div className="max-h-[45vh] shrink-0 overflow-y-auto">
        <RunConsole running={running} />
      </div>
    </div>
  );
}