import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";
import { Icon, type IconName } from "./icon";

type Tone = "neutral" | "accent" | "success" | "progress" | "error" | "solid";

const BASE =
    "inline-flex items-center gap-[5px] font-ui font-medium text-2xs leading-none " +
    "tracking-[0.01em] py-[3px] px-[8px] rounded-full border border-transparent whitespace-nowrap";

const TONES: Record<Tone, string> = {
    neutral: "bg-control text-muted border-line",
    accent: "bg-accent-soft text-accent-text border-accent-line",
    success: "bg-[rgba(var(--signal-success-rgb),0.14)] text-success border-[rgba(var(--signal-success-rgb),0.35)]",
    progress: "bg-[rgba(var(--signal-progress-rgb),0.14)] text-progress border-[rgba(var(--signal-progress-rgb),0.35)]",
    error: "bg-[rgba(var(--signal-error-rgb),0.14)] text-error border-[rgba(var(--signal-error-rgb),0.35)]",
    solid: "bg-accent text-on-accent border-transparent font-semibold",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: Tone;
    icon?: IconName;
    dot?: boolean;
}

/** Small status / category badge. Pill-shaped, tinted by tone. */
export function Badge({ children, tone = "neutral", icon, dot = false, className = "", ...rest }: BadgeProps) {
    return (
        <span
            className={cn(BASE, TONES[tone], className)}
            {...rest}>
            {dot && <span className="w-[5px] h-[5px] rounded-full bg-current" />}
            {icon && (
                <Icon
                    name={icon}
                    size={11}
                />
            )}
            {children}
        </span>
    );
}
