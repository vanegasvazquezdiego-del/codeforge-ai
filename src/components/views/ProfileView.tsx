import { useMemo, useRef, useState } from 'react';
import {
  Activity,
  Award,
  CalendarDays,
  Camera,
  CheckCircle2,
  Download,
  Flame,
  Languages,
  Pencil,
  Save,
  Terminal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Level } from '@/lib/types';
import { LANGUAGES, getLanguage } from '@/lib/languages';
import { computeStats } from '@/lib/stats';
import { clamp } from '@/lib/cn';
import { useActivity } from '@/store/activity';
import { useExercises } from '@/store/exercises';
import { useProfile, fileToAvatar } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { clearAll, estimateBytes, exportSnapshot, importSnapshot, storageAvailable } from '@/lib/storage';
import { Badge, Bar, Dot, Panel, PanelHeader, Stat } from '@/components/ui/Primitives';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Segmented, Slider, TextArea, TextInput } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/store/toasts';

const LEVELS: Level[] = ['Principiante', 'Intermedio', 'Avanzado'];

export function ProfileView() {
  const profile = useProfile();
  const setProfile = useProfile((s) => s.set);
  const logs = useActivity((s) => s.logs);
  const exercises = useExercises((s) => s.exercises);
  const resetExercises = useExercises((s) => s.reset);
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  const stats = useMemo(() => computeStats(logs, exercises), [logs, exercises]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const solvedByLanguage = useMemo(() => {
    const map = new Map<string, number>();
    exercises.filter((e) => e.solvedAt).forEach((e) => map.set(e.languageId, (map.get(e.languageId) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [exercises]);

  const solvedByLevel = useMemo(() => {
    const map = new Map<Level, number>();
    exercises.filter((e) => e.solvedAt).forEach((e) => map.set(e.level, (map.get(e.level) ?? 0) + 1));
    return LEVELS.map((level) => ({ level, count: map.get(level) ?? 0 }));
  }, [exercises]);

  const maxDay = Math.max(1, ...stats.last14.map((d) => d.runs + d.solved));
  const maxWeekday = Math.max(1, ...stats.weekdayHistogram);
  const initials = (profile.name || 'CF').slice(0, 2).toUpperCase();

  const saveProfile = () => {
    setProfile({
      name: draft.name.trim(),
      role: draft.role.trim(),
      level: draft.level,
      bio: draft.bio.trim(),
      goalMinutesPerDay: draft.goalMinutesPerDay,
    });
    setEditing(false);
    toast.ok('Perfil actualizado');
  };

  const onAvatar = async (file: File) => {
    try {
      const dataUrl = await fileToAvatar(file);
      setProfile({ avatar: dataUrl });
      toast.ok('Avatar actualizado');
    } catch (err) {
      toast.err('No se pudo cargar la imagen', err instanceof Error ? err.message : undefined);
    }
  };

  const doExport = () => {
    const blob = new Blob([exportSnapshot()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codeforge-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.info('Respaldo descargado', 'La clave de la IA nunca se incluye en el archivo.');
  };

  const doImport = async (file: File) => {
    try {
      const result = importSnapshot(await file.text());
      if (!result.ok) {
        toast.err('Importacion fallida', result.error);
        return;
      }
      toast.ok('Respaldo restaurado', 'Recargando para aplicar los cambios…');
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      toast.err('No se pudo leer el archivo');
    }
  };

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
        {/* ------------------------------------------------------- Identidad */}
        <Panel className="surface-texture overflow-hidden">
          <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={`Avatar de ${profile.name || 'tu perfil'}`}
                  className="h-20 w-20 rounded-xl border border-line object-cover shadow-e2"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid h-20 w-20 place-items-center rounded-xl border border-accent-line bg-accent-soft font-mono text-[1.6rem] font-semibold text-accent"
                >
                  {initials}
                </span>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Cambiar avatar"
                className="absolute -right-1.5 -bottom-1.5 grid h-7 w-7 place-items-center rounded-md border border-line bg-surface text-muted shadow-e1 transition-[color,border-color] hover:border-accent-line hover:text-accent"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onAvatar(file);
                  e.target.value = '';
                }}
              />
              {profile.avatar && (
                <button
                  type="button"
                  onClick={() => setProfile({ avatar: '' })}
                  aria-label="Quitar avatar"
                  className="absolute -top-1.5 -left-1.5 grid h-6 w-6 place-items-center rounded-md border border-line bg-surface text-faint shadow-e1 transition-colors hover:text-err"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">
                  {profile.name || 'Sin nombre'}
                </h1>
                <Badge tone="accent">{profile.level}</Badge>
              </div>
              <p className="mt-0.5 text-[0.85rem] text-muted">
                {profile.role || 'Rol por definir'} · {profile.goalMinutesPerDay} min/dia de meta
              </p>
              <p className="mt-2 max-w-prose text-[0.85rem] leading-relaxed text-muted">
                {profile.bio ||
                  'Anade una frase sobre que estas aprendiendo. Aparece aqui y solo aqui, en tu navegador.'}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {editing ? (
                <>
                  <IconButton label="Cancelar cambios" onClick={() => setEditing(false)}>
                    <X className="h-4 w-4" />
                  </IconButton>
                  <Button variant="primary" size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={saveProfile}>
                    Guardar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => {
                  setDraft(profile);
                  setEditing(true);
                }}>
                  Editar perfil
                </Button>
              )}
            </div>
          </div>

          {editing && (
            <div className="anim-fade-up grid gap-4 border-t border-line-soft bg-bg-deep/40 p-5 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="p-name">
                <TextInput
                  id="p-name"
                  value={draft.name}
                  maxLength={40}
                  placeholder="Como te llamamos"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Rol o foco actual" htmlFor="p-role" hint="Ej.: automatizacion, backend, algoritmos.">
                <TextInput
                  id="p-role"
                  value={draft.role}
                  maxLength={48}
                  placeholder="Estudiante de primer ano"
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                />
              </Field>
              <Field label="Nivel" htmlFor="p-level">
                <div id="p-level">
                  <Segmented
                    label="Nivel"
                    value={draft.level}
                    onChange={(level) => setDraft({ ...draft, level })}
                    options={LEVELS.map((l) => ({ value: l, label: l }))}
                  />
                </div>
              </Field>
              <Field label="Meta diaria" htmlFor="p-goal" hint="Se usa para estimar el tiempo de la sesion.">
                <Slider
                  value={draft.goalMinutesPerDay}
                  min={5}
                  max={180}
                  step={5}
                  label="Objetivo diario"
                  format={(v) => `${v} min`}
                  onChange={(v) => setDraft({ ...draft, goalMinutesPerDay: clamp(v, 5, 180) })}
                />
              </Field>
              <Field label="Sobre ti" htmlFor="p-bio" className="sm:col-span-2">
                <TextArea
                  id="p-bio"
                  rows={3}
                  maxLength={240}
                  value={draft.bio}
                  placeholder="Que te Apaesce practicar ahora mismo"
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                />
              </Field>
            </div>
          )}
        </Panel>

        {/* --------------------------------------------------------- Metricas */}
        <section aria-labelledby="stats-title">
          <h2 id="stats-title" className="sr-only">
            Estadisticas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Ejecuciones"
              value={stats.totalRuns}
              hint={`${stats.cleanRuns} terminaron sin error`}
              icon={<Terminal className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Ejercicios"
              value={`${stats.totalSolved}/${exercises.length}`}
              hint="retos resueltos sobre el catalogo"
              icon={<Award className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Racha"
              value={`${stats.streak}d`}
              hint={`Mejor marca: ${stats.bestStreak} dias`}
              icon={<Flame className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Lenguajes"
              value={stats.languagesPracticed}
              hint={`${LANGUAGES.length} disponibles en el editor`}
              icon={<Languages className="h-3.5 w-3.5" />}
            />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ----------------------------------------------------- Actividad */}
          <Panel>
            <PanelHeader
              title="Ultimos 14 dias"
              subtitle={`${stats.activeDays} ${stats.activeDays === 1 ? 'dia' : 'dias'} con actividad · ${stats.minutesToday} min estimados hoy`}
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <div className="flex h-44 items-stretch gap-1.5 px-4 py-4">
              {stats.last14.map((day) => {
                const total = day.runs + day.solved;
                const pct = (total / maxDay) * 100;
                return (
                  <div key={day.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="font-mono text-[0.62rem] text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      {total}
                    </span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-[3px] bg-accent/70 transition-[height,opacity] duration-500 ease-out group-hover:bg-accent"
                        style={{ height: `${Math.max(3, pct)}%` }}
                        title={`${day.day}: ${day.runs} ejecuciones, ${day.solved} resueltos`}
                      />
                    </div>
                    <span className="font-mono text-[0.6rem] text-faint">{day.day.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* -------------------------------------------------- Distribucion */}
          <Panel>
            <PanelHeader
              title="Distribucion"
              subtitle="Ejercicios resueltos por nivel y lenguaje"
              icon={<Activity className="h-4 w-4" />}
            />
            <div className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-2.5">
                {solvedByLevel.map((item) => (
                  <div key={item.level} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[0.8rem] text-muted">{item.level}</span>
                    <div className="flex-1">
                      <Bar value={item.count} max={Math.max(1, ...solvedByLevel.map((l) => l.count))} />
                    </div>
                    <span className="w-6 shrink-0 text-right font-mono text-[0.78rem] text-ink tabular-nums">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              {solvedByLanguage.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 border-t border-line-soft pt-3.5">
                  {solvedByLanguage.map(([id, count]) => (
                    <Badge key={id} tone="accent" mono>
                      {getLanguage(id as never).label} · {count}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="border-t border-line-soft pt-3.5 text-[0.82rem] leading-snug text-muted">
                  Todavia no has resuelto ningun ejercicio. Resuelve uno en la vista de ejercicios y aqui aparecera el
                  desglose.
                </p>
              )}

              <div className="border-t border-line-soft pt-3.5">
                <p className="mb-2 text-micro font-medium uppercase tracking-widest text-faint">
                  Actividad por dia de la semana
                </p>
                <div className="flex h-16 items-stretch gap-1.5">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label, index) => (
                    <div key={label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-[3px] bg-accent/60 transition-[height] duration-500 ease-out"
                          style={{ height: `${Math.max(3, (stats.weekdayHistogram[index] / maxWeekday) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[0.62rem] text-faint">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* ------------------------------------------------------------ Datos */}
        <Panel>
          <PanelHeader
            title="Tus datos"
            subtitle={
              storageAvailable
                ? `Todo vive en este navegador · ${(estimateBytes() / 1024).toFixed(1)} KB usados`
                : 'Almacenamiento local no disponible: los datos duran lo que esta pestaña'
            }
            icon={<Download className="h-4 w-4" />}
          />
          <div className="flex flex-col gap-4 p-4">
            <p className="max-w-prose text-[0.85rem] leading-relaxed text-muted">
              CodeForge no tiene servidor propio ni cuentas: tu codigo se compila en el motor publico que elijas en
              Ajustes (Judge0, Wandbox o tu Piston) y las consultas de IA van directamente al proveedor configurado. Si
              quieres cambiar de equipo o de navegador, descarga un respaldo.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={doExport}>
                Descargar respaldo
              </Button>
              <Button variant="outline" size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => importRef.current?.click()}>
                Restaurar respaldo
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void doImport(file);
                  e.target.value = '';
                }}
              />
              <Button variant="ghost" size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => {
                resetExercises();
                toast.info('Catalogo restaurado', 'Se reiniciaron los ejercicios generados.');
              }}>
                Reiniciar catalogo
              </Button>
              <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmClear(true)}>
                Borrar todo
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3.5">
              <span className="text-[0.8rem] text-muted">Tema activo:</span>
              <Segmented
                size="sm"
                label="Tema"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'void', label: 'Void' },
                  { value: 'slate', label: 'Slate' },
                  { value: 'cyber', label: 'Cyber' },
                  { value: 'paper', label: 'Paper' },
                ]}
              />
            </div>
          </div>
        </Panel>

        <footer className="flex items-center gap-2 pb-2 text-[0.76rem] text-faint">
          <Dot tone={storageAvailable ? 'ok' : 'warn'} />
          {storageAvailable
            ? 'Datos guardados en localStorage de este navegador.'
            : 'Sin almacenamiento local: no cierres la pestaña o perderas el progreso.'}
        </footer>
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Borrar todos los datos locales"
        description="Se eliminan perfil, ajustes, ejercicios generados, historial de ejecuciones y conversaciones. No hay forma de deshacerlo."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => {
                clearAll();
                setConfirmClear(false);
                toast.ok('Datos borrados', 'Recargando la aplicacion…');
                window.setTimeout(() => window.location.reload(), 700);
              }}
            >
              Si, borrar todo
            </Button>
          </>
        }
      >
        <p className="text-[0.88rem] leading-relaxed text-muted">
          Si prefieres conservarlos, descarga antes un respaldo. La clave de la IA tampoco se borra de tu gestor de
          contadores del navegador: eliminala ahi si la has guardado de forma permanente.
        </p>
      </Modal>
    </div>
  );
}