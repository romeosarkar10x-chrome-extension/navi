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
            {messages.map((message, i) => {
                switch (message.kind) {
                    case "message":
                        return (
                            <ChatMessage
                                key={i}
                                role={message.role}
                                meta={message.meta}
                                initials="JD">
                                {message.role === "assistant" && message.streaming ? (
                                    <StreamingMarkdown
                                        text={message.text ?? ""}
                                        done={!!message.streamDone}
                                        onComplete={() => message.id && onStreamComplete(message.id)}
                                    />
                                ) : message.role === "assistant" && message.text != null ? (
                                    <Markdown source={message.text} />
                                ) : (
                                    message.body
                                )}
                            </ChatMessage>
                        );

                    case "thought":
                        return (
                            <ThinkingBlock
                                key={i}
                                text={message.text ?? ""}
                                streaming={message.streaming}
                                streamDone={message.streamDone}
                                open={message.open}
                                onToggle={() => message.id && onToggleThought(message.id)}
                                onComplete={() => message.id && onStreamComplete(message.id)}
                            />
                        );

                    case "tool_call":
                        <AgentActionCard
                            key={i}
                            type={message.type}
                            label={message.label}
                            status={message.status}
                            detail={message.detail}
                            defaultOpen={message.open}
                        />;
                }
            })}
            {busy && !pendingApproval && !streamingNow && (
                <div className="py-[2px] px-1">
                    <StreamingIndicator label="Navi is working..." />
                </div>
            )}
        </div>
    );
}
