import type { ChangeEventHandler, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/lib/cn";
import { Icon, type IconName } from "../core/icon";

type Size = "sm" | "md" | "lg";

const BASE =
    "flex items-center gap-2 bg-surface-raised border border-line-strong rounded-md px-[10px] " +
    "transition duration-[120ms] ease-[var(--ease-out)] " +
    "focus-within:border-accent-line focus-within:shadow-[var(--glow-focus)]";

const SIZES: Record<Size, string> = {
    sm: "h-[26px]",
    md: "h-[32px]",
    lg: "h-[38px]",
};

const INPUT_CLS =
    "flex-1 min-w-0 border-none outline-none bg-transparent font-ui text-base text-strong " + "placeholder:text-faint";

export interface InputProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
    value?: string;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    type?: string;
    icon?: IconName;
    size?: Size;
    invalid?: boolean;
    disabled?: boolean;
    trailing?: ReactNode;
    inputProps?: InputHTMLAttributes<HTMLInputElement>;
}

/** Single-line text input with optional leading icon and trailing slot. */
export function Input({
    value,
    onChange,
    placeholder,
    type = "text",
    icon,
    size = "md",
    invalid = false,
    disabled = false,
    trailing,
    className = "",
    inputProps = {},
    ...rest
}: InputProps) {
    return (
        <div
            className={cn(
                BASE,
                SIZES[size],
                invalid && "border-[color-mix(in_srgb,var(--signal-error)_60%,transparent)]",
                disabled && "opacity-50 pointer-events-none",
                className,
            )}
            {...rest}>
            {icon && (
                <span className="text-faint inline-flex">
                    <Icon
                        name={icon}
                        size={15}
                    />
                </span>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={INPUT_CLS}
                {...inputProps}
            />
            {trailing}
        </div>
    );
}
