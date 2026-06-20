import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

const BASE =
    "relative inline-flex items-center w-[36px] h-[20px] rounded-full p-[2px] border cursor-pointer flex-none " +
    "transition duration-[120ms] ease-[var(--ease-out)] " +
    "focus-visible:outline-none focus-visible:shadow-[var(--glow-focus)] " +
    "disabled:opacity-45 disabled:pointer-events-none";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
}

/** Binary toggle switch. */
export function Switch({ checked = false, onChange, disabled = false, className = "", ...rest }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            className={cn(BASE, checked ? "bg-accent border-transparent" : "bg-control border-line-strong", className)}
            disabled={disabled}
            onClick={() => onChange?.(!checked)}
            {...rest}>
            <span
                className={cn(
                    "w-[14px] h-[14px] rounded-full transition duration-200 ease-[var(--ease-out)]",
                    checked ? "translate-x-[16px] bg-on-accent" : "bg-muted",
                )}
            />
        </button>
    );
}
