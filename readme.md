# rehype-typst-math

[Typst 0.15](https://typst.app/blog/2026/typst-0.15#mathml) added MathML support for HTML compilation.

This is a simple rehype plugin that renders `div.inline-math` and `div.math-display` to MathML `<math>` elements using the Typst binary.

It requires a preinstalled Typst binary of version at least 0.15 in the local environment.

[The test script](test.mjs) is a simple use case of this plugin.

## ROADMAP
- [ ] use `typst.ts` to avoid dependency on a Typst binary
