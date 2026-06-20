import { z } from "zod";
import type OpenAI from "openai";
import { ACTION_PARAMS, type ActionName } from "@/schemas/actions";
import type { ExecutableAction } from "./index";

type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;

/** Human-readable descriptions surfaced to the model for each tool. */
const TOOL_DESCRIPTIONS: Record<ActionName, string> = {
    click: "Click an interactive element (button, link, checkbox, …) on the page.",
    fill: "Type text into an input or textarea, replacing its current value.",
    select: "Choose an option in a <select> dropdown.",
    scroll: "Scroll an element into view, or scroll down the page when no ref is given.",
};

/** Convert a Zod object schema into the JSON Schema OpenAI expects for tool parameters. */
function toParameters(schema: z.ZodType): Record<string, unknown> {
    // Drop the `$schema` key — some endpoints reject unknown top-level keys.
    const { $schema: _schema, ...params } = z.toJSONSchema(schema) as Record<string, unknown>;
    return params;
}

/** The tool definitions sent to the model, derived from the Zod action schemas. */
export const AGENT_TOOLS: ChatCompletionTool[] = (Object.keys(ACTION_PARAMS) as ActionName[]).map(name => ({
    type: "function",
    function: {
        name,
        description: TOOL_DESCRIPTIONS[name],
        parameters: toParameters(ACTION_PARAMS[name]),
    },
}));

export type ParsedToolCall = { action: ExecutableAction } | { error: string };

/**
 * Validate a model tool call's name + raw JSON arguments against the Zod schemas
 * and produce a typed `ExecutableAction`, or an error message to feed back to the
 * model as the tool result.
 */
export function parseToolCall(name: string, rawArgs: string): ParsedToolCall {
    const schema = ACTION_PARAMS[name as ActionName];
    if (!schema) return { error: `Unknown tool "${name}".` };

    let json: unknown;
    try {
        json = JSON.parse(rawArgs || "{}");
    } catch {
        return { error: "Tool arguments were not valid JSON." };
    }

    const result = schema.safeParse(json);
    if (!result.success) {
        const issue = result.error.issues[0];
        return {
            error: issue ? `${issue.path.join(".") || "arguments"}: ${issue.message}` : "Invalid tool arguments.",
        };
    }

    const data = result.data;
    switch (name as ActionName) {
        case "click":
            return { action: { action: "click", ref: (data as z.infer<typeof ACTION_PARAMS.click>).ref } };
        case "fill": {
            const d = data as z.infer<typeof ACTION_PARAMS.fill>;
            return { action: { action: "fill", ref: d.ref, value: d.value } };
        }
        case "select": {
            const d = data as z.infer<typeof ACTION_PARAMS.select>;
            return { action: { action: "select", ref: d.ref, value: d.value } };
        }
        case "scroll":
            return { action: { action: "scroll", ref: (data as z.infer<typeof ACTION_PARAMS.scroll>).ref } };
    }
}
