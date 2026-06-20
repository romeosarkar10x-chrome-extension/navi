import { useEffect, useRef } from "react";
import { Button, ContextPill, Icon, PromptInput } from "@/components/index";
import { cn } from "@/lib/cn";
import type { ActiveTab, ElementAttachment } from "@/lib/agent/page-bridge";
import type { ExecutableAction } from "@/lib/agent";
import type { ChatTurn } from "../types";
import { Messages } from "@/components/chat/messages";

const CHIP_BTN =
    "inline-flex items-center gap-[5px] rounded-full py-[3px] px-[8px] font-ui text-2xs cursor-pointer border " +
    "transition duration-[120ms] ease-[var(--ease-out)]";

function hostOf(url: string): string {
    try {
        return new URL(url).hostname || url;
    } catch {
        return url || "current page";
    }
}

function describeAction(a: ExecutableAction): string {
    switch (a.action) {
        case "click":
            return `Click element #${a.ref}`;
        case "fill":
            return `Type “${a.value}” into #${a.ref}`;
        case "select":
            return `Select “${a.value}” in #${a.ref}`;
        case "scroll":
            return a.ref == null ? "Scroll the page" : `Scroll to #${a.ref}`;
    }
}

export interface ChatViewProps {
    messages: ChatTurn[];
    draft: string;
    setDraft: (value: string) => void;
    onSend: (text: string) => void;
    model: string;
    onOpenModel: () => void;
    busy: boolean;
    onStop: () => void;
    activeTab: ActiveTab | null;
    attachPage: boolean;
    onToggleAttach: (on: boolean) => void;
    attachments: ElementAttachment[];
    onRemoveAttachment: (ref: number) => void;
    picking: boolean;
    onTogglePicker: () => void;
    pendingApproval: ExecutableAction | null;
    onApprove: (approved: boolean) => void;
    onStreamComplete: (id: string) => void;
    onToggleThought: (id: string) => void;
}

export function ChatView({
    messages,
    draft,
    setDraft,
    onSend,
    model,
    onOpenModel,
    busy,
    onStop,
    activeTab,
    attachPage,
    onToggleAttach,
    attachments,
    onRemoveAttachment,
    picking,
    onTogglePicker,
    pendingApproval,
    onApprove,
    onStreamComplete,
    onToggleThought,
}: ChatViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, busy]);

    const streamingNow = messages.some(m => m.streaming);

    // Follow the typewriter as it reveals text between token arrivals, but only
    // while the user is parked near the bottom — don't yank them back if they
    // scrolled up to read.
    useEffect(() => {
        if (!streamingNow) return;
        let raf = 0;
        const pin = () => {
            const el = scrollRef.current;
            if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 80) el.scrollTop = el.scrollHeight;
            raf = requestAnimationFrame(pin);
        };
        raf = requestAnimationFrame(pin);
        return () => cancelAnimationFrame(raf);
    }, [streamingNow]);

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <Messages
                {...{
                    messages,
                    busy,
                    onStreamComplete,
                    onToggleThought,
                    scrollRef,
                    pendingApproval,
                }}
            />

            <div className="flex-none border-t border-line bg-surface-base pt-[10px] px-3 pb-3 flex flex-col gap-[9px]">
                {pendingApproval && (
                    <div className="flex items-center gap-2 rounded-md border border-accent-line bg-surface-agent px-[10px] py-2">
                        <span className="flex-none inline-flex text-accent-text">
                            <Icon
                                name="mouse-pointer-click"
                                size={14}
                            />
                        </span>
                        <span className="flex-1 min-w-0 text-sm text-strong truncate">
                            {describeAction(pendingApproval)}
                        </span>
                        <Button
                            variant="primary"
                            size="sm"
                            icon="play"
                            onClick={() => onApprove(true)}>
                            Run
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onApprove(false)}>
                            Skip
                        </Button>
                    </div>
                )}

                <div className="flex gap-[6px] flex-wrap items-center">
                    {attachPage && activeTab ? (
                        <ContextPill
                            icon="globe"
                            onRemove={() => onToggleAttach(false)}>
                            {hostOf(activeTab.url)}
                        </ContextPill>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onToggleAttach(true)}
                            className={cn(
                                CHIP_BTN,
                                "bg-surface-raised border-line text-muted hover:text-strong hover:border-line-strong",
                            )}>
                            <Icon
                                name="plus"
                                size={11}
                            />
                            Attach page
                        </button>
                    )}
                    {attachments.map(a => (
                        <ContextPill
                            key={a.ref}
                            icon="scan-text"
                            onRemove={() => onRemoveAttachment(a.ref)}>
                            {a.descriptor}
                        </ContextPill>
                    ))}
                </div>

                <PromptInput
                    value={draft}
                    onChange={setDraft}
                    onSend={() => onSend(draft)}
                    onModelClick={onOpenModel}
                    {...{ model, busy, onStop, picking, onTogglePicker }}
                />
            </div>
        </div>
    );
}
