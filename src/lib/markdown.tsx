import { Fragment, type ReactNode } from 'react';
import { cn } from './cn';

/**
 * Renderizador de Markdown mínimo y seguro.
 * No hay dangerouslySetInnerHTML ni HTML crudo: la entrada del modelo
 * solo puede producir nodos de React, asi que no puede inyectar etiquetas.
 *
 * Cubre lo que realmente usa un copiloto de codigo: titulos, parrafos,
 * listas, citas, reglas, codigo en linea, enlaces y bloques de codigo.
 */

export interface CodeBlock {
  language: string;
  code: string;
}

interface Segment {
  kind: 'text' | 'code';
  content: string;
}

function inlineToNodes(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(<Fragment key={`${keyPrefix}-t${index}`}>{text.slice(cursor, match.index)}</Fragment>);
    const token = match[0];
    const key = `${keyPrefix}-m${index}`;

    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded-[3px] border border-line-soft bg-elev px-1 py-px font-mono text-[0.85em] text-accent"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
      const href = linkMatch?.[2] ?? '#';
      const safe = /^https?:\/\//i.test(href) ? href : undefined;
      nodes.push(
        safe ? (
          <a
            key={key}
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline decoration-accent-line underline-offset-2 hover:decoration-accent"
          >
            {linkMatch?.[1]}
          </a>
        ) : (
          <span key={key} className="text-accent">
            {linkMatch?.[1]}
          </span>
        ),
      );
    }

    cursor = match.index + token.length;
    index += 1;
  }

  if (cursor < text.length) nodes.push(<Fragment key={`${keyPrefix}-t${index}`}>{text.slice(cursor)}</Fragment>);
  return nodes;
}

/** Segmenta un parrafo en troceables de codigo y de texto. */
function splitInline(text: string): Segment[] {
  const segments: Segment[] = [];
  const parts = text.split(/(`[^`]+`)/g);
  parts.forEach((part) => {
    if (!part) return;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      segments.push({ kind: 'code', content: part.slice(1, -1) });
    } else {
      segments.push({ kind: 'text', content: part });
    }
  });
  return segments;
}

export interface ParsedMarkdown {
  nodes: ReactNode[];
  codeBlocks: CodeBlock[];
}

export function parseMarkdown(
  raw: string,
  renderCode?: (block: CodeBlock, index: number) => ReactNode,
): ParsedMarkdown {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  const codeBlocks: CodeBlock[] = [];
  let i = 0;
  let key = 0;
  const codeIndex = { current: 0 };

  const flushParagraph = (buffer: string[]) => {
    if (!buffer.length) return;
    const text = buffer.join(' ').trim();
    buffer.length = 0;
    if (!text) return;
    nodes.push(
      <p key={`p${key++}`} className="text-[0.94rem] leading-relaxed text-muted">
        {inlineToNodes(text, `p${key}`)}
      </p>,
    );
  };

  const paragraph: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    // --- Bloque de codigo -------------------------------------------------
    if (/^\s*```/.test(line)) {
      flushParagraph(paragraph);
      const language = line.trim().slice(3).trim().toLowerCase();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const code = body.join('\n');
      codeBlocks.push({ language, code });
      const index = codeIndex.current++;
      nodes.push(
        renderCode ? (
          <Fragment key={`c${key++}`}>{renderCode({ language, code }, index)}</Fragment>
        ) : (
          <CodeFence key={`c${key++}`} language={language} code={code} />
        ),
      );
      continue;
    }

    // --- Linea vacia ------------------------------------------------------
    if (!line.trim()) {
      flushParagraph(paragraph);
      i += 1;
      continue;
    }

    // --- Regla ------------------------------------------------------------
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph(paragraph);
      nodes.push(<hr key={`hr${key++}`} className="my-4 border-line-soft" />);
      i += 1;
      continue;
    }

    // --- Titulo -----------------------------------------------------------
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph(paragraph);
      const level = heading[1].length;
      const text = heading[2].trim();
      const sizes = ['text-base font-semibold text-ink', 'text-[0.95rem] font-semibold text-ink', 'text-[0.9rem] font-semibold text-ink', 'text-[0.85rem] font-semibold text-muted'];
      nodes.push(
        <p
          key={`h${key++}`}
          className={cn('mt-3 flex items-center gap-2 tracking-tight first:mt-0', sizes[level - 1])}
        >
          {level === 1 && <span className="h-3.5 w-0.5 rounded-full bg-accent" aria-hidden="true" />}
          {inlineToNodes(text, `h${key}`)}
        </p>,
      );
      i += 1;
      continue;
    }

    // --- Cita -------------------------------------------------------------
    if (/^\s*>\s?/.test(line)) {
      flushParagraph(paragraph);
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      nodes.push(
        <blockquote
          key={`q${key++}`}
          className="border-l-2 border-accent-line bg-accent-soft/25 py-2 pl-3 pr-2 text-[0.9rem] text-muted"
        >
          {inlineToNodes(body.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // --- Lista no ordenada ------------------------------------------------
    if (/^\s*([-*+])\s+/.test(line)) {
      flushParagraph(paragraph);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+])\s+/, ''));
        i += 1;
      }
      nodes.push(
        <ul key={`ul${key++}`} className="flex flex-col gap-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2.5 text-[0.92rem] leading-relaxed text-muted">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-line" aria-hidden="true" />
              <span className="min-w-0">{renderInlineSegments(item, `li${key}-${idx}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // --- Lista ordenada ---------------------------------------------------
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushParagraph(paragraph);
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i += 1;
      }
      nodes.push(
        <ol key={`ol${key++}`} className="flex flex-col gap-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2.5 text-[0.92rem] leading-relaxed text-muted">
              <span className="mt-0.5 shrink-0 font-mono text-[0.72rem] text-accent-line">{idx + 1}.</span>
              <span className="min-w-0">{renderInlineSegments(item, `oli${key}-${idx}`)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }

  flushParagraph(paragraph);
  return { nodes, codeBlocks };
}

function renderInlineSegments(text: string, key: string): ReactNode {
  const segments = splitInline(text);
  return segments.map((seg, idx) =>
    seg.kind === 'code' ? (
      <code
        key={`${key}-c${idx}`}
        className="rounded-[3px] border border-line-soft bg-elev px-1 py-px font-mono text-[0.85em] text-accent"
      >
        {seg.content}
      </code>
    ) : (
      <Fragment key={`${key}-t${idx}`}>{inlineToNodes(seg.content, `${key}-t${idx}`)}</Fragment>
    ),
  );
}

function CodeFence({ language, code }: CodeBlock) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-code-bg">
      <div className="flex items-center justify-between border-b border-line-soft px-3 py-1.5">
        <span className="font-mono text-micro uppercase tracking-widest text-faint">{language || 'texto'}</span>
      </div>
      <pre className="scroll-thin max-h-96 overflow-x-auto px-3 py-2.5">
        <code className="font-mono text-[0.82rem] leading-relaxed text-ink">{code}</code>
      </pre>
    </div>
  );
}

/** Resalta de forma ligera las palabras clave del lenguaje dentro de un bloque. */
export function highlightKeywords(code: string, language: string): ReactNode[] {
  const keywords: Record<string, string[]> = {
    python: ['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'import', 'from', 'class', 'try', 'except', 'with', 'lambda', 'None', 'True', 'False', 'and', 'or', 'not', 'print', 'range', 'len'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'of', 'in', 'import', 'from', 'export', 'class', 'try', 'catch', 'async', 'await', 'new', 'null', 'undefined', 'true', 'false'],
    typescript: ['const', 'let', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'interface', 'type', 'class', 'public', 'private', 'readonly', 'string', 'number', 'boolean', 'void', 'null', 'undefined', 'true', 'false'],
    java: ['public', 'private', 'static', 'void', 'class', 'int', 'long', 'double', 'boolean', 'String', 'if', 'else', 'for', 'while', 'return', 'new', 'import', 'package', 'try', 'catch', 'final'],
    go: ['package', 'import', 'func', 'var', 'const', 'if', 'else', 'for', 'range', 'return', 'struct', 'interface', 'defer', 'go', 'chan', 'map', 'slice', 'int', 'string', 'bool', 'true', 'false', 'nil'],
    rust: ['fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'if', 'else', 'for', 'while', 'loop', 'match', 'return', 'use', 'pub', 'mod', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'i64', 'u32', 'String', 'Vec'],
    cpp: ['#include', 'using', 'namespace', 'int', 'long', 'double', 'bool', 'char', 'void', 'if', 'else', 'for', 'while', 'return', 'struct', 'class', 'const', 'auto', 'std', 'string', 'vector', 'true', 'false'],
    sql: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'GROUP', 'BY', 'ORDER', 'HAVING', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT', 'INSERT', 'INTO', 'VALUES', 'CREATE', 'TABLE'],
    css: ['--', 'var', 'calc', 'min', 'max', 'repeat', 'auto-fit', 'grid-template-columns'],
    html: ['div', 'span', 'section', 'main', 'header', 'footer', 'nav', 'article', 'aside', 'button', 'input', 'label', 'ul', 'li', 'h1', 'h2', 'h3', 'p', 'style', 'script'],
  };
  const words = keywords[language] ?? [];
  if (!words.length) return [code];

  const escaped = words
    .filter((w) => /^[A-Za-z_#]/.test(w))
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  if (!escaped) return [code];

  const regex = new RegExp(`(${escaped})\\b`, 'g');
  const out: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > cursor) out.push(code.slice(cursor, match.index));
    out.push(
      <span key={`kw${index++}`} className="font-medium text-accent">
        {match[1]}
      </span>,
    );
    cursor = match.index + match[1].length;
  }
  if (cursor < code.length) out.push(code.slice(cursor));
  return out;
}