import { browser } from "wxt/browser";
import { DEFAULT_CONFIG, type ProviderConfig } from "./providers";

const CONFIG_KEY = "navi:provider-config";
const AGENT_KEY = "navi:agent-settings";

/** Tuning for the agent action loop. */
export interface AgentSettings {
    /** Run proposed actions without asking for confirmation each time. */
    autoExecute: boolean;
    /** Maximum number of agent steps before pausing. */
    maxSteps: number;
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
    autoExecute: false,
    maxSteps: 10,
};

/** Load the saved provider config, falling back to defaults for any missing fields. */
export async function loadConfig(): Promise<ProviderConfig> {
    const stored = await browser.storage.local.get(CONFIG_KEY);
    const saved = stored[CONFIG_KEY] as Partial<ProviderConfig> | undefined;
    return { ...DEFAULT_CONFIG, ...saved };
}

/** Persist the provider config to extension storage. */
export async function saveConfig(config: ProviderConfig): Promise<void> {
    await browser.storage.local.set({ [CONFIG_KEY]: config });
}

export async function loadAgentSettings(): Promise<AgentSettings> {
    const stored = await browser.storage.local.get(AGENT_KEY);
    const saved = stored[AGENT_KEY] as Partial<AgentSettings> | undefined;
    return { ...DEFAULT_AGENT_SETTINGS, ...saved };
}

export async function saveAgentSettings(settings: AgentSettings): Promise<void> {
    await browser.storage.local.set({ [AGENT_KEY]: settings });
}
