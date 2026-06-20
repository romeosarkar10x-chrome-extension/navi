import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";
import { Icon, type IconName } from "../core/icon";

export interface ContextPillProps extends HTMLAttributes<HTMLSpanElement> {
    icon?: IconName;
    onRemove?: () => void;
}

/** Context chip showing what Navi can currently "see" — page, selection, screenshot. */
export function ContextPill({ icon = "file-text", children, onRemove, className = "", ...rest }: ContextPillProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-[5px] max-w-[200px] bg-surface-raised border border-line " +
                    "rounded-full py-[3px] px-[7px] font-ui text-2xs text-muted",
                className,
            )}
            {...rest}>
            <span className="flex-none inline-flex text-accent-text">
                <Icon
                    name={icon}
                    size={11}
                />
            </span>
            <span className="truncate">{children}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label="Remove context"
                    className="inline-flex items-center justify-center w-[14px] h-[14px] border-none bg-transparent rounded-full text-faint cursor-pointer flex-none transition duration-[120ms] ease-[var(--ease-out)] hover:bg-control hover:text-strong">
                    <Icon
                        name="x"
                        size={10}
                    />
                </button>
            )}
        </span>
    );
}
