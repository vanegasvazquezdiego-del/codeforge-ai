import { useCallback, useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { MONACO_THEMES, setupMonaco } from '@/lib/monaco';
import { getLanguage } from '@/lib/languages';
import { useSettings } from '@/store/settings';
import { useWorkspace } from '@/store/workspace';
import { Spinner } from '@/components/ui/Primitives';

setupMonaco();

export function CodeEditor({
  onRun,
  onToggleAssistant,
}: {
  onRun: () => void;
  onToggleAssistant: () => void;
}) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const disposables = useRef<{ dispose: () => void }[]>([]);

  const languageId = useWorkspace((s) => s.languageId);
  const activeId = useWorkspace((s) => s.activeId);
  const content = useWorkspace((s) => s.files.find((f) => f.id === s.activeId)?.content ?? '');
  const updateContent = useWorkspace((s) => s.updateContent);
  const setSelection = useWorkspace((s) => s.setSelection);

  const theme = useSettings((s) => s.theme);
  const editorSettings = useSettings((s) => s.editor);
  const lang = getLanguage(languageId);

  const skin = MONACO_THEMES[editorSettings.skin === 'sync' ? theme : editorSettings.skin];

  /** La seleccion es contexto del copiloto: se publica en el store, sin duplicar estado. */
  const publishSelection = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (!editor || !model || !selection || selection.isEmpty()) {
      setSelection({ text: '', startLine: null, endLine: null });
      return;
    }
    const text = model.getValueInRange(selection);
    setSelection({
      // Una seleccion enorme se recorta: el prompt no debe desbordar el contexto.
      text: text.length > 12000 ? `${text.slice(0, 12000)}\n…` : text,
      startLine: selection.startLineNumber,
      endLine: selection.endLineNumber,
    });
  }, [setSelection]);

  const onMount: OnMount = useCallback(
    (instance) => {
      editorRef.current = instance;
      disposables.current.push(
        instance.onDidChangeCursorSelection(() => publishSelection()),
        instance.onDidFocusEditorText(() => publishSelection()),
      );
      instance.addCommand(2048 | 3, () => onRun()); // Ctrl/Cmd + Enter
      instance.addCommand(2048 | 2, () => onToggleAssistant()); // Ctrl/Cmd + I
      instance.focus();
    },
    [onRun, onToggleAssistant, publishSelection],
  );

  useEffect(() => () => disposables.current.forEach((d) => d.dispose()), []);

  useEffect(() => {
    editorRef.current?.updateOptions({ theme: skin });
  }, [skin]);

  return (
    <div className="relative h-full min-h-0 w-full" data-testid="code-editor">
      <Editor
        height="100%"
        language={lang.monaco}
        value={content}
        onChange={(value) => updateContent(activeId, value ?? '')}
        onMount={onMount}
        theme={skin}
        loading={
          <div className="flex h-full items-center justify-center gap-2.5 bg-code-bg text-[0.8rem] text-muted">
            <Spinner className="text-accent" />
            Cargando el editor…
          </div>
        }
        options={{
          fontSize: editorSettings.fontSize,
          fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Menlo, monospace",
          fontLigatures: editorSettings.ligatures,
          tabSize: editorSettings.tabSize,
          insertSpaces: true,
          detectIndentation: false,
          minimap: { enabled: editorSettings.minimap, renderCharacters: false, maxColumn: 80 },
          lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
          glyphMargin: false,
          folding: true,
          wordWrap: editorSettings.wordWrap ? 'on' : 'off',
          renderLineHighlight: 'line',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          smoothScrolling: editorSettings.smoothScrolling,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          formatOnType: editorSettings.formatOnType,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          padding: { top: 14, bottom: 18 },
          fixedOverflowWidgets: true,
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
          suggest: { showWords: true, preview: true },
          quickSuggestions: { other: true, comments: false, strings: false },
        }}
      />
    </div>
  );
}