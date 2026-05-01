import { describe, it, expect } from "vitest";
import {
  classify,
  isCosmeticLine,
  classifyFile,
  detectTag,
  buildSummaryMd,
} from "../../../scripts/classify-sync-diff";

// Helper: build a unified-diff fragment for one modified file.
// Keeps tests readable without dragging real `git diff` output into fixtures.
function modifiedFileDiff(path: string, removed: string[], added: string[]): string {
  const minus = removed.map((l) => `-${l}`).join("\n");
  const plus = added.map((l) => `+${l}`).join("\n");
  const body = [minus, plus].filter((s) => s.length > 0).join("\n");
  return [
    `diff --git a/${path} b/${path}`,
    `index 1111111..2222222 100644`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,${Math.max(removed.length, 1)} +1,${Math.max(added.length, 1)} @@`,
    body,
    "",
  ].join("\n");
}

function deletedFileDiff(path: string, removed: string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    `deleted file mode 100644`,
    `index 1111111..0000000`,
    `--- a/${path}`,
    `+++ /dev/null`,
    `@@ -1,${Math.max(removed.length, 1)} +0,0 @@`,
    ...removed.map((l) => `-${l}`),
    "",
  ].join("\n");
}

function addedFileDiff(path: string, added: string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    `new file mode 100644`,
    `index 0000000..1111111`,
    `--- /dev/null`,
    `+++ b/${path}`,
    `@@ -0,0 +1,${Math.max(added.length, 1)} @@`,
    ...added.map((l) => `+${l}`),
    "",
  ].join("\n");
}

function renamedFileDiff(from: string, to: string): string {
  return [
    `diff --git a/${from} b/${to}`,
    `similarity index 100%`,
    `rename from ${from}`,
    `rename to ${to}`,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------

describe("isCosmeticLine", () => {
  it("matches the syllago version stamp footer", () => {
    expect(
      isCosmeticLine("+{/* Generated from syllago 0.10.3 on 2026-04-28 */}")
    ).toBe(true);
  });

  it("matches the generatedAt JSON timestamp", () => {
    expect(
      isCosmeticLine('+  "generatedAt": "2026-04-28T15:42:01.123Z",')
    ).toBe(true);
  });

  it("matches a Last updated MDX comment", () => {
    expect(isCosmeticLine("+<!-- Last updated: 2026-04-28 -->")).toBe(true);
  });

  it("treats pure-whitespace lines as cosmetic (ignored)", () => {
    expect(isCosmeticLine("+   ")).toBe(true);
    expect(isCosmeticLine("-")).toBe(true);
  });

  it("rejects an unrelated content edit", () => {
    expect(
      isCosmeticLine("+The `syllago add` command now supports --provider.")
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("classify: empty diff", () => {
  it("returns empty lists and an empty summary", () => {
    const result = classify("");
    expect(result.cosmetic_files).toEqual([]);
    expect(result.material_files).toEqual([]);
    expect(result.tag).toBeNull();
    expect(result.summary_md).toBe("");
  });
});

describe("classify: cosmetic-only file", () => {
  it("lands a canonical-keys mdx with only a Generated-from stamp in cosmetic_files", () => {
    const diff = modifiedFileDiff(
      "src/content/docs/reference/canonical-keys/display-name.mdx",
      ["{/* Generated from syllago 0.10.2 on 2026-04-25 */}"],
      ["{/* Generated from syllago 0.10.3 on 2026-04-28 */}"]
    );
    const result = classify(diff);
    expect(result.cosmetic_files).toEqual([
      "src/content/docs/reference/canonical-keys/display-name.mdx",
    ]);
    expect(result.material_files).toEqual([]);
  });

  it("lands a data-quality JSON file with only a generatedAt change in cosmetic_files", () => {
    const diff = modifiedFileDiff(
      "src/data/data-quality/claude-code.json",
      ['  "generatedAt": "2026-04-25T10:00:00.000Z",'],
      ['  "generatedAt": "2026-04-28T15:42:01.123Z",']
    );
    const result = classify(diff);
    expect(result.cosmetic_files).toEqual([
      "src/data/data-quality/claude-code.json",
    ]);
    expect(result.material_files).toEqual([]);
  });
});

describe("classify: material-only file", () => {
  it("treats a deleted file as material even with no body", () => {
    const diff = deletedFileDiff(
      "src/content/docs/using-syllago/cli-reference/create.mdx",
      [
        "---",
        "title: syllago create",
        "---",
        "",
        "Creates a new content item.",
      ]
    );
    const result = classify(diff);
    expect(result.material_files).toEqual([
      "src/content/docs/using-syllago/cli-reference/create.mdx",
    ]);
    expect(result.cosmetic_files).toEqual([]);
  });

  it("treats a renamed file as material", () => {
    const diff = renamedFileDiff(
      "src/content/docs/using-syllago/cli-reference/sync-and-export.mdx",
      "src/content/docs/using-syllago/cli-reference/sync-install.mdx"
    );
    const result = classify(diff);
    expect(result.material_files).toEqual([
      "src/content/docs/using-syllago/cli-reference/sync-install.mdx",
    ]);
    expect(result.cosmetic_files).toEqual([]);
  });

  it("treats a real prose change as material", () => {
    const diff = modifiedFileDiff(
      "src/content/docs/using-syllago/cli-reference/index.mdx",
      ["The `syllago` CLI has 12 top-level commands."],
      ["The `syllago` CLI has 13 top-level commands."]
    );
    const result = classify(diff);
    expect(result.material_files).toEqual([
      "src/content/docs/using-syllago/cli-reference/index.mdx",
    ]);
    expect(result.cosmetic_files).toEqual([]);
  });

  it("treats a new file (added) as material", () => {
    const diff = addedFileDiff(
      "src/content/docs/using-syllago/cli-reference/sync-install.mdx",
      ["---", "title: syllago sync-install", "---", "", "## Synopsis"]
    );
    const result = classify(diff);
    expect(result.material_files).toEqual([
      "src/content/docs/using-syllago/cli-reference/sync-install.mdx",
    ]);
    expect(result.cosmetic_files).toEqual([]);
  });
});

describe("classify: mixed file (cosmetic + non-cosmetic line)", () => {
  it("lands a file with one prose change and one stamp change in material_files", () => {
    const diff = modifiedFileDiff(
      "src/content/docs/reference/agents-matrix.mdx",
      [
        "{/* Generated from syllago 0.10.2 on 2026-04-25 */}",
        "Three providers support agents today.",
      ],
      [
        "{/* Generated from syllago 0.10.3 on 2026-04-28 */}",
        "Four providers support agents today.",
      ]
    );
    const result = classify(diff);
    expect(result.material_files).toEqual([
      "src/content/docs/reference/agents-matrix.mdx",
    ]);
    expect(result.cosmetic_files).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("detectTag", () => {
  it("extracts the tag from a Generated-from stamp line", () => {
    const diff = modifiedFileDiff(
      "src/content/docs/reference/canonical-keys/display-name.mdx",
      ["{/* Generated from syllago 0.10.2 on 2026-04-25 */}"],
      ["{/* Generated from syllago 0.10.3 on 2026-04-28 */}"]
    );
    expect(classify(diff).tag).toBe("v0.10.3");
  });

  it("returns null when no version stamp is present", () => {
    const diff = modifiedFileDiff(
      "src/content/docs/using-syllago/cli-reference/index.mdx",
      ["The CLI has 12 commands."],
      ["The CLI has 13 commands."]
    );
    const result = classify(diff);
    expect(result.tag).toBeNull();
  });

  it("does not throw on an empty diff", () => {
    expect(() => classify("")).not.toThrow();
    expect(classify("").tag).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("classify: summary_md format", () => {
  it("produces the expected layout for 3 cosmetic + 2 material files", () => {
    const diff = [
      modifiedFileDiff(
        "src/content/docs/reference/canonical-keys/display-name.mdx",
        ["{/* Generated from syllago 0.10.2 on 2026-04-25 */}"],
        ["{/* Generated from syllago 0.10.3 on 2026-04-28 */}"]
      ),
      modifiedFileDiff(
        "src/content/docs/reference/canonical-keys/license.mdx",
        ["{/* Generated from syllago 0.10.2 on 2026-04-25 */}"],
        ["{/* Generated from syllago 0.10.3 on 2026-04-28 */}"]
      ),
      modifiedFileDiff(
        "src/data/data-quality/claude-code.json",
        ['  "generatedAt": "2026-04-25T10:00:00.000Z",'],
        ['  "generatedAt": "2026-04-28T15:42:01.123Z",']
      ),
      deletedFileDiff(
        "src/content/docs/using-syllago/cli-reference/create.mdx",
        ["---", "title: syllago create", "---"]
      ),
      modifiedFileDiff(
        "src/content/docs/using-syllago/cli-reference/index.mdx",
        ["12 commands"],
        ["13 commands"]
      ),
    ].join("");

    const result = classify(diff);
    expect(result.cosmetic_files).toHaveLength(3);
    expect(result.material_files).toHaveLength(2);

    const expected = [
      "Cosmetic regen: 3 files (canonical-keys version stamps, data-quality timestamps).",
      "",
      "Material:",
      "- src/content/docs/using-syllago/cli-reference/create.mdx (deleted)",
      "- src/content/docs/using-syllago/cli-reference/index.mdx (modified)",
    ].join("\n");
    expect(result.summary_md).toBe(expected);
  });

  it("omits the Material section when material_files is empty", () => {
    const diff = modifiedFileDiff(
      "src/content/docs/reference/canonical-keys/display-name.mdx",
      ["{/* Generated from syllago 0.10.2 on 2026-04-25 */}"],
      ["{/* Generated from syllago 0.10.3 on 2026-04-28 */}"]
    );
    const result = classify(diff);
    expect(result.summary_md).toBe(
      "Cosmetic regen: 1 file (timestamp/version stamp updates)."
    );
    expect(result.summary_md.includes("Material:")).toBe(false);
  });

  it("returns an empty summary when both lists are empty", () => {
    expect(classify("").summary_md).toBe("");
  });
});

// ---------------------------------------------------------------------------

describe("buildSummaryMd: direct unit tests", () => {
  it("renders modified change-type bullets correctly", () => {
    const out = buildSummaryMd(
      [],
      [{ path: "a.mdx", changeType: "modified" }]
    );
    expect(out).toContain("- a.mdx (modified)");
  });

  it("renders renamed change-type bullets correctly", () => {
    const out = buildSummaryMd(
      [],
      [{ path: "b.mdx", changeType: "renamed" }]
    );
    expect(out).toContain("- b.mdx (renamed)");
  });
});

// ---------------------------------------------------------------------------

describe("classifyFile: structural changes always material", () => {
  it("flags deleted files as material even with stamp-only contentLines", () => {
    expect(
      classifyFile({
        path: "x.mdx",
        changeType: "deleted",
        contentLines: ["-{/* Generated from syllago 0.10.2 on 2026-04-25 */}"],
      })
    ).toBe("material");
  });

  it("flags renamed files as material even with no contentLines", () => {
    expect(
      classifyFile({
        path: "y.mdx",
        changeType: "renamed",
        contentLines: [],
      })
    ).toBe("material");
  });
});

// ---------------------------------------------------------------------------

describe("detectTag: only added lines count", () => {
  it("ignores tags that only appear in removed lines", () => {
    // If the stamp line is removed but no replacement exists, no tag.
    const tag = detectTag([
      {
        path: "f.mdx",
        changeType: "modified",
        contentLines: ["-{/* Generated from syllago 0.10.2 on 2026-04-25 */}"],
      },
    ]);
    expect(tag).toBeNull();
  });

  it("returns the tag from the first added line that matches", () => {
    const tag = detectTag([
      {
        path: "f.mdx",
        changeType: "modified",
        contentLines: [
          "-{/* Generated from syllago 0.10.2 on 2026-04-25 */}",
          "+{/* Generated from syllago 0.10.3 on 2026-04-28 */}",
        ],
      },
    ]);
    expect(tag).toBe("v0.10.3");
  });
});
