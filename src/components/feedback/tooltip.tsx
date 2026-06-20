import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/lib/cn";

const BUBBLE_BASE =
    "absolute z-50 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none " +
    "bg-surface-overlay text-strong border border-line-strong rounded-sm py-[5px] px-2 " +
    "font-ui text-2xs shadow-[var(--shadow-pop)] opacity-0 " +
    "transition duration-[120ms] ease-[var(--ease-out)] " +
    "group-hover:opacity-100 group-hover:translate-y-0 " +
    "group-focus-within:opacity-100 group-focus-within:translate-y-0";

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
    label: ReactNode;
    kbd?: ReactNode;
    side?: "top" | "bottom";
    children: ReactNode;
}

/** Hover/focus tooltip wrapper. Wrap the trigger element as a child. */
export function Tooltip({ label, kbd, side = "top", children, className = "", ...rest }: TooltipProps) {
    return (
        <span
            className={cn("group relative inline-flex", className)}
            {...rest}>
            {children}
            <span
                role="tooltip"
                className={cn(
                    BUBBLE_BASE,
                    side === "bottom"
                        ? "top-[calc(100%+6px)] -translate-y-[4px]"
                        : "bottom-[calc(100%+6px)] translate-y-[4px]",
                )}>
                {label}
                {kbd && <span className="ml-[6px] text-faint">{kbd}</span>}
            </span>
        </span>
    );
}
