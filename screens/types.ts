import type { ReactNode } from "react";
import type { ActionDetail, ActionStatus, ActionType } from "@/components";

export type ViewKey = "welcome" | "connect" | "chat" | "settings" | "task" | "history" | "recipes";

/** A chat turn — either a rendered message or an inline agent-action card. */
export interface ChatTurn {
    kind?: "action";
    /** Stable id for action cards so their status can be updated in place. */
    id?: string;
    role?: "user" | "assistant";
    meta?: ReactNode;
    body?: ReactNode;
    /** Plain-text version of `body`, used to build the model's conversation history. */
    text?: string;
    // action-card fields (when kind === "action")
    type?: ActionType;
    label?: ReactNode;
    status?: ActionStatus;
    detail?: ActionDetail[];
    open?: boolean;
}
