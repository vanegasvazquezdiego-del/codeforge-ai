import { Check, ChevronDown, Code2 } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';
import { useWorkspace } from '@/store/workspace';
import { Popover } from '@/components/ui/Popover';
import { cn } from '@/lib/cn';

export function LanguagePicker() {
  const languageId = useWorkspace((s) => s.languageId);
  const setLanguage = useWorkspace((s) => s.setLanguage);
  const current = LANGUAGES.find((l) => l.id === languageId) ?? LANGUAGES[0];

  return (
    <Popover
      width="w-72"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          id={id}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={toggle}
          className={cn(
            'flex h-9 items-center gap-2 rounded-md border border-line bg-bg-deep pl-2.5 pr-2',
            'text-[0.82rem] transition-[border-color,background-color] duration-150',
            'hover:border-line-strong hover:bg-elev',
            open && 'border-accent-line bg-elev',
          )}
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-[3px] shadow-e1"
            style={{ background: current.tint }}
          />
          <span className="font-medium text-ink">{current.label}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn('h-3.5 w-3.5 text-faint transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
      )}
    >
      {(close) => (
        <div className="scroll-thin max-h-80 overflow-y-auto" role="menu" aria-label="Lenguajes">
          {LANGUAGES.map((lang) => {
            const selected = lang.id === current.id;
            return (
              <button
                key={lang.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setLanguage(lang.id);
                  close();
                }}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-sm px-2.5 py-2 text-left',
                  'transition-colors duration-100',
                  selected ? 'bg-accent-soft' : 'hover:bg-elev',
                )}
              >
                <span
                  aria-hidden="true"
                  className="mt-1 h-3 w-1 shrink-0 rounded-full"
                  style={{ background: lang.tint }}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('flex items-center gap-1.5 text-[0.85rem] font-medium', selected ? 'text-accent' : 'text-ink')}>
                    {lang.label}
                    {lang.kind !== 'remote' && (
                      <span className="rounded-full border border-line px-1.5 py-px text-[0.6rem] font-normal tracking-wider text-faint uppercase">
                        {lang.kind === 'preview' ? 'preview' : 'sqlite'}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[0.74rem] leading-snug text-faint">{lang.blurb}</span>
                </span>
                {selected && <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />}
              </button>
            );
          })}
          <p className="mt-1.5 flex items-start gap-1.5 border-t border-line-soft px-2.5 pt-2.5 text-[0.72rem] leading-snug text-faint">
            <Code2 aria-hidden="true" className="mt-px h-3 w-3 shrink-0" />
            HTML y CSS se renderizan en el navegador. SQL corre sobre SQLite en memoria.
          </p>
        </div>
      )}
    </Popover>
  );
}