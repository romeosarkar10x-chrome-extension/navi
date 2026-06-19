import { browser } from "wxt/browser";

/** One node in the simplified, pruned DOM tree sent to the model. */
export interface DOMNode {
    /** Assigned only to interactive elements; matches the live `data-navi-ref` stamp. */
    ref?: number;
    tag: string;
    role?: string;
    text?: string;
    href?: string;
    type?: string;
    label?: string;
    value?: string;
    placeholder?: string;
    options?: string[];
    clickable?: boolean;
    editable?: boolean;
    children?: DOMNode[];
}

export interface PageSnapshot {
    url: string;
    title: string;
    selection: string;
    tree: DOMNode;
    truncated: boolean;
}

/** One action the agent can ask us to perform on the page. */
export type AgentAction =
    | { action: "click"; ref: number }
    | { action: "fill"; ref: number; value: string }
    | { action: "select"; ref: number; value: string }
    | { action: "scroll"; ref?: number }
    | { action: "done"; text: string };

export interface ActionResult {
    ok: boolean;
    error?: string;
}

/** An element the user picked via the inspector, attached to the chat as context. */
export interface ElementAttachment {
    ref: number;
    descriptor: string;
    node: DOMNode;
}

export interface ActiveTab {
    id: number;
    url: string;
    title: string;
}

export async function getActiveTab(): Promise<ActiveTab | null> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) return null;
    return { id: tab.id, url: tab.url ?? "", title: tab.title ?? "" };
}

export async function capturePage(tabId: number): Promise<PageSnapshot> {
    try {
        const [res] = await browser.scripting.executeScript({ target: { tabId }, func: captureFn });
        return res.result as PageSnapshot;
    } catch {
        throw new Error("Can't read this page — it may be a browser, extension, or store page.");
    }
}

export async function runAction(tabId: number, action: AgentAction): Promise<ActionResult> {
    try {
        const [res] = await browser.scripting.executeScript({ target: { tabId }, func: actionFn, args: [action] });
        return res.result as ActionResult;
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Action failed" };
    }
}

/* ------------------------------------------------------------------ *
 * Injected page functions.                                            *
 * These are serialized via `func.toString()` and run in the page's    *
 * isolated world, so they MUST be self-contained: only DOM globals,   *
 * their own nested helpers, and the (type-erased) arguments.          *
 * ------------------------------------------------------------------ */

function captureFn(): PageSnapshot {
    const MAX_NODES = 1200;
    const MAX_TEXT = 150;
    const MAX_JSON = 14000;
    let refCounter = 0;
    let nodeCount = 0;
    let truncated = false;

    // Clear stale capture refs so this snapshot's refs are unambiguous.
    document.querySelectorAll("[data-navi-ref]").forEach(el => el.removeAttribute("data-navi-ref"));

    const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "PATH", "META", "LINK", "HEAD"]);

    function isVisible(el: Element): boolean {
        const he = el as HTMLElement;
        if (he.hidden || el.getAttribute("aria-hidden") === "true") return false;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
    }

    function isClickable(el: Element): boolean {
        const tag = el.tagName;
        const role = el.getAttribute("role");
        if (tag === "A" && (el as HTMLAnchorElement).href) return true;
        if (tag === "BUTTON" || tag === "SUMMARY") return true;
        if (role === "button" || role === "link" || role === "tab" || role === "menuitem") return true;
        if (el.hasAttribute("onclick")) return true;
        const ti = el.getAttribute("tabindex");
        if (ti !== null && parseInt(ti, 10) >= 0) return true;
        if (tag === "INPUT")
            return ["button", "submit", "checkbox", "radio", "reset"].includes((el as HTMLInputElement).type);
        return false;
    }

    function isEditable(el: Element): boolean {
        const tag = el.tagName;
        if (tag === "TEXTAREA" || tag === "SELECT") return true;
        if ((el as HTMLElement).isContentEditable) return true;
        if (tag === "INPUT")
            return !["button", "submit", "checkbox", "radio", "reset", "hidden"].includes(
                (el as HTMLInputElement).type,
            );
        return false;
    }

    function directText(el: Element): string {
        let t = "";
        el.childNodes.forEach(n => {
            if (n.nodeType === 3) t += n.textContent;
        });
        return t.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
    }

    function labelFor(el: Element): string {
        const aria = el.getAttribute("aria-label");
        if (aria) return aria.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
        if (el.id) {
            const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lab?.textContent) return lab.textContent.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
        }
        const ph = el.getAttribute("placeholder");
        return ph ? ph.slice(0, MAX_TEXT) : "";
    }

    function build(el: Element): DOMNode | null {
        if (nodeCount >= MAX_NODES) {
            truncated = true;
            return null;
        }
        if (SKIP.has(el.tagName) || !isVisible(el)) return null;

        const clickable = isClickable(el);
        const editable = isEditable(el);
        const interactive = clickable || editable;

        const node: DOMNode = { tag: el.tagName.toLowerCase() };
        const role = el.getAttribute("role");
        if (role) node.role = role;

        if (interactive) {
            node.ref = refCounter++;
            el.setAttribute("data-navi-ref", String(node.ref));
            if (clickable) node.clickable = true;
            if (editable) node.editable = true;
            if (el.tagName === "A") node.href = (el as HTMLAnchorElement).getAttribute("href") ?? undefined;
            if (el.tagName === "INPUT") {
                const input = el as HTMLInputElement;
                node.type = input.type;
                if (input.value) node.value = input.value.slice(0, MAX_TEXT);
                if (input.placeholder) node.placeholder = input.placeholder.slice(0, MAX_TEXT);
            }
            if (el.tagName === "TEXTAREA" && (el as HTMLTextAreaElement).value) {
                node.value = (el as HTMLTextAreaElement).value.slice(0, MAX_TEXT);
            }
            if (el.tagName === "SELECT") {
                const sel = el as HTMLSelectElement;
                node.options = Array.from(sel.options)
                    .map(o => o.text)
                    .slice(0, 30);
                node.value = sel.value;
            }
            const lab = labelFor(el);
            if (lab) node.label = lab;
        }

        const text = clickable
            ? (el as HTMLElement).innerText.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT)
            : directText(el);
        if (text) node.text = text;

        nodeCount++;

        const children: DOMNode[] = [];
        el.childNodes.forEach(child => {
            if (child.nodeType === 1) {
                const c = build(child as Element);
                if (c) children.push(c);
            }
        });
        if (children.length) node.children = children;

        // Drop empty non-interactive wrappers; flatten single-child passthroughs.
        if (!interactive && !node.text) {
            if (children.length === 0) return null;
            if (children.length === 1) return children[0];
        }
        return node;
    }

    const tree = build(document.body) ?? { tag: "body" };
    const snapshot: PageSnapshot = {
        url: location.href,
        title: document.title,
        selection: (window.getSelection()?.toString() ?? "").replace(/\s+/g, " ").trim().slice(0, 2000),
        tree,
        truncated,
    };
    if (JSON.stringify(snapshot).length > MAX_JSON) snapshot.truncated = true;
    return snapshot;
}

function actionFn(action: AgentAction): ActionResult {
    if (action.action === "done") return { ok: true };

    if (action.action === "scroll" && action.ref == null) {
        window.scrollBy({ top: Math.round(window.innerHeight * 0.8) });
        return { ok: true };
    }

    const ref = (action as { ref?: number }).ref;
    const el = document.querySelector(`[data-navi-ref="${ref}"]`) as HTMLElement | null;
    if (!el) return { ok: false, error: `No element found for ref ${ref}` };
    el.scrollIntoView({ block: "center" });

    try {
        if (action.action === "click") {
            el.click();
            return { ok: true };
        }
        if (action.action === "scroll") return { ok: true };
        if (action.action === "fill") {
            const input = el as HTMLInputElement | HTMLTextAreaElement;
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
            if (setter) setter.call(input, action.value);
            else input.value = action.value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            return { ok: true };
        }
        if (action.action === "select") {
            const sel = el as HTMLSelectElement;
            sel.value = action.value;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return { ok: true };
        }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    return { ok: false, error: "Unsupported action" };
}
