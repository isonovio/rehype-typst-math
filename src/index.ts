import type { Plugin } from "unified";
import type { Root, Element, Text } from "hast";
import { visit, SKIP } from "unist-util-visit";
import { fromHtml } from "hast-util-from-html";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { tmpdir, homedir } from "os";
import { join } from "path";
import { createHash } from "crypto";

const CACHE_VERSION = "1";

export type Display = "inline" | "block";

export interface Options {
    typstBin?: string; // default: typst
    cacheDir?: string; // default: ~/.cache/rehype-typst-math
}

function getTypstVersion(typstBin: string): string {
    return execFileSync(typstBin, ["--version"], { encoding: "utf8" }).trim();
}

function compileSingleExpr(
    expr: string,
    display: Display,
    typstBin: string,
): Element {
    // Typst inline: $expr$  — block: $ expr $ (spaces force display mode)
    const typst = display === "block" ? `$ ${expr} $` : `$${expr}$`;

    const hash = createHash("md5").update(typst).digest("hex");
    const src = join(tmpdir(), `rehype-typst-${hash}.typ`);
    const out = join(tmpdir(), `rehype-typst-${hash}.html`);

    writeFileSync(src, typst);
    try {
        execFileSync(typstBin, [
            "compile",
            "--features",
            "html",
            "--format",
            "html",
            src,
            out,
        ]);
    } catch (err) {
        throw new Error(
            `typst compilation failed for expression: ${expr}\n${err}`,
        );
    }
    const html = readFileSync(out, "utf8");

    const tree = fromHtml(html);
    let mathNode: Element | undefined;
    visit(tree, "element", (node: Element) => {
        if (node.tagName === "math" && !mathNode) {
            mathNode = node;
            return SKIP;
        }
    });

    if (!mathNode)
        throw new Error(`typst produced no <math> element for: ${expr}`);
    return mathNode;
}

export const rehypeTypstMath: Plugin<[Options?], Root> = (options = {}) => {
    const {
        typstBin = "typst",
        cacheDir = join(homedir(), ".cache", "rehype-typst-math"),
    } = options;

    mkdirSync(cacheDir, { recursive: true });
    const typstVersion = getTypstVersion(typstBin);

    function cacheKey(expr: string, display: Display): string {
        return createHash("md5")
            .update(`${CACHE_VERSION}:${typstVersion}:${display}:${expr}`)
            .digest("hex");
    }

    function readCache(key: string): Element | undefined {
        const file = join(cacheDir, `${key}.json`);
        if (!existsSync(file)) return undefined;
        try {
            return JSON.parse(readFileSync(file, "utf8")) as Element;
        } catch {
            return undefined;
        }
    }

    function writeCache(key: string, mathNode: Element): void {
        writeFileSync(join(cacheDir, `${key}.json`), JSON.stringify(mathNode));
    }

    return (tree: Root) => {
        visit(tree, "element", (node: Element, index, parent) => {
            if (index == null || !parent) return;

            const cls =
                (node.properties?.className as string[] | undefined) ?? [];
            const display: Display | undefined = cls.includes("math-inline")
                ? "inline"
                : cls.includes("math-display")
                  ? "block"
                  : undefined;
            if (!display) return;

            const expr = (node.children[0] as Text | undefined)?.value ?? "";
            if (!expr) return;

            const key = cacheKey(expr, display);
            const mathNode =
                readCache(key) ??
                (() => {
                    const node = compileSingleExpr(expr, display, typstBin);
                    writeCache(key, node);
                    return node;
                })();

            parent.children[index] = mathNode;
        });
    };
};
