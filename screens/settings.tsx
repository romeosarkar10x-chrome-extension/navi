import { useState, type ReactNode } from "react";
import { APIKeyInput, Button, Icon, Select, Slider, StatusDot, Switch } from "@/components";

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="mb-[18px]">
            <div className="font-mono text-2xs tracking-[0.06em] uppercase text-faint mb-2">{title}</div>
            <div className="bg-surface-card border border-line rounded-md overflow-hidden">{children}</div>
        </div>
    );
}

function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
    return (
        <div className="flex items-center gap-3 py-[11px] px-3 border-t border-line-faint first:border-t-0">
            <div className="flex-1 min-w-0 text-sm text-body">
                {label}
                {hint && <span className="block text-2xs text-faint mt-[2px]">{hint}</span>}
            </div>
            <div className="flex-none flex items-center">{children}</div>
        </div>
    );
}

export function SettingsView({ onBack }: { onBack: () => void }) {
    const [provider, setProvider] = useState("cloud");
    const [autoExec, setAutoExec] = useState(false);
    const [maxSteps, setMaxSteps] = useState(10);
    const [theme, setTheme] = useState("system");
    const [speed, setSpeed] = useState("Normal");
    const [position, setPosition] = useState("Right");
    const [history, setHistory] = useState(true);

    return (
        <div className="flex-1 min-h-0 flex flex-col pt-4 px-4 pb-5 overflow-y-auto navi-scroll">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-[5px] self-start mb-[14px] text-muted font-ui text-sm cursor-pointer hover:text-strong">
                <Icon
                    name="arrow-left"
                    size={14}
                />{" "}
                Back to chat
            </button>
            <h2 className="font-display text-xl font-semibold text-strong mb-[18px]">Settings</h2>

            <Section title="Provider">
                <Row label="Source">
                    <Select
                        value={provider}
                        onChange={e => setProvider(e.target.value)}
                        size="sm"
                        options={[
                            { value: "cloud", label: "Cloud · Claude" },
                            { value: "local", label: "Local · LM Studio" },
                        ]}
                    />
                </Row>
                {provider === "cloud" ? (
                    <Row label="API key">
                        <APIKeyInput
                            size="sm"
                            value="sk-ant-api03-9f2c"
                            onChange={() => {}}
                        />
                    </Row>
                ) : (
                    <Row label="Status">
                        <StatusDot
                            tone="success"
                            pulse>
                            localhost:1234
                        </StatusDot>
                    </Row>
                )}
                <Row label="Model">
                    <Select
                        size="sm"
                        options={[
                            { value: "s4", label: "Claude Sonnet 4" },
                            { value: "o4", label: "Claude Opus 4" },
                        ]}
                    />
                </Row>
            </Section>

            <Section title="Agent">
                <Row
                    label="Auto-execute actions"
                    hint="Run without asking each time">
                    <Switch
                        checked={autoExec}
                        onChange={setAutoExec}
                    />
                </Row>
                <Row
                    label="Max autonomous steps"
                    hint={`${maxSteps} before pausing`}>
                    <div className="w-[120px]">
                        <Slider
                            value={maxSteps}
                            min={1}
                            max={50}
                            onChange={setMaxSteps}
                        />
                    </div>
                </Row>
                <Row label="Action speed">
                    <Select
                        size="sm"
                        options={["Slow", "Normal", "Fast"]}
                        value={speed}
                        onChange={e => setSpeed(e.target.value)}
                    />
                </Row>
            </Section>

            <Section title="General">
                <Row label="Theme">
                    <Select
                        size="sm"
                        value={theme}
                        onChange={e => setTheme(e.target.value)}
                        options={[
                            { value: "system", label: "System" },
                            { value: "dark", label: "Dark" },
                            { value: "light", label: "Light" },
                        ]}
                    />
                </Row>
                <Row label="Sidebar position">
                    <Select
                        size="sm"
                        options={["Right", "Left"]}
                        value={position}
                        onChange={e => setPosition(e.target.value)}
                    />
                </Row>
            </Section>

            <Section title="Data & privacy">
                <Row label="Save conversation history">
                    <Switch
                        checked={history}
                        onChange={setHistory}
                    />
                </Row>
                <div className="flex gap-2 py-[11px] px-3 border-t border-line-faint">
                    <Button
                        variant="danger"
                        size="sm"
                        icon="trash-2">
                        Clear all history
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon="download">
                        Export data
                    </Button>
                </div>
            </Section>
        </div>
    );
}

interface ModelOption {
    id: string;
    sub: string;
    icon: "sparkles" | "cpu";
}

const MODELS: ModelOption[] = [
    { id: "Claude Sonnet 4", sub: "Anthropic · fast, balanced", icon: "sparkles" },
    { id: "Claude Opus 4", sub: "Anthropic · deepest reasoning", icon: "sparkles" },
    { id: "Mistral 7B", sub: "Local · localhost:1234", icon: "cpu" },
];

export interface ModelSheetProps {
    current: string;
    onPick: (label: string) => void;
    onClose: () => void;
}

export function ModelSheet({ current, onPick, onClose }: ModelSheetProps) {
    return (
        <div
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[2px] flex items-end z-30 animate-fade">
            <div
                onClick={e => e.stopPropagation()}
                className="w-full bg-surface-overlay border-t border-line-strong rounded-t-xl pt-2 px-3 pb-4 shadow-[var(--shadow-pop)] animate-sheet-up">
                <div className="w-[34px] h-1 rounded-[2px] bg-line-strong mx-auto mt-[6px] mb-3" />
                <div className="text-sm font-semibold text-strong px-1 pb-2">Switch model</div>
                {MODELS.map(m => {
                    const on = m.id === current;
                    return (
                        <button
                            type="button"
                            key={m.id}
                            onClick={() => onPick(m.id)}
                            className={`flex items-center gap-[11px] w-full p-[10px] border-none rounded-md cursor-pointer text-left text-inherit transition duration-[120ms] ease-[var(--ease-out)] ${
                                on ? "bg-accent-soft" : "bg-transparent hover:bg-control"
                            }`}>
                            <span className="w-[30px] h-[30px] flex-none rounded-sm bg-surface-raised flex items-center justify-center text-accent-text">
                                <Icon
                                    name={m.icon}
                                    size={15}
                                />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-base font-medium text-strong">{m.id}</div>
                                <div className="text-2xs text-muted font-mono mt-[1px]">{m.sub}</div>
                            </div>
                            {on ? (
                                <Icon
                                    name="check"
                                    size={15}
                                />
                            ) : (
                                <StatusDot tone="success" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
