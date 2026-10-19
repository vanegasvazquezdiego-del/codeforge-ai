import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  ChevronsDownUp,
  CopyPlus,
  FileCode2,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';
import type { CodeFile, LanguageId } from '@/lib/types';
import {
  basename,
  buildTree,
  dirname,
  extname,
  type TreeNode,
} from '@/lib/files';
import { getLanguage } from '@/lib/languages';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui/Button';
import { ContextItem, ContextMenu, ContextSeparator, type ContextState } from '@/components/ui/ContextMenu';
import { toast } from '@/store/toasts';

/** Icono por extension, como en el explorador de VS Code. */
function iconFor(name: string, entry: boolean) {
  if (entry) return Star;
  const ext = extname(name);
  const code = new Set(['.py', '.js', '.ts', '.cpp', '.java', '.rs', '.go', '.css', '.html', '.sql']);
  return code.has(ext) ? FileCode2 : FileText;
}

/** Editor en linea con el truco de VS Code: la extension queda seleccionada. */
function InlineInput({
  initial,
  selectSuffix,
  placeholder,
  label,
  onCancel,
  onCommit,
}: {
  initial: string;
  selectSuffix: string;
  placeholder: string;
  label: string;
  onCancel: () => void;
  /** `true` acepta y cierra; un string es el error que se muestra bajo el input. */
  onCommit: (value: string) => true | string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    // Selecciona solo la parte "sufijo": `untitled.py` -> "py" seleccionado.
    if (selectSuffix && initial.endsWith(selectSuffix)) {
      node.setSelectionRange(initial.length - selectSuffix.length, initial.length);
    } else {
      node.select();
    }
  }, [initial, selectSuffix]);

  const submit = () => {
    // Enter dispara onSubmit y luego onBlur al desmontarse el input:
    // sin este cerrojo se crearian dos archivos con el mismo nombre.
    if (done.current) return;
    const result = onCommit(value);
    if (result === true) {
      done.current = true;
      return;
    }
    setError(result);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="py-0.5"
    >
      <input
        ref={ref}
        value={value}
        aria-label={label}
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={submit}
        className={cn(
          'w-full rounded-sm border bg-bg-deep px-1.5 py-1 font-mono text-[0.78rem] text-ink',
          'focus:outline-none focus:ring-1',
          error ? 'border-err focus:ring-err/40' : 'border-accent-line focus:ring-accent/30',
        )}
      />
      {error && <p className="mt-1 px-1 text-[0.7rem] text-err">{error}</p>}
    </form>
  );
}

type Draft = { kind: 'file' | 'folder'; folder: string } | { kind: 'rename'; id: string } | null;

export function FileExplorer({
  collapsed,
  onToggle,
  languageId,
}: {
  collapsed: boolean;
  onToggle: () => void;
  languageId: LanguageId;
}) {
  const files = useWorkspace((s) => s.files);
  const activeId = useWorkspace((s) => s.activeId);
  const setActive = useWorkspace((s) => s.setActive);
  const createFile = useWorkspace((s) => s.createFile);
  const createFolder = useWorkspace((s) => s.createFolder);
  const renameFile = useWorkspace((s) => s.renameFile);
  const duplicateFile = useWorkspace((s) => s.duplicateFile);
  const removeFile = useWorkspace((s) => s.removeFile);
  const removeFolder = useWorkspace((s) => s.removeFolder);
  const setEntry = useWorkspace((s) => s.setEntry);

  const lang = getLanguage(languageId);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState<Draft>(null);
  const [menu, setMenu] = useState<ContextState | null>(null);

  const tree = useMemo(() => buildTree(files), [files]);

  const toggleFolder = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // Si el archivo activo esta en una carpeta cerrada, se abre para no perderlo.
  const activeFile = files.find((file) => file.id === activeId);
  useEffect(() => {
    if (!activeFile) return;
    const folder = dirname(activeFile.name);
    if (!folder) return;
    setExpanded((prev) => {
      if (prev.has(folder)) return prev;
      const next = new Set(prev);
      let current = folder;
      while (current) {
        next.add(current);
        current = dirname(current);
      }
      return next;
    });
  }, [activeFile]);

  const copyPath = (path: string) => {
    void navigator.clipboard?.writeText(path).then(() => toast.ok('Ruta copiada', path));
  };

  if (collapsed) {
    return (
      <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-2">
        <IconButton label="Mostrar el explorador" onClick={onToggle} active>
          <FilesIcon />
        </IconButton>
      </div>
    );
  }

  return (
    <aside
      aria-label="Explorador de archivos"
      className="flex w-64 shrink-0 flex-col border-r border-line bg-surface"
    >
      <header className="flex h-8 shrink-0 items-center gap-0.5 border-b border-line-soft px-2">
        <h2 className="flex-1 truncate text-micro font-semibold uppercase tracking-widest text-faint">
          Explorador
        </h2>
        <IconButton
          label="Nuevo archivo"
          className="h-6 w-6"
          onClick={() => setDraft({ kind: 'file', folder: '' })}
        >
          <FilePlus2 className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Nueva carpeta" className="h-6 w-6" onClick={() => setDraft({ kind: 'folder', folder: '' })}>
          <FolderPlus className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Contraer carpetas" className="h-6 w-6" onClick={collapseAll}>
          <ChevronsDownUp className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Ocultar el explorador" className="h-6 w-6" onClick={onToggle}>
          <PanelIcon />
        </IconButton>
      </header>

      <div
        role="tree"
        aria-label="Archivos del proyecto"
        onContextMenu={(e) => {
          // Clic derecho en el vacio: menu de la carpeta raiz.
          if (e.target === e.currentTarget) {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY, payload: { kind: 'root' } });
          }
        }}
        className="scroll-thin min-h-0 flex-1 overflow-auto py-1"
      >
        {draft?.kind === 'file' && draft.folder === '' && (
          <div style={{ paddingLeft: 8 }}>
            <InlineInput
              initial={`untitled.${lang.ext}`}
              selectSuffix={`.${lang.ext}`}
              placeholder={`nombre.${lang.ext}`}
              label="Nombre del nuevo archivo"
              onCancel={() => setDraft(null)}
              onCommit={(value) => {
                const result = createFile('', value);
                if (!result.ok) return result.error ?? 'Nombre no valido.';
                setDraft(null);
                return true;
              }}
            />
          </div>
        )}
        {draft?.kind === 'folder' && draft.folder === '' && (
          <div style={{ paddingLeft: 8 }}>
            <InlineInput
              initial="nueva-carpeta"
              selectSuffix="carpeta"
              placeholder="nombre-de-carpeta"
              label="Nombre de la nueva carpeta"
              onCancel={() => setDraft(null)}
              onCommit={(value) => {
                const result = createFolder('', value);
                if (!result.ok) return result.error ?? 'Nombre no valido.';
                setExpanded((prev) => new Set(prev).add(result.path ?? ''));
                setDraft(null);
                return true;
              }}
            />
          </div>
        )}

        {tree.map((node) => (
          <Node
            key={node.path || '__root__'}
            node={node}
            depth={node.depth}
            expanded={expanded}
            draft={draft}
            setDraft={setDraft}
            activeId={activeId}
            files={files}
            languageId={languageId}
            onToggleFolder={toggleFolder}
            onOpen={setActive}
            onMenu={(event, payload) => {
              event.preventDefault();
              event.stopPropagation();
              setMenu({ x: event.clientX, y: event.clientY, payload });
            }}
            actions={{
              renameFile,
              duplicateFile,
              removeFile,
              removeFolder,
              setEntry,
              createFile,
              createFolder,
              setExpanded,
              copyPath,
              setDraft,
            }}
          />
        ))}

        {tree.length === 0 && (
          <p className="px-3 py-6 text-center text-[0.76rem] text-faint">
            No hay archivos. Usa el icono + para crear el primero.
          </p>
        )}
      </div>

      <footer className="shrink-0 border-t border-line-soft px-2.5 py-1.5">
        <p className="truncate text-[0.7rem] text-faint">
          {files.length} {files.length === 1 ? 'archivo' : 'archivos'} ·{' '}
          <span className="text-accent">{files.filter((f) => f.entry).length ? basename(files.find((f) => f.entry)!.name) : 'sin entrada'}</span>
        </p>
      </footer>

      <ContextMenu state={menu} onClose={() => setMenu(null)}>
        {menuAction(menu, {
          files,
          renameFile,
          duplicateFile,
          removeFile,
          removeFolder,
          setEntry,
          createFile,
          createFolder,
          copyPath,
          setDraft,
          close: () => setMenu(null),
        })}
      </ContextMenu>
    </aside>
  );
}

/* -------------------------------------------------------------------------
   Nodos
   ------------------------------------------------------------------------- */

type Actions = {
  renameFile: (id: string, name: string) => { ok: boolean; error?: string };
  duplicateFile: (id: string) => { ok: boolean; id?: string; error?: string };
  removeFile: (id: string) => void;
  removeFolder: (folder: string) => number;
  setEntry: (id: string) => { ok: boolean; error?: string };
  createFile: (folder: string, name: string) => { ok: boolean; id?: string; error?: string };
  createFolder: (folder: string, name: string) => { ok: boolean; path?: string; error?: string };
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  copyPath: (path: string) => void;
  setDraft: (draft: Draft) => void;
};

function Node({
  node,
  depth,
  expanded,
  draft,
  setDraft,
  activeId,
  files,
  languageId,
  onToggleFolder,
  onOpen,
  onMenu,
  actions,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  draft: Draft;
  setDraft: (draft: Draft) => void;
  activeId: string;
  files: CodeFile[];
  languageId: LanguageId;
  onToggleFolder: (path: string) => void;
  onOpen: (id: string) => void;
  onMenu: (event: React.MouseEvent, payload: unknown) => void;
  actions: Actions;
}) {
  const indent = 8 + depth * 12;
  const open = expanded.has(node.path);

  if (node.kind === 'folder') {
    const children: TreeNode[] = node.children;
    const creatingFile = draft?.kind === 'file' && draft.folder === node.path;
    const creatingFolder = draft?.kind === 'folder' && draft.folder === node.path;

    return (
      <div role="none">
        <button
          type="button"
          role="treeitem"
          aria-expanded={open}
          onClick={() => onToggleFolder(node.path)}
          onContextMenu={(e) => onMenu(e, { kind: 'folder', path: node.path })}
          style={{ paddingLeft: indent }}
          className="group flex w-full items-center gap-1 py-[3px] pr-2 text-left text-[0.8rem] text-muted transition-colors duration-100 hover:bg-elev hover:text-ink"
        >
          {open ? (
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-faint" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-faint" />
          )}
          {open ? (
            <FolderOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
          ) : (
            <Folder aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent/70" />
          )}
          <span className="truncate">{node.name}</span>
        </button>

        {open && (
          <div role="group">
            {creatingFile && (
              <div style={{ paddingLeft: indent + 18 }}>
                <InlineInput
                  initial={`untitled.${getLanguage(languageId).ext}`}
                  selectSuffix={`.${getLanguage(languageId).ext}`}
                  placeholder="nombre"
                  label={`Nombre del archivo en ${node.path}`}
                  onCancel={() => setDraft(null)}
                  onCommit={(value) => {
                    const result = actions.createFile(node.path, value);
                    if (!result.ok) return result.error ?? 'Nombre no valido.';
                    setDraft(null);
                    return true;
                  }}
                />
              </div>
            )}
            {creatingFolder && (
              <div style={{ paddingLeft: indent + 18 }}>
                <InlineInput
                  initial="nueva-carpeta"
                  selectSuffix="carpeta"
                  placeholder="nombre"
                  label={`Nombre de la carpeta en ${node.path}`}
                  onCancel={() => setDraft(null)}
                  onCommit={(value) => {
                    const result = actions.createFolder(node.path, value);
                    if (!result.ok) return result.error ?? 'Nombre no valido.';
                    const created = result.path ?? '';
                    let current = dirname(created);
                    const next = new Set(expanded);
                    while (current) {
                      next.add(current);
                      current = dirname(current);
                    }
                    actions.setExpanded(next);
                    setDraft(null);
                    return true;
                  }}
                />
              </div>
            )}

            {children.map((child) => (
              <Node
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                draft={draft}
                setDraft={setDraft}
                activeId={activeId}
                files={files}
                languageId={languageId}
                onToggleFolder={onToggleFolder}
                onOpen={onOpen}
                onMenu={onMenu}
                actions={actions}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Archivo ---
  if (node.anchor) return null;
  const active = node.file.id === activeId;
  const isEntry = node.file.entry;
  const renaming = draft?.kind === 'rename' && draft.id === node.file.id;
  const Icon = iconFor(node.name, isEntry);

  return (
    <div role="none">
      {renaming ? (
        <div style={{ paddingLeft: indent + 18 }}>
          <InlineInput
            initial={basename(node.name)}
            selectSuffix=""
            placeholder="nombre"
            label={`Renombrar ${node.name}`}
            onCancel={() => setDraft(null)}
            onCommit={(value) => {
              const result = actions.renameFile(node.file.id, value);
              if (!result.ok) return result.error ?? 'Nombre no valido.';
              setDraft(null);
              return true;
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          role="treeitem"
          aria-selected={active}
          onClick={() => onOpen(node.file.id)}
          onDoubleClick={() => setDraft({ kind: 'rename', id: node.file.id })}
          onKeyDown={(e) => {
            if (e.key === 'F2') setDraft({ kind: 'rename', id: node.file.id });
            if (e.key === 'Enter') onOpen(node.file.id);
          }}
          onContextMenu={(e) => onMenu(e, { kind: 'file', id: node.file.id, path: node.path })}
          title={node.path}
          style={{ paddingLeft: indent + 18 }}
          className={cn(
            'group flex w-full items-center gap-1.5 py-[3px] pr-2 text-left text-[0.8rem] transition-colors duration-100',
            active ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-elev hover:text-ink',
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn('h-3.5 w-3.5 shrink-0', isEntry ? 'text-accent' : 'text-faint')}
            fill={isEntry ? 'currentColor' : 'none'}
          />
          <span className={cn('truncate', isEntry && 'font-medium')}>{node.name}</span>
          {isEntry && (
            <span className="ml-auto shrink-0 rounded-full border border-accent-line px-1.5 text-[0.58rem] tracking-wider text-accent uppercase">
              main
            </span>
          )}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Menu contextual
   ------------------------------------------------------------------------- */

type Payload =
  | { kind: 'root' }
  | { kind: 'folder'; path: string }
  | { kind: 'file'; id: string; path: string };

function menuAction(
  menu: ContextState | null,
  api: {
    files: CodeFile[];
    renameFile: Actions['renameFile'];
    duplicateFile: Actions['duplicateFile'];
    removeFile: Actions['removeFile'];
    removeFolder: Actions['removeFolder'];
    setEntry: Actions['setEntry'];
    createFile: Actions['createFile'];
    createFolder: Actions['createFolder'];
    copyPath: (path: string) => void;
    setDraft: (draft: Draft) => void;
    close: () => void;
  },
) {
  const payload = menu?.payload as Payload | undefined;
  if (!payload) return null;

  const done = (result: { ok: boolean; error?: string }, okMessage: string) => {
    api.close();
    if (!result.ok) toast.warn('No se pudo hacer', result.error);
    else toast.ok(okMessage);
  };

  if (payload.kind === 'root') {
    return (
      <>
        <ContextItem
          icon={<FilePlus2 className="h-3.5 w-3.5" />}
          onClick={() => {
            api.close();
            api.setDraft({ kind: 'file', folder: '' });
          }}
        >
          Nuevo archivo
        </ContextItem>
        <ContextItem
          icon={<FolderPlus className="h-3.5 w-3.5" />}
          onClick={() => {
            api.close();
            api.setDraft({ kind: 'folder', folder: '' });
          }}
        >
          Nueva carpeta
        </ContextItem>
      </>
    );
  }

  if (payload.kind === 'folder') {
    return (
      <>
        <ContextItem
          icon={<FilePlus2 className="h-3.5 w-3.5" />}
          onClick={() => {
            api.close();
            api.setDraft({ kind: 'file', folder: payload.path });
          }}
        >
          Nuevo archivo
        </ContextItem>
        <ContextItem
          icon={<FolderPlus className="h-3.5 w-3.5" />}
          onClick={() => {
            api.close();
            api.setDraft({ kind: 'folder', folder: payload.path });
          }}
        >
          Nueva carpeta
        </ContextItem>
        <ContextSeparator />
        <ContextItem
          icon={<Copy className="h-3.5 w-3.5" />}
          onClick={() => {
            api.close();
            api.copyPath(payload.path);
          }}
          shortcut={`${api.files.filter((f) => f.name.startsWith(`${payload.path}/`)).length} archivos`}
        >
          Copiar ruta
        </ContextItem>
        <ContextItem
          icon={<Trash2 className="h-3.5 w-3.5" />}
          danger
          onClick={() => {
            const removed = api.removeFolder(payload.path);
            api.close();
            if (removed) toast.warn(`Se elimino la carpeta ${payload.path}`, `${removed} archivos dentro.`);
          }}
        >
          Eliminar carpeta
        </ContextItem>
      </>
    );
  }

  const file = api.files.find((f) => f.id === payload.id);
  if (!file) return null;

  return (
    <>
      <ContextItem
        icon={<Pencil className="h-3.5 w-3.5" />}
        onClick={() => {
          api.close();
          api.setDraft({ kind: 'rename', id: payload.id });
        }}
        shortcut="F2"
      >
        Renombrar
      </ContextItem>
      <ContextItem
        icon={<CopyPlus className="h-3.5 w-3.5" />}
        onClick={() => {
          const result = api.duplicateFile(payload.id);
          api.close();
          if (!result.ok) toast.warn('No se pudo duplicar', result.error);
          else toast.ok('Archivo duplicado');
        }}
      >
        Duplicar
      </ContextItem>
      <ContextItem
        icon={<Copy className="h-3.5 w-3.5" />}
        onClick={() => {
          api.close();
          api.copyPath(payload.path);
        }}
      >
        Copiar ruta
      </ContextItem>
      {!file.entry && (
        <ContextItem
          icon={<Star className="h-3.5 w-3.5" />}
          onClick={() => done(api.setEntry(payload.id), `${basename(payload.path)} es ahora el archivo de entrada.`)}
        >
          Marcar como entrada
        </ContextItem>
      )}
      <ContextSeparator />
      <ContextItem
        icon={<Trash2 className="h-3.5 w-3.5" />}
        danger
        disabled={api.files.length <= 1}
        onClick={() => {
          api.removeFile(payload.id);
          api.close();
          toast.info(`Se elimino ${basename(payload.path)}`);
        }}
      >
        Eliminar
      </ContextItem>
    </>
  );
}

function FilesIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M1.8 12.5v-9A.8.8 0 0 1 2.6 2.7h3.6l1.4 1.6h5.6a.8.8 0 0 1 .8.8v7.4a.8.8 0 0 1-.8.8H2.6a.8.8 0 0 1-.8-.8Z" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.2" />
      <path d="M6.4 2.8v10.4" />
    </svg>
  );
}