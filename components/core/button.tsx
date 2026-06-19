import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-[7px] font-ui font-medium rounded-md ' +
  'border border-transparent cursor-pointer whitespace-nowrap select-none ' +
  'transition duration-[120ms] ease-[var(--ease-out)] ' +
  'focus-visible:outline-none focus-visible:shadow-[var(--glow-focus)] ' +
  'disabled:opacity-45 disabled:pointer-events-none';

const SIZES: Record<Size, string> = {
  sm: 'h-[26px] px-[10px] text-sm',
  md: 'h-[32px] px-[14px] text-base',
  lg: 'h-[38px] px-[18px] text-md',
};

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-on-accent font-semibold hover:bg-accent-hover hover:shadow-[var(--glow-soft)] ' +
    'active:bg-accent-press active:shadow-none active:translate-y-[0.5px]',
  secondary:
    'bg-control text-strong border-line-strong hover:bg-control-hover active:translate-y-[0.5px]',
  ghost: 'bg-transparent text-body hover:bg-control hover:text-strong active:translate-y-[0.5px]',
  danger:
    'bg-transparent text-error border-[color-mix(in_srgb,var(--signal-error)_38%,transparent)] ' +
    'hover:bg-[color-mix(in_srgb,var(--signal-error)_14%,transparent)]',
};

const ICON_SIZE: Record<Size, number> = { sm: 14, md: 16, lg: 18 };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  full?: boolean;
}

/** Primary action button with variants, sizes, optional leading/trailing icon and loading state. */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  full = false,
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  const iconSize = ICON_SIZE[size];
  return (
    <button
      type={type}
      className={cn(BASE, SIZES[size], VARIANTS[variant], full && 'w-full', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Icon name="loader" size={iconSize} className="animate-spin-fast" />
      ) : (
        icon && <Icon name={icon} size={iconSize} />
      )}
      {children != null && <span>{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
