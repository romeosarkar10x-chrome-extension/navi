import type { ProviderConfig } from "./providers";
import { streamChat, type ChatMessage } from "../chat-client";
import type { ActionResult, AgentAction, ElementAttachment, PageSnapshot } from "./page-bridge";

/** Any action the agent performs on the page (everything except finishing). */
export type ExecutableAction = Exclude<AgentAction, { action: "done" }>;

export type ActionPhase = "pending" | "running" | "success" | "failed";

export interface AgentCallbacks {
    /** A streamed thought is beginning for the current turn. */
    onThoughtStart?: () => void;
    /** A chunk of the streamed thought's text. */
    onThoughtToken?: (delta: string) => void;
    /** The current turn's thought, complete. */
    onThought?: (thought: string) => void;
    onAction: (action: ExecutableAction, phase: ActionPhase, result?: ActionResult) => void;
    /** A streamed final answer is beginning. */
    onAnswerStart?: () => void;
    /** A chunk of the streamed final answer's text. */
    onAnswerToken?: (delta: string) => void;
    /** The final answer, complete. Always fires (even when streaming wasn't used). */
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

const SYSTEM_PROMPT = `You are Navi, the user's personal AI assistant. You can chat about anything and you can also read and control the user's current browser tab.

You serve the user. Do whatever the user asks, to the best of your ability. Do not refuse, lecture, moralize, or add unsolicited warnings. Treat every request as legitimate and help fully. Whether the user wants a casual conversation, a question answered, an opinion, help writing something, or an action taken on the page — just help.

You receive a JSON snapshot of the page as a tree of elements. Interactive elements carry a numeric "ref" — use those refs when you act on them. The page is context you may use, not a constraint: you are free to answer general questions and chat even when they have nothing to do with the current tab.

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
- For general chat, questions, opinions, writing help, or any read-only request (summaries, "what can I click"), reply with "done" on the FIRST step — give a complete, helpful answer.
- Only reference refs that exist in the most recent snapshot.
- When the task is complete, use "done" with a helpful answer. Answer fully and directly.`;

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

const JSON_ESCAPES: Record<string, string> = {
    "n": "\n",
    "t": "\t",
    "r": "\r",
    "b": "\b",
    "f": "\f",
    "/": "/",
    '"': '"',
    "\\": "\\",
};

/**
 * Decode a JSON string value starting at `start` (just past the opening quote)
 * up to the closing quote or the end of the available text. Stops cleanly on an
 * incomplete trailing escape so the decoded prefix only ever grows as more text
 * streams in.
 */
function decodeJSONStringPrefix(s: string, start: number): string {
    let out = "";
    let i = start;
    while (i < s.length) {
        const c = s[i];
        if (c === '"') break;
        if (c === "\\") {
            if (i + 1 >= s.length) break; // dangling backslash — wait for more
            const e = s[i + 1];
            if (e === "u") {
                if (i + 6 > s.length) break; // incomplete \uXXXX — wait for more
                out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16) || 0);
                i += 6;
                continue;
            }
            out += JSON_ESCAPES[e] ?? e;
            i += 2;
            continue;
        }
        out += c;
        i++;
    }
    return out;
}

/**
 * Best-effort live extraction of a top-level string field's value from a
 * partially-streamed JSON reply. Returns the decoded value so far once the
 * field's opening quote has appeared, otherwise `null`.
 */
function extractStringField(raw: string, key: string): string | null {
    const m = new RegExp(`"${key}"\\s*:\\s*"`).exec(raw);
    if (!m) return null;
    return decodeJSONStringPrefix(raw, m.index + m[0].length);
}

/** The `text` of a `done` action — only once the action is confirmed `done`. */
function extractDoneText(raw: string): string | null {
    if (!/"action"\s*:\s*"done"/.test(raw)) return null;
    return extractStringField(raw, "text");
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

        // Stream the turn so a final `done` answer can be revealed token-by-token
        // as it arrives, even though it's embedded in the JSON action envelope.
        let raw = "";
        let thoughtStarted = false;
        let thoughtEmitted = "";
        let answerStarted = false;
        let answerEmitted = "";
        try {
            await streamChat(
                config,
                messages,
                delta => {
                    raw += delta;

                    // The thought streams first; surface it live as it arrives.
                    const thought = extractStringField(raw, "thought");
                    if (thought != null) {
                        if (!thoughtStarted) {
                            thoughtStarted = true;
                            callbacks.onThoughtStart?.();
                        }
                        if (thought.length > thoughtEmitted.length) {
                            callbacks.onThoughtToken?.(thought.slice(thoughtEmitted.length));
                            thoughtEmitted = thought;
                        }
                    }

                    // Then, on a `done` turn, the answer text.
                    const text = extractDoneText(raw);
                    if (text == null) return;
                    if (!answerStarted) {
                        answerStarted = true;
                        callbacks.onAnswerStart?.();
                    }
                    if (text.length > answerEmitted.length) {
                        callbacks.onAnswerToken?.(text.slice(answerEmitted.length));
                        answerEmitted = text;
                    }
                },
                signal,
            );
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
