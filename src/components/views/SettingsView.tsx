import { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Palette,
  RotateCcw,
  Sparkles,
  Terminal,
  Type,
  XCircle,
} from 'lucide-react';
import type { EditorSkin, EngineId, EnginePreference, Level } from '@/lib/types';
import { ENGINE_META, probeEngine } from '@/lib/engine';
import { MODEL_PRESETS, PROVIDER_LABEL, PROVIDER_NEEDS_KEY, testConnection } from '@/lib/ai';
import { THEME_META, THEME_ORDER, useSettings } from '@/store/settings';
import { useProfile } from '@/store/profile';
import { Badge, Dot, Panel, PanelHeader } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { CheckCard, Field, Segmented, Select, Slider, Switch, TextInput } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/store/toasts';

const LEVELS: Level[] = ['Principiante', 'Intermedio', 'Avanzado'];

const SKINS: { value: EditorSkin; label: string }[] = [
  { value: 'sync', label: 'Seguir el tema de la aplicacion' },
  { value: 'void', label: 'Forge Void' },
  { value: 'slate', label: 'Forge Slate' },
  { value: 'cyber', label: 'Forge Cyber' },
  { value: 'paper', label: 'Forge Paper' },
  { value: 'contrast', label: 'Alto contraste' },
];

export function SettingsView() {
  const settings = useSettings();
  const profile = useProfile();
  const setProfile = useProfile((s) => s.set);
  const [showKey, setShowKey] = useState(false);
  const [engineProbe, setEngineProbe] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; detail: string }>({
    state: 'idle',
    detail: 'Sin comprobar.',
  });
  const [aiProbe, setAiProbe] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; detail: string }>({
    state: 'idle',
    detail: 'Sin comprobar.',
  });
  const [confirmReset, setConfirmReset] = useState(false);

  const ai = settings.ai;
  const presets = MODEL_PRESETS[ai.provider];

  const checkEngine = async (engine: EngineId) => {
    setEngineProbe({ state: 'busy', detail: `Comprobando ${ENGINE_META[engine].label}…` });
    const result = await probeEngine(engine, settings.pistonBaseUrl, AbortSignal.timeout(20_000));
    setEngineProbe({ state: result.ok ? 'ok' : 'fail', detail: `${ENGINE_META[engine].label}: ${result.detail}` });
  };

  const checkAi = async () => {
    setAiProbe({ state: 'busy', detail: 'Contactando con el proveedor…' });
    const result = await testConnection({
      ...ai,
      apiKey: ai.keyStorage === 'session' ? settings.sessionApiKey || ai.apiKey : ai.apiKey,
    });
    setAiProbe({ state: result.ok ? 'ok' : 'fail', detail: result.detail });
  };

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
        <header>
          <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Ajustes</h1>
          <p className="mt-1 max-w-prose text-[0.88rem] leading-relaxed text-muted">
            Todo se guarda en este navegador. Ningun ajuste viaja a un servidor propio, y la clave del modelo solo se
            usa para hablar con el proveedor que elijas.
          </p>
        </header>

        {/* ------------------------------------------------------- Apariencia */}
        <Panel>
          <PanelHeader
            title="Apariencia"
            subtitle="El acento cambia de identidad en cada tema; los neutros se recalculan, no se invierten."
            icon={<Palette className="h-4 w-4" />}
          />
          <div className="flex flex-col gap-4 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {THEME_ORDER.map((theme) => (
                <CheckCard
                  key={theme}
                  checked={settings.theme === theme}
                  onChange={() => settings.setTheme(theme)}
                  title={THEME_META[theme].label}
                  description={THEME_META[theme].hint}
                  swatch={THEME_META[theme].swatch}
                />
              ))}
            </div>

            <div className="border-t border-line-soft pt-4">
              <Field
                label="Tu nivel"
                htmlFor="s-level"
                hint="El copiloto ajusta la explicacion y el tipo de retos que propone. Se guarda en tu perfil."
              >
                <div id="s-level">
                  <Segmented
                    label="Nivel"
                    value={profile.level}
                    onChange={(level) => setProfile({ level })}
                    options={LEVELS.map((l) => ({ value: l, label: l }))}
                  />
                </div>
              </Field>
            </div>
          </div>
        </Panel>

        {/* ----------------------------------------------------------- Editor */}
        <Panel>
          <PanelHeader
            title="Editor"
            subtitle="Se aplican al instante, sin recargar."
            icon={<Type className="h-4 w-4" />}
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Tema del editor" htmlFor="s-skin">
              <Select
                id="s-skin"
                value={settings.editor.skin}
                onChange={(e) => settings.setEditor({ skin: e.target.value as EditorSkin })}
                options={SKINS.map((s) => ({ value: s.value, label: s.label }))}
              />
            </Field>

            <Field label="Tabulacion" htmlFor="s-tab" hint="Cuantos espacios inserta el editor.">
              <div id="s-tab">
                <Segmented
                  label="Tabulacion"
                  value={String(settings.editor.tabSize) as '2' | '4' | '8'}
                  onChange={(value) => settings.setEditor({ tabSize: Number(value) as 2 | 4 | 8 })}
                  options={[
                    { value: '2', label: '2 espacios' },
                    { value: '4', label: '4 espacios' },
                    { value: '8', label: '8' },
                  ]}
                />
              </div>
            </Field>

            <Slider
              value={settings.editor.fontSize}
              min={11}
              max={22}
              label="Tamano de fuente"
              format={(v) => `${v} px`}
              onChange={(v) => settings.setEditor({ fontSize: v })}
            />

            <div className="flex flex-col justify-center gap-0.5 rounded-md border border-line bg-bg-deep px-3 py-2.5">
              <Switch
                checked={settings.editor.minimap}
                onChange={(v) => settings.setEditor({ minimap: v })}
                label="Minimapa"
                description="Mapa de desplazamiento a la derecha del codigo."
              />
              <Switch
                checked={settings.editor.lineNumbers}
                onChange={(v) => settings.setEditor({ lineNumbers: v })}
                label="Numeros de linea"
              />
              <Switch
                checked={settings.editor.wordWrap}
                onChange={(v) => settings.setEditor({ wordWrap: v })}
                label="Ajuste de linea"
                description="No corta las lineas largas."
              />
              <Switch
                checked={settings.editor.ligatures}
                onChange={(v) => settings.setEditor({ ligatures: v })}
                label="Ligaduras tipograficas"
                description="Convierte == en ≠ en JetBrains Mono."
              />
              <Switch
                checked={settings.editor.formatOnType}
                onChange={(v) => settings.setEditor({ formatOnType: v })}
                label="Formatear al escribir"
              />
              <Switch
                checked={settings.editor.smoothScrolling}
                onChange={(v) => settings.setEditor({ smoothScrolling: v })}
                label="Desplazamiento suave"
              />
            </div>
          </div>
        </Panel>

        {/* --------------------------------------------------------- Asistente */}
        <Panel>
          <PanelHeader
            title="Asistente IA"
            subtitle="Se conecta directo desde tu navegador al proveedor que elijas."
            icon={<Sparkles className="h-4 w-4" />}
            actions={
              aiProbe.state === 'ok' ? (
                <Badge tone="ok">
                  <CheckCircle2 className="h-3 w-3" /> conectado
                </Badge>
              ) : aiProbe.state === 'fail' ? (
                <Badge tone="err">
                  <XCircle className="h-3 w-3" /> sin conexion
                </Badge>
              ) : null
            }
          />
          <div className="flex flex-col gap-4 p-4">
            <Field label="Proveedor" htmlFor="s-provider">
              <div id="s-provider">
                <Segmented
                  label="Proveedor"
                  value={ai.provider}
                  onChange={settings.setAiProvider}
                  options={[
                    { value: 'gemini', label: 'Gemini' },
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'ollama', label: 'Ollama' },
                  ]}
                />
              </div>
            </Field>

            <p className="rounded-md border border-line bg-bg-deep px-3 py-2.5 text-[0.8rem] leading-relaxed text-muted">
              {ai.provider === 'ollama'
                ? 'Ollama corre en tu maquina. Arrancalo con `ollama serve` y luego `ollama pull <modelo>`. No hace falta ninguna clave.'
                : `Vas a usar ${PROVIDER_LABEL[ai.provider]}. La clave viaja en cada peticion desde tu navegador y no se guarda en ningun servidor de CodeForge.`}
            </p>

            {PROVIDER_NEEDS_KEY[ai.provider] && (
              <Field
                label="API key"
                htmlFor="s-key"
                actions={
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="inline-flex items-center gap-1 text-[0.75rem] text-faint transition-colors hover:text-ink"
                  >
                    {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                }
                hint={
                  ai.keyStorage === 'session'
                    ? 'Modo sesion: se borra al cerrar esta pestaña.'
                    : 'Se guarda en localStorage de este navegador. Usa sesion si trabajas en un equipo compartido.'
                }
              >
                <div className="relative">
                  <KeyRound
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-faint"
                  />
                  <TextInput
                    id="s-key"
                    type={showKey ? 'text' : 'password'}
                    value={ai.apiKey}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Pega aqui tu clave"
                    className="pl-9 font-mono"
                    onChange={(e) => settings.setAi({ apiKey: e.target.value })}
                  />
                </div>
              </Field>
            )}

            <Field label="Dónde se guarda la clave" htmlFor="s-keystore">
              <div id="s-keystore">
                <Segmented
                  label="Persistencia de la clave"
                  value={ai.keyStorage}
                  onChange={(value) => settings.setAi({ keyStorage: value })}
                  options={[
                    { value: 'local', label: 'Recordar en este navegador' },
                    { value: 'session', label: 'Solo esta sesion' },
                  ]}
                />
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="URL base" htmlFor="s-baseurl" hint="Cambiala para apuntar a un gateway compatible.">
                <TextInput
                  id="s-baseurl"
                  value={ai.baseUrl}
                  spellCheck={false}
                  className="font-mono"
                  onChange={(e) => settings.setAi({ baseUrl: e.target.value })}
                />
              </Field>
              <Field label="Modelo" htmlFor="s-model">
                <Select
                  id="s-model"
                  value={presets.some((p) => p.value === ai.model) ? ai.model : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') return;
                    settings.setAi({ model: e.target.value });
                  }}
                  options={[
                    ...presets.map((p) => ({ value: p.value, label: p.label })),
                    { value: '__custom__', label: 'Otro modelo (escribelo debajo)' },
                  ]}
                />
              </Field>
            </div>

            <Field
              label="Nombre del modelo"
              htmlFor="s-modelname"
              hint="Se envia tal cual en la peticion. Consulta los nombres disponibles en tu proveedor."
            >
              <TextInput
                id="s-modelname"
                value={ai.model}
                spellCheck={false}
                className="font-mono"
                onChange={(e) => settings.setAi({ model: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Slider
                value={ai.temperature}
                min={0}
                max={1}
                step={0.1}
                label="Temperatura"
                format={(v) => (v === 0 ? 'determinista' : v >= 0.7 ? 'creativo' : v.toFixed(1))}
                onChange={(v) => settings.setAi({ temperature: v })}
              />
              <Slider
                value={ai.maxTokens}
                min={400}
                max={8000}
                step={200}
                label="Respuesta maxima"
                format={(v) => `${v} tokens`}
                onChange={(v) => settings.setAi({ maxTokens: v })}
              />
            </div>

            <div className="rounded-md border border-line bg-bg-deep px-3 py-1">
              <Switch
                checked={settings.allowEditorWrites}
                onChange={settings.setAllowEditorWrites}
                label="Permitir aplicar codigo desde el copiloto"
                description="Muestra el boton “Reemplazar archivo” en cada bloque de codigo de la respuesta."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3.5">
              <Button variant="outline" size="sm" loading={aiProbe.state === 'busy'} onClick={() => void checkAi()}>
                Probar conexion con el modelo
              </Button>
              {aiProbe.detail && (
                <p className="flex items-center gap-1.5 text-[0.8rem] text-muted">
                  <Dot
                    tone={aiProbe.state === 'ok' ? 'ok' : aiProbe.state === 'fail' ? 'err' : 'neutral'}
                    pulse={aiProbe.state === 'busy'}
                  />
                  {aiProbe.detail}
                </p>
              )}
            </div>
          </div>
        </Panel>

        {/* -------------------------------------------------------- Ejecucion */}
        <Panel>
          <PanelHeader
            title="Motor de ejecucion"
            subtitle="Judge0, Wandbox y Piston compilan y ejecutan en un contenedor aislado. Ninguno guarda tu codigo."
            icon={<Terminal className="h-4 w-4" />}
            actions={
              engineProbe.state === 'ok' ? (
                <Badge tone="ok">operativo</Badge>
              ) : engineProbe.state === 'fail' ? (
                <Badge tone="err">sin respuesta</Badge>
              ) : null
            }
          />
          <div className="flex flex-col gap-4 p-4">
            <Field
              label="Motor preferido"
              htmlFor="s-engine"
              hint="En automatico se prueban en orden y, si uno falla o se satura, se cae al siguiente."
            >
              <div id="s-engine">
                <Segmented
                  label="Motor preferido"
                  value={settings.engine}
                  onChange={(value) => settings.setEngine(value as EnginePreference)}
                  options={[
                    { value: 'auto', label: 'Automatico' },
                    { value: 'judge0', label: 'Judge0' },
                    { value: 'wandbox', label: 'Wandbox' },
                    { value: 'piston', label: 'Piston' },
                  ]}
                />
              </div>
            </Field>

            <ul className="flex flex-col gap-1.5">
              {(Object.keys(ENGINE_META) as EngineId[]).map((engine) => (
                <li
                  key={engine}
                  className="flex items-start gap-2.5 rounded-md border border-line bg-bg-deep px-3 py-2.5"
                >
                  <Dot
                    tone={settings.engine === 'auto' || settings.engine === engine ? 'accent' : 'neutral'}
                    pulse={settings.engine === 'auto' && engine !== 'piston'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.84rem] font-medium text-ink">
                      {ENGINE_META[engine].label}
                      {ENGINE_META[engine].multiFile && (
                        <Badge tone="accent" className="ml-2">
                          multi-archivo
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-[0.77rem] leading-snug text-muted">{ENGINE_META[engine].hint}</p>
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    loading={engineProbe.state === 'busy'}
                    onClick={() => void checkEngine(engine)}
                  >
                    Probar
                  </Button>
                </li>
              ))}
            </ul>

            <Field
              label="URL base de tu Piston"
              htmlFor="s-piston"
              hint="Solo para proyectos con varios archivos: levanta tu propia instancia y pega aqui su URL."
            >
              <div className="relative">
                <Link2
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-faint"
                />
                <TextInput
                  id="s-piston"
                  value={settings.pistonBaseUrl}
                  spellCheck={false}
                  className="pl-9 font-mono"
                  onChange={(e) => settings.setPistonBaseUrl(e.target.value)}
                />
              </div>
            </Field>

            <div className="rounded-md border border-line bg-bg-deep px-3 py-1">
              <Switch
                checked={settings.soundEnabled}
                onChange={settings.setSoundEnabled}
                label="Sonido al terminar de ejecutar"
                description="Un tono corto y discreto. Util si estas haciendo otra cosa mientras pruebas."
              />
            </div>

            {engineProbe.detail !== 'Sin comprobar.' && (
              <p className="flex items-start gap-1.5 text-[0.8rem] leading-snug text-muted">
                <Dot
                  tone={engineProbe.state === 'ok' ? 'ok' : engineProbe.state === 'fail' ? 'err' : 'neutral'}
                  pulse={engineProbe.state === 'busy'}
                />
                {engineProbe.detail}
              </p>
            )}
          </div>
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
          <p className="text-[0.8rem] text-muted">Restablecer deja los ajustes de fabrica. No toca tu codigo ni tus ejercicios.</p>
          <Button variant="danger" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setConfirmReset(true)}>
            Restablecer ajustes
          </Button>
        </div>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Restablecer ajustes"
        description="Vuelve el tema, el editor, el motor y la configuracion de IA a sus valores por defecto."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                settings.resetSettings();
                setConfirmReset(false);
                toast.ok('Ajustes restablecidos');
              }}
            >
              Restablecer
            </Button>
          </>
        }
      >
        <p className="text-[0.88rem] leading-relaxed text-muted">
          La clave de la IA se borra tambien de esta maquina. Vuelve a escribirla si quieres seguir usando el copiloto.
        </p>
      </Modal>
    </div>
  );
}