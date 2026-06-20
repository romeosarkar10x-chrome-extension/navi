import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/lib/cn";
import { Icon, type IconName } from "../core/icon";

export interface QuickAction {
    icon?: IconName;
    label: ReactNode;
    onClick?: () => void;
}

const BTN_CLS =
    "inline-flex items-center gap-[6px] flex-none h-[28px] px-[11px] rounded-full " +
    "bg-surface-card border border-line text-body font-ui text-sm cursor-pointer whitespace-nowrap " +
    "transition duration-[120ms] ease-[var(--ease-out)] " +
    "hover:border-accent-line hover:text-strong hover:bg-surface-raised active:translate-y-[0.5px]";

export interface QuickActionsProps extends HTMLAttributes<HTMLDivElement> {
    actions?: QuickAction[];
}

/** Horizontally scrollable row of quick-action shortcuts above the composer. */
export function QuickActions({ actions = [], className = "", ...rest }: QuickActionsProps) {
    return (
        <div
            className={cn("flex gap-[7px] overflow-x-auto pt-[1px] pb-[3px] navi-noscroll", className)}
            {...rest}>
            {actions.map((a, i) => (
                <button
                    type="button"
                    key={i}
                    className={BTN_CLS}
                    onClick={a.onClick}>
                    {a.icon && (
                        <span className="text-accent-text inline-flex">
                            <Icon
                                name={a.icon}
                                size={13}
                            />
                        </span>
                    )}
                    {a.label}
                </button>
            ))}
        </div>
    );
}
