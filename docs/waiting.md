# Assumptions and open checks

The prototype proceeds with the following documented assumptions. None blocks the two core demos.

- The `current-2024` diameter values are the researched values in `docs/spec.md`. A human should visually compare `engine/rules/law-tables.ts` with MK 935 Annex 7 before presenting the result as legal guidance.
- The assignment's Oz/Os assortment column totals 70%. The prototype preserves it, calculates the remaining 30% as unpriced volume, and points to Kamīnmalka as the likely missing share.
- Protection-zone stands remain included by default to match the worked example. They are flagged and an alternative total is shown without them.
- Hauling conditions and distance have no supplied formula. The prototype represents the specialist's judgment through editable forwarding and transport EUR/m³ rates.
- The public contract picker contains only our three synthetic files. Third-party templates remain local, ignored test material and are never published.
- Cached synthetic extraction results are deterministic demo fixtures. A newly uploaded contract requires `OPENROUTER_API_KEY`.
- Contract upload is one PDF per run. Multi-document batch processing is outside the one-day prototype.
