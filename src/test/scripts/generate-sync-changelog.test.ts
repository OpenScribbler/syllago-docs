import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  insertBlock,
  normalizeTag,
  parseArgs,
  renderSyncedBlock,
  run,
  summarizeCosmetic,
  type Classification,
} from "../../../scripts/generate-sync-changelog";

// ---------------------------------------------------------------------------
// Test fixture helpers

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "sync-changelog-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function writeFixture(
  name: string,
  content: string
): string {
  const path = join(workDir, name);
  writeFileSync(path, content);
  return path;
}

function writeClassification(
  name: string,
  data: Classification
): string {
  return writeFixture(name, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// parseArgs

describe("parseArgs", () => {
  it("returns null when --classification is missing", () => {
    expect(parseArgs(["--tag", "v0.10.3"])).toBeNull();
  });

  it("parses all flags", () => {
    const args = parseArgs([
      "--classification",
      "c.json",
      "--tag",
      "v0.10.3",
      "--changelog",
      "FOO.md",
      "--dry-run",
    ]);
    expect(args).toEqual({
      classification: "c.json",
      tag: "v0.10.3",
      changelog: "FOO.md",
      dryRun: true,
    });
  });

  it("defaults changelog and dryRun", () => {
    const args = parseArgs(["--classification", "c.json"]);
    expect(args).toEqual({
      classification: "c.json",
      tag: null,
      changelog: "CHANGELOG.md",
      dryRun: false,
    });
  });
});

// ---------------------------------------------------------------------------
// normalizeTag

describe("normalizeTag", () => {
  it("prefixes a v if missing", () => {
    expect(normalizeTag("0.10.3")).toBe("v0.10.3");
  });
  it("preserves an existing v", () => {
    expect(normalizeTag("v0.10.3")).toBe("v0.10.3");
  });
  it("returns null for empty/null", () => {
    expect(normalizeTag(null)).toBeNull();
    expect(normalizeTag("")).toBeNull();
    expect(normalizeTag("   ")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// summarizeCosmetic

describe("summarizeCosmetic", () => {
  it("returns canonical-keys for files all under canonical-keys/", () => {
    const summary = summarizeCosmetic([
      "src/content/docs/reference/canonical-keys/agents-name.mdx",
      "src/content/docs/reference/canonical-keys/skills-name.mdx",
    ]);
    expect(summary).toContain("canonical-keys");
  });

  it("combines canonical-keys + data-quality", () => {
    const summary = summarizeCosmetic([
      "src/content/docs/reference/canonical-keys/a.mdx",
      "src/content/docs/reference/canonical-keys/b.mdx",
      "src/data/data-quality/cursor.json",
    ]);
    expect(summary).toContain("canonical-keys");
    expect(summary).toContain("data-quality");
  });

  it("falls back to a single parent dir when only one bucket is hit", () => {
    const summary = summarizeCosmetic([
      "src/data/providers/cursor.json",
      "src/data/providers/claude-code.json",
    ]);
    expect(summary.toLowerCase()).toContain("providers");
  });
});

// ---------------------------------------------------------------------------
// renderSyncedBlock

describe("renderSyncedBlock", () => {
  it("includes Material when material_files is non-empty", () => {
    const block = renderSyncedBlock(
      {
        cosmetic_files: ["src/data/data-quality/cursor.json"],
        material_files: ["src/content/docs/using-syllago/cli-reference/create.mdx"],
        tag: "v0.10.3",
        summary_md: "",
      },
      "v0.10.3"
    );
    expect(block).not.toBeNull();
    expect(block!).toContain("### Synced (syllago v0.10.3)");
    expect(block!).toContain("- Cosmetic regen: 1 files");
    expect(block!).toContain(
      "- Material: src/content/docs/using-syllago/cli-reference/create.mdx"
    );
  });

  it("omits Material when material_files is empty", () => {
    const block = renderSyncedBlock(
      {
        cosmetic_files: ["src/data/data-quality/cursor.json"],
        material_files: [],
        tag: null,
        summary_md: "",
      },
      "v0.10.3"
    );
    expect(block).not.toBeNull();
    expect(block!).not.toContain("Material:");
    expect(block!).toContain("- Cosmetic regen: 1 files");
  });

  it("returns null when both lists are empty (defensive)", () => {
    const block = renderSyncedBlock(
      {
        cosmetic_files: [],
        material_files: [],
        tag: null,
        summary_md: "",
      },
      "v0.10.3"
    );
    expect(block).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// insertBlock — direct tests of the pure insertion logic

describe("insertBlock", () => {
  const block = "### Synced (syllago v0.10.3)\n- Cosmetic regen: 1 files (canonical-keys version stamps).";

  it("inserts under today's heading when it already exists", () => {
    const current =
      "# Changelog\n\nintro\n\n## 2026-04-29\n\n### Added\n- something\n\n## 2026-04-28\n\n### Fixed\n- old\n";
    const out = insertBlock(current, block, "2026-04-29");
    // Today's heading is unchanged and not duplicated.
    expect((out.match(/^## 2026-04-29\b/gm) ?? []).length).toBe(1);
    // The new block sits between the today heading and the existing ### Added.
    const todayIdx = out.indexOf("## 2026-04-29");
    const blockIdx = out.indexOf("### Synced (syllago v0.10.3)");
    const addedIdx = out.indexOf("### Added");
    expect(todayIdx).toBeGreaterThan(-1);
    expect(blockIdx).toBeGreaterThan(todayIdx);
    expect(addedIdx).toBeGreaterThan(blockIdx);
  });

  it("prepends a new dated section when newest heading is older", () => {
    const current =
      "# Changelog\n\nintro\n\n## 2026-04-28\n\n### Fixed\n- old\n";
    const out = insertBlock(current, block, "2026-04-29");
    expect(out).toContain("## 2026-04-29");
    expect(out).toContain("## 2026-04-28");
    const newDateIdx = out.indexOf("## 2026-04-29");
    const oldDateIdx = out.indexOf("## 2026-04-28");
    expect(newDateIdx).toBeLessThan(oldDateIdx);
    expect(out.indexOf("### Synced")).toBeGreaterThan(newDateIdx);
    expect(out.indexOf("### Synced")).toBeLessThan(oldDateIdx);
  });

  it("creates a section after the title when changelog has no dated heading", () => {
    const current = "# Changelog\n\nAll notable changes.\n";
    const out = insertBlock(current, block, "2026-04-29");
    expect(out).toContain("# Changelog");
    expect(out).toContain("## 2026-04-29");
    expect(out).toContain("### Synced");
    // Title comes before the new dated section.
    expect(out.indexOf("# Changelog")).toBeLessThan(out.indexOf("## 2026-04-29"));
  });

  it("appends additional Synced blocks under the same date on repeated runs", () => {
    const current =
      "# Changelog\n\nintro\n\n## 2026-04-29\n\n### Synced (syllago v0.10.2)\n- Cosmetic regen: 1 files (canonical-keys version stamps).\n";
    const second = "### Synced (syllago v0.10.3)\n- Cosmetic regen: 2 files (data-quality timestamps).";
    const out = insertBlock(current, second, "2026-04-29");
    // Still only one date heading.
    expect((out.match(/^## 2026-04-29\b/gm) ?? []).length).toBe(1);
    // Both Synced blocks present.
    expect(out).toContain("### Synced (syllago v0.10.2)");
    expect(out).toContain("### Synced (syllago v0.10.3)");
    // The newer (v0.10.3) block lands above the older one.
    expect(out.indexOf("v0.10.3")).toBeLessThan(out.indexOf("v0.10.2"));
  });
});

// ---------------------------------------------------------------------------
// run() — integration via the public entry point

const SAMPLE_CHANGELOG_WITH_TODAY = `# Changelog

All notable changes.

## 2026-04-29

### Added
- a thing
`;

const SAMPLE_CHANGELOG_OLDER = `# Changelog

All notable changes.

## 2026-04-28

### Fixed
- something
`;

const SAMPLE_CHANGELOG_EMPTY = `# Changelog

All notable changes to the syllago documentation site.
`;

describe("run: same-day insertion", () => {
  it("inserts under today's heading without duplicating it", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: "v0.10.3",
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_WITH_TODAY);
    const result = run({
      args: { classification: cls, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(0);
    const updated = readFileSync(cl, "utf-8");
    expect((updated.match(/^## 2026-04-29\b/gm) ?? []).length).toBe(1);
    expect(updated).toContain("### Synced (syllago v0.10.3)");
    expect(updated).toContain("### Added");
  });
});

describe("run: new-day insertion", () => {
  it("prepends a new ## <today> heading above the existing one", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: "v0.10.3",
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_OLDER);
    const result = run({
      args: { classification: cls, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(0);
    const updated = readFileSync(cl, "utf-8");
    expect(updated).toContain("## 2026-04-29");
    expect(updated).toContain("## 2026-04-28");
    expect(updated.indexOf("## 2026-04-29")).toBeLessThan(
      updated.indexOf("## 2026-04-28")
    );
  });
});

describe("run: empty changelog", () => {
  it("creates a new section after the title block", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: "v0.10.3",
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_EMPTY);
    const result = run({
      args: { classification: cls, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(0);
    const updated = readFileSync(cl, "utf-8");
    expect(updated).toContain("# Changelog");
    expect(updated).toContain("## 2026-04-29");
    expect(updated).toContain("### Synced (syllago v0.10.3)");
  });
});

describe("run: repeated same-day", () => {
  it("appends a second Synced block under the same date heading", () => {
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_WITH_TODAY);

    const cls1 = writeClassification("c1.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: "v0.10.2",
      summary_md: "",
    });
    const r1 = run({
      args: { classification: cls1, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(r1.exitCode).toBe(0);

    const cls2 = writeClassification("c2.json", {
      cosmetic_files: [
        "src/content/docs/reference/canonical-keys/agents-name.mdx",
      ],
      material_files: [],
      tag: "v0.10.3",
      summary_md: "",
    });
    const r2 = run({
      args: { classification: cls2, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(r2.exitCode).toBe(0);

    const updated = readFileSync(cl, "utf-8");
    expect((updated.match(/^## 2026-04-29\b/gm) ?? []).length).toBe(1);
    expect(updated).toContain("### Synced (syllago v0.10.2)");
    expect(updated).toContain("### Synced (syllago v0.10.3)");
  });
});

describe("run: material-empty case", () => {
  it("omits the Material bullet when material_files is empty", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: "v0.10.3",
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_WITH_TODAY);
    const result = run({
      args: { classification: cls, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(0);
    const updated = readFileSync(cl, "utf-8");
    // Find the Synced block region and confirm it has only the cosmetic bullet.
    const syncedIdx = updated.indexOf("### Synced (syllago v0.10.3)");
    const after = updated.slice(syncedIdx);
    const nextHeading = after.search(/\n(?:## |### )/);
    const region = after.slice(
      0,
      nextHeading === -1 ? after.length : nextHeading
    );
    expect(region).not.toContain("- Material:");
    expect(region).toContain("- Cosmetic regen: 1 files");
  });
});

describe("run: tag inference", () => {
  it("falls back to classification.tag when --tag is not given", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: "v0.10.3",
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_WITH_TODAY);
    const result = run({
      args: { classification: cls, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(0);
    const updated = readFileSync(cl, "utf-8");
    expect(updated).toContain("### Synced (syllago v0.10.3)");
  });

  it("exits 1 with an error message when both --tag and classification.tag are missing", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: null,
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_WITH_TODAY);
    const result = run({
      args: { classification: cls, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no tag provided");
  });

  it("--tag overrides classification.tag", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: "v0.10.0",
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_WITH_TODAY);
    const result = run({
      args: {
        classification: cls,
        tag: "v0.10.3",
        changelog: cl,
        dryRun: false,
      },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(0);
    const updated = readFileSync(cl, "utf-8");
    expect(updated).toContain("### Synced (syllago v0.10.3)");
    expect(updated).not.toContain("### Synced (syllago v0.10.0)");
  });
});

describe("run: short-summary inference", () => {
  it("names canonical-keys when cosmetic files are all under canonical-keys/", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: [
        "src/content/docs/reference/canonical-keys/agents-name.mdx",
        "src/content/docs/reference/canonical-keys/skills-name.mdx",
        "src/content/docs/reference/canonical-keys/rules-content.mdx",
      ],
      material_files: [],
      tag: "v0.10.3",
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_WITH_TODAY);
    const result = run({
      args: { classification: cls, tag: null, changelog: cl, dryRun: false },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(0);
    const updated = readFileSync(cl, "utf-8");
    expect(updated).toContain(
      "- Cosmetic regen: 3 files (canonical-keys version stamps)."
    );
  });
});

describe("run: dry-run", () => {
  it("prints the would-be content to stdout and does not mutate the file", () => {
    const cls = writeClassification("c.json", {
      cosmetic_files: ["src/data/data-quality/cursor.json"],
      material_files: [],
      tag: "v0.10.3",
      summary_md: "",
    });
    const cl = writeFixture("CL.md", SAMPLE_CHANGELOG_WITH_TODAY);
    const before = readFileSync(cl, "utf-8");
    const beforeMtime = statSync(cl).mtimeMs;

    const result = run({
      args: { classification: cls, tag: null, changelog: cl, dryRun: true },
      today: "2026-04-29",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("### Synced (syllago v0.10.3)");

    const after = readFileSync(cl, "utf-8");
    const afterMtime = statSync(cl).mtimeMs;
    expect(after).toBe(before);
    expect(afterMtime).toBe(beforeMtime);
  });
});
