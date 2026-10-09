## Supplied-video review

A trusted `seedUrl` makes scan call Lightreel first with durable key `seed-review`.
The blocking request has a nine-minute default timeout, retains only the four
requested answer fields and conversation ID, and never polls or resubmits an
ambiguous seed request. Its provider-reported access is metadata attribution,
not independent proof of video access and not a profile-wide DNA claim.

The official [Lightreel API documentation](https://lightreel.ai/docs) describes
`POST /v1/chat`, structured fields nested under `answer`, and requests taking
several minutes. The review requests four fields (within the documented five).

## Response bounds and diagnostics

ScrapeCreators feed responses can contain fields discarded by the sanitizer.
Only `/v3/tiktok/profile/videos` may use a 2 MiB raw buffer; other endpoints retain
a 256 KiB maximum. Sanitized durable receipt bodies remain capped at 256 KiB in
UTF-8. The larger feed bound is a robustness measure. An oversized response is
only a hypothesis for the previous live feed failure; its cause was not verified.

Errors expose only a fixed category, transport-failure enum, and valid HTTP status.
They never include raw provider diagnostics, credentials, request bodies, or URLs.
All added verification uses synthetic injected responses. No live provider result
or content quality is established by these tests.
