import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../core/icon";

type Tone = "success" | "error" | "info";

const ICON_TONES: Record<Tone, string> = {
    success: "text-success",
    error: "text-error",
    info: "text-accent-text",
};

const ICONS: Record<Tone, IconName> = {
    success: "check-circle-2",
    error: "circle-alert",
    info: "info",
};

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
    tone?: Tone;
    icon?: IconName;
    onDismiss?: () => void;
}

/** Transient notification — presentational; caller controls placement + timeout. */
export function Toast({ tone = "info", icon, children, onDismiss, className = "", ...rest }: ToastProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-[10px] bg-surface-overlay border border-line-strong rounded-md " +
                    "py-[9px] px-[11px] shadow-[var(--shadow-pop)] font-ui text-sm text-strong animate-toast-in",
                className,
            )}
            role="status"
            {...rest}>
            <span className={cn("flex-none inline-flex", ICON_TONES[tone])}>
                <Icon
                    name={icon ?? ICONS[tone]}
                    size={16}
                />
            </span>
            <span className="flex-1">{children}</span>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    className="inline-flex items-center justify-center w-[20px] h-[20px] border-none bg-transparent rounded-xs text-faint cursor-pointer transition duration-[120ms] ease-[var(--ease-out)] hover:bg-control hover:text-strong">
                    <Icon
                        name="x"
                        size={14}
                    />
                </button>
            )}
        </div>
    );
}
