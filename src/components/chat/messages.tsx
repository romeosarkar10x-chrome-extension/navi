import { ExecutableAction } from "@/lib/agent";
import { ChatTurn } from "@/types";
import React from "react";

export function Messages({
    messages,
    busy,
    onStreamComplete,
    onToggleThought,
    scrollRef,
    pendingApproval,
}: {
    messages: ChatTurn[];
    busy: boolean;
    onStreamComplete: (id: string) => void;
    onToggleThought: (id: string) => void;
    scrollRef: React.Ref<HTMLDivElement | null>;
    pendingApproval: ExecutableAction | null;
}) {
    const streamingNow = messages.some(m => m.streaming);

    return (
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
                ) : m.kind === "thought" ? (
                    <ThinkingBlock
                        key={i}
                        text={m.text ?? ""}
                        streaming={m.streaming}
                        streamDone={m.streamDone}
                        open={m.open}
                        onToggle={() => m.id && onToggleThought(m.id)}
                        onComplete={() => m.id && onStreamComplete(m.id)}
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
    );
}
