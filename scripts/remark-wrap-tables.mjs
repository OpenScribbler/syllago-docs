/**
 * remark-wrap-tables — wraps every markdown `<table>` in a `<div class="table-wrap">`
 * so global CSS can provide a scroll container with sticky header + first column.
 *
 * The scroll wrapper is the element that owns `overflow`, `max-height`, `border`,
 * and `border-radius`. The table itself must not clip its own overflow, because
 * `overflow: hidden` on a table breaks `position: sticky` on any descendant cell.
 *
 * Injected as an `mdxJsxFlowElement` so it works uniformly in .md and .mdx files.
 * `SKIP` prevents revisiting the original table (now the wrapper's child) and
 * causing an infinite wrap loop.
 */
import { visit, SKIP } from "unist-util-visit";

export default function remarkWrapTables() {
  return function transformer(tree) {
    visit(tree, "table", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;

      // Don't double-wrap if this plugin runs twice or the source already wraps.
      if (
        parent.type === "mdxJsxFlowElement" &&
        parent.name === "div" &&
        Array.isArray(parent.attributes) &&
        parent.attributes.some(
          (a) =>
            a.type === "mdxJsxAttribute" &&
            a.name === "className" &&
            typeof a.value === "string" &&
            a.value.split(/\s+/).includes("table-wrap")
        )
      ) {
        return;
      }

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "div",
        attributes: [
          { type: "mdxJsxAttribute", name: "className", value: "table-wrap" },
        ],
        children: [node],
      };

      return [SKIP, index + 1];
    });
  };
}
