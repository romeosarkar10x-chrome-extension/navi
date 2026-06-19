import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'success' | 'progress' | 'error' | 'idle';

const DOT: Record<Tone, string> = {
  success: 'bg-success shadow-[var(--glow-success)]',
  progress: 'bg-progress shadow-[var(--glow-progress)]',
  error: 'bg-error shadow-[var(--glow-error)]',
  idle: 'bg-faint',
};

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  pulse?: boolean;
}

/** Status dot + optional label — connection state, live indicators. */
export function StatusDot({ tone = 'idle', children, pulse = false, className = '', ...rest }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-[7px] font-ui text-sm text-body', className)} {...rest}>
      <span className={cn('w-[8px] h-[8px] rounded-full flex-none relative', DOT[tone], pulse && 'navi-pulse')} />
      {children && <span>{children}</span>}
    </span>
  );
}
