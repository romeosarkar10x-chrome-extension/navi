import { browser } from "wxt/browser";
import type { ElementAttachment } from "./page-bridge";

/**
 * Turn on the devtools-style element picker in the given tab. Each element the
 * user clicks is posted back and delivered to `onPick`. Returns a disposer that
 * removes the message listener (call `stopPicker` to also tear down the page UI).
 */
export function startPicker(tabId: number, onPick: (attachment: ElementAttachment) => void): () => void {
    const listener = (msg: unknown) => {
        const m = msg as { type?: string; attachment?: ElementAttachment };
        if (m?.type === "navi:element-picked" && m.attachment) onPick(m.attachment);
    };
    browser.runtime.onMessage.addListener(listener);
    browser.scripting.executeScript({ target: { tabId }, func: pickerFn }).catch(() => {});
    return () => browser.runtime.onMessage.removeListener(listener);
}

export async function stopPicker(tabId: number): Promise<void> {
    await browser.scripting
        .executeScript({
            target: { tabId },
            func: () => (window as unknown as { __naviPickerStop?: () => void }).__naviPickerStop?.(),
        })
        .catch(() => {});
}

/* Injected, self-contained — runs in the page's isolated world. Uses the global
 * `chrome.runtime` (not the bundled `browser`) to post picks back to the panel. */
function pickerFn(): void {
    const w = window as unknown as { __naviPickerStop?: () => void; __naviPickCounter?: number };
    if (w.__naviPickerStop) return;

    const ACCENT = "#22DDD0";
    const box = document.createElement("div");
    Object.assign(box.style, {
        position: "fixed",
        zIndex: "2147483647",
        pointerEvents: "none",
        border: "2px solid " + ACCENT,
        background: "rgba(34,221,208,0.12)",
        borderRadius: "3px",
        display: "none",
    });
    const tag = document.createElement("div");
    Object.assign(tag.style, {
        position: "fixed",
        zIndex: "2147483647",
        pointerEvents: "none",
        background: "#0b0b0d",
        color: ACCENT,
        font: "11px/1.4 ui-monospace, monospace",
        padding: "2px 6px",
        borderRadius: "3px",
        maxWidth: "280px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "none",
    });
    document.body.appendChild(box);
    document.body.appendChild(tag);

    let current: Element | null = null;
    let counter = w.__naviPickCounter ?? 0;

    function describe(el: Element): string {
        const name = el.tagName.toLowerCase();
        const text = ((el as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
        return text ? `<${name}> "${text}"` : `<${name}>`;
    }

    function serialize(el: Element, depth: number): ElementAttachment["node"] {
        const node: ElementAttachment["node"] = { tag: el.tagName.toLowerCase() };
        let own = "";
        el.childNodes.forEach(n => {
            if (n.nodeType === 3) own += n.textContent;
        });
        own = own.replace(/\s+/g, " ").trim().slice(0, 150);
        if (own) node.text = own;
        if (el.tagName === "A") node.href = (el as HTMLAnchorElement).getAttribute("href") ?? undefined;
        if (depth > 0) {
            const kids: ElementAttachment["node"][] = [];
            el.childNodes.forEach(c => {
                if (c.nodeType === 1 && kids.length < 40) kids.push(serialize(c as Element, depth - 1));
            });
            if (kids.length) node.children = kids;
        }
        return node;
    }

    function onMove(e: MouseEvent) {
        const el = e.target as Element | null;
        if (!el || el === box || el === tag) return;
        current = el;
        const r = el.getBoundingClientRect();
        Object.assign(box.style, {
            display: "block",
            left: r.left + "px",
            top: r.top + "px",
            width: r.width + "px",
            height: r.height + "px",
        });
        tag.textContent = describe(el);
        Object.assign(tag.style, {
            display: "block",
            left: r.left + "px",
            top: (r.top > 22 ? r.top - 22 : r.bottom + 4) + "px",
        });
    }

    function onClick(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const el = current ?? (e.target as Element | null);
        if (!el) return;
        const ref = counter++;
        w.__naviPickCounter = counter;
        el.setAttribute("data-navi-pick", String(ref));
        const attachment: ElementAttachment = { ref, descriptor: describe(el), node: serialize(el, 4) };
        (
            globalThis as unknown as { chrome: { runtime: { sendMessage: (m: unknown) => void } } }
        ).chrome.runtime.sendMessage({
            type: "navi:element-picked",
            attachment,
        });
    }

    function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") stop();
    }

    function stop() {
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("keydown", onKey, true);
        box.remove();
        tag.remove();
        w.__naviPickerStop = undefined;
    }

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    w.__naviPickerStop = stop;
}
