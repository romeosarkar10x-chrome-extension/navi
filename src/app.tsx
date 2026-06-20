import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Icon, type ActionDetail, type ActionStatus, type ActionType, type IconName } from "@/components/index";
import { cn } from "@/lib/cn";
import { DEFAULT_CONFIG, isConfigReady, type ProviderConfig } from "@/lib/agent/providers";
import {
    DEFAULT_AGENT_SETTINGS,
    loadAgentSettings,
    loadConfig,
    saveAgentSettings,
    saveConfig,
    type AgentSettings,
} from "@/lib/storage";
import type { ChatMessage } from "@/lib/chat-client";
import { runAgent, type ActionPhase, type AgentCallbacks, type ExecutableAction } from "@/lib/agent";
import {
    capturePage,
    getActiveTab,
    runAction,
    type ActionResult,
    type ActiveTab,
    type ElementAttachment,
    type PageSnapshot,
} from "@/lib/agent/page-bridge";
import { startPicker, stopPicker } from "@/lib/element-picker";
import { TopBar } from "./views/shell";
import { WelcomeView } from "./views/welcome-view";
import { ConnectView } from "./views/connect-view";
import { ChatView } from "./views/chat-view";
import { TaskView } from "./views/task-view";
import { SettingsView, ModelSheet } from "./views/settings-view";
import type { ChatTurn, ViewKey } from "./types";

const GREETING: ChatTurn[] = [
    {
        role: "assistant",
        meta: "navi",
        kind: "message",
        body: (
            <span>
                Hey! I can see the current tab. Ask me to summarize it, pull data into a table, or act on it — click a
                button, fill a form. Use <b>Inspect element</b> to attach a specific element to talk about.
            </span>
        ),
    },
];

function actionLabel(action: ExecutableAction): string {
    switch (action.action) {
        case "click":
            return `Click #${action.ref}`;
        case "fill":
            return `Type into #${action.ref}`;
        case "select":
            return `Select in #${action.ref}`;
        case "scroll":
            return action.ref == null ? "Scroll page" : `Scroll to #${action.ref}`;
    }
}

const ACTION_TYPE: Record<ExecutableAction["action"], ActionType> = {
    click: "click",
    fill: "fill",
    select: "fill",
    scroll: "navigate",
};

const ACTION_STATUS: Record<ActionPhase, ActionStatus> = {
    pending: "pending",
    running: "running",
    success: "success",
    failed: "failed",
};

function actionCard(action: ExecutableAction, phase: ActionPhase, id: string, result?: ActionResult): ChatTurn {
    const detail: ActionDetail[] = [];
    if (action.action !== "scroll") detail.push({ k: "ref", v: String(action.ref) });
    if (action.action === "fill" || action.action === "select") detail.push({ k: "value", v: action.value });
    if (result?.error && result.error !== "skipped") detail.push({ k: "error", v: result.error });
    return {
        kind: "tool_call",
        id,
        type: ACTION_TYPE[action.action],
        label: actionLabel(action),
        status: ACTION_STATUS[phase],
        detail,
    };
}

function EmptyView({ kind, onBack }: { kind: "history" | "recipes"; onBack: () => void }) {
    const cfg: { icon: IconName; t: string; d: string } =
        kind === "history"
            ? {
                  icon: "history",
                  t: "No history yet",
                  d: "Conversations you have with Navi will show up here, grouped by day.",
              }
            : {
                  icon: "bookmark",
                  t: "No recipes yet",
                  d: "Save an automation as a recipe to run it again on any matching page.",
              };
    return (
        <div className="flex-1 min-h-0 flex flex-col items-center text-center justify-center pt-4 px-4 pb-5 overflow-y-auto navi-scroll">
            <span className="w-[48px] h-[48px] rounded-[12px] bg-surface-card border border-line flex items-center justify-center text-faint mb-[14px]">
                <Icon
                    name={cfg.icon}
                    size={20}
                />
            </span>
            <div className="text-md font-semibold text-strong">{cfg.t}</div>
            <div className="text-sm text-muted mt-[6px] max-w-[28ch] leading-[1.5]">{cfg.d}</div>
            <div className="mt-4">
                <Button
                    variant="secondary"
                    size="sm"
                    icon="arrow-left"
                    onClick={onBack}>
                    Back to chat
                </Button>
            </div>
        </div>
    );
}

export function App() {
    const [view, setView] = useState<ViewKey>("welcome");
    const [hydrated, setHydrated] = useState(false);
    const [config, setConfig] = useState<ProviderConfig>(DEFAULT_CONFIG);
    const [agentSettings, setAgentSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS);
    const [sheet, setSheet] = useState(false);
    const [messages, setMessages] = useState<ChatTurn[]>(GREETING);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);
    const [attachPage, setAttachPage] = useState(true);
    const [attachments, setAttachments] = useState<ElementAttachment[]>([]);
    const [picking, setPicking] = useState(false);
    const [pendingApproval, setPendingApproval] = useState<ExecutableAction | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const approvalRef = useRef<((approved: boolean) => void) | null>(null);
    const pickerDisposeRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        Promise.all([loadConfig(), loadAgentSettings()]).then(([cfg, agent]) => {
            setConfig(cfg);
            setAgentSettings(agent);
            // Skip the welcome/connect flow when a usable config is already saved.
            if (isConfigReady(cfg)) setView("chat");
            setHydrated(true);
        });
        return () => pickerDisposeRef.current?.();
    }, []);

    useEffect(() => {
        if (view === "chat")
            getActiveTab()
                .then(setActiveTab)
                .catch(() => {});
    }, [view]);

    function persistConfig(next: ProviderConfig) {
        setConfig(next);
        void saveConfig(next);
    }

    function persistAgentSettings(next: AgentSettings) {
        setAgentSettings(next);
        void saveAgentSettings(next);
    }

    async function togglePicker() {
        const tab = activeTab ?? (await getActiveTab());
        if (!tab) return;
        if (picking) {
            pickerDisposeRef.current?.();
            pickerDisposeRef.current = null;
            await stopPicker(tab.id);
            setPicking(false);
        } else {
            pickerDisposeRef.current = startPicker(tab.id, a => setAttachments(prev => [...prev, a]));
            setPicking(true);
        }
    }

    function requestApproval(action: ExecutableAction): Promise<boolean> {
        setPendingApproval(action);
        return new Promise<boolean>(resolve => {
            approvalRef.current = approved => {
                approvalRef.current = null;
                setPendingApproval(null);
                resolve(approved);
            };
        });
    }

    function handleApprove(approved: boolean) {
        approvalRef.current?.(approved);
    }

    function handleStop() {
        abortRef.current?.abort();
        approvalRef.current?.(false);
        setBusy(false);
    }

    async function send(text: string) {
        const t = (text || "").trim();
        if (!t || busy) return;
        setDraft("");

        const history: ChatMessage[] = messages
            .filter(m => m.kind !== "tool_call" && (m.role === "user" || m.role === "assistant"))
            .map(m => ({
                role: m.role as "user" | "assistant",
                content: m.text ?? (typeof m.body === "string" ? m.body : ""),
            }))
            .filter(m => m.content.length > 0);

        setMessages(m => [...m, { role: "user", kind: "message", body: t, text: t }]);
        setBusy(true);

        const controller = new AbortController();
        abortRef.current = controller;

        const tab = activeTab ?? (await getActiveTab());
        if (tab && !activeTab) setActiveTab(tab);

        let snapshot: PageSnapshot | null = null;
        if (attachPage && tab) {
            try {
                snapshot = await capturePage(tab.id);
            } catch (err) {
                setMessages(m => [
                    ...m,
                    {
                        kind: "message",
                        role: "assistant",
                        meta: "note",
                        body: `⚠️ ${err instanceof Error ? err.message : "Couldn't read the page"}`,
                    },
                ]);
            }
        }

        let cardCounter = 0;
        let currentCardId = "";
        let streamId = "";
        let thoughtId = "";
        // Once a step's outcome (its action card or the final answer) appears, fold
        // the thought that produced it away.
        const collapseThought = () => {
            if (thoughtId)
                setMessages(m => m.map(x => (x.id === thoughtId ? { ...x, open: false, streamDone: true } : x)));
        };
        const callbacks: AgentCallbacks = {
            onThoughtStart: () => {
                thoughtId = `tht-${Date.now()}-${cardCounter++}`;
                setMessages(m => [
                    ...m,
                    { kind: "thought", id: thoughtId, text: "", streaming: true, streamDone: false, open: true },
                ]);
            },
            onThoughtToken: delta => {
                setMessages(m => m.map(x => (x.id === thoughtId ? { ...x, text: (x.text ?? "") + delta } : x)));
            },
            onThought: txt => {
                if (thoughtId) setMessages(m => m.map(x => (x.id === thoughtId ? { ...x, text: txt } : x)));
            },
            onAction: (action, phase, result) => {
                if (phase === "pending") {
                    collapseThought();
                    currentCardId = `act-${Date.now()}-${cardCounter++}`;
                }
                const id = currentCardId;
                const card = actionCard(action, phase, id, result);
                setMessages(m => {
                    const idx = m.findIndex(x => x.id === id);
                    if (idx < 0) return [...m, card];
                    const copy = [...m];
                    copy[idx] = card;
                    return copy;
                });
            },
            onAnswerStart: () => {
                collapseThought();
                streamId = `ans-${Date.now()}-${cardCounter++}`;
                setMessages(m => [
                    ...m,
                    {
                        id: streamId,
                        role: "assistant",
                        meta: config.model,
                        text: "",
                        kind: "message",
                        streaming: true,
                        streamDone: false,
                    },
                ]);
            },
            onAnswerToken: delta => {
                setMessages(m => m.map(x => (x.id === streamId ? { ...x, text: (x.text ?? "") + delta } : x)));
            },
            onAnswer: txt => {
                if (streamId) {
                    setMessages(m => m.map(x => (x.id === streamId ? { ...x, text: txt, streamDone: true } : x)));
                } else {
                    setMessages(m => [
                        ...m,
                        { role: "assistant", kind: "message", meta: config.model, body: txt, text: txt },
                    ]);
                }
            },
        };

        try {
            await runAgent({
                config,
                userText: t,
                snapshot,
                attachments,
                history,
                callbacks,
                maxSteps: agentSettings.maxSteps,
                autoExecute: agentSettings.autoExecute,
                requestApproval,
                runAction: action =>
                    tab ? runAction(tab.id, action) : Promise.resolve({ ok: false, error: "No accessible tab" }),
                recapture: async () => {
                    if (!attachPage || !tab) return snapshot;
                    try {
                        return await capturePage(tab.id);
                    } catch {
                        return null;
                    }
                },
                signal: controller.signal,
            });
        } finally {
            setBusy(false);
            abortRef.current = null;
            setPendingApproval(null);
            // Stopped or aborted mid-stream: mark any live stream ended so the
            // typewriter drains its buffer and the caret clears.
            const ended = new Set([streamId, thoughtId].filter(Boolean));
            if (ended.size) setMessages(m => m.map(x => (x.id && ended.has(x.id) ? { ...x, streamDone: true } : x)));
        }
    }

    function handleToggleThought(id: string) {
        setMessages(m => m.map(x => (x.id === id ? { ...x, open: !x.open } : x)));
    }

    function handleStreamComplete(id: string) {
        setMessages(m => m.map(x => (x.id === id ? { ...x, streaming: false } : x)));
    }

    // Hold the first paint until storage is read, so we don't flash the welcome
    // view before resuming a saved config.
    if (!hydrated) {
        return <div className="h-full bg-surface-base" />;
    }

    let main: ReactNode;
    if (view === "welcome") {
        main = (
            <WelcomeView
                onConnect={preset => {
                    setConfig(c => ({ ...c, baseURL: preset.baseURL, model: preset.model }));
                    setView("connect");
                }}
            />
        );
    } else if (view === "connect") {
        main = (
            <ConnectView
                initialConfig={config}
                onBack={() => setView(isConfigReady(config) ? "chat" : "welcome")}
                onDone={cfg => {
                    persistConfig(cfg);
                    setView("chat");
                }}
            />
        );
    } else if (view === "settings") {
        main = (
            <SettingsView
                config={config}
                onConfigChange={persistConfig}
                agentSettings={agentSettings}
                onAgentSettingsChange={persistAgentSettings}
                onBack={() => setView("chat")}
            />
        );
    } else if (view === "task") {
        main = <TaskView onStop={() => setView("chat")} />;
    } else if (view === "history" || view === "recipes") {
        main = (
            <EmptyView
                kind={view}
                onBack={() => setView("chat")}
            />
        );
    } else {
        main = (
            <ChatView
                messages={messages}
                draft={draft}
                setDraft={setDraft}
                onSend={send}
                model={config.model}
                onOpenModel={() => setSheet(true)}
                busy={busy}
                onStop={handleStop}
                activeTab={activeTab}
                attachPage={attachPage}
                onToggleAttach={setAttachPage}
                attachments={attachments}
                onRemoveAttachment={ref => setAttachments(a => a.filter(x => x.ref !== ref))}
                picking={picking}
                onTogglePicker={togglePicker}
                pendingApproval={pendingApproval}
                onApprove={handleApprove}
                onStreamComplete={handleStreamComplete}
                onToggleThought={handleToggleThought}
            />
        );
    }

    const showChrome = view !== "welcome" && view !== "connect";

    return (
        <div className={cn("relative flex flex-col h-full bg-surface-base", "shadow-[var(--shadow-rail)]")}>
            {showChrome && (
                <TopBar
                    model={config.model}
                    view={view}
                    onOpenModel={() => setSheet(true)}
                    onOpenSettings={() => setView("settings")}
                    onNav={v => setView(v)}
                />
            )}
            <div className="flex-1 min-h-0 flex flex-col">{main}</div>
            {sheet && (
                <ModelSheet
                    currentModel={config.model}
                    onClose={() => setSheet(false)}
                    onPick={preset => {
                        persistConfig({ ...config, baseURL: preset.baseURL, model: preset.model });
                        setSheet(false);
                    }}
                    onConnectNew={() => {
                        setSheet(false);
                        setView("connect");
                    }}
                />
            )}
        </div>
    );
}
