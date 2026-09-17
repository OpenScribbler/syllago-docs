# Style patch proposals

These are editing-LLM proposals from the three-page Vale + Jev trial. They are
deliberately not applied: the goal is to test whether the queue supports a
small, reviewable edit loop. Two proposals are worth accepting; one is an
explicit rejection that should become project policy.

## 1. Accept: add the serial comma

Source: `Google.OxfordComma`, `quick-start.mdx:29`.

```diff
-In the provider picker, **space** toggles a selection and **enter** confirms.
+In the provider picker, **space** toggles a selection, and **enter** confirms.
```

This is mechanical, preserves meaning, and matches the selected style guide.

## 2. Accept after author review: split a dense procedure paragraph

Source: manual review of Jev's `single_idea` near miss (`0.37` violation
probability, below its `0.50` review threshold), `quick-start.mdx:29`.

```diff
-Follow the terminal prompts: `init` detects the AI coding tools (providers) on your machine and asks you to confirm which ones to manage. In the provider picker, **space** toggles a selection and **enter** confirms. When it finishes, your config exists at `.syllago/config.json`. To skip the prompts and accept defaults, pass `--yes`.
+Follow the terminal prompts. `init` detects the AI coding tools (providers) on your machine and asks you to confirm which ones to manage. In the provider picker, **space** toggles a selection, and **enter** confirms.
+
+When initialization finishes, your config is at `.syllago/config.json`. To skip the prompts and accept the defaults, pass `--yes`.
```

The proposal separates interaction instructions from the result and optional
shortcut. This also demonstrates a recall gap: the current semantic threshold
does not surface a plausible edit without a human looking at near misses.

## 3. Reject: replace `CLI` with `command-line tool`

Source: `Google.WordList`, repeated on `why-syllago.mdx` and `sandbox.mdx`.

```diff
-A typical workflow today might involve **Claude Code** in the terminal, **Cursor** as the IDE, and **Copilot CLI** for shell commands.
+A typical workflow today might involve **Claude Code** in the terminal, **Cursor** as the IDE, and **Copilot command-line tool** for shell commands.
```

Do not apply this patch. `Copilot CLI` is a product name, and `CLI` is accepted
vocabulary for Syllago's technical audience. A production setup should add a
targeted vocabulary exception rather than disable `Google.WordList` wholesale.
