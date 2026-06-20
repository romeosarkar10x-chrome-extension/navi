import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export interface StreamingIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
    label?: ReactNode;
}

/** Animated "thinking" dots shown while the assistant is generating. */
export function StreamingIndicator({ label, className = "", ...rest }: StreamingIndicatorProps) {
    return (
        <span
            className={cn("inline-flex items-center gap-1 py-[2px]", className)}
            {...rest}>
            <span className="navi-streaming-dot w-[5px] h-[5px] rounded-full bg-accent-text" />
            <span className="navi-streaming-dot w-[5px] h-[5px] rounded-full bg-accent-text" />
            <span className="navi-streaming-dot w-[5px] h-[5px] rounded-full bg-accent-text" />
            {label && <span className="ml-[6px] font-ui text-sm text-muted">{label}</span>}
        </span>
    );
}
