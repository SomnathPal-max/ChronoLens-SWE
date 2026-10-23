# Evaluated Noun Phrases for SAM 3.1 Segmentation

Per project rules and Meta platform facts (verified Oct 23, 2026):
1. **One short noun phrase per request** (1 to 4 words). Comma lists return zero matches, "and" or a second text part segments only one concept, commands and questions are unreliable, negation/OR/spatial phrases are inconsistent.
2. Max 16 tracked objects per frame.
3. Use `metadata.mask_encoding="one_bit"` and `metadata.include_confidence="true"`.

## Evaluated Noun Phrases on Web & UI Applications

| Concept / UI Element | Recommended Noun Phrase | Alternative Phrases | Notes / Boundary Stability |
|----------------------|-------------------------|---------------------|----------------------------|
| Kanban Card | `"kanban card"` | `"card"`, `"task card"` | High confidence (0.85-0.95); segments entire card rectangle including shadow. |
| Column / Container | `"kanban column"` | `"column"`, `"board column"` | Good confidence; best when styled with background distinction (e.g. `bg-gray-100`). |
| Top Navigation Bar | `"navigation bar"` | `"navbar"`, `"header"` | High confidence; segments horizontal sticky bar across full viewport width. |
| Modal Dialog | `"modal dialog"` | `"modal"`, `"dialog window"` | Sharp boundary; catches popup dialog overlay distinctly. |
| Button | `"button"` | `"action button"`, `"submit button"` | Sharp boundary; catches CTA and add-card buttons. |
| Text / Heading | `"header text"` | `"heading"`, `"title"` | Lower mask resolution on small typography; box prompt or higher contrast recommended. |
| Modal Backdrop | `"modal backdrop"` | `"dim overlay"`, `"dark overlay"` | Useful for detecting modal presence and backdrop dimming. |

## Invalid / Discouraged Phrases

- `"cards and columns"` (multi-concept phrases segment only one element or fail)
- `"highlight the broken card"` (imperative commands are unreliable)
- `"is the modal above the navbar?"` (questions are rejected or yield zero matches)
- `"card that is not moving"` (negation is inconsistent)
- `"red dot"` (too ambiguous zero-shot across complex UI backgrounds)
