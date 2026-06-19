import type { ProviderConfig } from "./providers";
import { chatComplete, type ChatMessage } from "./chat-client";
import type { ActionResult, AgentAction, ElementAttachment, PageSnapshot } from "./page-bridge";

/** Any action the agent performs on the page (everything except finishing). */
export type ExecutableAction = Exclude<AgentAction, { action: "done" }>;

export type ActionPhase = "pending" | "running" | "success" | "failed";

export interface AgentCallbacks {
    onThought?: (thought: string) => void;
    onAction: (action: ExecutableAction, phase: ActionPhase, result?: ActionResult) => void;
    onAnswer: (text: string) => void;
}

export interface RunAgentOptions {
    config: ProviderConfig;
    userText: string;
    snapshot: PageSnapshot | null;
    attachments: ElementAttachment[];
    history: ChatMessage[];
    callbacks: AgentCallbacks;
    maxSteps: number;
    autoExecute: boolean;
    requestApproval: (action: ExecutableAction) => Promise<boolean>;
    runAction: (action: ExecutableAction) => Promise<ActionResult>;
    recapture: () => Promise<PageSnapshot | null>;
    signal: AbortSignal;
}

const SYSTEM_PROMPT = `You are Navi, an AI agent that can read and control the user's current browser tab.

You receive a JSON snapshot of the page as a tree of elements. Interactive elements carry a numeric "ref" — use those refs to act on them.

Respond with EXACTLY ONE JSON object and nothing else, shaped like:
{ "thought": "<one short sentence>", "action": "<name>", ... }

Available actions:
- { "action": "click", "ref": <n> } — click an element.
- { "action": "fill", "ref": <n>, "value": "<text>" } — type into an input or textarea.
- { "action": "select", "ref": <n>, "value": "<option text>" } — choose a <select> option.
- { "action": "scroll", "ref": <n optional> } — scroll to an element, or down the page if no ref.
- { "action": "done", "text": "<your answer to the user>" } — finish and reply to the user.

Rules:
- Output one action per turn. After each action you get a fresh snapshot.
- For read-only requests (summaries, questions, "what can I click"), reply with "done" on the FIRST step.
- Only reference refs that exist in the most recent snapshot.
- When the task is complete, use "done" with a helpful, concise answer.`;

interface RawAction {
    thought?: string;
    action?: string;
    ref?: number | string;
    value?: string;
    text?: string;
}

/** Serialize a snapshot into the compact text handed to the model. */
export function snapshotToText(snapshot: PageSnapshot | null): string {
    if (!snapshot) return "(no page access — the current tab can't be read)";
    return JSON.stringify({
        url: snapshot.url,
        title: snapshot.title,
        selection: snapshot.selection || undefined,
        truncated: snapshot.truncated || undefined,
        tree: snapshot.tree,
    });
}

function buildUserMessage(userText: string, snapshot: PageSnapshot | null, attachments: ElementAttachment[]): string {
    const parts = [userText.trim()];
    if (attachments.length) {
        const listed = attachments.map(a => `- ${a.descriptor}\n  ${JSON.stringify(a.node)}`).join("\n");
        parts.push(`The user attached these specific elements:\n${listed}`);
    }
    parts.push(`Page snapshot:\n${snapshotToText(snapshot)}`);
    return parts.join("\n\n");
}

/** Pull the first balanced top-level JSON object out of a model reply. */
function extractJSON(raw: string): string | null {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const text = fenced ? fenced[1] : raw;
    const start = text.indexOf("{");
    if (start < 0) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
    }
    return null;
}

/** Parse a model reply into a thought + a typed action. Falls back to a `done` answer. */
export function parseAction(raw: string): { thought?: string; action: AgentAction } {
    const json = extractJSON(raw);
    const fallback = { action: { action: "done", text: raw.trim() } as AgentAction };
    if (!json) return fallback;

    let obj: RawAction;
    try {
        obj = JSON.parse(json) as RawAction;
    } catch {
        return fallback;
    }

    const thought = typeof obj.thought === "string" ? obj.thought : undefined;
    const ref = Number(obj.ref);
    switch (obj.action) {
        case "click":
            return { thought, action: { action: "click", ref } };
        case "fill":
            return { thought, action: { action: "fill", ref, value: String(obj.value ?? "") } };
        case "select":
            return { thought, action: { action: "select", ref, value: String(obj.value ?? "") } };
        case "scroll":
            return { thought, action: { action: "scroll", ref: obj.ref == null ? undefined : ref } };
        case "done":
            return { thought, action: { action: "done", text: String(obj.text ?? thought ?? "") } };
        default:
            return { thought, action: { action: "done", text: String(obj.text ?? thought ?? raw.trim()) } };
    }
}

function observation(result: ActionResult, snapshot: PageSnapshot | null): string {
    const status = result.ok ? "Action succeeded." : `Action failed: ${result.error ?? "unknown error"}.`;
    return `${status}\n\nUpdated page snapshot:\n${snapshotToText(snapshot)}`;
}

/**
 * Drive the page agent: ask the model for an action, optionally gate it on user
 * approval, execute it, re-snapshot, and loop until the model is `done`, the step
 * limit is hit, or the run is aborted.
 */
export async function runAgent(opts: RunAgentOptions): Promise<void> {
    const { config, callbacks, maxSteps, autoExecute, requestApproval, runAction, recapture, signal } = opts;

    const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...opts.history,
        { role: "user", content: buildUserMessage(opts.userText, opts.snapshot, opts.attachments) },
    ];

    for (let step = 0; step < maxSteps; step++) {
        if (signal.aborted) return;

        let raw: string;
        try {
            raw = await chatComplete(config, messages, signal);
        } catch (err) {
            if (signal.aborted) return;
            callbacks.onAnswer(`⚠️ ${err instanceof Error ? err.message : "Request failed"}`);
            return;
        }
        messages.push({ role: "assistant", content: raw });

        const { thought, action } = parseAction(raw);
        if (thought) callbacks.onThought?.(thought);

        if (action.action === "done") {
            callbacks.onAnswer(action.text || thought || raw.trim());
            return;
        }

        callbacks.onAction(action, "pending");

        if (!autoExecute) {
            const approved = await requestApproval(action);
            if (signal.aborted) return;
            if (!approved) {
                callbacks.onAction(action, "failed", { ok: false, error: "skipped" });
                messages.push({ role: "user", content: "The user skipped that action. Reconsider your next step." });
                continue;
            }
        }

        callbacks.onAction(action, "running");
        const result = await runAction(action);
        callbacks.onAction(action, result.ok ? "success" : "failed", result);
        if (signal.aborted) return;

        const next = await recapture();
        messages.push({ role: "user", content: observation(result, next) });
    }

    callbacks.onAnswer("I reached the step limit. Let me know if you'd like me to keep going.");
}
