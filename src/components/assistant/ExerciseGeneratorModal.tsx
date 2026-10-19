import { useEffect, useState } from 'react';
import { Dices, Sparkles } from 'lucide-react';
import type { ExerciseDraft, LanguageId, Level } from '@/lib/types';
import { LANGUAGES } from '@/lib/languages';
import { useAssistant } from '@/store/assistant';
import { useExercises } from '@/store/exercises';
import { isDuplicate } from '@/lib/exercises';
import { useSettings } from '@/store/settings';
import { useProfile } from '@/store/profile';
import { AiError } from '@/lib/ai';
import { ExerciseParseError } from '@/lib/prompts';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Segmented, TextArea, Select } from '@/components/ui/Form';
import { Badge, Spinner } from '@/components/ui/Primitives';
import { toast } from '@/store/toasts';

const LEVELS: Level[] = ['Principiante', 'Intermedio', 'Avanzado'];

export function ExerciseGeneratorModal({
  open,
  onClose,
  onCreated,
  initialLanguage,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (exerciseId: string) => void;
  initialLanguage: LanguageId;
}) {
  const [languageId, setLanguageId] = useState<LanguageId>(initialLanguage);
  const [level, setLevel] = useState<Level>('Principiante');
  const [extra, setExtra] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rawReply, setRawReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ExerciseDraft | null>(null);

  const requestExercise = useAssistant((s) => s.requestExercise);
  const add = useExercises((s) => s.add);
  const exercises = useExercises((s) => s.exercises);
  const settingsLevel = useProfile((s) => s.level);
  const aiConfig = useSettings((s) => s.ai);
  const hasKey = aiConfig.provider === 'ollama' || Boolean(aiConfig.apiKey);

  useEffect(() => {
    if (open) {
      setLanguageId(initialLanguage);
      setLevel(settingsLevel);
      setError(null);
      setPreview(null);
      setExtra('');
      setRawReply(null);
    }
  }, [open, initialLanguage, settingsLevel]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setRawReply(null);
    try {
      const draft = await requestExercise(languageId, level, extra);
      if (isDuplicate(exercises, draft.title, languageId)) {
        setError(
          `Ya tienes un ejercicio llamado "${draft.title}" en este lenguaje. Cambia el nivel o pide otro enfoque en las instrucciones.`,
        );
        setBusy(false);
        return;
      }
      if (!draft.tests.length && !['html', 'css'].includes(languageId)) {
        setError('El modelo no propuso casos de prueba. Anade el criterio en las instrucciones y vuelve a generar.');
        setBusy(false);
        return;
      }
      setPreview(draft);
    } catch (err) {
      // Si el fallo fue de formato, se guarda lo que respondio el modelo:
      // sin eso el error es un callejon sin salida.
      setRawReply(err instanceof ExerciseParseError ? err.raw : null);
      setError(
        err instanceof AiError || err instanceof Error
          ? err.message
          : 'No se pudo generar el ejercicio. Intenta de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!preview) return;
    const created = add(preview, languageId);
    toast.ok('Ejercicio guardado', `${created.title} · ${created.tests.length} casos de prueba`);
    onCreated(created.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Generar ejercicio con IA"
      description="El modelo devuelve el enunciado, el codigo de arranque y los casos de prueba. Tu los revisas antes de guardarlos."
      footer={
        preview ? (
          <>
            <Button variant="ghost" onClick={generate} loading={busy}>
              Regenerar
            </Button>
            <Button variant="primary" onClick={save}>
              Guardar en mis ejercicios
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={generate} loading={busy} icon={<Sparkles className="h-4 w-4" />}>
              Generar
            </Button>
          </>
        )
      }
    >
      {busy ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Spinner className="h-6 w-6 text-accent" />
          <p className="text-[0.85rem] text-muted">Redactando enunciado, arranque y casos de prueba…</p>
          <p className="max-w-sm text-center text-[0.76rem] text-faint">
            Si tu modelo es local puede tardar varios segundos. El ejercicio se guardara solo si lo apruebas.
          </p>
        </div>
      ) : preview ? (
        <div className="flex flex-col gap-4">
          <header className="flex flex-wrap items-center gap-2">
            <h3 className="text-[1rem] font-semibold tracking-tight text-ink">{preview.title}</h3>
            <Badge tone="accent">{preview.level}</Badge>
            <Badge tone="neutral" mono>
              {LANGUAGES.find((l) => l.id === languageId)?.label}
            </Badge>
          </header>
          <div className="scroll-thin max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-bg-deep px-3 py-2.5 text-[0.84rem] leading-relaxed text-muted">
            {preview.statement}
          </div>
          <div>
            <p className="mb-1.5 text-micro font-medium uppercase tracking-widest text-faint">Codigo de arranque</p>
            <pre className="scroll-thin max-h-56 overflow-auto rounded-md border border-line bg-code-bg px-3 py-2.5 font-mono text-[0.78rem] leading-relaxed text-ink">
              {preview.starter}
            </pre>
          </div>
          <div>
            <p className="mb-1.5 text-micro font-medium uppercase tracking-widest text-faint">
              Casos de prueba ({preview.tests.length})
            </p>
            {preview.tests.length === 0 ? (
              <p className="rounded-md border border-dashed border-line px-3 py-2.5 text-[0.8rem] text-faint">
                Este ejercicio se valida a ojo: el lenguaje no tiene motor de ejecucion.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {preview.tests.map((test, i) => (
                  <li key={test.id} className="grid gap-2 rounded-md border border-line bg-bg-deep px-3 py-2 sm:grid-cols-[9rem_1fr]">
                    <span className="text-[0.78rem] font-medium text-ink">{test.label || `Caso ${i + 1}`}</span>
                    <span className="grid gap-1 font-mono text-[0.74rem] text-muted">
                      <span>
                        <span className="text-faint">stdin → </span>
                        {test.stdin ? test.stdin : '(vacio)'}
                      </span>
                      <span>
                        <span className="text-faint">stdout ← </span>
                        {test.expected}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!hasKey && (
            <div className="rounded-md border border-warn/35 bg-warn-soft px-3 py-2.5 text-[0.8rem] leading-snug text-ink">
              No hay modelo configurado. Ve a <strong>Ajustes → Asistente IA</strong> y conecta Gemini, OpenAI o un
              Ollama en local.
            </div>
          )}

          <Field label="Lenguaje" htmlFor="gen-lang" hint="El enunciado se adapta al punto de entrada del runtime.">
            <Select
              id="gen-lang"
              value={languageId}
              onChange={(e) => setLanguageId(e.target.value as LanguageId)}
              options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))}
            />
          </Field>

          <Field label="Nivel" htmlFor="gen-level">
            <div id="gen-level">
              <Segmented
                label="Nivel del ejercicio"
                value={level}
                onChange={setLevel}
                options={LEVELS.map((l) => ({ value: l, label: l }))}
              />
            </div>
          </Field>

          <Field
            label="Instrucciones extra (opcional)"
            htmlFor="gen-extra"
            hint="Ej.: 'usa solo recursion, sin la biblioteca estandar' o 'el tema es grafos'."
          >
            <TextArea
              id="gen-extra"
              rows={3}
              value={extra}
              placeholder="Enfoca el ejercicio en…"
              onChange={(e) => setExtra(e.target.value)}
            />
          </Field>

          {error && (
            <div role="alert" className="rounded-md border border-err/35 bg-err-soft px-3 py-2.5 text-[0.82rem] text-err">
              <p>{error}</p>
              {rawReply && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[0.76rem] text-err/80 hover:text-err">
                    Ver lo que respondio el modelo
                  </summary>
                  <pre className="scroll-thin mt-1.5 max-h-44 overflow-auto rounded-sm border border-err/25 bg-bg-deep px-2.5 py-2 font-mono text-[0.72rem] leading-relaxed whitespace-pre-wrap break-words text-muted">
                    {rawReply.slice(0, 4000)}
                  </pre>
                </details>
              )}
            </div>
          )}

          <p className="flex items-start gap-2 text-[0.76rem] leading-snug text-faint">
            <Dices aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Puedes repetir la generacion tantas veces como quieras hasta dar con un reto que te enganche. Nada se guarda
            hasta que pulses el boton.
          </p>
        </div>
      )}
    </Modal>
  );
}