import { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import type { CodeFile } from '@/lib/types';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, EmptyState } from '@/components/ui/Primitives';

const CSS_SCAFFOLD = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview de CSS</title>
    <style>__FORGE_STYLES__</style>
  </head>
  <body>
    <article class="card">
      <h1>Hola, CodeForge</h1>
      <p>Edita el CSS y este documento de muestra se actualiza.</p>
      <ul>
        <li>Rejilla con auto-fit</li>
        <li>Variables CSS</li>
        <li>Sin media queries</li>
      </ul>
      <button type="button">Boton de muestra</button>
    </article>
  </body>
</html>`;

function buildDocument(files: CodeFile[]): string {
  const css = files
    .filter((f) => f.name.endsWith('.css'))
    .map((f) => f.content)
    .join('\n');

  const htmlFile = files.find((f) => f.name.endsWith('.html') && f.entry) ?? files.find((f) => f.name.endsWith('.html'));
  const html = htmlFile?.content ?? CSS_SCAFFOLD;

  if (!htmlFile) return CSS_SCAFFOLD.replace('__FORGE_STYLES__', css);

  if (!css.trim()) return html;

  const styleTag = `<style data-forge="css">\n${css}\n</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${styleTag}\n</head>`);
  if (/<head[^>]*>/i.test(html)) return html.replace(/(<head[^>]*>)/i, `$1\n${styleTag}`);
  return `${styleTag}\n${html}`;
}

export function PreviewPane({ files }: { files: CodeFile[] }) {
  const [nonce, setNonce] = useState(0);
  const [doc, setDoc] = useState('');

  const pending = useMemo(() => buildDocument(files), [files]);

  // Debounce: el preview no debe re-renderizar en cada tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => setDoc(pending), 320);
    return () => window.clearTimeout(timer);
  }, [pending, nonce]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
        <Eye aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
        <h2 className="text-[0.82rem] font-semibold tracking-tight text-ink">Preview</h2>
        <Badge tone="accent">sandbox</Badge>
        <div className="ml-auto">
          <IconButton label="Recargar preview" onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-bg-deep">
        {!doc ? (
          <EmptyState
            icon={<Eye className="h-5 w-5" />}
            title="Nada que previsualizar"
            description="El documento se generara en cuanto escribas."
            className="absolute inset-4 border-0"
          />
        ) : (
          <iframe
            key={`${nonce}-${doc.length}`}
            title="Preview del resultado"
            srcDoc={doc}
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            referrerPolicy="no-referrer"
            className="anim-fade-in h-full w-full border-0"
          />
        )}
      </div>

      <footer className="border-t border-line-soft px-3 py-2">
        <p className="text-[0.72rem] leading-snug text-faint">
          El preview corre en un iframe aislado, sin acceso a esta pagina. Los estilos de tus archivos CSS se inyectan
          automaticamente.
        </p>
      </footer>
    </div>
  );
}

export function PreviewHint({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="max-w-sm text-[0.85rem] leading-relaxed text-muted">
        Elige HTML o CSS en el selector de lenguaje para ver el resultado renderizado al lado del editor.
      </p>
      <Button size="sm" variant="outline" onClick={onSwitch}>
        Cambiar a HTML
      </Button>
    </div>
  );
}