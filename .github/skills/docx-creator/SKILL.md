---
name: docx-creator
description: "Creates professional Microsoft Word (.docx) documents with Microsoft branding, 4-color palette, Segoe UI font, structured sections, and executive formatting. USE FOR: create word document, generate docx, write report, Microsoft branded document, workshop guide, training material, whitepaper, proposal. DO NOT USE FOR: presentations (use pptx-creator or ms-gamma-presenter), diagrams (use figjam-diagrams)."
---

# DOCX Creator

Create professional Microsoft-branded Word documents (.docx).

## Branding Defaults

| Element | Value |
|---------|-------|
| Primary Color | #0078D4 (Microsoft Blue) |
| Heading Colors | Rotate: #F25022, #7FBA00, #00A4EF, #FFB900 |
| Font (headings) | Segoe UI Semibold |
| Font (body) | Segoe UI, 11pt |
| Header bar | 4-color Microsoft stripe (2px each) |
| Footer | Page number, doc title, "Confidential" |
| Margins | 1 inch all sides |
| Line spacing | 1.15 |

## Document Structure

Every document MUST include:

1. **Cover page** — title, subtitle, date, author, version, Microsoft logo colors bar
2. **Table of contents** — auto-generated from headings
3. **Executive summary** — 150-250 words (for reports/whitepapers)
4. **Main content** — organized by H2/H3 sections
5. **Next steps / Recommendations** — actionable bullet list
6. **References** — all cited sources with URLs
7. **Appendix** — reference materials (if applicable)

## Versioning & Archiving

- Every document MUST display: **date**, **version** (semver), and **author** on the cover page and in the footer
- Filename pattern: `{Title}_v{version}_{YYYY-MM-DD}.docx`
- Save to: `output/docx/`
- Before overwriting an existing file, move the previous version to `output/docx/archive/`
- Include a **Document History** table on page 2 (after cover, before ToC):

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | {{date}} | {{author}} | Initial version |

## Content Guidelines

- Use tables for structured data — never describe data that belongs in a table
- Use bullet lists for 3+ items — avoid paragraph-form lists
- Each section starts with a one-sentence purpose statement
- Keep paragraphs under 4 sentences
- Include call-out boxes (shaded) for key insights or warnings
- Number figures and tables: "Figure 1:", "Table 1:"

## Document Types

| Type | Focus | Typical Length |
|------|-------|---------------|
| Report | Findings + recommendations | 8-15 pages |
| Guide | Step-by-step instructions | 10-20 pages |
| Workshop | Exercises + hands-on content | 15-25 pages |
| Proposal | Problem → solution → plan | 5-10 pages |
| Whitepaper | Deep-dive technical content | 10-20 pages |

## Factual Integrity

- NEVER fabricate metrics, KPIs, ROI figures, market data, statistics, or research findings
- Only use data from: workspace context, user-provided materials, or credible official sources
- Credible sources: Gartner, Forrester, IDC, McKinsey, Microsoft Learn, IEEE, ACM, HBR, official vendor docs, peer-reviewed publications
- Also valid: Microsoft Blog, GitHub Blog, Anthropic Blog/Engineering, GitHub Docs, Claude Code Docs, Azure Architecture Center, Microsoft Tech Community, official product release notes
- Every metric, statistic, or market claim MUST include a hyperlink to its source
- If no credible source exists, state as assumption ("Based on typical enterprise benchmarks...") or omit entirely
- Add a **References** section at the end of every document listing all cited sources with URLs
- Use footnote-style citations in the body: "...reduced costs by 40% [1]" with `[1] https://source.url` in References

## Quality Checklist

- [ ] Cover page has title, date, author, version, and color bar
- [ ] Document History table present on page 2
- [ ] All headings use Segoe UI Semibold
- [ ] Tables have header row with brand color background
- [ ] No orphan headings (heading must be followed by content)
- [ ] Footer includes page numbers
- [ ] Document reads to completion in under 15 minutes
- [ ] No fabricated data — all metrics have source hyperlinks
- [ ] References section present with all cited sources
- [ ] Filename follows `{Title}_v{version}_{date}.docx` pattern
- [ ] Saved to `output/docx/` with previous version archived
