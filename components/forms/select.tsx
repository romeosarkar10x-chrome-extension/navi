import type { ChangeEventHandler, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '../core/icon';

type Size = 'sm' | 'md';

export interface SelectOption {
  value: string;
  label: string;
}

const BASE =
  'relative inline-flex items-center w-full bg-surface-raised border border-line-strong rounded-md ' +
  'transition duration-[120ms] ease-[var(--ease-out)] ' +
  'focus-within:border-accent-line focus-within:shadow-[var(--glow-focus)]';

const SIZES: Record<Size, string> = { sm: 'h-[26px]', md: 'h-[32px]' };

const SELECT_CLS =
  'appearance-none w-full h-full border-none outline-none bg-transparent cursor-pointer ' +
  'font-ui text-base text-strong pl-[10px] pr-[30px]';

export interface SelectProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  options?: Array<string | SelectOption>;
  size?: Size;
  disabled?: boolean;
}

/** Styled wrapper over a native <select> — keeps native a11y, Navi chrome. */
export function Select({
  value,
  onChange,
  options = [],
  size = 'md',
  disabled = false,
  className = '',
  ...rest
}: SelectProps) {
  return (
    <div className={cn(BASE, SIZES[size], disabled && 'opacity-50 pointer-events-none', className)} {...rest}>
      <select value={value} onChange={onChange} disabled={disabled} className={SELECT_CLS}>
        {options.map((o) => {
          const opt: SelectOption = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
      <span className="absolute right-[9px] text-faint pointer-events-none inline-flex">
        <Icon name="chevron-down" size={15} />
      </span>
    </div>
  );
}
