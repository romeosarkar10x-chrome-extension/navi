import { useState, type ReactNode } from "react";
import { Button, Icon, type IconName } from "@/components";
import { cn } from "@/lib/cn";
import { TopBar } from "./shell";
import { WelcomeView, ConnectView } from "./welcome";
import { ChatView, TaskView } from "./chat";
import { SettingsView, ModelSheet } from "./settings";
import type { ChatTurn, ModelID, Provider, ViewKey } from "./types";

const GREETING: ChatTurn[] = [
    {
        role: "assistant",
        meta: "claude-sonnet-4",
        body: (
            <span>
                Hey! I can see this jobs page. Ask me to summarize it, pull the listings into a table, or apply to
                matching roles — I'll show each step before running.
            </span>
        ),
    },
];

const MODEL_LABELS: Record<ModelID, string> = {
    "claude-sonnet-4": "Claude Sonnet 4",
    "claude-opus-4": "Claude Opus 4",
    "mistral-7b": "Mistral 7B",
};

function labelToModel(label: string): ModelID {
    if (label === "Claude Opus 4") return "claude-opus-4";
    if (label === "Mistral 7B") return "mistral-7b";
    return "claude-sonnet-4";
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
    const [provider, setProvider] = useState<Provider>("cloud");
    const [model, setModel] = useState<ModelID>("claude-sonnet-4");
    const [sheet, setSheet] = useState(false);
    const [messages, setMessages] = useState<ChatTurn[]>(GREETING);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);

    function send(text: string) {
        const t = (text || "").trim();
        if (!t) return;
        setDraft("");
        setMessages(m => [...m, { role: "user", body: t }]);
        setBusy(true);
        setTimeout(() => {
            setBusy(false);
            if (/apply/i.test(t)) {
                setMessages(m => [
                    ...m,
                    {
                        role: "assistant",
                        meta: "claude-sonnet-4",
                        body: (
                            <span>
                                I found <strong>12 matching roles</strong>. I'll apply to each, pausing for review
                                before any submit. Starting now.
                            </span>
                        ),
                    },
                ]);
                setTimeout(() => setView("task"), 600);
            } else if (/table|extract/i.test(t)) {
                setMessages(m => [
                    ...m,
                    {
                        kind: "action",
                        type: "scrape",
                        label: (
                            <span>
                                Scraped <b>12 listings</b>
                            </span>
                        ),
                        status: "success",
                        detail: [
                            { k: "fields", v: "title, company, location, salary" },
                            { k: "rows", v: "12" },
                        ],
                        open: true,
                    },
                    {
                        role: "assistant",
                        meta: "claude-sonnet-4",
                        body: (
                            <span>
                                Extracted 12 listings. Top result: <strong>Senior SWE · Acme · $180–210k</strong>. Want
                                this as CSV?
                            </span>
                        ),
                    },
                ]);
            } else {
                setMessages(m => [
                    ...m,
                    {
                        role: "assistant",
                        meta: "claude-sonnet-4",
                        body: (
                            <span>
                                This is a <strong>job search results</strong> page with 1,284 listings. The top roles
                                are senior backend and full-stack positions in the Bay Area, most posted this week.
                            </span>
                        ),
                    },
                ]);
            }
        }, 1500);
    }

    let main: ReactNode;
    if (view === "welcome") {
        main = (
            <WelcomeView
                onConnect={p => {
                    setProvider(p);
                    setView("connect");
                }}
            />
        );
    } else if (view === "connect") {
        main = (
            <ConnectView
                provider={provider}
                onBack={() => setView("welcome")}
                onDone={() => setView("chat")}
            />
        );
    } else if (view === "settings") {
        main = <SettingsView onBack={() => setView("chat")} />;
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
                model={model}
                onOpenModel={() => setSheet(true)}
                busy={busy}
            />
        );
    }

    const showChrome = view !== "welcome" && view !== "connect";

    return (
        <div className={cn("relative flex flex-col h-full bg-surface-base", "shadow-[var(--shadow-rail)]")}>
            {showChrome && (
                <TopBar
                    model={model}
                    view={view}
                    onOpenModel={() => setSheet(true)}
                    onOpenSettings={() => setView("settings")}
                    onNav={v => setView(v)}
                />
            )}
            <div className="flex-1 min-h-0 flex flex-col">{main}</div>
            {sheet && (
                <ModelSheet
                    current={MODEL_LABELS[model]}
                    onClose={() => setSheet(false)}
                    onPick={label => {
                        setModel(labelToModel(label));
                        setSheet(false);
                    }}
                />
            )}
        </div>
    );
}
