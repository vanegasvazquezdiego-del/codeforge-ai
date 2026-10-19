export type LanguageId =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'cpp'
  | 'java'
  | 'rust'
  | 'go'
  | 'html'
  | 'css'
  | 'sql';

export type ThemeId = 'void' | 'slate' | 'cyber' | 'paper';
export type EditorSkin = 'sync' | 'void' | 'slate' | 'cyber' | 'paper' | 'contrast';
export type Level = 'Principiante' | 'Intermedio' | 'Avanzado';
/** Motores externos de ejecución de código. */
export type EngineId = 'judge0' | 'wandbox' | 'piston';
export type EnginePreference = EngineId | 'auto';
export type RunStatus = 'ok' | 'error' | 'timeout' | 'running';
export type EngineKind = 'remote' | 'preview' | 'sql';

export interface CodeFile {
  id: string;
  name: string;
  content: string;
  /** Archivo de entrada. Piston ejecuta el primero de la lista. */
  entry: boolean;
}

export interface RunResult {
  id: string;
  languageId: LanguageId;
  status: RunStatus;
  stdout: string;
  stderr: string;
  /** stdout+stderr combinados, tal cual lo devuelve el motor. */
  output: string;
  exitCode: number | null;
  signal: string | null;
  /** Milisegundos de reloj del navegador (ida + vuelta). */
  wallMs: number;
  /** Tiempo de CPU informado por el motor, si lo hay. */
  cpuMs: number | null;
  createdAt: number;
  /** Texto de error legible cuando el motor falló (red, 503, timeout local…). */
  engineError: string | null;
}

export interface TestCase {
  id: string;
  label: string;
  stdin: string;
  expected: string;
}

export type CaseOutcome = 'pass' | 'fail' | 'error';

export interface CaseResult {
  id: string;
  label: string;
  outcome: CaseOutcome;
  stdin: string;
  expected: string;
  actual: string;
  wallMs: number;
  engineError: string | null;
}

export interface Exercise {
  id: string;
  title: string;
  languageId: LanguageId;
  level: Level;
  statement: string;
  /** Lista corta de conceptos clave (para chips). */
  concepts: string[];
  starter: string;
  hint: string;
  tests: TestCase[];
  origin: 'seed' | 'ai';
  createdAt: number;
  solvedAt: number | null;
}

export interface ExerciseDraft {
  title: string;
  level: Level;
  statement: string;
  concepts: string[];
  starter: string;
  hint: string;
  tests: TestCase[];
}

export type AiProvider = 'gemini' | 'openai' | 'ollama';

export type AiRole = 'user' | 'assistant';

export interface AiMessage {
  id: string;
  role: AiRole;
  content: string;
  createdAt: number;
  /** Acción rápida que originó el mensaje, si aplica. */
  action?: AiActionId;
  pending?: boolean;
  error?: string;
}

export type AiActionId =
  | 'explain'
  | 'debug'
  | 'optimize'
  | 'exercise'
  | 'teach'
  | 'freeform';

export interface AssistantContext {
  languageId: LanguageId;
  /** Código seleccionado en el editor, si lo hay. */
  selection: string;
  selectionStartLine: number | null;
  selectionEndLine: number | null;
  /** Código completo del archivo activo. */
  code: string;
  fileName: string;
  /** Último error de ejecución, para el modo depurar. */
  lastError: string | null;
  lastRunOk: boolean | null;
  level: Level;
}

export interface Profile {
  name: string;
  role: string;
  level: Level;
  bio: string;
  /** Data URL de la imagen subida (o vacío). */
  avatar: string;
  goalMinutesPerDay: number;
}

export interface DayLog {
  /** ISO yyyy-mm-dd */
  day: string;
  runs: number;
  solved: number;
  /** Executions that terminated without engine error. */
  cleanRuns: number;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: 2 | 4 | 8;
  skin: EditorSkin;
  minimap: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  ligatures: boolean;
  formatOnType: boolean;
  smoothScrolling: boolean;
}

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  /** 'local' persiste la clave; 'session' la borra al cerrar la pestaña. */
  keyStorage: 'local' | 'session';
}

export interface AppSettings {
  theme: ThemeId;
  editor: EditorSettings;
  ai: AiSettings;
  /** Motor preferido: 'auto' rota entre los que soporten el lenguaje. */
  engine: EnginePreference;
  pistonBaseUrl: string;
  stdin: string;
  /** Autorizar que las respuestas de la IA se apliquen al editor con un clic. */
  allowEditorWrites: boolean;
  /** Volumen del "ding" de ejecución (0 = mudo). */
  soundEnabled: boolean;
}

export interface Toast {
  id: string;
  tone: 'info' | 'ok' | 'warn' | 'err';
  title: string;
  detail?: string;
}

export type ViewId = 'editor' | 'exercises' | 'profile' | 'settings';