# WHFD AI research design interview

Status: interview in progress; implementation has not been agreed.

Background: [primary-source research and draft participant notice](ctf-ai-detection.md).
Language: [glossary](../../GLOSSARY.md).

## Settled scope

The user supports the research direction and dedicated Grafana research area, with the explicit constraint that challenges stay unchanged. See [the scope decision](../adr/0001-preserve-challenge-content-for-ai-research.md). The earlier report remains a research inventory; its challenge-modification proposals are not implementation requirements.

- Purpose: research only. This feature does not enforce competition rules, alter scores or impose penalties.
- Data source: participants in the hosted CTF and its rCTF instance. A separate recruited comparison experiment is not part of the requested scope.
- Collection changes: rCTF infrastructure may be modified to capture the data needed for this research, while preserving challenges.
- Desired observations include raw User-Agents and submitted flag text. Exact field scope, access and retention remain to be agreed.

## Current decision frontier

1. Attribution: existing team accounts versus changes for individual participant attribution.
2. Access: who may query the raw research dataset, including submitted flag text and User-Agents.
3. Model disclosure: whether to add a visible site-wide optional model-in-User-Agent instruction outside challenge content. Permission to change infrastructure does not by itself settle the exact participant-facing instruction.

## Decisions to reach after this round

Specific sources and fields, including IP handling; retention and deletion; institutional lawful basis and participant information; evaluation and dashboard behavior. Competition observations and model declarations must preserve their provenance: unknown AI usage is not labeled human-only. Any optional participant declaration remains a separate design decision; no controlled study is assumed.

Only the settled scope has been recorded. Collection, application code and Grafana remain unchanged.
