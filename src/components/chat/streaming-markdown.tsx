import { useEffect, useRef } from "react";
import { useTypewriter } from "@/lib/use-typewriter";
import { Markdown } from "./markdown";

export interface StreamingMarkdownProps {
    /** Full text accumulated so far; grows as tokens stream in. */
    text: string;
    /** True once the stream has ended (the typewriter still drains any backlog). */
    done: boolean;
    /** Fired once when the stream is done and every character has been revealed. */
    onComplete?: () => void;
}

// Inline cursor appended to the revealed text so it sits at the true caret
// position — even mid-line — rather than breaking onto its own line.
const CARET = "▌"; // ▌

export function StreamingMarkdown({ text, done, onComplete }: StreamingMarkdownProps) {
    const shown = useTypewriter(text);
    const caughtUp = shown.length >= text.length;
    const finished = done && caughtUp;

    const completedRef = useRef(false);
    useEffect(() => {
        if (finished && !completedRef.current) {
            completedRef.current = true;
            onComplete?.();
        }
    }, [finished, onComplete]);

    return <Markdown source={finished ? text : shown + CARET} />;
}
