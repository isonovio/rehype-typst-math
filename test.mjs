import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { rehypeTypstMath } from "./dist/index.js";

const markdown = `
# Hello

Inline math: $sum_i x_i$

Block math:

$$
integral_0^1 f(x) dif x
$$
`;

const result = await unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeTypstMath)
    .use(rehypeStringify)
    .process(markdown);

console.log(String(result));
