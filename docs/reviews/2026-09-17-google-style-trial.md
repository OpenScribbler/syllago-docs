# Google style trial: Vale and Jev

Date: 2026-09-17

This trial compares two complementary checks against the hand-authored Syllago
documentation. Vale applies deterministic rules from version 0.7.1 of the
community-maintained Google package. Jev evaluates five semantic rules that are
difficult to express as word lists or syntax patterns. Neither result is a
release gate.

## Vale baseline

The custom Syllago style remains in `vale/styles/Syllago`, but `.vale.ini`
temporarily selects `Google, Vale`. Existing exclusions for generated content
remain active.

Vale reported 818 findings across 18 rules:

| Severity | Findings |
| --- | ---: |
| Error | 216 |
| Warning | 117 |
| Suggestion | 485 |

The highest-volume rules were:

| Rule | Findings | Observation |
| --- | ---: | --- |
| `Google.EmDash` | 204 | Conflicts with Syllago's frequent spaced-em-dash style. |
| `Google.Parens` | 191 | Intentionally broad suggestion; every parenthetical is a candidate. |
| `Google.Acronyms` | 113 | Needs a Syllago vocabulary for accepted domain terms. |
| `Google.Passive` | 102 | Finds grammatical patterns but cannot decide whether the actor matters. |
| `Google.WordList` | 62 | Mostly deterministic and suitable for project-level review. |
| `Google.Contractions` | 40 | A house-style choice rather than a correctness issue. |
| `Google.WordListCase` | 29 | Mostly deterministic and suitable for project-level review. |
| `Google.Semicolons` | 23 | Intentionally broad suggestion requiring editorial judgment. |
| `Google.Headings` | 13 | Overlaps the existing Syllago heading-capitalization rule. |

The raw baseline demonstrates why the package needs project overrides before it
can become an actionable queue. Installing a public style package provides
coverage, but it does not decide which house-style choices Syllago adopts.

## Jev semantic rules

The prototype asks a three-way Choice question for each applicable unit:
`violation`, `compliant`, or `not_applicable`. It reports the probability of a
violation and retains Jev's confidence value.

| Rule | Scope | Google guidance |
| --- | --- | --- |
| `actor_clarity` | Paragraph | [Active voice](https://developers.google.com/style/voice) |
| `contextual_jargon` | Paragraph | [Jargon](https://developers.google.com/style/jargon) |
| `single_idea` | Paragraph | [Paragraph structure](https://developers.google.com/style/paragraph-structure) |
| `critical_information_first` | Paragraph | [Critical information first](https://developers.google.com/style/paragraph-structure#put_critical_information_first) |
| `descriptive_heading` | Heading plus following paragraph | [Headings and titles](https://developers.google.com/style/headings) |

The parser excludes frontmatter, imports, tables, JSX component lines, comments,
and fenced code. It keeps adjacent list items separate and pairs each heading
with its first prose unit. Parser tests are essential: early trial runs exposed
false findings caused by merged list items and shell comments mistaken for
headings.

Four real pages were sampled with the default limit of 12 paragraphs per page:

- `getting-started/why-syllago.mdx`
- `getting-started/quick-start.mdx`
- `getting-started/installation.mdx`
- `advanced/sandbox.mdx`

After correcting the two segmentation bugs, the sample produced no findings at
the trial thresholds. A deliberately bad five-paragraph fixture produced strong
signals for unclear actors, novel jargon, unrelated paragraph topics, buried
critical information, and a generic heading. It also produced lower-confidence
review candidates, including one false positive. Based on that result, likely
violations start at 0.85 and review candidates start at 0.50.

## Interpretation

This is a pipeline proof, not an accuracy result. The real-page sample is too
small, and the deliberately bad examples are too obvious, to estimate precision
or recall. The next useful experiment is a labeled set of real and near-miss
passages for each semantic rule. Thresholds should be tuned per rule before any
check blocks a pull request or automatically requests an edit from a generative
model.
