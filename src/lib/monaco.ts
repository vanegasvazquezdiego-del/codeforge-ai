import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import type { ThemeId } from './types';

/* --------------------------------------------------------------------------
   Monaco se empaqueta localmente: nada de CDN, todo funciona sin internet
   (salvo la ejecucion de codigo y la IA, que inherently necesitan red).
   -------------------------------------------------------------------------- */

let configured = false;

function tokens(palette: {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  fn: string;
  type: string;
  bg: string;
  gutter: string;
  text: string;
  selection: string;
  line: string;
  cursor: string;
}) {
  return {
    rules: [
      { token: '', foreground: palette.text.replace('#', '') },
      { token: 'comment', foreground: palette.comment.replace('#', ''), fontStyle: 'italic' },
      { token: 'keyword', foreground: palette.keyword.replace('#', '') },
      { token: 'string', foreground: palette.string.replace('#', '') },
      { token: 'string.escape', foreground: palette.string.replace('#', '') },
      { token: 'number', foreground: palette.number.replace('#', '') },
      { token: 'type', foreground: palette.type.replace('#', '') },
      { token: 'type.identifier', foreground: palette.type.replace('#', '') },
      { token: 'identifier', foreground: palette.text.replace('#', '') },
      { token: 'delimiter', foreground: palette.text.replace('#', '') },
      { token: 'tag', foreground: palette.keyword.replace('#', '') },
      { token: 'attribute.name', foreground: palette.fn.replace('#', '') },
      { token: 'metatag', foreground: palette.comment.replace('#', '') },
      { token: 'variable', foreground: palette.text.replace('#', '') },
      { token: 'variable.predefined', foreground: palette.type.replace('#', '') },
      { token: 'constant', foreground: palette.number.replace('#', '') },
      { token: 'operator', foreground: palette.text.replace('#', '') },
      { token: 'annotation', foreground: palette.number.replace('#', '') },
      { token: 'invalid', foreground: palette.text.replace('#', '') },
    ],
    colors: {
      'editor.background': palette.bg,
      'editor.foreground': palette.text,
      'editor.lineHighlightBackground': palette.line,
      'editorLineNumber.foreground': palette.gutter,
      'editorLineNumber.activeForeground': palette.text,
      'editorCursor.foreground': palette.cursor,
      'editor.selectionBackground': palette.selection,
      'editor.inactiveSelectionBackground': palette.selection.replace(/[0-9a-f]{2}\)/i, '22)'),
      'editorIndentGuide.background1': palette.line,
      'editorIndentGuide.activeBackground1': palette.gutter,
      'editorWidget.background': palette.bg,
      'editorWidget.border': palette.gutter,
      'editorSuggestWidget.background': palette.bg,
      'editorSuggestWidget.border': palette.gutter,
      'editorHoverWidget.background': palette.bg,
      'scrollbarSlider.background': `${palette.gutter}66`,
      'scrollbarSlider.hoverBackground': palette.gutter,
      'scrollbarSlider.activeBackground': palette.gutter,
      'minimap.background': palette.bg,
      'editorBracketMatch.background': palette.selection,
      'editorBracketMatch.border': palette.gutter,
    },
  };
}

export const MONACO_THEMES: Record<ThemeId | 'contrast', string> = {
  void: 'forge-void',
  slate: 'forge-slate',
  cyber: 'forge-cyber',
  paper: 'forge-paper',
  contrast: 'forge-contrast',
};

export function setupMonaco() {
  if (configured) return;
  configured = true;

  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'json') return new jsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    },
  };

  loader.config({ monaco });

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    strict: true,
    noEmit: true,
  });
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    noEmit: true,
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  const palettes = {
    void: {
      keyword: '#c792ea', string: '#9ece6a', number: '#ff9e64', comment: '#5c6a80',
      fn: '#7aa2f7', type: '#7dcfff', bg: '#141821', gutter: '#3d4757', text: '#d5dde9',
      selection: '#2b6b5744', line: '#ffffff08', cursor: '#4ade9b',
    },
    slate: {
      keyword: '#c586c0', string: '#ce9178', number: '#b5cea8', comment: '#6a9955',
      fn: '#dcdcaa', type: '#4ec9b0', bg: '#1b212a', gutter: '#48505e', text: '#d6dde8',
      selection: '#264f7844', line: '#ffffff0a', cursor: '#6ea8fe',
    },
    cyber: {
      keyword: '#ff7ad9', string: '#7dfcd4', number: '#ffb86c', comment: '#6d5a86',
      fn: '#66d9ff', type: '#f4a6ff', bg: '#191223', gutter: '#6b5580', text: '#efe4f7',
      selection: '#ff5ea833', line: '#ffffff0d', cursor: '#ff5ea8',
    },
    paper: {
      keyword: '#8250df', string: '#0a7d4b', number: '#b5511a', comment: '#8a8f98',
      fn: '#1a5fb4', type: '#0b7285', bg: '#ffffff', gutter: '#b4b9c0', text: '#1f2328',
      selection: '#b4d5fe80', line: '#00000006', cursor: '#1f9c72',
    },
    contrast: {
      keyword: '#ff7bd5', string: '#b6f09c', number: '#ffc777', comment: '#8fa0b8',
      fn: '#8fd4ff', type: '#9fe8ff', bg: '#000000', gutter: '#6a7a90', text: '#ffffff',
      selection: '#3355ff55', line: '#ffffff12', cursor: '#ffe600',
    },
  };

  const bases = { void: 'vs-dark', slate: 'vs-dark', cyber: 'vs-dark', paper: 'vs', contrast: 'vs-dark' } as const;

  (Object.keys(palettes) as Array<keyof typeof palettes>).forEach((key) => {
    monaco.editor.defineTheme(MONACO_THEMES[key], {
      base: bases[key],
      inherit: true,
      rules: tokens(palettes[key]).rules,
      colors: tokens(palettes[key]).colors,
    });
  });
}

export function monacoLanguageFor(id: string): string {
  return id;
}

export { monaco };