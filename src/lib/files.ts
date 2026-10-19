import type { CodeFile, LanguageId } from './types';
import { getLanguage } from './languages';

/* =========================================================================
   Rutas de archivo
   -------------------------------------------------------------------------
   `CodeFile.name` es una ruta relativa tipo `src/utiles.py`. Las carpetas son
   implicitas: se derivan de las rutas, igual que en Git. Asi no hay dos
   fuentes de verdad (una carpeta y sus archivos) que se desincronicen.
   ========================================================================= */

export const MAX_DEPTH = 6;
export const MAX_FILES = 40;
/** Archivo ancla que mantiene viva una carpeta vacia (mismo truco que Git). */
export const ANCHOR_NAME = '.keep';

/** Caracteres que Windows y macOS rechazan. */
const ILLEGAL = /[<>:"|?*\\]/;
/** Caracteres de control y espacios no imprimibles. */
const CONTROL = /[\u0000-\u001f\u007f]/;

export function dirname(path: string): string {
  const clean = path.replace(/\/+$/, '');
  const index = clean.lastIndexOf('/');
  return index === -1 ? '' : clean.slice(0, index);
}

export function basename(path: string): string {
  const clean = path.replace(/\/+$/, '');
  const index = clean.lastIndexOf('/');
  return index === -1 ? clean : clean.slice(index + 1);
}

export function extname(path: string): string {
  const name = basename(path);
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index);
}

/** `src/utiles.py` -> `utiles` */
export function stem(path: string): string {
  const name = basename(path);
  const ext = extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

/** Normaliza lo que escribe la persona: sin barras iniciales ni espacios sueltos. */
export function normalizePath(input: string): string {
  return input
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/')
    .map((segment) => segment.trim().replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('/');
}

export interface NameProblem {
  message: string;
}

/** Devuelve `null` si el nombre es valido, o el motivo del rechazo. */
export function validatePath(input: string, files: CodeFile[]): NameProblem | null {
  const path = normalizePath(input);
  if (!path) return { message: 'El nombre no puede estar vacio.' };

  const segments = path.split('/');
  if (segments.some((segment) => ILLEGAL.test(segment))) {
    return { message: 'No puedes usar < > : " | ? * ni barras inversas en el nombre.' };
  }
  if (segments.some((segment) => CONTROL.test(segment))) {
    return { message: 'El nombre no puede llevar saltos de linea ni caracteres de control.' };
  }
  if (segments.some((segment) => /^\.+$/.test(segment))) {
    return { message: '". " y ".." no son nombres validos.' };
  }
  if (segments.length > MAX_DEPTH) {
    return { message: `Como mucho ${MAX_DEPTH} niveles de carpeta.` };
  }
  if (files.length >= MAX_FILES) {
    return { message: `El proyecto esta limitado a ${MAX_FILES} archivos.` };
  }
  if (files.some((file) => file.name === path)) {
    return { message: `Ya existe "${basename(path)}" en esa carpeta.` };
  }
  if (files.some((file) => file.name.startsWith(`${path}/`))) {
    return { message: `Ya existe una carpeta llamada "${basename(path)}".` };
  }
  return null;
}

/** `src/datos.py` -> `src/datos2.py`, como hace VS Code. */
export function uniquePath(path: string, files: CodeFile[]): string {
  if (!files.some((file) => file.name === path)) return path;
  const dir = dirname(path);
  const base = stem(path);
  const ext = extname(path);
  for (let n = 2; n < 200; n += 1) {
    const candidate = `${dir ? `${dir}/` : ''}${base}${n}${ext}`;
    if (!files.some((file) => file.name === candidate)) return candidate;
  }
  return path;
}

/* -------------------------------------------------------------------------
   Arbol
   ------------------------------------------------------------------------- */

export interface TreeFile {
  kind: 'file';
  path: string;
  name: string;
  file: CodeFile;
  depth: number;
  /** Ancla interna: solo existe para que una carpeta vacia se vea en el arbol. */
  anchor?: boolean;
}

export interface TreeFolder {
  kind: 'folder';
  path: string;
  name: string;
  depth: number;
  children: TreeNode[];
}

export type TreeNode = TreeFile | TreeFolder;

export function buildTree(files: CodeFile[]): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', path: '', name: '', depth: -1, children: [] };
  const folders = new Map<string, TreeFolder>([['', root]]);

  function ensureFolder(path: string, depth: number): TreeFolder {
    const existing = folders.get(path);
    if (existing) return existing;
    const parent = ensureFolder(dirname(path), depth - 1);
    const folder: TreeFolder = { kind: 'folder', path, name: basename(path), depth, children: [] };
    parent.children.push(folder);
    folders.set(path, folder);
    return folder;
  }

  for (const file of files) {
    const path = normalizePath(file.name) || file.name;
    const depth = path.split('/').length - 1;
    const parent = ensureFolder(dirname(path), depth - 1);
    parent.children.push({
      kind: 'file',
      path,
      name: basename(path),
      file: { ...file, name: path },
      depth,
      anchor: basename(path) === ANCHOR_NAME,
    });
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' });
    });
    nodes.forEach((node) => {
      if (node.kind === 'folder') sort(node.children);
    });
  };
  sort(root.children);
  return root.children;
}

/** Todas las rutas de carpeta presentes en el proyecto. */
export function allFolderPaths(files: CodeFile[]): string[] {
  const set = new Set<string>();
  for (const file of files) {
    let current = dirname(file.name);
    while (current) {
      set.add(current);
      current = dirname(current);
    }
  }
  return [...set].sort();
}

/** Todo lo que vive dentro de una carpeta, recursivamente. */
export function filesInFolder(files: CodeFile[], folder: string): CodeFile[] {
  const prefix = `${folder}/`;
  return files.filter((file) => file.name.startsWith(prefix));
}

/** Cuantas carpetas hay por debajo de `folder` (para el contador de la etiqueta). */
export function countUnder(folder: string, files: CodeFile[]): number {
  return filesInFolder(files, folder).length;
}

/* -------------------------------------------------------------------------
   Contenido inicial
   ------------------------------------------------------------------------- */

/** Comentario de cabecera segun el lenguaje, para que el archivo no este vacio. */
export function skeletonFor(languageId: LanguageId, path: string): string {
  const lang = getLanguage(languageId);
  const title = basename(path);

  if (lang.id === 'sql') return `-- ${title}\n`;
  if (lang.id === 'html') {
    return (
      `<!doctype html>\n<html lang="es">\n  <head>\n    <meta charset="utf-8" />\n` +
      `    <title>${title}</title>\n  </head>\n  <body>\n    \n  </body>\n</html>\n`
    );
  }
  if (lang.id === 'css') return `/* ${title} */\n`;

  const slashes = new Set(['javascript', 'typescript', 'cpp', 'java', 'rust', 'go']);
  if (lang.id === 'python') {
    return `def ${stem(path) || 'main'}():\n    # TODO: implementa ${title}\n    pass\n`;
  }
  return slashes.has(lang.id) ? `// ${title}\n` : `# ${title}\n`;
}