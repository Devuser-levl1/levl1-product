# Task bank — reviewer packet (Levl1 starter content)

Generated 2026-11-05. One section per task. A task can be marked **reviewed** in the app (Task bank → open task → Review) only by someone who hires for that role, and **activated** only after "Verify in Judge0" passes.

## What has already been machine-checked (you do not need to redo this)

- Every expected output was produced by **running** the reference solution, not written by hand.
- An **independent second solution** (JavaScript, or an alternative SQL query) produces identical output on every test.
- 4–5 **deliberately wrong solutions** ("mutants" — the mistakes candidates typically make) are each caught by **at least two tests, at least one hidden**. The table per task shows which tests catch which mistake.
- Starter code runs as given (Python/JavaScript/SQL locally; C++ compiled; Java/Go/TypeScript are compiled by Judge0 on first "Verify").

## What only you can judge (≈15 minutes per task)

1. **Realism** — would a strong candidate at this level recognise this as their actual job? Too easy / too hard for the stated years?
2. **Clarity** — is any rule in the prompt ambiguous enough that a good engineer could reasonably produce different output? (If so, the hidden tests are unfair — tell us which rule.)
3. **Probe answers** — is each "strong answer" what a hire you would want actually says? Is anything missing or wrong for your stack/company?
4. **Rubric** — do the strong/weak criteria match how your team judges code? Adjust weights if needed.
5. **Hidden tests** — is any hidden test testing something the prompt does not state? Every hidden test must follow from the written rules.

When satisfied: Task bank → task → Review → write a note ("Reviewed by <name>, <role>: checked realism, prompt, probes, tests") → **Mark reviewed** → **Verify in Judge0** → **Activate for live use**.

---

## API access-log summary

**Key** `backend-junior-access-log` · **Roles** backend, fullstack, devops · **Level** junior (0–3 yrs) · **Time** ~10 min · **Languages** python, javascript, typescript, java, cpp, go

**Prompt (as the candidate sees it)**

> On-call asked for a quick summary of an API's access log.
> 
> Input (stdin): one request per line: "<METHOD> <PATH> <STATUS> <LATENCY_MS>", e.g. "GET /orders?page=2 200 35". Blank lines are ignored. A line is malformed if it does not have exactly 4 fields, METHOD is not one of GET POST PUT PATCH DELETE, PATH does not start with "/", STATUS is not an integer from 100 to 599, or LATENCY_MS is not a non-negative integer.
> 
> Output (stdout):
> requests=<valid requests>
> errors_4xx=<valid requests with status 400-499>
> errors_5xx=<valid requests with status 500-599>
> skipped=<malformed lines>
> then up to 3 lines "<path> <count>" for the most requested paths, ignoring any query string (the part from "?"), sorted by count descending, then path ascending.
> 
> Example: the lines "GET /a 200 5", "GET /a?x=1 500 9", "POST /b 404 3" print requests=3, errors_4xx=1, errors_5xx=1, skipped=0, "/a 2", "/b 1".

**Tests**: 7 (1 visible, 6 hidden): basic; query strings are grouped *(hidden)*; ties sort by path *(hidden)*; malformed lines *(hidden)*; empty input *(hidden)*; status range edges and garbage *(hidden)*; all tied, unsorted arrival *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| keeps query string | basic, query strings are grouped |
| no status range | malformed lines, status range edges and garbage |
| skipped counted as requests | malformed lines, status range edges and garbage |
| tie by insertion | ties sort by path, all tied, unsorted arrival |

**Expected probe answers to check**

- **grouping paths** — *Why strip the query string before counting paths?*  
  Strong: The query string is parameters, not a different endpoint; grouping by route gives meaningful hot paths. Mentions that path params (/orders/123) may need normalising too in a real system.  
  Weak signals: Did not notice query strings, or cannot explain why they matter.
- **malformed-line handling** — *What does your code do with a line it cannot parse, and why?*  
  Strong: Skips and counts it so the summary is still produced and the data-quality problem is visible; does not crash the whole report on one bad line.  
  Weak signals: Crashes, or silently drops lines without counting.
- **tie-breaking** — *Two paths have the same count — which comes first and how does your sort guarantee it?*  
  Strong: Path ascending, via a composite sort key (count desc, path asc); explains that without it the order depends on insertion/hash order.  
  Weak signals: Unaware the order is otherwise unstable.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Per-client rate limiter

**Key** `backend-mid-rate-limiter` · **Roles** backend, fullstack · **Level** mid (2–8 yrs) · **Time** ~12 min · **Languages** python, javascript, typescript, java, go, cpp

**Prompt (as the candidate sees it)**

> You are adding rate limiting in front of a public API.
> 
> Input (stdin): the first line is "N W" — each client may make at most N ALLOWED requests in any sliding window of W seconds. Each following line is "<client_id> <timestamp>" (integer seconds, non-decreasing).
> 
> For every request print ALLOW or DENY on its own line. A request is allowed if, counting only previously ALLOWED requests from the same client with timestamp t' where t - W < t' <= t, fewer than N exist. Denied requests do not count toward the limit.
> 
> Example: with "2 10", requests from client a at 1, 2, 3, 11 are ALLOW, ALLOW, DENY, ALLOW.

**Tests**: 6 (1 visible, 5 hidden): basic; window boundary is exclusive *(hidden)*; denied requests do not count *(hidden)*; independent clients *(hidden)*; window spans a fixed-bucket edge *(hidden)*; many clients interleaved *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| counts denied | basic, window boundary is exclusive, denied requests do not count, independent clients, many clients interleaved |
| fixed window | denied requests do not count, window spans a fixed-bucket edge, many clients interleaved |
| global counter | basic, independent clients, many clients interleaved |
| inclusive boundary | basic, window boundary is exclusive, denied requests do not count, independent clients, many clients interleaved |

**Expected probe answers to check**

- **data structure for per-client history** — *Why did you use this structure to track each client's requests?*  
  Strong: A per-client queue (deque) of allowed timestamps: evict from the front as the window moves, so each request is O(1) amortised and memory is bounded by N per client. Mentions why a plain list scan or a single counter is wrong.  
  Weak signals: Cannot say what is stored or why; claims a single counter works; unaware of growth.
- **window boundary** — *Is a request exactly W seconds after an earlier one inside or outside the window, and how does your code decide?*  
  Strong: Outside — the window is (t-W, t], so entries with timestamp <= t-W are evicted. Points to the exact comparison in their code.  
  Weak signals: Unsure, or says it does not matter.
- **denied requests** — *Should a denied request count against the client? Why?*  
  Strong: No — counting denials would let a client lock itself out permanently under sustained retries; only allowed requests consume quota.  
  Weak signals: Counts everything without considering retry storms.
- **production / scale** — *How would this change across multiple API servers?*  
  Strong: Shared state (e.g. Redis sorted set or token bucket with atomic Lua/INCR + TTL), accepts some approximation (sliding-log vs sliding-window counter vs token bucket) and discusses clock skew.  
  Weak signals: Keeps in-process state and assumes one server.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Idempotent payment charges

**Key** `backend-senior-idempotent-charges` · **Roles** backend · **Level** senior (6–40 yrs) · **Time** ~15 min · **Languages** python, javascript, typescript, java, cpp, go

**Prompt (as the candidate sees it)**

> Mobile clients retry payment requests when the network drops, so the charge endpoint must be idempotent: a retried request must never charge twice.
> 
> Input (stdin), one command per line:
> - "ACCOUNT <id> <balance_cents>" creates an account (ignore it if the id already exists).
> - "CREDIT <id> <amount_cents>" adds money (ignore unknown accounts; no output).
> - "CHARGE <idempotency_key> <account> <amount_cents>" requests a charge.
> 
> For each CHARGE print one line:
> - First time a key is seen: "ERROR unknown_account" if the account does not exist, else "ERROR invalid_amount" if amount <= 0, else "DECLINED insufficient_funds" if the balance is lower than the amount, else deduct and print "OK <new_balance>".
> - Key seen before with the SAME account and amount: print exactly the response that was returned the first time (do not re-execute — even if the balance has changed since).
> - Key seen before with a DIFFERENT account or amount: print "CONFLICT".
> 
> After all commands print "BALANCE <id> <balance>" for every account, sorted by id.

**Tests**: 6 (1 visible, 5 hidden): basic; retry after balance changes replays the original *(hidden)*; declined stays declined on retry *(hidden)*; conflicting payloads *(hidden)*; errors and duplicate accounts *(hidden)*; mixed retries, conflicts and redefinition *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| account redefinition resets | errors and duplicate accounts, mixed retries, conflicts and redefinition |
| no conflict check | conflicting payloads, mixed retries, conflicts and redefinition |
| only caches success | declined stays declined on retry, mixed retries, conflicts and redefinition |
| reexecutes on retry | basic, retry after balance changes replays the original, declined stays declined on retry, conflicting payloads, mixed retries, conflicts and redefinition |

**Expected probe answers to check**

- **store the response vs re-execute** — *On a retry, why return the stored response instead of running the charge again?*  
  Strong: Idempotency means the same request yields the same effect AND the same answer; re-executing could double-charge or give a different answer if state changed (e.g. a decline turning into success after a top-up). Store the first outcome and replay it.  
  Weak signals: Thinks checking "already charged" is enough; does not consider declines or changed balances.
- **payload mismatch** — *What should happen when the same key arrives with a different amount, and why?*  
  Strong: Reject as a conflict (HTTP 409/422 style) — it is a client bug or key reuse; silently replaying or executing would be wrong either way.  
  Weak signals: Executes it as a new charge or replays the old response.
- **caching failures** — *Do you cache error and declined responses too?*  
  Strong: Yes, for deterministic outcomes the client asked about — otherwise a retry could succeed later and charge unexpectedly. Discusses NOT caching transient server failures (5xx/timeouts) so they can be retried.  
  Weak signals: Only caches successes without considering the consequence.
- **production design** — *How would this work with several API servers and a crash mid-charge?*  
  Strong: Persist key + request hash + status in the database in the same transaction as the charge (or a unique constraint with an in-progress state), TTL for keys, return 409/retry-later while in progress, and handle concurrent duplicate requests atomically.  
  Weak signals: Keeps an in-memory map and assumes one server.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Monthly paid revenue by country (SQL)

**Key** `data-junior-sql-revenue` · **Roles** data · **Level** junior (0–3 yrs) · **Time** ~10 min · **Languages** sql

**Prompt (as the candidate sees it)**

> Finance wants a monthly revenue breakdown by country.
> 
> Tables (SQLite):
> - customers(id INTEGER, country TEXT)
> - orders(id INTEGER, customer_id INTEGER, ordered_at TEXT "YYYY-MM-DD", amount_cents INTEGER, status TEXT — "paid", "refunded" or "pending")
> 
> Write one query that returns, for every country and month with at least one PAID order: country, month (YYYY-MM), the number of paid orders, and total paid revenue in cents. Ignore refunded and pending orders, and ignore orders whose customer does not exist. Sort by month ascending, then revenue descending, then country ascending.
> 
> The output format is SQLite's default: columns separated by "|", no header. Use SQLite 3.27-compatible SQL.

**Tests**: 6 (1 visible, 5 hidden): basic; refunded and pending excluded *(hidden)*; orphan orders ignored *(hidden)*; ties and sort order *(hidden)*; repeat customers count every order *(hidden)*; mixed month with refunds, orphans and ties *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| counts customers | orphan orders ignored, ties and sort order, repeat customers count every order |
| includes refunds | refunded and pending excluded, mixed month with refunds, orphans and ties |
| left join orphans | orphan orders ignored, mixed month with refunds, orphans and ties |
| sort by country | basic, mixed month with refunds, orphans and ties |

**Expected probe answers to check**

- **join type** — *Why an inner join rather than a left join here?*  
  Strong: Orders without a matching customer have no country, so they cannot be attributed; an inner join drops them (and in real life you would report them as a data-quality issue). A left join would produce a NULL-country group.  
  Weak signals: Cannot explain the difference or says it does not matter.
- **COUNT(*) vs COUNT(DISTINCT customer_id)** — *What exactly does your orders column count?*  
  Strong: Paid orders — COUNT(*) after filtering; COUNT(DISTINCT customer_id) would be paying customers, a different metric.  
  Weak signals: Mixes up orders and customers.
- **refunds** — *How would you report revenue net of refunds instead?*  
  Strong: Subtract refunded amounts in the month of the refund (needs a refunded_at) or attribute to the original order month — states which and why finance usually wants one convention consistently.  
  Weak signals: Just deletes refunded rows without thinking about timing.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Daily active users from a raw event log

**Key** `data-mid-dau` · **Roles** data, backend · **Level** mid (1–7 yrs) · **Time** ~10 min · **Languages** python, javascript, typescript, java, go

**Prompt (as the candidate sees it)**

> You maintain a small analytics job. Input (stdin) is a raw event log, one event per line: "<user_id>,<event_name>,<ISO-8601 timestamp>" (e.g. u1,login,2026-03-01T10:00:00Z). Lines may be out of order and some are malformed.
> 
> Print, sorted by date ascending, one line per day: "<YYYY-MM-DD>,<number of distinct users active that day>". Then print a final line "skipped=<K>" with the number of malformed lines you skipped. A line is malformed if it does not have exactly three comma-separated fields, the user id is empty, or the timestamp does not start with a valid YYYY-MM-DD date. Ignore blank lines; trim whitespace around fields.

**Tests**: 7 (1 visible, 6 hidden): basic; malformed lines are skipped *(hidden)*; unsorted input *(hidden)*; empty input *(hidden)*; whitespace around fields *(hidden)*; invalid date shapes *(hidden)*; duplicates across days, unsorted, padded *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| counts events | basic, unsorted input, whitespace around fields, duplicates across days, unsorted, padded |
| no trim | whitespace around fields, duplicates across days, unsorted, padded |
| no validation | malformed lines are skipped, invalid date shapes |
| unsorted | unsorted input, duplicates across days, unsorted, padded |

**Expected probe answers to check**

- **how distinct users are counted** — *How does your code make sure a user is counted once per day?*  
  Strong: A set of user ids per date (dict of sets / defaultdict(set)); duplicates collapse naturally. Can explain memory cost and alternatives (HyperLogLog at scale).  
  Weak signals: Counts lines, or de-duplicates globally instead of per day.
- **malformed-line policy** — *Why skip malformed lines instead of failing the whole job?*  
  Strong: Raw logs are dirty; one bad line should not drop a day of metrics. Skip, count and surface the number (or log samples) so data quality is visible; fail only if the skip rate crosses a threshold.  
  Weak signals: Never considered it, or would silently drop without counting.
- **time zones** — *Which timezone defines "a day" in your output?*  
  Strong: Uses the timestamp's date as given (UTC here) and notes that business reporting may need a fixed timezone conversion before bucketing.  
  Weak signals: Unaware that the bucket depends on timezone.
- **scale** — *What changes if the log is 500 GB a day?*  
  Strong: Streams instead of loading everything; partition by date; distributed group-by (Spark/SQL COUNT(DISTINCT)) or approximate distinct counts; incremental daily runs with late-data handling.  
  Weak signals: Loads everything into memory on one machine.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Sessionize page views (SQL, window functions)

**Key** `data-senior-sql-sessions` · **Roles** data, ml · **Level** senior (5–40 yrs) · **Time** ~15 min · **Languages** sql

**Prompt (as the candidate sees it)**

> Product analytics needs sessions reconstructed from raw page views.
> 
> Table (SQLite): page_views(user_id TEXT, ts INTEGER — epoch seconds, page TEXT). Rows are not in any particular order and a user can have several views with the same ts.
> 
> A user's session starts at their first view, and a new session starts whenever the gap since that user's previous view is MORE than 1800 seconds (a gap of exactly 1800 stays in the same session).
> 
> Return one row per user: user_id, number of sessions, the largest number of views in any one session, and the total session duration in seconds (sum over the user's sessions of last ts minus first ts). Sort by user_id.
> 
> Output format: SQLite default ("|" separated, no header). Use SQLite 3.27-compatible SQL (window functions such as LAG and SUM() OVER are available).

**Tests**: 8 (1 visible, 7 hidden): basic; gap of exactly 1800 stays in session *(hidden)*; interleaved users *(hidden)*; duplicate timestamps and single views *(hidden)*; long single session *(hidden)*; another user's activity must not bridge a gap *(hidden)*; chained exact-boundary gaps *(hidden)*; busy site, sparse users *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| counts views not sessions | basic, gap of exactly 1800 stays in session, interleaved users, duplicate timestamps and single views, long single session, another user's activity must not bridge a gap, chained exact-boundary gaps |
| duration as views | basic, gap of exactly 1800 stays in session, interleaved users, duplicate timestamps and single views, long single session, another user's activity must not bridge a gap, chained exact-boundary gaps, busy site, sparse users |
| gap inclusive | gap of exactly 1800 stays in session, chained exact-boundary gaps |
| no partition | another user's activity must not bridge a gap, busy site, sparse users |

**Expected probe answers to check**

- **session boundary** — *Walk me through how a view becomes the start of a new session in your query.*  
  Strong: LAG(ts) partitioned by user ordered by ts; if the gap is > 1800 (or there is no previous view) flag 1; a running SUM of flags gives the session number. Points out <= 1800 vs < 1800 and why exactly 1800 stays in the session.  
  Weak signals: Cannot explain the flag-and-running-sum idea or the boundary.
- **partitioning** — *What happens if you forget PARTITION BY user_id in the LAG?*  
  Strong: The previous row could belong to a different user, so a user's first view could be glued onto someone else's session — wrong session counts for interleaved users.  
  Weak signals: Unsure what partitioning does.
- **window functions vs self-join** — *Why window functions instead of joining each view to earlier views?*  
  Strong: Single ordered pass per user (O(n log n) with the sort) instead of an O(n²) self-join; easier to reason about; in a warehouse it parallelises by partition.  
  Weak signals: No view on cost.
- **scale and late data** — *How would you run this daily on billions of events with late-arriving data?*  
  Strong: Incremental processing per day with a lookback window (sessions can cross midnight), partition by user/date, reprocess affected users when late events arrive, store session ids rather than recomputing history.  
  Weak signals: Recomputes everything from scratch every day without considering cost.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Search-as-you-type: debounce and stale responses

**Key** `frontend-mid-search-race` · **Roles** frontend, fullstack, mobile · **Level** mid (2–7 yrs) · **Time** ~12 min · **Languages** javascript, typescript, python

**Prompt (as the candidate sees it)**

> A search box fires API requests as the user types. Two classic bugs: sending a request on every keystroke, and showing results for an old query when responses arrive out of order. Simulate the correct behaviour.
> 
> Input (stdin), one event per line, in time order:
> - "TYPE <t_ms> <query>" — the search box now contains <query> (a single token).
> - "RESP <t_ms> <query> <count>" — a response for <query> arrives with <count> results.
> 
> Debounce: a request is sent for a TYPE event only if the next TYPE happens at least 300 ms later, or there is no later TYPE.
> 
> Output (stdout):
> 1. One line "SENT <query>" for each request sent, in order.
> 2. Then, for each RESP line in input order: "SHOW <query> <count>" if <query> equals what the search box contains at that moment (the most recent TYPE line above it), otherwise "IGNORE <query>" (a stale response must never overwrite newer results).

**Tests**: 8 (1 visible, 7 hidden): basic; debounce boundary is inclusive *(hidden)*; typed-but-not-sent query blocks older results *(hidden)*; user retypes an earlier query *(hidden)*; response before any typing and repeats *(hidden)*; pauses of exactly 300 ms send *(hidden)*; newest keystroke still in debounce window *(hidden)*; unsent edit makes the last sent result stale *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| compares latest sent | typed-but-not-sent query blocks older results, unsent edit makes the last sent result stale |
| no debounce | basic, debounce boundary is inclusive, typed-but-not-sent query blocks older results, user retypes an earlier query, pauses of exactly 300 ms send, newest keystroke still in debounce window, unsent edit makes the last sent result stale |
| shows everything | basic, debounce boundary is inclusive, typed-but-not-sent query blocks older results, user retypes an earlier query, response before any typing and repeats, pauses of exactly 300 ms send, newest keystroke still in debounce window, unsent edit makes the last sent result stale |
| strict debounce | debounce boundary is inclusive, pauses of exactly 300 ms send |

**Expected probe answers to check**

- **stale-response check** — *Why compare a response with what is in the box now rather than with the last request you sent?*  
  Strong: The user may have typed something newer that is still inside the debounce window (not sent yet); the results must match what the user sees. Mentions alternatives: request ids / AbortController to cancel stale requests.  
  Weak signals: Thinks last-sent is equivalent, or relies on responses arriving in order.
- **debounce interval** — *How did you decide what counts as "300 ms later", and what would you change in a real UI?*  
  Strong: >= 300 ms gap sends (explains the boundary); in a real UI tunes the delay, sends immediately on Enter, and may add a minimum query length and caching of recent queries.  
  Weak signals: Unsure about the boundary; no UX reasoning.
- **cancellation** — *How would you implement this with real fetch calls in React?*  
  Strong: useEffect with a timer cleared on each keystroke, AbortController to cancel in-flight requests when a newer query is sent, and/or a request counter so only the latest response sets state; cleanup on unmount.  
  Weak signals: No cleanup; sets state from every promise.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Cart pricing with promo codes

**Key** `fullstack-mid-cart-pricing` · **Roles** fullstack, backend, frontend · **Level** mid (2–7 yrs) · **Time** ~12 min · **Languages** javascript, typescript, python, java, go

**Prompt (as the candidate sees it)**

> Checkout must compute the order total with promo codes — the same logic powers the cart UI preview and the order API, so it has to be exact.
> 
> Input (stdin):
> - "ITEM <sku> <unit_price_cents> <quantity>" — the same sku may appear again; add the quantities and keep the first unit price.
> - "PROMO <code>" — a code the shopper entered.
> 
> Promo codes (each applies at most once; repeated codes are ignored, not invalid):
> - "BOGO-<sku>": buy one get one free on that sku — floor(quantity / 2) units are free. Only valid if the sku is in the cart.
> - "SAVE10": 10% off the subtotal AFTER BOGO discounts, rounded DOWN to the cent.
> - "FREESHIP": free shipping.
> Any other code is invalid.
> 
> Shipping is 499 cents unless the subtotal (before any discount) is at least 5000 cents, or FREESHIP applies.
> 
> Output (stdout):
> subtotal=<sum of unit price × quantity>
> discount=<total discount>
> shipping=<cents>
> total=<subtotal - discount + shipping>
> then "INVALID <code>" for each invalid code, in input order.
> 
> All amounts are integer cents.

**Tests**: 8 (1 visible, 7 hidden): basic; BOGO then percentage, merged SKUs *(hidden)*; shipping threshold uses the pre-discount subtotal *(hidden)*; repeated and invalid codes *(hidden)*; floor rounding *(hidden)*; empty cart *(hidden)*; BOGO pushes total under threshold, shipping still free *(hidden)*; percentage code entered twice *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| bogo rounds up | BOGO then percentage, merged SKUs, repeated and invalid codes |
| duplicate codes stack | repeated and invalid codes, percentage code entered twice |
| percent before bogo | BOGO then percentage, merged SKUs, repeated and invalid codes |
| rounds half up | BOGO then percentage, merged SKUs, repeated and invalid codes, floor rounding |
| shipping after discount | shipping threshold uses the pre-discount subtotal, BOGO pushes total under threshold, shipping still free |

**Expected probe answers to check**

- **promotion order** — *Why apply BOGO before the 10% discount?*  
  Strong: Percentage discounts should apply to what the shopper actually pays for; applying 10% to free items over-discounts. States that promo ordering is a business rule that must be explicit and consistent between UI and API.  
  Weak signals: Order was accidental; unaware it changes the total.
- **money representation and rounding** — *How do you represent money and round the 10%?*  
  Strong: Integer minor units (cents), never floats; floor explicitly as specified; would centralise rounding policy (banker's vs half-up vs floor) because finance and tax depend on it.  
  Weak signals: Uses floats and rounds ad hoc.
- **shared logic between UI and API** — *The cart page and the order API both need this — where should the logic live?*  
  Strong: Server is the source of truth (the client can be tampered with); share a pure pricing module or have the UI call a pricing endpoint for previews; never trust a client-computed total.  
  Weak signals: Trusts totals sent by the browser.
- **invalid codes** — *What should the shopper see for an invalid or inapplicable code?*  
  Strong: Reject with a specific reason (unknown vs not applicable to cart vs already applied) without failing checkout; log for abuse detection; idempotent re-application.  
  Weak signals: Fails the whole order or silently ignores.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Canary rollout health gate

**Key** `devops-mid-canary-gate` · **Roles** devops, backend · **Level** mid (2–8 yrs) · **Time** ~12 min · **Languages** python, go, javascript, java

**Prompt (as the candidate sees it)**

> Your deploy pipeline sends a slice of traffic to a canary and must decide automatically whether to promote it.
> 
> Input (stdin): one line per minute per version: "<minute> <version> <requests> <errors> <p99_ms>", version is "baseline" or "canary". Lines may be in any order; ignore malformed lines.
> 
> A minute is evaluable only if both versions have a line for it, the canary served at least 50 requests, and the baseline served at least 1.
> 
> Check evaluable minutes in ascending order. A minute fails if:
> 1. the canary error rate (errors/requests) is MORE than the baseline error rate plus 0.5 percentage points (reason "error_rate"), or otherwise
> 2. the canary p99 is MORE than 1.2 × the baseline p99 (reason "latency").
> 
> Output exactly one line: "ROLLBACK <minute> <reason>" for the first failing minute; otherwise "PROMOTE <evaluable_minutes>" if there were at least 3 evaluable minutes, else "HOLD insufficient_data <evaluable_minutes>".
> 
> Comparisons are exact: equal to the limit is NOT a failure.

**Tests**: 9 (1 visible, 8 hidden): basic promote; error-rate regression rolls back *(hidden)*; exact limits are not failures *(hidden)*; error checked before latency, low traffic skipped *(hidden)*; insufficient data holds *(hidden)*; unordered lines, incident on both versions *(hidden)*; equal latency limit then error regression *(hidden)*; both rules fail in the same minute *(hidden)*; two clean minutes only *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| equal is violation | exact limits are not failures, equal latency limit then error regression |
| float absolute threshold | basic promote, exact limits are not failures, unordered lines, incident on both versions, both rules fail in the same minute, two clean minutes only |
| ignores min traffic | error checked before latency, low traffic skipped, insufficient data holds |
| latency checked first | error checked before latency, low traffic skipped, both rules fail in the same minute |
| promotes on any data | insufficient data holds, two clean minutes only |

**Expected probe answers to check**

- **relative vs absolute error threshold** — *Why compare the canary against the baseline instead of a fixed error-rate limit?*  
  Strong: Baseline captures current conditions (an upstream incident raises both); comparing relatively isolates the change under test. A fixed limit both false-alarms during incidents and misses regressions on quiet days.  
  Weak signals: Cannot say why the baseline matters.
- **minimum traffic** — *Why ignore minutes where the canary served fewer than 50 requests?*  
  Strong: Error rates on tiny samples are noise (1 error in 10 = 10%); a minimum sample size (or a statistical test) prevents flapping. Mentions sequential testing / confidence intervals as the grown-up version.  
  Weak signals: Treats every minute equally.
- **HOLD vs PROMOTE** — *Why HOLD instead of promoting when nothing failed but there were only two evaluable minutes?*  
  Strong: Absence of evidence is not evidence of health; promotion should require enough observed traffic. Safe default is to keep the canary small and keep collecting.  
  Weak signals: Promotes on no data.
- **exact comparisons** — *How do you avoid floating-point mistakes exactly at the limit?*  
  Strong: Cross-multiply and compare integers (or use decimal/rational math) so equal-to-limit is deterministic.  
  Weak signals: Unaware floats can mis-compare at the boundary.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Offline edits: sync and conflict handling

**Key** `mobile-mid-offline-sync` · **Roles** mobile, frontend, fullstack · **Level** mid (2–8 yrs) · **Time** ~14 min · **Languages** javascript, typescript, python, java

**Prompt (as the candidate sees it)**

> A notes app lets people edit fields offline. When the phone reconnects, its queued edits are replayed against the server, which may have changed in the meantime. Each field has a version number.
> 
> Input (stdin), one per line (order of kinds may be mixed):
> - "SERVER <field> <value> <version>" — the server's state when the phone went offline.
> - "REMOTE <field> <value>" — a change another device made while this phone was offline: the field takes the value and its version increases by 1 (a new field starts at version 1).
> - "LOCAL <field> <value> <base_version>" — an edit queued on the phone, made when the phone believed the field was at <base_version>.
> 
> Sync: first apply ALL REMOTE changes (in input order), then replay the LOCAL edits in input order. A missing field has version 0. A local edit APPLIES if its base_version equals the field's current version, or if the field's current version was produced by this phone's own previous applied edit during this replay (the phone is building on its own write). When it applies, the field takes the value and its version increases by 1. Otherwise it is a conflict and the server value is kept.
> 
> Output: for each LOCAL edit in order, "APPLIED <field>" or "CONFLICT <field> server=<current server value or ->". Then "STATE <field>=<value>@<version>" for every field, sorted by field name.

**Tests**: 6 (1 visible, 5 hidden): basic; own consecutive edits rebase *(hidden)*; remote change between own edits order *(hidden)*; new fields and remote-only fields *(hidden)*; conflict then later own edit *(hidden)*; remote line listed after the local edit still happened first *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| interleaves in input order | remote change between own edits order, remote line listed after the local edit still happened first |
| last write wins | basic, remote change between own edits order, new fields and remote-only fields, conflict then later own edit, remote line listed after the local edit still happened first |
| no rebase on own writes | own consecutive edits rebase, conflict then later own edit |
| remote keeps version | basic, remote change between own edits order, new fields and remote-only fields, conflict then later own edit, remote line listed after the local edit still happened first |

**Expected probe answers to check**

- **conflict policy** — *Why not simply let the last write win?*  
  Strong: Last-write-wins silently destroys another device's change; version checks (optimistic concurrency) detect the conflict so the app can show it, merge, or ask the user. Mentions field-level vs document-level granularity and CRDTs/three-way merge as richer options.  
  Weak signals: Thinks overwriting is fine because the phone is the newest.
- **rebasing own edits** — *Two queued edits on the same field both say base_version 3. Why does the second one apply?*  
  Strong: The second edit was made on top of the phone's own first edit; after the first applies the version moved because of us, not another device, so it is not a real conflict. Without this, every multi-edit offline session would self-conflict. Alternative: coalesce the queue to the last edit per field.  
  Weak signals: Cannot explain why the second edit is not a conflict.
- **ordering** — *Why apply all remote changes before replaying local ones?*  
  Strong: Remote changes happened on the server while the phone was offline — they precede the phone's sync in server time; interleaving by line order would pretend the phone was online.  
  Weak signals: Processes in input order without thinking about time.
- **user experience** — *What should the user see on a conflict?*  
  Strong: Do not lose their text: keep a local copy, show the server version, offer keep-mine / keep-theirs / merge; make sync status visible; retry safely (idempotent mutations with ids).  
  Weak signals: Drops the local edit silently.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?

---

## Evaluate a multi-class classifier

**Key** `ml-mid-classifier-metrics` · **Roles** ml, data · **Level** mid (1–7 yrs) · **Time** ~12 min · **Languages** python, javascript, java, cpp

**Prompt (as the candidate sees it)**

> Before a model ships, you report per-class errors and a summary score on the held-out set.
> 
> Input (stdin): one prediction per line: "<true_label> <predicted_label>" (labels are single tokens). Ignore lines that do not have exactly two tokens. If there are no valid lines print "no_data".
> 
> Classes are all labels that appear as either a true or a predicted label. For each class c, sorted alphabetically, print "<c> tp=<n> fp=<n> fn=<n>" where tp = true c predicted c, fp = predicted c but true label differs, fn = true c but predicted something else.
> 
> Then print:
> accuracy_permille=<floor(1000 × correct / total)>
> macro_f1_permille=<floor(1000 × macro F1)>
> where macro F1 is the unweighted mean over all classes of F1_c = 2·tp / (2·tp + fp + fn).
> 
> Compute exactly (no rounding before the final floor).

**Tests**: 8 (1 visible, 7 hidden): basic; predicted-only class counts *(hidden)*; imbalanced classes (macro ≠ micro) *(hidden)*; malformed lines and single class *(hidden)*; empty input *(hidden)*; floor sits just below a boundary *(hidden)*; never-true label still scored *(hidden)*; two-thirds boundary floors down *(hidden)*

**Mistakes the tests catch** (mutation testing)

| Deliberately wrong solution | Caught by |
|---|---|
| classes from truth only | predicted-only class counts, never-true label still scored |
| f1 of macro p r | basic, predicted-only class counts, imbalanced classes (macro ≠ micro), two-thirds boundary floors down |
| micro f1 | basic, predicted-only class counts, imbalanced classes (macro ≠ micro), never-true label still scored |
| rounds instead of floor | imbalanced classes (macro ≠ micro), two-thirds boundary floors down |

**Expected probe answers to check**

- **macro vs micro averaging** — *Why report macro F1 rather than micro F1 or accuracy?*  
  Strong: Macro weights every class equally, so poor performance on rare classes is visible; micro/accuracy are dominated by frequent classes (in single-label multi-class micro F1 equals accuracy). Chooses based on whether rare classes matter for the product.  
  Weak signals: Thinks they are the same, or cannot say when each is appropriate.
- **predicted-only classes** — *A label appears only in predictions, never in the ground truth. Does it count, and why?*  
  Strong: Yes — it is a real class the model emits; its F1 is 0 (all false positives) and ignoring it hides a failure mode.  
  Weak signals: Only iterates over true labels.
- **exact arithmetic** — *Why did you avoid floating point (or how did you handle it)?*  
  Strong: Floors at exact boundaries can flip with float error; fractions or integer cross-multiplication give deterministic results; otherwise round only at presentation.  
  Weak signals: No awareness of float error.
- **beyond the numbers** — *What else would you check before shipping this model?*  
  Strong: Confusion matrix patterns, per-segment metrics (fairness/slices), calibration, class imbalance and threshold choice, confidence intervals on a small test set, and data leakage.  
  Weak signals: Only the headline number.

**Questions for the reviewer**

- [ ] Realistic for this level?  - [ ] Prompt unambiguous?  - [ ] Probe answers right for our stack?  - [ ] Rubric weights right?  - [ ] Every hidden test follows from the written rules?
