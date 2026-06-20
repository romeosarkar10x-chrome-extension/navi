import { useState, type ReactNode } from "react";
import { APIKeyInput, Button, Icon, Input, Select, Slider, Switch } from "@/components/index";
import { matchPreset, PRESETS, type ProviderConfig, type ProviderPreset } from "@/lib/providers";
import type { AgentSettings } from "@/lib/storage";

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

export interface SettingsViewProps {
    config: ProviderConfig;
    onConfigChange: (config: ProviderConfig) => void;
    agentSettings: AgentSettings;
    onAgentSettingsChange: (settings: AgentSettings) => void;
    onBack: () => void;
}

const CUSTOM = "custom";

export function SettingsView({
    config,
    onConfigChange,
    agentSettings,
    onAgentSettingsChange,
    onBack,
}: SettingsViewProps) {
    const [theme, setTheme] = useState("system");
    const [speed, setSpeed] = useState("Normal");
    const [position, setPosition] = useState("Right");
    const [history, setHistory] = useState(true);

    const activePreset = matchPreset(config);

    function selectPreset(id: string) {
        const preset = PRESETS.find(p => p.id === id);
        if (preset) onConfigChange({ ...config, baseURL: preset.baseURL, model: preset.model });
    }

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
                <Row label="Preset">
                    <Select
                        value={activePreset?.id ?? CUSTOM}
                        onChange={e => selectPreset(e.target.value)}
                        size="sm"
                        options={[
                            ...PRESETS.map(p => ({ value: p.id, label: p.label })),
                            { value: CUSTOM, label: "Custom" },
                        ]}
                    />
                </Row>
                <Row label="Endpoint">
                    <Input
                        size="sm"
                        className="w-[180px]"
                        value={config.baseURL}
                        onChange={e => onConfigChange({ ...config, baseURL: e.target.value })}
                    />
                </Row>
                <Row label="Model">
                    <Input
                        size="sm"
                        className="w-[180px]"
                        value={config.model}
                        onChange={e => onConfigChange({ ...config, model: e.target.value })}
                    />
                </Row>
                <Row
                    label="API key"
                    hint="Optional — leave blank for endpoints that don't need one">
                    <APIKeyInput
                        size="sm"
                        className="w-[180px]"
                        value={config.apiKey}
                        onChange={e => onConfigChange({ ...config, apiKey: e.target.value })}
                    />
                </Row>
            </Section>

            <Section title="Agent">
                <Row
                    label="Auto-execute actions"
                    hint="Run without asking each time">
                    <Switch
                        checked={agentSettings.autoExecute}
                        onChange={v => onAgentSettingsChange({ ...agentSettings, autoExecute: v })}
                    />
                </Row>
                <Row
                    label="Max autonomous steps"
                    hint={`${agentSettings.maxSteps} before pausing`}>
                    <div className="w-[120px]">
                        <Slider
                            value={agentSettings.maxSteps}
                            min={1}
                            max={50}
                            onChange={v => onAgentSettingsChange({ ...agentSettings, maxSteps: v })}
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

export interface ModelSheetProps {
    currentModel: string;
    onPick: (preset: ProviderPreset) => void;
    onClose: () => void;
}

export function ModelSheet({ currentModel, onPick, onClose }: ModelSheetProps) {
    return (
        <div
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[2px] flex items-end z-30 animate-fade">
            <div
                onClick={e => e.stopPropagation()}
                className="w-full bg-surface-overlay border-t border-line-strong rounded-t-xl pt-2 px-3 pb-4 shadow-[var(--shadow-pop)] animate-sheet-up">
                <div className="w-[34px] h-1 rounded-[2px] bg-line-strong mx-auto mt-[6px] mb-3" />
                <div className="text-sm font-semibold text-strong px-1 pb-2">Switch model</div>
                {PRESETS.map(preset => {
                    const on = preset.model === currentModel;
                    return (
                        <button
                            type="button"
                            key={preset.id}
                            onClick={() => onPick(preset)}
                            className={`flex items-center gap-[11px] w-full p-[10px] border-none rounded-md cursor-pointer text-left text-inherit transition duration-[120ms] ease-[var(--ease-out)] ${
                                on ? "bg-accent-soft" : "bg-transparent hover:bg-control"
                            }`}>
                            <span className="w-[30px] h-[30px] flex-none rounded-sm bg-surface-raised flex items-center justify-center text-accent-text">
                                <Icon
                                    name={preset.icon}
                                    size={15}
                                />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-base font-medium text-strong">{preset.label}</div>
                                <div className="text-2xs text-muted font-mono mt-[1px]">{preset.sub}</div>
                            </div>
                            {on && (
                                <Icon
                                    name="check"
                                    size={15}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
