import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const BUBBLE_BASE =
    "absolute z-50 whitespace-nowrap pointer-events-none " +
    "bg-surface-overlay text-strong border border-line-strong rounded-sm py-[5px] px-2 " +
    "font-ui text-2xs shadow-[var(--shadow-pop)] opacity-0 " +
    "transition duration-[120ms] ease-[var(--ease-out)] " +
    "group-hover:opacity-100 group-hover:translate-y-0 " +
    "group-focus-within:opacity-100 group-focus-within:translate-y-0";

// Horizontal anchor. The bubble is whitespace-nowrap, so on a trigger that hugs
// the panel edge a centered bubble overhangs and forces a phantom horizontal
// scrollbar. Anchoring its edge to the trigger's edge keeps it in-bounds.
const ALIGN: Record<"center" | "left" | "right", string> = {
    center: "left-1/2 -translate-x-1/2",
    left: "left-0",
    right: "right-0",
};

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
    label: ReactNode;
    kbd?: ReactNode;
    side?: "top" | "bottom";
    align?: "center" | "left" | "right";
    children: ReactNode;
}

/** Hover/focus tooltip wrapper. Wrap the trigger element as a child. */
export function Tooltip({ label, kbd, side = "top", align = "center", children, className = "", ...rest }: TooltipProps) {
    return (
        <span
            className={cn("group relative inline-flex", className)}
            {...rest}>
            {children}
            <span
                role="tooltip"
                className={cn(
                    BUBBLE_BASE,
                    ALIGN[align],
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
