import { useEffect, useRef, useState } from "react";
import {
    AgentActionCard,
    Badge,
    Button,
    Card,
    ChatMessage,
    ContextPill,
    Icon,
    PromptInput,
    QuickActions,
    StepTimeline,
    StreamingIndicator,
    type Step,
} from "@/src/components";
import { cn } from "@/src/lib/cn";
import type { ActiveTab, ElementAttachment } from "@/src/lib/page-bridge";
import type { ExecutableAction } from "@/src/lib/agent";
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
}: ChatViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, busy]);

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
                            {m.body}
                        </ChatMessage>
                    ),
                )}
                {busy && !pendingApproval && (
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

export function TaskView({ onStop }: { onStop: () => void }) {
    const [steps, setSteps] = useState<Step[]>([
        { label: "Reading job listings", status: "done", detail: "found 12 matches" },
        {
            label: (
                <span>
                    Clicking <b>Apply</b> · Software Engineer at Acme
                </span>
            ),
            status: "running",
        },
        { label: "Filling application form", status: "pending" },
        { label: "Review before submit", status: "pending" },
    ]);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        const t = setTimeout(() => {
            setSteps(prev => {
                const i = prev.findIndex(s => s.status === "running");
                if (i < 0 || i >= prev.length - 1) return prev;
                const next = prev.map(s => ({ ...s }));
                next[i].status = "done";
                next[i + 1].status = "running";
                return next;
            });
        }, 2200);
        return () => clearTimeout(t);
    }, [steps, paused]);

    const done = steps.filter(s => s.status === "done").length;
    return (
        <div className="flex-1 min-h-0 flex flex-col pt-4 px-4 pb-5 overflow-y-auto navi-scroll">
            <Card
                agent
                className="mb-[14px]">
                <div className="flex items-center gap-[10px]">
                    <span className="w-[30px] h-[30px] flex-none rounded-sm bg-[rgba(var(--beacon-rgb),0.14)] text-accent-text flex items-center justify-center">
                        <Icon
                            name="workflow"
                            size={15}
                        />
                    </span>
                    <div>
                        <div className="text-md font-semibold text-strong">Applying to matching jobs</div>
                        <div className="text-xs text-muted mt-[2px] font-mono">
                            {done} of {steps.length} steps · acme + 11 more
                        </div>
                    </div>
                    <Badge
                        tone="progress"
                        dot>
                        {paused ? "Paused" : "Running"}
                    </Badge>
                </div>
            </Card>

            <div className="flex items-center gap-[6px] text-sm text-muted mb-4">
                <Icon
                    name="eye"
                    size={13}
                />{" "}
                Looking at: <b className="text-body">“Apply” button</b> on the listing card
            </div>

            <StepTimeline steps={steps} />

            <div className="flex gap-2 mt-[14px] pt-[14px] border-t border-line">
                {paused ? (
                    <Button
                        variant="primary"
                        size="sm"
                        icon="play"
                        onClick={() => setPaused(false)}>
                        Resume
                    </Button>
                ) : (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="pause"
                        onClick={() => setPaused(true)}>
                        Pause
                    </Button>
                )}
                <Button
                    variant="danger"
                    size="sm"
                    icon="square"
                    onClick={onStop}>
                    Stop
                </Button>
            </div>
        </div>
    );
}
