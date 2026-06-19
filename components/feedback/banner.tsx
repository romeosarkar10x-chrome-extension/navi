import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../core/icon';

type Tone = 'info' | 'warn' | 'error';

const TONES: Record<Tone, string> = {
  info: 'bg-accent-soft border-accent-line',
  warn: 'bg-[rgba(var(--signal-progress-rgb),0.12)] border-[rgba(var(--signal-progress-rgb),0.35)]',
  error: 'bg-[rgba(var(--signal-error-rgb),0.12)] border-[rgba(var(--signal-error-rgb),0.35)]',
};

const ICON_TONES: Record<Tone, string> = {
  info: 'text-accent-text',
  warn: 'text-progress',
  error: 'text-error',
};

const ICONS: Record<Tone, IconName> = {
  info: 'info',
  warn: 'triangle-alert',
  error: 'circle-alert',
};

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: Tone;
  title?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
}

/** Inline alert banner — missing key, connection failed, action failed. */
export function Banner({ tone = 'info', title, children, icon, actions, className = '', ...rest }: BannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-[10px] py-[10px] px-3 rounded-md border font-ui text-sm leading-snug',
        TONES[tone],
        className,
      )}
      role="alert"
      {...rest}
    >
      <span className={cn('flex-none mt-[1px]', ICON_TONES[tone])}>
        <Icon name={icon ?? ICONS[tone]} size={16} />
      </span>
      <div className="flex-1 text-body">
        {title && <strong className="block mb-[2px] text-strong font-semibold">{title}</strong>}
        {children}
        {actions && <div className="mt-2 flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
