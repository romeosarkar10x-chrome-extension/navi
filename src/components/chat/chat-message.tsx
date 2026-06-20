import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "../core/avatar";

type Role = "user" | "assistant";

const BUBBLE_COMMON =
    "rounded-lg py-[9px] px-3 font-ui text-base leading-[1.55] " +
    "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 " +
    "[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_del]:line-through " +
    // headings
    "[&_h1]:text-lg [&_h2]:text-md [&_h3]:text-base [&_h4]:text-base [&_h5]:text-sm [&_h6]:text-sm " +
    "[&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold " +
    "[&_h1]:mt-[14px] [&_h2]:mt-[14px] [&_h3]:mt-3 [&_h4]:mt-3 [&_h5]:mt-3 [&_h6]:mt-3 " +
    "[&_h1]:mb-[6px] [&_h2]:mb-[6px] [&_h3]:mb-1 [&_h4]:mb-1 [&_h5]:mb-1 [&_h6]:mb-1 [&_h1]:leading-tight [&_h2]:leading-tight " +
    // inline + fenced code
    "[&_code]:font-mono [&_code]:text-[0.92em] [&_code]:rounded-xs [&_code]:px-[5px] [&_code]:py-[1px] " +
    "[&_pre]:my-2 [&_pre]:p-[10px] [&_pre]:rounded-sm [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-[0.9em] [&_pre]:leading-[1.5] " +
    "[&_pre]:bg-surface-sunken [&_pre]:border [&_pre]:border-line " +
    "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_pre_code]:text-inherit " +
    // lists
    "[&_ul]:my-[6px] [&_ol]:my-[6px] [&_ul]:pl-[18px] [&_ol]:pl-[18px] [&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-[3px] " +
    "[&_li.navi-md-task]:list-none [&_li.navi-md-task]:-ml-[18px] [&_li.navi-md-task]:flex [&_li.navi-md-task]:items-start [&_li.navi-md-task]:gap-[6px] " +
    "[&_li.navi-md-task_input]:mt-[3px] " +
    // blockquote, links, images, rules
    "[&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-muted " +
    "[&_a]:underline [&_img]:max-w-full [&_img]:rounded-sm [&_img]:my-2 " +
    "[&_hr]:my-3 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-line " +
    // tables
    "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
    "[&_th]:border [&_th]:border-line [&_th]:px-[8px] [&_th]:py-[4px] [&_th]:font-semibold [&_th]:bg-surface-raised " +
    "[&_td]:border [&_td]:border-line [&_td]:px-[8px] [&_td]:py-[4px]";

const BUBBLE_ASSISTANT =
    "bg-surface-card border border-line text-body rounded-tl-xs " +
    "[&_strong]:text-strong [&_code]:bg-surface-raised [&_a]:text-accent-text " +
    "[&_h1]:text-strong [&_h2]:text-strong [&_h3]:text-strong [&_h4]:text-strong [&_h5]:text-strong [&_h6]:text-strong";

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
