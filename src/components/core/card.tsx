import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

const BASE = "bg-surface-card border border-line rounded-lg transition duration-[120ms] ease-[var(--ease-out)]";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    pad?: boolean;
    raised?: boolean;
    agent?: boolean;
    interactive?: boolean;
}

/** Generic surface container — message bubbles, recipe cards, settings groups. */
export function Card({
    children,
    pad = true,
    raised = false,
    agent = false,
    interactive = false,
    className = "",
    ...rest
}: CardProps) {
    return (
        <div
            className={cn(
                BASE,
                pad && "p-4",
                raised && "shadow-[var(--shadow-card)]",
                agent && "bg-surface-agent border-accent-line",
                interactive &&
                    "cursor-pointer hover:border-line-strong hover:bg-surface-raised active:translate-y-[0.5px]",
                className,
            )}
            {...rest}>
            {children}
        </div>
    );
}
