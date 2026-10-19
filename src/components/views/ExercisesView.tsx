import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  FlaskConical,
  Lightbulb,
  Loader2,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { CaseResult, Exercise, LanguageId, Level } from '@/lib/types';
import { LANGUAGES, getLanguage } from '@/lib/languages';
import { useExercises, filterExercises } from '@/store/exercises';
import { useWorkspace } from '@/store/workspace';
import { Badge, EmptyState, Panel } from '@/components/ui/Primitives';
import { Button, IconButton } from '@/components/ui/Button';
import { Segmented, Select, TextInput } from '@/components/ui/Form';
import { cn, formatMs } from '@/lib/cn';
import { toast } from '@/store/toasts';

const LEVELS: Level[] = ['Principiante', 'Intermedio', 'Avanzado'];

export function ExercisesView({
  onGenerate,
  onOpenEditor,
}: {
  onGenerate: () => void;
  onOpenEditor: () => void;
}) {
  const exercises = useExercises((s) => s.exercises);
  const results = useExercises((s) => s.results);
  const validatingId = useExercises((s) => s.validatingId);
  const validate = useExercises((s) => s.validate);
  const remove = useExercises((s) => s.remove);
  const markSolved = useExercises((s) => s.markSolved);

  const files = useWorkspace((s) => s.files);
  const languageId = useWorkspace((s) => s.languageId);
  const updateContent = useWorkspace((s) => s.updateContent);
  const activeId = useWorkspace((s) => s.activeId);
  const setLanguage = useWorkspace((s) => s.setLanguage);

  const [languageFilter, setLanguageFilter] = useState<LanguageId | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<Level | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'solved'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const filtered = useMemo(
    () => filterExercises(exercises, { language: languageFilter, level: levelFilter, status: statusFilter, query }),
    [exercises, languageFilter, levelFilter, statusFilter, query],
  );

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  const solvedCount = exercises.filter((e) => e.solvedAt).length;

  const loadIntoEditor = (exercise: Exercise) => {
    setLanguage(exercise.languageId);
    updateContent(activeId, exercise.starter);
    toast.ok('Ejercicio cargado', `${exercise.title} · el archivo activo ahora tiene el arranque.`);
    onOpenEditor();
  };

  const runValidation = async (exercise: Exercise) => {
    const cases = await validate(exercise, files);
    if (!cases.length) {
      toast.warn('Este lenguaje no se puede validar', 'HTML y CSS se revisan a ojo en el preview.');
      return;
    }
    const passed = cases.filter((c) => c.outcome === 'pass').length;
    if (passed === cases.length) {
      if (!exercise.solvedAt) markSolved(exercise.id);
      toast.ok('Todos los casos pasan', `${passed}/${cases.length} correctos.`);
    } else {
      toast.warn(`${passed}/${cases.length} casos pasan`, 'Revisa la salida esperada de cada caso fallido.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-line bg-surface px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.35rem] font-semibold tracking-tight text-ink">Ejercicios</h1>
            <p className="mt-0.5 text-[0.82rem] text-muted">
              {exercises.length} retos · {solvedCount} resueltos · cada caso se ejecuta de verdad contra el motor
            </p>
          </div>
          <Button variant="primary" icon={<Sparkles className="h-4 w-4" />} onClick={onGenerate}>
            Generar con IA
          </Button>
        </div>

        <div className="mt-3.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-faint"
            />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por titulo o concepto…"
              aria-label="Buscar ejercicios"
              className="pl-9"
            />
          </div>
          <Select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as LanguageId | 'all')}
            aria-label="Filtrar por lenguaje"
            options={[
              { value: 'all', label: 'Todos los lenguajes' },
              ...LANGUAGES.map((l) => ({ value: l.id, label: l.label })),
            ]}
          />
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 sm:w-44">
              <Segmented
                size="sm"
                label="Estado"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'open', label: 'Abiertos' },
                  { value: 'solved', label: 'Hechos' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {(['all', ...LEVELS] as const).map((level) => {
            const active = levelFilter === level;
            const count =
              level === 'all'
                ? exercises.length
                : exercises.filter((e) => e.level === level).length;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setLevelFilter(level as Level | 'all')}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[0.75rem] font-medium transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px',
                  active
                    ? 'border-accent-line bg-accent-soft text-accent'
                    : 'border-line text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {level === 'all' ? 'Todos los niveles' : level}
                <span className="ml-1.5 font-mono text-[0.68rem] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto xl:grid xl:grid-cols-[22rem_1fr] xl:overflow-hidden">
        {/* ------------------------------------------------------------ Lista */}
        <div className="bg-bg-deep/40 xl:scroll-thin xl:min-h-0 xl:overflow-y-auto xl:border-r xl:border-line">
          {filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<CircleSlash className="h-5 w-5" />}
                title="Ningun ejercicio coincide"
                description="Ajusta los filtros o genera uno nuevo con el modelo que tengas configurado."
                action={
                  <Button size="sm" variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={onGenerate}>
                    Generar uno
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5 p-3">
              {filtered.map((exercise, index) => {
                const active = exercise.id === selected?.id;
                const lang = getLanguage(exercise.languageId);
                const caseResults = results[exercise.id];
                const passed = caseResults?.filter((c) => c.outcome === 'pass').length ?? 0;
                return (
                  <li key={exercise.id} className="stagger" style={{ ['--i' as string]: index }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(exercise.id);
                        setShowHint(false);
                      }}
                      aria-current={active}
                      className={cn(
                        'w-full rounded-md border px-3 py-2.5 text-left',
                        'transition-[background-color,border-color,transform] duration-150',
                        active
                          ? 'border-accent-line bg-accent-soft/35'
                          : 'border-line bg-surface hover:border-line-strong',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-1 h-2.5 w-1 shrink-0 rounded-full"
                          style={{ background: lang.tint }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[0.88rem] font-medium text-ink">{exercise.title}</span>
                            {exercise.solvedAt && <CheckCircle2 aria-label="resuelto" className="h-3.5 w-3.5 shrink-0 text-ok" />}
                            {exercise.origin === 'ai' && <Badge tone="accent">IA</Badge>}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge tone={toneForLevel(exercise.level)}>{exercise.level}</Badge>
                            {caseResults && (
                              <Badge tone={passed === caseResults.length ? 'ok' : 'warn'} mono>
                                {passed}/{caseResults.length} casos
                              </Badge>
                            )}
                          </span>
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* --------------------------------------------------------- Detalle */}
        <div className="xl:scroll-thin xl:min-h-0 xl:overflow-y-auto">
          {selected ? (
            <ExerciseDetail
              key={selected.id}
              exercise={selected}
              results={results[selected.id]}
              validating={validatingId === selected.id}
              showHint={showHint}
              onToggleHint={() => setShowHint((v) => !v)}
              onLoad={() => loadIntoEditor(selected)}
              onValidate={() => void runValidation(selected)}
              onDelete={() => {
                remove(selected.id);
                setSelectedId(null);
                toast.info('Ejercicio eliminado');
              }}
              currentLanguage={languageId}
            />
          ) : (
            <div className="p-6">
              <EmptyState
                icon={<FlaskConical className="h-5 w-5" />}
                title="Selecciona un ejercicio"
                description="A la izquierda tienes el catalogo completo, filtrable por lenguaje, nivel y estado."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toneForLevel(level: Level): 'ok' | 'warn' | 'err' {
  if (level === 'Principiante') return 'ok';
  if (level === 'Intermedio') return 'warn';
  return 'err';
}

function ExerciseDetail({
  exercise,
  results,
  validating,
  showHint,
  onToggleHint,
  onLoad,
  onValidate,
  onDelete,
  currentLanguage,
}: {
  exercise: Exercise;
  results?: CaseResult[];
  validating: boolean;
  showHint: boolean;
  onToggleHint: () => void;
  onLoad: () => void;
  onValidate: () => void;
  onDelete: () => void;
  currentLanguage: LanguageId;
}) {
  const lang = getLanguage(exercise.languageId);
  const isRunnable = lang.kind !== 'preview';
  const mismatched = currentLanguage !== exercise.languageId;

  return (
    <article className="anim-fade-in mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[1.3rem] font-semibold tracking-tight text-ink">{exercise.title}</h2>
            {exercise.solvedAt && <Badge tone="ok">resuelto</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={toneForLevel(exercise.level)}>{exercise.level}</Badge>
            <Badge tone="neutral" mono>
              {lang.label}
            </Badge>
            {exercise.concepts.slice(0, 4).map((concept) => (
              <Badge key={concept} tone="neutral">
                {concept}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {exercise.origin === 'ai' && (
            <IconButton label="Eliminar ejercicio" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
          <Button
            variant="subtle"
            icon={<Play className="h-3.5 w-3.5 fill-current" />}
            onClick={onLoad}
            className="flex-1 sm:flex-none"
          >
            Cargar en el editor
          </Button>
          <Button
            variant="primary"
            icon={validating ? <Loader2 className="h-4 w-4 anim-spin" /> : <FlaskConical className="h-4 w-4" />}
            onClick={onValidate}
            disabled={!isRunnable || validating}
            className="flex-1 sm:flex-none"
            title={isRunnable ? 'Ejecuta los casos contra el codigo del editor' : 'Este lenguaje se revisa a ojo'}
          >
            Validar
          </Button>
        </div>
      </header>

      {mismatched && (
        <p className="flex items-start gap-2 rounded-md border border-warn/35 bg-warn-soft px-3 py-2.5 text-[0.82rem] leading-snug text-ink">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          El editor esta en <strong>{getLanguage(currentLanguage).label}</strong>. Pulsa “Cargar en el editor” para
          cambiarlo a {lang.label} antes de validar.
        </p>
      )}

      <Panel className="overflow-hidden">
        <div className="whitespace-pre-wrap px-4 py-3.5 text-[0.9rem] leading-relaxed text-muted">{exercise.statement}</div>
      </Panel>

      <div>
        <Button variant="ghost" size="sm" icon={<Lightbulb className="h-3.5 w-3.5" />} onClick={onToggleHint}>
          {showHint ? 'Ocultar pista' : 'Ver pista'}
        </Button>
        {showHint && (
          <p className="anim-fade-up mt-2 rounded-md border border-accent-line bg-accent-soft/40 px-3 py-2.5 text-[0.86rem] leading-relaxed text-ink">
            {exercise.hint}
          </p>
        )}
      </div>

      {exercise.tests.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-3 py-3 text-[0.84rem] text-muted">
          Este lenguaje no tiene motor de ejecucion: el reto se practica mirando el preview y revisando el codigo a mano.
        </p>
      ) : (
        <section aria-label="Casos de prueba">
          <h3 className="mb-2 text-micro font-medium uppercase tracking-widest text-faint">
            Casos de prueba ({exercise.tests.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {exercise.tests.map((test, index) => {
              const result = results?.find((r) => r.id === test.id);
              return (
                <li
                  key={test.id}
                  className="stagger overflow-hidden rounded-md border border-line bg-surface"
                  style={{ ['--i' as string]: index }}
                >
                  <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
                    {result ? (
                      <CaseIcon outcome={result.outcome} />
                    ) : (
                      <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-line-strong" />
                    )}
                    <span className="text-[0.84rem] font-medium text-ink">{test.label}</span>
                    {result && (
                      <span className="ml-auto font-mono text-[0.72rem] text-faint">{formatMs(result.wallMs)}</span>
                    )}
                  </div>
                  <div className="grid gap-2 px-3 py-2 font-mono text-[0.76rem] leading-relaxed sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="mb-0.5 text-faint">stdin</p>
                      <pre className="whitespace-pre-wrap break-words text-muted">{test.stdin || '(vacio)'}</pre>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-0.5 text-faint">
                        {result ? 'salida real' : 'stdout esperada'}
                      </p>
                      <pre
                        className={cn(
                          'whitespace-pre-wrap break-words',
                          result
                            ? result.outcome === 'pass'
                              ? 'text-ok'
                              : 'text-err'
                            : 'text-muted',
                        )}
                      >
                        {(result ? result.actual : test.expected) || '(sin salida)'}
                      </pre>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}

function CaseIcon({ outcome }: { outcome: CaseResult['outcome'] }) {
  if (outcome === 'pass') return <CheckCircle2 aria-label="correcto" className="h-3.5 w-3.5 shrink-0 text-ok" />;
  if (outcome === 'fail') return <XCircle aria-label="salida incorrecta" className="h-3.5 w-3.5 shrink-0 text-warn" />;
  return <AlertTriangle aria-label="error de ejecucion" className="h-3.5 w-3.5 shrink-0 text-err" />;
}