import { z } from "zod";

/**
 * Zod parameter schemas for each page action the agent can take. These are the
 * single source of truth: `lib/agent/tools.ts` turns them into the OpenAI tool
 * definitions sent to the model, and validates the model's tool-call arguments
 * back against them.
 */

export const ClickParams = z.object({
    ref: z.number().int().describe("The numeric ref of the element to click, from the latest page snapshot."),
});

export const FillParams = z.object({
    ref: z.number().int().describe("The numeric ref of the input or textarea to type into."),
    value: z.string().describe("The text to type into the field, replacing its current value."),
});

export const SelectParams = z.object({
    ref: z.number().int().describe("The numeric ref of the <select> element."),
    value: z.string().describe("The visible text of the option to choose."),
});

export const ScrollParams = z.object({
    ref: z
        .number()
        .int()
        .optional()
        .describe("The numeric ref of an element to scroll into view. Omit to scroll down the page."),
});

/** Every action tool, keyed by tool name. The keys are the tool names the model calls. */
export const ACTION_PARAMS = {
    click: ClickParams,
    fill: FillParams,
    select: SelectParams,
    scroll: ScrollParams,
} as const;

export type ActionName = keyof typeof ACTION_PARAMS;
