import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'min' | 'max' | 'step' | 'onChange' | 'type'> {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
}

/** Range slider with a beacon-filled track and glowing thumb. */
export function Slider({
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  className = '',
  ...rest
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className={cn('navi-slider', className)}
      style={{
        background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--control) ${pct}%, var(--control) 100%)`,
      }}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange?.(Number(e.target.value))}
      {...rest}
    />
  );
}
