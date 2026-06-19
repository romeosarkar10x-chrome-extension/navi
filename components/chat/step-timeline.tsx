import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "../core/icon";

export type StepStatus = "pending" | "running" | "done" | "failed";

export interface Step {
    label: ReactNode;
    status?: StepStatus;
    detail?: ReactNode;
}

const NODE_STATE: Record<StepStatus, string> = {
    pending: "border-line-strong bg-surface-card text-faint",
    done: "bg-[rgba(var(--signal-success-rgb),0.16)] border-transparent text-success",
    running: "bg-accent-soft border-accent-line text-accent-text shadow-[var(--glow-dot)]",
    failed: "bg-[rgba(var(--signal-error-rgb),0.16)] border-transparent text-error",
};

const LABEL_STATE: Record<StepStatus, string> = {
    pending: "text-faint",
    done: "text-body",
    running: "text-strong font-medium",
    failed: "text-body",
};

function Node({ status, index }: { status: StepStatus; index: number }) {
    if (status === "done")
        return (
            <Icon
                name="check"
                size={12}
            />
        );
    if (status === "failed")
        return (
            <Icon
                name="x"
                size={12}
            />
        );
    if (status === "running")
        return (
            <span className="animate-spin-fast inline-flex">
                <Icon
                    name="loader"
                    size={12}
                />
            </span>
        );
    return <span className="text-2xs font-mono">{index + 1}</span>;
}

export interface StepTimelineProps extends HTMLAttributes<HTMLDivElement> {
    steps?: Step[];
}

/** Vertical stepper for the agent task view — one row per step with live status. */
export function StepTimeline({ steps = [], className = "", ...rest }: StepTimelineProps) {
    return (
        <div
            className={cn("flex flex-col", className)}
            {...rest}>
            {steps.map((s, i) => {
                const status = s.status ?? "pending";
                const isLast = i === steps.length - 1;
                return (
                    <div
                        className="flex gap-[10px]"
                        key={i}>
                        <div className="flex flex-col items-center flex-none">
                            <span
                                className={cn(
                                    "w-[20px] h-[20px] rounded-full flex items-center justify-center border-[1.5px] flex-none z-[1]",
                                    NODE_STATE[status],
                                )}>
                                <Node
                                    status={status}
                                    index={i}
                                />
                            </span>
                            {!isLast && (
                                <span
                                    className={cn(
                                        "w-[1.5px] flex-1 min-h-[10px]",
                                        status === "done" ? "bg-[rgba(var(--signal-success-rgb),0.35)]" : "bg-line",
                                    )}
                                />
                            )}
                        </div>
                        <div className="pb-[14px] flex-1 min-w-0">
                            <div className={cn("font-ui text-sm leading-[1.4]", LABEL_STATE[status])}>{s.label}</div>
                            {s.detail && <div className="mt-[3px] font-mono text-2xs text-faint">{s.detail}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
