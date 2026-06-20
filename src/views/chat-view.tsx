import { useEffect, useRef } from "react";
import {
    AgentActionCard,
    Button,
    ChatMessage,
    ContextPill,
    Icon,
    Markdown,
    PromptInput,
    QuickActions,
    StreamingIndicator,
    StreamingMarkdown,
} from "@/components/index";
import { cn } from "@/lib/cn";
import type { ActiveTab, ElementAttachment } from "@/lib/page-bridge";
import type { ExecutableAction } from "@/lib/agent";
import type { ChatTurn } from "../types";

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
            <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto py-4 px-[14px] flex flex-col gap-[14px] navi-scroll">
                {messages.map((m, i) =>
                    m.kind === "action" ? (
                        <AgentActionCard
                            key={i}
                            type={m.type}
                            label={m.label}
                            status={m.status}
                            detail={m.detail}
                            defaultOpen={m.open}
                        />
                    ) : (
                        <ChatMessage
                            key={i}
                            role={m.role}
                            meta={m.meta}
                            initials="JD">
                            {m.role === "assistant" && m.streaming ? (
                                <StreamingMarkdown
                                    text={m.text ?? ""}
                                    done={!!m.streamDone}
                                    onComplete={() => m.id && onStreamComplete(m.id)}
                                />
                            ) : m.role === "assistant" && m.text != null ? (
                                <Markdown source={m.text} />
                            ) : (
                                m.body
                            )}
                        </ChatMessage>
                    ),
                )}
                {busy && !pendingApproval && !streamingNow && (
                    <div className="py-[2px] px-1">
                        <StreamingIndicator label="Navi is working…" />
                    </div>
                )}
            </div>

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
                    {busy && (
                        <button
                            type="button"
                            onClick={onStop}
                            className={cn(CHIP_BTN, "ml-auto border-line text-error hover:border-line-strong")}>
                            <Icon
                                name="square"
                                size={11}
                            />
                            Stop
                        </button>
                    )}
                </div>

                <QuickActions
                    actions={[
                        { icon: "scan-text", label: "Summarize page", onClick: () => onSend("Summarize this page") },
                        {
                            icon: "table",
                            label: "Extract data",
                            onClick: () => onSend("Extract the main data on this page as a table"),
                        },
                        {
                            icon: "mouse-pointer-click",
                            label: "What can I click?",
                            onClick: () =>
                                onSend("What are the main things I can click or interact with on this page?"),
                        },
                    ]}
                />
                <PromptInput
                    value={draft}
                    onChange={setDraft}
                    onSend={() => onSend(draft)}
                    model={model}
                    onModelClick={onOpenModel}
                    disabled={busy}
                    {...{ picking, onTogglePicker }}
                />
            </div>
        </div>
    );
}
