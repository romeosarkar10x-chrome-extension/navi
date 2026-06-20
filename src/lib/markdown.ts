// A small, dependency-free Markdown parser.
//
// It turns a Markdown string into an AST of block/inline nodes that the
// `<Markdown>` component renders to React elements. We parse to an AST (rather
// than emitting an HTML string) so rendering stays XSS-safe — model output is
// never injected as raw HTML.
//
// Supported: ATX + setext headings, paragraphs, ordered/unordered lists
// (nested, with task-list checkboxes), blockquotes, fenced code blocks,
// horizontal rules, GFM pipe tables, and inline emphasis (bold/italic/
// strikethrough), inline code, links, images, autolinks, backslash escapes,
// and hard line breaks.

export type InlineNode =
    | { type: "text"; value: string }
    | { type: "strong"; children: InlineNode[] }
    | { type: "em"; children: InlineNode[] }
    | { type: "del"; children: InlineNode[] }
    | { type: "code"; value: string }
    | { type: "br" }
    | { type: "link"; href: string; title?: string; children: InlineNode[] }
    | { type: "image"; src: string; alt: string; title?: string };

export type TableAlign = "left" | "center" | "right" | null;

export interface ListItem {
    children: BlockNode[];
    /** A task-list item (`- [ ]` / `- [x]`); `null` when the item isn't a task. */
    task: boolean;
    checked: boolean;
}

export type BlockNode =
    | { type: "heading"; level: number; children: InlineNode[] }
    | { type: "paragraph"; children: InlineNode[] }
    | { type: "blockquote"; children: BlockNode[] }
    | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
    | { type: "code"; lang?: string; value: string }
    | { type: "table"; align: TableAlign[]; header: InlineNode[][]; rows: InlineNode[][][] }
    | { type: "hr" };

export type MarkdownNode = BlockNode;

const PUNCT = "\\`*_{}[]()#+-.!|~>\"'";

function isPunct(ch: string): boolean {
    return ch.length === 1 && PUNCT.includes(ch);
}

function isBlank(line: string): boolean {
    return /^\s*$/.test(line);
}

function leadingSpaces(line: string): number {
    const m = /^ */.exec(line);
    return m ? m[0].length : 0;
}

// ---------------------------------------------------------------------------
// Block parsing
// ---------------------------------------------------------------------------

const HR_RE = /^ {0,3}([-*_])[ \t]*(\1[ \t]*){2,}$/;
const ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const FENCE_RE = /^(\s{0,3})(`{3,}|~{3,})(.*)$/;
const SETEXT_RE = /^ {0,3}(=+|-+)[ \t]*$/;
const ORDERED_RE = /^( *)(\d{1,9})([.)])( +)(.*)$/;
const BULLET_RE = /^( *)([-+*])( +)(.*)$/;

interface Marker {
    ordered: boolean;
    indent: number;
    contentIndent: number;
    text: string;
    start: number;
}

function matchMarker(line: string): Marker | null {
    const o = ORDERED_RE.exec(line);
    if (o)
        return {
            ordered: true,
            indent: o[1].length,
            contentIndent: o[1].length + o[2].length + o[3].length + o[4].length,
            text: o[5],
            start: parseInt(o[2], 10),
        };
    const b = BULLET_RE.exec(line);
    if (b)
        return {
            ordered: false,
            indent: b[1].length,
            contentIndent: b[1].length + b[2].length + b[3].length,
            text: b[4],
            start: 1,
        };
    return null;
}

function isTableDelimiter(line: string): boolean {
    return line.includes("-") && /^ *\|? *:?-+:? *(\| *:?-+:? *)*\|? *$/.test(line);
}

function isBlockStart(line: string): boolean {
    return (
        FENCE_RE.test(line) ||
        /^ {0,3}#{1,6}([ \t]|$)/.test(line) ||
        /^ {0,3}>/.test(line) ||
        HR_RE.test(line) ||
        matchMarker(line) != null
    );
}

export function parseMarkdown(src: string): BlockNode[] {
    const lines = src.replace(/\r\n?/g, "\n").split("\n");
    return parseBlocks(lines, 0, lines.length);
}

function parseBlocks(lines: string[], from: number, to: number): BlockNode[] {
    const out: BlockNode[] = [];
    let i = from;

    while (i < to) {
        const line = lines[i];

        if (isBlank(line)) {
            i++;
            continue;
        }

        // Fenced code block.
        const fence = FENCE_RE.exec(line);
        if (fence) {
            const indent = fence[1].length;
            const marker = fence[2];
            const lang = fence[3].trim().split(/\s+/)[0] || undefined;
            const close = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
            const body: string[] = [];
            i++;
            while (i < to && !close.test(lines[i])) {
                body.push(lines[i].slice(indent));
                i++;
            }
            if (i < to) i++; // consume the closing fence
            out.push({ type: "code", lang, value: body.join("\n") });
            continue;
        }

        // Horizontal rule.
        if (HR_RE.test(line)) {
            out.push({ type: "hr" });
            i++;
            continue;
        }

        // ATX heading.
        const atx = ATX_RE.exec(line);
        if (atx) {
            out.push({ type: "heading", level: atx[1].length, children: parseInline(atx[2] ?? "") });
            i++;
            continue;
        }

        // Blockquote.
        if (/^ {0,3}>/.test(line)) {
            const inner: string[] = [];
            while (i < to && /^ {0,3}>/.test(lines[i])) {
                inner.push(lines[i].replace(/^ {0,3}> ?/, ""));
                i++;
            }
            out.push({ type: "blockquote", children: parseBlocks(inner, 0, inner.length) });
            continue;
        }

        // List.
        if (matchMarker(line)) {
            const { node, next } = parseList(lines, i, to);
            out.push(node);
            i = next;
            continue;
        }

        // GFM table (header row followed by a delimiter row).
        if (line.includes("|") && i + 1 < to && isTableDelimiter(lines[i + 1])) {
            const { node, next } = parseTable(lines, i, to);
            out.push(node);
            i = next;
            continue;
        }

        // Paragraph (with setext-heading detection).
        const para: string[] = [line];
        i++;
        let asHeading = false;
        while (i < to && !isBlank(lines[i])) {
            const setext = SETEXT_RE.exec(lines[i]);
            if (setext) {
                out.push({
                    type: "heading",
                    level: setext[1][0] === "=" ? 1 : 2,
                    children: parseInline(para.join("\n")),
                });
                i++;
                asHeading = true;
                break;
            }
            if (isBlockStart(lines[i])) break;
            para.push(lines[i]);
            i++;
        }
        if (!asHeading) out.push({ type: "paragraph", children: parseInline(para.join("\n")) });
    }

    return out;
}

function parseList(lines: string[], from: number, to: number): { node: BlockNode; next: number } {
    const first = matchMarker(lines[from])!;
    const ordered = first.ordered;
    const baseIndent = first.indent;
    const items: ListItem[] = [];
    let i = from;

    while (i < to) {
        const marker = matchMarker(lines[i]);
        if (!marker || marker.indent !== baseIndent || marker.ordered !== ordered) break;

        const contentIndent = marker.contentIndent;
        const itemLines: string[] = [marker.text];
        i++;

        while (i < to) {
            const ln = lines[i];
            if (isBlank(ln)) {
                itemLines.push("");
                i++;
                continue;
            }
            const sibling = matchMarker(ln);
            if (sibling && sibling.indent === baseIndent && sibling.ordered === ordered) break;
            const lead = leadingSpaces(ln);
            if (lead >= contentIndent) {
                itemLines.push(ln.slice(contentIndent));
                i++;
                continue;
            }
            if (sibling && lead > baseIndent) {
                itemLines.push(ln.slice(Math.min(lead, contentIndent)));
                i++;
                continue;
            }
            break;
        }

        while (itemLines.length && itemLines[itemLines.length - 1] === "") itemLines.pop();

        let task = false;
        let checked = false;
        const tm = /^\[([ xX])\][ \t]+(.*)$/.exec(itemLines[0]);
        if (tm) {
            task = true;
            checked = tm[1].toLowerCase() === "x";
            itemLines[0] = tm[2];
        }

        items.push({ children: parseBlocks(itemLines, 0, itemLines.length), task, checked });
    }

    return { node: { type: "list", ordered, start: first.start, items }, next: i };
}

function splitRow(line: string): string[] {
    const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    const cells: string[] = [];
    let buf = "";
    for (let k = 0; k < s.length; k++) {
        const c = s[k];
        if (c === "\\" && s[k + 1] === "|") {
            buf += "|";
            k++;
        } else if (c === "|") {
            cells.push(buf.trim());
            buf = "";
        } else {
            buf += c;
        }
    }
    cells.push(buf.trim());
    return cells;
}

function parseTable(lines: string[], from: number, to: number): { node: BlockNode; next: number } {
    const header = splitRow(lines[from]);
    const delim = splitRow(lines[from + 1]);
    const cols = header.length;
    const align: TableAlign[] = delim.map(c => {
        const left = c.startsWith(":");
        const right = c.endsWith(":");
        return left && right ? "center" : right ? "right" : left ? "left" : null;
    });

    const norm = (cells: string[]): InlineNode[][] => {
        const a = cells.slice(0, cols);
        while (a.length < cols) a.push("");
        return a.map(c => parseInline(c));
    };

    const rows: InlineNode[][][] = [];
    let i = from + 2;
    while (i < to && !isBlank(lines[i]) && lines[i].includes("|")) {
        rows.push(norm(splitRow(lines[i])));
        i++;
    }

    return { node: { type: "table", align, header: norm(header), rows }, next: i };
}

// ---------------------------------------------------------------------------
// Inline parsing
// ---------------------------------------------------------------------------

/** Flatten inline nodes to plain text (used for image alt text). */
export function inlineText(nodes: InlineNode[]): string {
    return nodes
        .map(n => {
            if (n.type === "text" || n.type === "code") return n.value;
            if (n.type === "image") return n.alt;
            if (n.type === "br") return " ";
            if ("children" in n) return inlineText(n.children);
            return "";
        })
        .join("");
}

function matchCodeSpan(text: string, i: number): { value: string; end: number } | null {
    let n = 0;
    while (text[i + n] === "`") n++;
    const open = i + n;
    let j = open;
    while (j < text.length) {
        if (text[j] === "`") {
            let k = 0;
            while (text[j + k] === "`") k++;
            if (k === n) {
                let value = text.slice(open, j).replace(/\n/g, " ");
                if (/^ .* $/.test(value) && value.trim() !== "") value = value.slice(1, -1);
                return { value, end: j + n };
            }
            j += k;
        } else {
            j++;
        }
    }
    return null;
}

interface LinkMatch {
    label: string;
    url: string;
    title?: string;
    end: number;
}

function matchLink(text: string, i: number): LinkMatch | null {
    // text[i] === "[" — find the matching "]" (allowing nested brackets/escapes).
    let depth = 0;
    let labelEnd = -1;
    for (let j = i; j < text.length; j++) {
        const c = text[j];
        if (c === "\\") {
            j++;
            continue;
        }
        if (c === "[") depth++;
        else if (c === "]" && --depth === 0) {
            labelEnd = j;
            break;
        }
    }
    if (labelEnd < 0 || text[labelEnd + 1] !== "(") return null;

    const label = text.slice(i + 1, labelEnd);
    let k = labelEnd + 2;
    while (text[k] === " " || text[k] === "\n") k++;

    let url = "";
    if (text[k] === "<") {
        k++;
        while (k < text.length && text[k] !== ">") url += text[k++];
        if (text[k] !== ">") return null;
        k++;
    } else {
        let parens = 0;
        while (k < text.length) {
            const c = text[k];
            if (c === "\\") {
                url += text[k + 1] ?? "";
                k += 2;
                continue;
            }
            if (c === "(") parens++;
            else if (c === ")") {
                if (parens === 0) break;
                parens--;
            } else if (/\s/.test(c)) break;
            url += c;
            k++;
        }
    }

    let title: string | undefined;
    while (text[k] === " " || text[k] === "\n") k++;
    const quote = text[k];
    if (quote === '"' || quote === "'") {
        k++;
        let t = "";
        while (k < text.length && text[k] !== quote) {
            if (text[k] === "\\") {
                t += text[k + 1] ?? "";
                k += 2;
                continue;
            }
            t += text[k++];
        }
        k++;
        title = t;
        while (text[k] === " " || text[k] === "\n") k++;
    }

    if (text[k] !== ")") return null;
    return { label, url, title, end: k + 1 };
}

const AUTOLINK_RE = /^<((?:[a-z][a-z0-9+.-]*:|mailto:)[^>\s]+|[^\s@>]+@[^\s@>]+\.[^\s>]+)>/i;

function matchAutolink(text: string, i: number): { node: InlineNode; end: number } | null {
    const m = AUTOLINK_RE.exec(text.slice(i));
    if (!m) return null;
    const url = m[1];
    const href = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `mailto:${url}`;
    return { node: { type: "link", href, children: [{ type: "text", value: url }] }, end: i + m[0].length };
}

const EMPHASIS: { re: RegExp; type: "strong" | "em" | "del" }[] = [
    { re: /\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*/, type: "strong" },
    { re: /(?<![\w])__(?=\S)([\s\S]+?)(?<=\S)__(?![\w])/, type: "strong" },
    { re: /~~(?=\S)([\s\S]+?)(?<=\S)~~/, type: "del" },
    { re: /\*(?=\S)([\s\S]+?)(?<=\S)\*/, type: "em" },
    { re: /(?<![\w])_(?=\S)([\s\S]+?)(?<=\S)_(?![\w])/, type: "em" },
];

/** Resolve emphasis/strong/strikethrough on a run of plain text (no code/links). */
function parseEmphasis(text: string): InlineNode[] {
    if (!text) return [];
    let best: { type: "strong" | "em" | "del"; m: RegExpExecArray } | null = null;
    for (const e of EMPHASIS) {
        const m = e.re.exec(text);
        if (m && (!best || m.index < best.m.index)) best = { type: e.type, m };
    }
    if (!best) return [{ type: "text", value: text }];

    const { type, m } = best;
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    return [...parseEmphasis(before), { type, children: parseEmphasis(m[1]) }, ...parseEmphasis(after)];
}

export function parseInline(text: string): InlineNode[] {
    const out: InlineNode[] = [];
    let buf = "";
    let i = 0;

    const flush = () => {
        if (buf) {
            out.push(...parseEmphasis(buf));
            buf = "";
        }
    };

    while (i < text.length) {
        const c = text[i];

        // Backslash escape.
        if (c === "\\" && i + 1 < text.length) {
            const next = text[i + 1];
            if (next === "\n") {
                flush();
                out.push({ type: "br" });
                i += 2;
                continue;
            }
            if (isPunct(next)) {
                flush();
                out.push({ type: "text", value: next });
                i += 2;
                continue;
            }
        }

        // Inline code span.
        if (c === "`") {
            const m = matchCodeSpan(text, i);
            if (m) {
                flush();
                out.push({ type: "code", value: m.value });
                i = m.end;
                continue;
            }
        }

        // Line break — hard if the line ended with two+ spaces, otherwise soft.
        if (c === "\n") {
            if (/ {2,}$/.test(buf)) {
                buf = buf.replace(/ +$/, "");
                flush();
                out.push({ type: "br" });
            } else {
                buf = buf.replace(/ +$/, "") + " ";
            }
            i++;
            continue;
        }

        // Image.
        if (c === "!" && text[i + 1] === "[") {
            const m = matchLink(text, i + 1);
            if (m) {
                flush();
                out.push({ type: "image", src: m.url, alt: inlineText(parseInline(m.label)), title: m.title });
                i = m.end;
                continue;
            }
        }

        // Link.
        if (c === "[") {
            const m = matchLink(text, i);
            if (m) {
                flush();
                out.push({ type: "link", href: m.url, title: m.title, children: parseInline(m.label) });
                i = m.end;
                continue;
            }
        }

        // Autolink.
        if (c === "<") {
            const m = matchAutolink(text, i);
            if (m) {
                flush();
                out.push(m.node);
                i = m.end;
                continue;
            }
        }

        buf += c;
        i++;
    }

    flush();
    return out;
}
