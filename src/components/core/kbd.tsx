import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

const BASE =
    "inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] font-mono text-2xs " +
    "leading-none text-body bg-surface-raised border border-line-strong border-b-2 rounded-xs";

/** Keyboard key cap, e.g. for shortcut hints. */
export function Kbd({ children, className = "", ...rest }: HTMLAttributes<HTMLElement>) {
    return (
        <kbd
            className={cn(BASE, className)}
            {...rest}>
            {children}
        </kbd>
    );
}
