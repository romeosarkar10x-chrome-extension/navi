import type { ReactNode } from "react";
import type { ActionDetail, ActionStatus, ActionType } from "@/components/index";

export type ViewKey = "welcome" | "connect" | "chat" | "settings" | "task" | "history" | "recipes";

/** A chat turn — a rendered message, an inline agent-action card, or a thinking block. */
export interface ChatTurn {
    kind?: "action" | "thought";
    /** Stable id for action/thought cards so they can be updated in place. */
    id?: string;
    role?: "user" | "assistant";
    meta?: ReactNode;
    body?: ReactNode;
    /** Plain-text version of `body`, used to build the model's conversation history. */
    text?: string;
    /** Render `text` through the typewriter (a live or just-finished streamed answer). */
    streaming?: boolean;
    /** The underlying token stream has ended; the typewriter drains the remaining buffer. */
    streamDone?: boolean;
    // action-card fields (when kind === "action")
    type?: ActionType;
    label?: ReactNode;
    status?: ActionStatus;
    detail?: ActionDetail[];
    open?: boolean;
}
