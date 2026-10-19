import { useEffect, useRef, useState } from 'react';
import { FilePlus2, MoreVertical, RotateCcw, Star, X } from 'lucide-react';
import { useWorkspace } from '@/store/workspace';
import { getLanguage } from '@/lib/languages';
import { Button, IconButton } from '@/components/ui/Button';
import { MenuItem, Popover } from '@/components/ui/Popover';
import { toast } from '@/store/toasts';
import { cn } from '@/lib/cn';

export function FileTabs() {
  const files = useWorkspace((s) => s.files);
  const activeId = useWorkspace((s) => s.activeId);
  const languageId = useWorkspace((s) => s.languageId);
  const setActive = useWorkspace((s) => s.setActive);
  const addFile = useWorkspace((s) => s.addFile);
  const removeFile = useWorkspace((s) => s.removeFile);
  const setEntry = useWorkspace((s) => s.setEntry);
  const resetToStarter = useWorkspace((s) => s.resetToStarter);

  const lang = getLanguage(languageId);

  return (
    <div className="flex items-center gap-1.5 border-b border-line bg-bg-deep/60 px-2">
      <div className="scroll-thin flex flex-1 items-stretch gap-1 overflow-x-auto" role="tablist" aria-label="Archivos del proyecto">
        {files.map((file) => {
          const active = file.id === activeId;
          return (
            <Tab
              key={file.id}
              id={file.id}
              name={file.name}
              active={active}
              entry={file.entry}
              canDelete={files.length > 1}
              onSelect={() => setActive(file.id)}
              onDelete={() => {
                removeFile(file.id);
                toast.info(`Se elimino ${file.name}`);
              }}
            />
          );
        })}
        <IconButton label="Nuevo archivo" onClick={addFile} className="my-auto h-7 w-7 shrink-0">
          <FilePlus2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      <Popover
        align="end"
        width="w-56"
        trigger={({ toggle, id, open }) => (
          <IconButton label="Acciones del proyecto" id={id} onClick={toggle} active={open} className="my-auto h-7 w-7 shrink-0">
            <MoreVertical className="h-3.5 w-3.5" />
          </IconButton>
        )}
      >
        {(close) => (
          <div role="menu" aria-label="Acciones del proyecto">
            <MenuItem
              onClick={() => {
                close();
                resetToStarter();
                toast.ok('Proyecto reiniciado', `Se restauro la plantilla de ${lang.label}.`);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar plantilla
            </MenuItem>
            <MenuItem
              onClick={() => {
                const target = files.find((f) => !f.entry);
                if (!target) {
                  toast.warn('Ya hay un archivo de entrada', 'Marca otro como entrada para ejecutar varios.');
                  return;
                }
                setEntry(target.id);
                close();
                toast.ok('Archivo de entrada cambiado', `Ahora se ejecuta ${target.name}.`);
              }}
            >
              <Star className="h-3.5 w-3.5" />
              Marcar otro como entrada
            </MenuItem>
          </div>
        )}
      </Popover>
    </div>
  );
}

function Tab({
  id,
  name,
  active,
  entry,
  canDelete,
  onSelect,
  onDelete,
}: {
  id: string;
  name: string;
  active: boolean;
  entry: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const rename = useWorkspace((s) => s.renameFile);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <form
        className="my-1 flex shrink-0 items-center"
        onSubmit={(e) => {
          e.preventDefault();
          rename(id, draft);
          setEditing(false);
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          aria-label="Nuevo nombre de archivo"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            rename(id, draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
          }}
          className="h-7 w-36 rounded-sm border border-accent-line bg-bg-deep px-2 font-mono text-[0.75rem] text-ink focus:outline-none"
        />
      </form>
    );
  }

  return (
    <div
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      onDoubleClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
        if (e.key === 'F2') setEditing(true);
      }}
      title={`${name}${entry ? ' · archivo de entrada' : ''} — doble clic para renombrar`}
      className={cn(
        'group my-1 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border px-2.5 text-[0.78rem]',
        'transition-[background-color,border-color,color] duration-150',
        active
          ? 'border-line-strong bg-surface text-ink shadow-e1'
          : 'border-transparent text-muted hover:bg-elev hover:text-ink',
      )}
    >
      {entry && <Star aria-label="archivo de entrada" className="h-3 w-3 shrink-0 text-accent" fill="currentColor" />}
      <span className="font-mono">{name}</span>
      {canDelete && (
        <button
          type="button"
          aria-label={`Cerrar ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="-mr-1 rounded-sm p-0.5 text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:text-err"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Botón reutilizable para la barra del editor (ejecutar, guardar plantilla…). */
export function ToolbarButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <Button size="xs" variant="ghost" onClick={onClick} title={title} className="font-mono">
      {children}
    </Button>
  );
}