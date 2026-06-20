import { Fragment, type ReactNode } from "react";
import { parseMarkdown, type BlockNode, type InlineNode } from "@/lib/markdown";

export interface MarkdownProps {
    /** Raw markdown source. */
    source: string;
}

/** Render markdown as React elements. Theming (colors, spacing) lives on the chat bubble. */
export function Markdown({ source }: MarkdownProps) {
    return <>{renderBlocks(parseMarkdown(source))}</>;
}

// Only let through schemes that can't execute script — guards against `javascript:`
// (and, for links, `data:`) URLs arriving from model output.
function safeURL(url: string, allowData = false): string | undefined {
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim());
    if (!scheme) return url; // relative or fragment — safe
    const s = scheme[1].toLowerCase();
    if (s === "http" || s === "https" || s === "mailto" || s === "tel") return url;
    if (allowData && s === "data") return url;
    return undefined;
}

function renderInline(nodes: InlineNode[]): ReactNode {
    return nodes.map((n, i) => {
        switch (n.type) {
            case "text":
                return <Fragment key={i}>{n.value}</Fragment>;
            case "strong":
                return <strong key={i}>{renderInline(n.children)}</strong>;
            case "em":
                return <em key={i}>{renderInline(n.children)}</em>;
            case "del":
                return <del key={i}>{renderInline(n.children)}</del>;
            case "code":
                return <code key={i}>{n.value}</code>;
            case "br":
                return <br key={i} />;
            case "link": {
                const href = safeURL(n.href);
                return (
                    <a
                        key={i}
                        href={href}
                        title={n.title}
                        target="_blank"
                        rel="noopener noreferrer">
                        {renderInline(n.children)}
                    </a>
                );
            }
            case "image": {
                const src = safeURL(n.src, true);
                return (
                    <img
                        key={i}
                        src={src}
                        alt={n.alt}
                        title={n.title}
                    />
                );
            }
        }
    });
}

/** A list item that holds a single paragraph renders "tight" (inline, no <p>). */
function renderListItemChildren(children: BlockNode[]): ReactNode {
    if (children.length === 1 && children[0].type === "paragraph") return renderInline(children[0].children);
    return renderBlocks(children);
}

function renderBlocks(nodes: BlockNode[]): ReactNode {
    return nodes.map((n, i) => {
        switch (n.type) {
            case "heading": {
                const Tag = `h${n.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
                return <Tag key={i}>{renderInline(n.children)}</Tag>;
            }
            case "paragraph":
                return <p key={i}>{renderInline(n.children)}</p>;
            case "blockquote":
                return <blockquote key={i}>{renderBlocks(n.children)}</blockquote>;
            case "code":
                return (
                    <pre key={i}>
                        <code>{n.value}</code>
                    </pre>
                );
            case "hr":
                return <hr key={i} />;
            case "list": {
                if (n.ordered)
                    return (
                        <ol
                            key={i}
                            start={n.start === 1 ? undefined : n.start}>
                            {n.items.map((item, j) => (
                                <li key={j}>{renderListItemChildren(item.children)}</li>
                            ))}
                        </ol>
                    );
                return (
                    <ul key={i}>
                        {n.items.map((item, j) => (
                            <li
                                key={j}
                                className={item.task ? "navi-md-task" : undefined}>
                                {item.task && (
                                    <input
                                        type="checkbox"
                                        checked={item.checked}
                                        readOnly
                                    />
                                )}
                                {renderListItemChildren(item.children)}
                            </li>
                        ))}
                    </ul>
                );
            }
            case "table":
                return (
                    <table key={i}>
                        <thead>
                            <tr>
                                {n.header.map((cell, c) => (
                                    <th
                                        key={c}
                                        style={{ textAlign: n.align[c] ?? undefined }}>
                                        {renderInline(cell)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {n.rows.map((row, r) => (
                                <tr key={r}>
                                    {row.map((cell, c) => (
                                        <td
                                            key={c}
                                            style={{ textAlign: n.align[c] ?? undefined }}>
                                            {renderInline(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
        }
    });
}
