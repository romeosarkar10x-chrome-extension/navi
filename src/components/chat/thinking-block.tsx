import { cn } from "@/lib/cn";
import { Icon } from "../core/icon";
import { Markdown } from "./markdown";
import { StreamingMarkdown } from "./streaming-markdown";

export interface ThinkingBlockProps {
    /** The thought text (full so far; grows while streaming). */
    text: string;
    /** Render through the typewriter (a live or just-finished streamed thought). */
    streaming?: boolean;
    /** The thought's token stream has ended. */
    streamDone?: boolean;
    /** Whether the block is expanded. */
    open?: boolean;
    /** Toggle expanded/collapsed. */
    onToggle: () => void;
    /** Fired once the streamed thought is done and fully revealed. */
    onComplete?: () => void;
}

const CONTENT_PROSE =
    "text-sm text-muted leading-[1.5] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:text-body " +
    "[&_code]:font-mono [&_code]:text-[0.92em] [&_ul]:my-[6px] [&_ol]:my-[6px] [&_ul]:pl-[18px] [&_ol]:pl-[18px] " +
    "[&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-[2px] [&_a]:underline [&_a]:text-accent-text";

/** Collapsible block showing the model's reasoning for the current agent step. */
export function ThinkingBlock({ text, streaming, streamDone, open = false, onToggle, onComplete }: ThinkingBlockProps) {
    const active = !!streaming && !streamDone;
    return (
        <div className="bg-surface-card border border-line rounded-md overflow-hidden font-ui">
            <button
                type="button"
                onClick={onToggle}
                className="flex items-center gap-[9px] py-2 px-[10px] w-full bg-transparent border-none text-left cursor-pointer">
                <span className={cn("flex-none inline-flex text-accent-text", active && "animate-pulse")}>
                    <Icon
                        name="sparkles"
                        size={14}
                    />
                </span>
                <span className="flex-1 min-w-0 text-sm text-muted">{active ? "Thinking…" : "Thinking"}</span>
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
            </button>
            {/* Kept mounted (hidden, not unmounted) when collapsed so the typewriter
                can keep draining and complete even while out of view. */}
            <div className={cn("pb-[10px] pr-[10px] pl-[33px]", CONTENT_PROSE, !open && "hidden")}>
                {streaming ? (
                    <StreamingMarkdown
                        text={text}
                        done={!!streamDone}
                        onComplete={onComplete}
                    />
                ) : (
                    <Markdown source={text} />
                )}
            </div>
        </div>
    );
}
