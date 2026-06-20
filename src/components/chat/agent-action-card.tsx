import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../core/icon";

export type ActionType = "click" | "type" | "navigate" | "scrape" | "screenshot" | "fill" | "read";
export type ActionStatus = "pending" | "running" | "success" | "failed";

export interface ActionDetail {
    k: ReactNode;
    v: ReactNode;
}

const ACTION_ICONS: Record<ActionType, IconName> = {
    click: "mouse-pointer-click",
    type: "keyboard",
    navigate: "compass",
    scrape: "scan-text",
    screenshot: "camera",
    fill: "text-cursor-input",
    read: "file-text",
};

const STATUS_ICONS: Record<ActionStatus, IconName> = {
    pending: "circle",
    running: "loader",
    success: "check",
    failed: "x",
};

const STATUS_CLS: Record<ActionStatus, string> = {
    pending: "text-faint",
    running: "text-progress animate-spin-fast",
    success: "text-success",
    failed: "text-error",
};

export interface AgentActionCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "type"> {
    type?: ActionType;
    label?: ReactNode;
    status?: ActionStatus;
    detail?: ActionDetail[];
    defaultOpen?: boolean;
}

/** Inline card showing one browser action the agent took, with status and expandable detail. */
export function AgentActionCard({
    type = "click",
    label,
    status = "success",
    detail = [],
    defaultOpen = false,
    className = "",
    ...rest
}: AgentActionCardProps) {
    const [open, setOpen] = useState(defaultOpen);
    const hasDetail = detail.length > 0;
    return (
        <div
            className={cn("bg-surface-agent border border-accent-line rounded-md overflow-hidden font-ui", className)}
            {...rest}>
            <button
                type="button"
                className={cn(
                    "flex items-center gap-[9px] py-2 px-[10px] w-full bg-transparent border-none text-left text-inherit",
                    hasDetail ? "cursor-pointer" : "cursor-default",
                )}
                onClick={() => hasDetail && setOpen(o => !o)}>
                <span className="flex-none inline-flex text-accent-text">
                    <Icon
                        name={ACTION_ICONS[type] ?? "zap"}
                        size={15}
                    />
                </span>
                <span className="flex-1 min-w-0 text-sm text-strong truncate [&_b]:font-semibold">{label}</span>
                <span className={cn("flex-none inline-flex items-center justify-center", STATUS_CLS[status])}>
                    <Icon
                        name={STATUS_ICONS[status]}
                        size={14}
                    />
                </span>
                {hasDetail && (
                    <span
                        className={cn(
                            "flex-none text-faint transition-transform duration-[120ms] ease-[var(--ease-out)]",
                            open && "rotate-180",
                        )}>
                        <Icon
                            name="chevron-down"
                            size={14}
                        />
                    </span>
                )}
            </button>
            {hasDetail && open && (
                <div className="pb-[10px] pr-[10px] pl-[33px]">
                    {detail.map((d, i) => (
                        <div
                            key={i}
                            className="font-mono text-2xs text-muted py-[3px] border-t border-line-faint [&_span]:text-faint first:border-t-0 first:pt-[6px]">
                            <span>{d.k} </span>
                            {d.v}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
