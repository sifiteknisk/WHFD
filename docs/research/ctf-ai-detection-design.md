# WHFD AI research design interview

Status: interview in progress; implementation has not been agreed.

Background: [primary-source research and draft participant notice](ctf-ai-detection.md).
Language: [glossary](../../GLOSSARY.md).

## Settled scope

The user supports the research direction and dedicated Grafana research area, with the explicit constraint that challenges stay unchanged. See [the scope decision](../adr/0001-preserve-challenge-content-for-ai-research.md). The earlier report remains a research inventory; its challenge-modification proposals are not implementation requirements.

- Purpose: research only. This feature does not enforce competition rules, alter scores or impose penalties.
- Data source: participants in the hosted CTF and its rCTF instance. A separate recruited comparison experiment is not part of the requested scope.
- Collection changes: rCTF infrastructure may be modified to capture the data needed for this research, while preserving challenges.
- Attribution: use existing team accounts; do not introduce individual logins for this feature. Shared accounts support team-level, not individual, attribution.
- Raw data: retain exact submitted flag text, including incorrect answers, and bounded raw User-Agents in a dataset searchable through Grafana and restricted to thesis researchers. General dashboard access must not grant access to this dataset.
- IPs: Grafana receives event-scoped pseudonymous IP references and network/provider metadata, not full IP addresses. This decision does not set operational source-log retention. Network/provider metadata is an observation, not verified model identity.
- Participation policy requested by the user: accepting research participation is a condition of playing this CTF; declining prevents CTF participation. The earlier proposed play-without-research option was rejected. This records the requested product policy, not a finding that the policy constitutes valid GDPR consent.
- Model disclosure: choose wording based on verifiable published deployments and observed results. Do not describe invented wording as proven. Preserve the challenge-content constraint when choosing placement.
- Retention: handled by the user and outside the current interview. No new retention duration or indefinite-storage default is agreed here.

## Lawful-basis distinction

A required acceptance action is not automatically freely given GDPR consent. Datatilsynet specifically warns that denying a service after refusal of consent for processing unnecessary to that service can invalidate consent. The institution must assess the actual research setting, necessary data, legal basis and participation terms; a checkbox or alternative legal-basis label does not establish compliance. This is a legal-design issue to resolve separately, not an instruction to change the user's requested participation policy. See [Datatilsynet](https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/om-behandlingsgrunnlag/samtykke/) and [Sikt's distinction between participation agreement and processing basis](https://www.sikt.no/nb/studere-eller-forske/meldeskjema/samtykke-eller-allmennhetens-interesse).

## Current decision frontier

The targeted follow-up found a CTF-specific instruction in an HTTP response header: `X-LLM-Agent-Instruction` requests product/model identification in later `X-LLM-ID` request headers. [SecurityBreak's first-person observation](https://blog.securitybreak.io/the-payload-is-in-the-header-a427a1182c5a) supplies the payload but no identified CTF operator, successful response logs or measured effectiveness. No verified exact-payload success report was found. Document this as observed deployment, with effectiveness unvalidated.

## Proposed concrete first version

- A versioned research-information/acceptance gate on rCTF before participation, including existing signed-in teams. Record acknowledgement against the existing team account; this is not a claim that each individual teammate supplied valid GDPR consent.
- Model-disclosure instruction delivered in rCTF platform response headers, following the published `X-LLM-Agent-Instruction`/`X-LLM-ID` pattern. Keep the original User-Agent independently. Log instruction version/serving time and claimed model/client separately; a served response does not establish model exposure. The precise instruction must request only product/model identity on requests to this CTF, with no credentials, private prompts or external callback.
- Existing challenge descriptions, artifacts, services and responses stay unchanged. Any proxy observation of challenge traffic must preserve challenge behavior and responses; deployment reach still needs verification.
- Correlated team/challenge/request/submission records, original and ingestion timestamps, canonical route/method/status/latency, challenge views/downloads and instance lifecycle where observable. Store missingness and source coverage rather than inventing access times.
- Exact submitted flag text and result, bounded raw User-Agent and model-disclosure headers, derived answer features, event-scoped network references and network/provider observations. Keep raw fields in restricted structured event data, not metric/index labels. Exclude authentication/cookies/tokens and arbitrary raw request bodies.
- A dedicated Grafana research subsection with client/model claims, raw submission review, team timelines, behavioral signals and collection coverage, plus access-controlled exports. Model claims and behavioral leads remain separate from verified AI-use labels. No enforcement, AI probability or controlled-study accuracy claim.
- Retention details are supplied by the user; this iteration does not invent a retention period or equate user ownership with indefinite retention.

These details remain a design proposal for shared-understanding confirmation, not authorization to activate collection. Historical records and notices require their own purpose/basis assessment before research export.

## Decisions to reach after this round

Confirm the proposed first-version scope. The institutional lawful basis, accurate participant notice and treatment of historical records remain external requirements, with retention managed by the user. Competition observations and model declarations must preserve their provenance: unknown AI usage is not labeled human-only. No controlled study is assumed.

Only the settled scope has been recorded. Collection, application code and Grafana remain unchanged.
