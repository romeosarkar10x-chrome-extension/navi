import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "../core/avatar";

type Role = "user" | "assistant";

const BUBBLE_COMMON =
    "rounded-lg py-[9px] px-3 font-ui text-base leading-[1.55] " +
    "[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold " +
    "[&_code]:font-mono [&_code]:text-[0.92em] [&_code]:rounded-xs [&_code]:px-[5px] [&_code]:py-[1px] " +
    "[&_ul]:my-[6px] [&_ol]:my-[6px] [&_ul]:pl-[18px] [&_ol]:pl-[18px] [&_li]:my-[3px] [&_a]:underline";

const BUBBLE_ASSISTANT =
    "bg-surface-card border border-line text-body rounded-tl-xs " +
    "[&_strong]:text-strong [&_code]:bg-surface-raised [&_a]:text-accent-text";

const BUBBLE_USER =
    "bg-accent text-on-accent rounded-tr-xs " +
    "[&_strong]:text-inherit [&_code]:bg-[rgba(0,0,0,0.18)] [&_a]:text-inherit";

export interface ChatMessageProps extends HTMLAttributes<HTMLDivElement> {
    role?: Role;
    meta?: ReactNode;
    initials?: string;
}

/** A single chat turn. role="user" right-aligns the accent bubble; "assistant" shows the Navi avatar + neutral bubble. */
export function ChatMessage({
    role = "assistant",
    children,
    meta,
    initials = "JD",
    className = "",
    ...rest
}: ChatMessageProps) {
    const isUser = role === "user";
    return (
        <div
            className={cn("flex gap-[9px] animate-msg-in", isUser && "flex-row-reverse", className)}
            {...rest}>
            <Avatar
                kind={isUser ? "user" : "navi"}
                initials={initials}
                size="sm"
            />
            <div className="max-w-[84%]">
                <div className={cn(BUBBLE_COMMON, isUser ? BUBBLE_USER : BUBBLE_ASSISTANT)}>{children}</div>
                {meta && (
                    <div className={cn("mt-[5px] text-2xs text-faint font-mono", isUser && "text-right")}>{meta}</div>
                )}
            </div>
        </div>
    );
}
