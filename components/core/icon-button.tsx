import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'ghost' | 'solid';

const BASE =
  'inline-flex items-center justify-center rounded-sm border border-transparent ' +
  'bg-transparent text-muted cursor-pointer transition duration-[120ms] ease-[var(--ease-out)] ' +
  'hover:bg-control hover:text-strong active:translate-y-[0.5px] ' +
  'focus-visible:outline-none focus-visible:shadow-[var(--glow-focus)] ' +
  'disabled:opacity-40 disabled:pointer-events-none';

const SIZES: Record<Size, string> = {
  sm: 'w-[26px] h-[26px]',
  md: 'w-[32px] h-[32px]',
  lg: 'w-[38px] h-[38px]',
};

const ICON_SIZE: Record<Size, number> = { sm: 15, md: 17, lg: 19 };

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: IconName;
  size?: Size;
  variant?: Variant;
  active?: boolean;
  label?: string;
}

/** Square icon-only button for toolbars and the top bar. */
export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  active = false,
  disabled = false,
  label,
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        BASE,
        SIZES[size],
        variant === 'solid' && 'bg-control text-strong border-line-strong hover:bg-control-hover',
        active && 'bg-accent-soft text-accent-text',
        className,
      )}
      disabled={disabled}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
    </button>
  );
}
