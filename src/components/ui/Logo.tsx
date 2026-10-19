import { Code2, Terminal } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'grid shrink-0 place-items-center rounded-md border border-accent-line bg-accent-soft text-accent',
          size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        )}
      >
        <Code2 className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn('font-display font-semibold tracking-tight text-ink', size === 'sm' ? 'text-[0.9rem]' : 'text-[1rem]')}>
          CodeForge
          <span className="ml-1 text-accent">AI</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[0.66rem] tracking-wide text-faint">
          <Terminal className="h-2.5 w-2.5" />
          editor + copiloto
        </span>
      </span>
    </span>
  );
}