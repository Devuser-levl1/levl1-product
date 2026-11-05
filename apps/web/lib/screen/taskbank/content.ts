// ── Levl1 starter content (Screen-scoped) — GENERATED, do not hand-edit ──────
// Task-bank drafts + role skill maps that agencies load with "Load Levl1
// starter content". Every task was machine-checked before it was written here:
//   • expected outputs come from RUNNING the reference solution
//   • an independent second solution agrees on every test
//   • 3–5 deliberately wrong solutions ("mutants") are each caught by ≥2 tests,
//     at least one of them hidden (see qa.mutants[].caughtBy)
// That is NOT a human review. Tasks load as DRAFT and must be reviewed by
// someone who hires for the role before they can be activated.
// SQL tasks: SQLite 3.27 syntax; each test's input is setup SQL.

export interface StarterTask {
  key: string; legacyTitle: string | null; title: string; prompt: string; roles: string[]; skills: string[]
  difficulty: string; experienceMin: number; experienceMax: number; languages: string[]
  starterCode: Record<string, string>
  tests: { id: string; name: string; input: string; expected: string; hidden: boolean }[]
  referenceSolution: string; referenceLanguage: string; minutes: number
  rubric: { criteria: unknown[]; probes: unknown[] }
  qa: { independentSolutions: string[]; testsAgree: number; mutants: { name: string; caughtBy: string[] }[]; checkedOn: string }
}

export const STARTER_TASKS: StarterTask[] = [
 {
  "key": "backend-junior-access-log",
  "legacyTitle": null,
  "title": "API access-log summary",
  "prompt": "On-call asked for a quick summary of an API's access log.\n\nInput (stdin): one request per line: \"<METHOD> <PATH> <STATUS> <LATENCY_MS>\", e.g. \"GET /orders?page=2 200 35\". Blank lines are ignored. A line is malformed if it does not have exactly 4 fields, METHOD is not one of GET POST PUT PATCH DELETE, PATH does not start with \"/\", STATUS is not an integer from 100 to 599, or LATENCY_MS is not a non-negative integer.\n\nOutput (stdout):\nrequests=<valid requests>\nerrors_4xx=<valid requests with status 400-499>\nerrors_5xx=<valid requests with status 500-599>\nskipped=<malformed lines>\nthen up to 3 lines \"<path> <count>\" for the most requested paths, ignoring any query string (the part from \"?\"), sorted by count descending, then path ascending.\n\nExample: the lines \"GET /a 200 5\", \"GET /a?x=1 500 9\", \"POST /b 404 3\" print requests=3, errors_4xx=1, errors_5xx=1, skipped=0, \"/a 2\", \"/b 1\".",
  "roles": [
   "backend",
   "fullstack",
   "devops"
  ],
  "skills": [
   "data-structures",
   "error-handling",
   "observability"
  ],
  "difficulty": "junior",
  "experienceMin": 0,
  "experienceMax": 3,
  "languages": [
   "python",
   "javascript",
   "typescript",
   "java",
   "cpp",
   "go"
  ],
  "starterCode": {
   "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # TODO: your solution\n\nmain()\n",
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "typescript": "import * as fs from 'fs'\nconst lines: string[] = fs.readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String line; (line = in.readLine()) != null; ) lines.add(line);\n        // TODO: your solution\n    }\n}\n",
   "cpp": "#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<string> lines;\n    for (string line; getline(cin, line); ) lines.push_back(line);\n    // TODO: your solution\n    return 0;\n}\n",
   "go": "package main\n\nimport (\n\t\"bufio\"\n\t\"os\"\n)\n\nfunc main() {\n\tsc := bufio.NewScanner(os.Stdin)\n\tvar lines []string\n\tfor sc.Scan() {\n\t\tlines = append(lines, sc.Text())\n\t}\n\t_ = lines // TODO: your solution\n}\n"
  },
  "minutes": 10,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "GET /orders 200 35\nGET /orders?page=2 200 41\nPOST /orders 201 88\nGET /health 200 2\nGET /users/7 404 12",
    "expected": "requests=5\nerrors_4xx=1\nerrors_5xx=0\nskipped=0\n/orders 3\n/health 1\n/users/7 1",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "query strings are grouped",
    "input": "GET /search?q=a 200 5\nGET /search?q=b 500 7\nGET /search 200 6\nGET /a 200 1\nGET /a?x=1 200 1",
    "expected": "requests=5\nerrors_4xx=0\nerrors_5xx=1\nskipped=0\n/search 3\n/a 2",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "ties sort by path",
    "input": "GET /zeta 200 1\nGET /alpha 200 1\nGET /mid 200 1\nGET /beta 200 1\nGET /zeta 200 1\nGET /alpha 503 9",
    "expected": "requests=6\nerrors_4xx=0\nerrors_5xx=1\nskipped=0\n/alpha 2\n/zeta 2\n/beta 1",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "malformed lines",
    "input": "GET /ok 200 10\nFETCH /x 200 1\nGET /x 700 1\nGET /x 200 -4\nGET /x 200\nGET x 200 1\n\nDELETE /ok 500 3\nGET /x two 1",
    "expected": "requests=2\nerrors_4xx=0\nerrors_5xx=1\nskipped=6\n/ok 2",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "empty input",
    "input": "",
    "expected": "requests=0\nerrors_4xx=0\nerrors_5xx=0\nskipped=0",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "status range edges and garbage",
    "input": "GET /a 100 1\nGET /a 599 1\nGET /b 99 1\nGET /b 600 1\nPUT /c 418 2\nnot a log line\nPATCH /c 204 3\nPATCH /d 204 3\nGET /d 204 3",
    "expected": "requests=6\nerrors_4xx=1\nerrors_5xx=1\nskipped=3\n/a 2\n/c 2\n/d 2",
    "hidden": true
   },
   {
    "id": "t7",
    "name": "all tied, unsorted arrival",
    "input": "GET /m 200 1\nGET /c 200 1\nGET /x 200 1\nGET /b 200 1",
    "expected": "requests=4\nerrors_4xx=0\nerrors_5xx=0\nskipped=0\n/b 1\n/c 1\n/m 1",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\nfrom collections import Counter\n\nMETHODS = {'GET', 'POST', 'PUT', 'PATCH', 'DELETE'}\n\ndef parse(line):\n    parts = line.split()\n    if len(parts) != 4:\n        return None\n    method, path, status, latency = parts\n    if method not in METHODS or not path.startswith('/'):\n        return None\n    if not (status.isdigit() and latency.isdigit()):\n        return None\n    status = int(status)\n    if not 100 <= status <= 599:\n        return None\n    return method, path.split('?', 1)[0], status\n\ndef main():\n    paths = Counter()\n    total = e4 = e5 = skipped = 0\n    for raw in sys.stdin.read().split('\\n'):\n        if not raw.strip():\n            continue\n        rec = parse(raw)\n        if rec is None:\n            skipped += 1\n            continue\n        _, path, status = rec\n        total += 1\n        e4 += 400 <= status <= 499\n        e5 += status >= 500\n        paths[path] += 1\n    print(f'requests={total}')\n    print(f'errors_4xx={e4}')\n    print(f'errors_5xx={e5}')\n    print(f'skipped={skipped}')\n    for path, n in sorted(paths.items(), key=lambda kv: (-kv[1], kv[0]))[:3]:\n        print(f'{path} {n}')\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "All four counters exact; top paths grouped without query strings with the stated tie-break.",
     "weak": "Counts malformed lines as requests, or groups \"/a\" and \"/a?x=1\" separately.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Validates every field (method set, status range, numeric latency); blank lines ignored; empty input prints zeros.",
     "weak": "Crashes on a short line or a non-numeric status.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "efficiency",
     "strong": "Single pass with a hash map; sorts only the distinct paths.",
     "weak": "Re-scans the log per path.",
     "weight": 1
    },
    {
     "id": "c4",
     "dimension": "code_quality",
     "strong": "Validation in its own small function with readable names.",
     "weak": "Deeply nested conditions in the main loop.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "structure",
     "strong": "Parse → validate → aggregate → report as clear steps.",
     "weak": "Printing mixed into parsing.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "grouping paths",
     "question": "Why strip the query string before counting paths?",
     "strongAnswer": "The query string is parameters, not a different endpoint; grouping by route gives meaningful hot paths. Mentions that path params (/orders/123) may need normalising too in a real system.",
     "weakSignals": "Did not notice query strings, or cannot explain why they matter."
    },
    {
     "id": "p2",
     "decision": "malformed-line handling",
     "question": "What does your code do with a line it cannot parse, and why?",
     "strongAnswer": "Skips and counts it so the summary is still produced and the data-quality problem is visible; does not crash the whole report on one bad line.",
     "weakSignals": "Crashes, or silently drops lines without counting."
    },
    {
     "id": "p3",
     "decision": "tie-breaking",
     "question": "Two paths have the same count — which comes first and how does your sort guarantee it?",
     "strongAnswer": "Path ascending, via a composite sort key (count desc, path asc); explains that without it the order depends on insertion/hash order.",
     "weakSignals": "Unaware the order is otherwise unstable."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 7,
   "mutants": [
    {
     "name": "keeps query string",
     "caughtBy": [
      "basic",
      "query strings are grouped"
     ]
    },
    {
     "name": "no status range",
     "caughtBy": [
      "malformed lines",
      "status range edges and garbage"
     ]
    },
    {
     "name": "skipped counted as requests",
     "caughtBy": [
      "malformed lines",
      "status range edges and garbage"
     ]
    },
    {
     "name": "tie by insertion",
     "caughtBy": [
      "ties sort by path",
      "all tied, unsorted arrival"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "backend-mid-rate-limiter",
  "legacyTitle": "Per-client rate limiter (SAMPLE)",
  "title": "Per-client rate limiter",
  "prompt": "You are adding rate limiting in front of a public API.\n\nInput (stdin): the first line is \"N W\" — each client may make at most N ALLOWED requests in any sliding window of W seconds. Each following line is \"<client_id> <timestamp>\" (integer seconds, non-decreasing).\n\nFor every request print ALLOW or DENY on its own line. A request is allowed if, counting only previously ALLOWED requests from the same client with timestamp t' where t - W < t' <= t, fewer than N exist. Denied requests do not count toward the limit.\n\nExample: with \"2 10\", requests from client a at 1, 2, 3, 11 are ALLOW, ALLOW, DENY, ALLOW.",
  "roles": [
   "backend",
   "fullstack"
  ],
  "skills": [
   "rate-limiting",
   "data-structures",
   "api-design"
  ],
  "difficulty": "mid",
  "experienceMin": 2,
  "experienceMax": 8,
  "languages": [
   "python",
   "javascript",
   "typescript",
   "java",
   "go",
   "cpp"
  ],
  "starterCode": {
   "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split(\"\\n\")\n    n, w = map(int, lines[0].split())\n    # TODO: decide ALLOW / DENY for each request\n\nmain()\n",
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\nconst [n, w] = lines[0].split(' ').map(Number)\n// TODO: decide ALLOW / DENY for each request\n",
   "typescript": "import * as fs from 'fs'\nconst lines: string[] = fs.readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String line; (line = in.readLine()) != null; ) lines.add(line);\n        // TODO: your solution\n    }\n}\n",
   "go": "package main\n\nimport (\n\t\"bufio\"\n\t\"os\"\n)\n\nfunc main() {\n\tsc := bufio.NewScanner(os.Stdin)\n\tvar lines []string\n\tfor sc.Scan() {\n\t\tlines = append(lines, sc.Text())\n\t}\n\t_ = lines // TODO: your solution\n}\n",
   "cpp": "#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<string> lines;\n    for (string line; getline(cin, line); ) lines.push_back(line);\n    // TODO: your solution\n    return 0;\n}\n"
  },
  "minutes": 12,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "2 10\na 1\na 2\na 3\na 11\nb 3",
    "expected": "ALLOW\nALLOW\nDENY\nALLOW\nALLOW",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "window boundary is exclusive",
    "input": "1 5\nx 0\nx 5\nx 9\nx 10",
    "expected": "ALLOW\nALLOW\nDENY\nALLOW",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "denied requests do not count",
    "input": "2 3\nc 1\nc 1\nc 2\nc 3\nc 4",
    "expected": "ALLOW\nALLOW\nDENY\nDENY\nALLOW",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "independent clients",
    "input": "1 100\na 1\nb 1\na 50\nb 101\na 101",
    "expected": "ALLOW\nALLOW\nDENY\nALLOW\nALLOW",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "window spans a fixed-bucket edge",
    "input": "2 10\na 8\na 9\na 11\na 19\na 21",
    "expected": "ALLOW\nALLOW\nDENY\nALLOW\nALLOW",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "many clients interleaved",
    "input": "1 3\nu1 0\nu2 0\nu1 1\nu3 2\nu2 3\nu1 3\nu3 4\nu3 5",
    "expected": "ALLOW\nALLOW\nDENY\nALLOW\nALLOW\nALLOW\nDENY\nALLOW",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\nfrom collections import deque, defaultdict\n\ndef main():\n    data = sys.stdin.read().split('\\n')\n    first = data[0].split()\n    n, w = int(first[0]), int(first[1])\n    allowed = defaultdict(deque)   # client -> timestamps of ALLOWED requests\n    out = []\n    for line in data[1:]:\n        parts = line.split()\n        if len(parts) != 2:\n            continue\n        client, t = parts[0], int(parts[1])\n        q = allowed[client]\n        while q and q[0] <= t - w:      # window is (t - w, t]\n            q.popleft()\n        if len(q) < n:\n            q.append(t)\n            out.append('ALLOW')\n        else:\n            out.append('DENY')\n    print('\\n'.join(out))\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Exactly the sliding-window semantics: window (t-W, t], only ALLOWED requests counted, per-client state.",
     "weak": "Fixed windows, counts denied requests, or shares one counter across clients.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "efficiency",
     "strong": "Per-client queue/deque with amortised O(1) eviction; memory bounded by N per client.",
     "weak": "Rescans every past request for each new one (O(n²)) or keeps unbounded history.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "edge_cases",
     "strong": "Handles the exact window boundary, many clients, bursts at the same timestamp.",
     "weak": "Off-by-one on the boundary; breaks when timestamps repeat.",
     "weight": 2
    },
    {
     "id": "c4",
     "dimension": "code_quality",
     "strong": "Clear names, small helper for the decision, no dead code.",
     "weak": "Monolithic loop with magic indexes and unclear state.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "structure",
     "strong": "Separates parsing from the limiter logic so the limiter could be reused or tested alone.",
     "weak": "Parsing, state and output tangled together.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "data structure for per-client history",
     "question": "Why did you use this structure to track each client's requests?",
     "strongAnswer": "A per-client queue (deque) of allowed timestamps: evict from the front as the window moves, so each request is O(1) amortised and memory is bounded by N per client. Mentions why a plain list scan or a single counter is wrong.",
     "weakSignals": "Cannot say what is stored or why; claims a single counter works; unaware of growth."
    },
    {
     "id": "p2",
     "decision": "window boundary",
     "question": "Is a request exactly W seconds after an earlier one inside or outside the window, and how does your code decide?",
     "strongAnswer": "Outside — the window is (t-W, t], so entries with timestamp <= t-W are evicted. Points to the exact comparison in their code.",
     "weakSignals": "Unsure, or says it does not matter."
    },
    {
     "id": "p3",
     "decision": "denied requests",
     "question": "Should a denied request count against the client? Why?",
     "strongAnswer": "No — counting denials would let a client lock itself out permanently under sustained retries; only allowed requests consume quota.",
     "weakSignals": "Counts everything without considering retry storms."
    },
    {
     "id": "p4",
     "decision": "production / scale",
     "question": "How would this change across multiple API servers?",
     "strongAnswer": "Shared state (e.g. Redis sorted set or token bucket with atomic Lua/INCR + TTL), accepts some approximation (sliding-log vs sliding-window counter vs token bucket) and discusses clock skew.",
     "weakSignals": "Keeps in-process state and assumes one server."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 6,
   "mutants": [
    {
     "name": "counts denied",
     "caughtBy": [
      "basic",
      "window boundary is exclusive",
      "denied requests do not count",
      "independent clients",
      "many clients interleaved"
     ]
    },
    {
     "name": "fixed window",
     "caughtBy": [
      "denied requests do not count",
      "window spans a fixed-bucket edge",
      "many clients interleaved"
     ]
    },
    {
     "name": "global counter",
     "caughtBy": [
      "basic",
      "independent clients",
      "many clients interleaved"
     ]
    },
    {
     "name": "inclusive boundary",
     "caughtBy": [
      "basic",
      "window boundary is exclusive",
      "denied requests do not count",
      "independent clients",
      "many clients interleaved"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "backend-senior-idempotent-charges",
  "legacyTitle": null,
  "title": "Idempotent payment charges",
  "prompt": "Mobile clients retry payment requests when the network drops, so the charge endpoint must be idempotent: a retried request must never charge twice.\n\nInput (stdin), one command per line:\n- \"ACCOUNT <id> <balance_cents>\" creates an account (ignore it if the id already exists).\n- \"CREDIT <id> <amount_cents>\" adds money (ignore unknown accounts; no output).\n- \"CHARGE <idempotency_key> <account> <amount_cents>\" requests a charge.\n\nFor each CHARGE print one line:\n- First time a key is seen: \"ERROR unknown_account\" if the account does not exist, else \"ERROR invalid_amount\" if amount <= 0, else \"DECLINED insufficient_funds\" if the balance is lower than the amount, else deduct and print \"OK <new_balance>\".\n- Key seen before with the SAME account and amount: print exactly the response that was returned the first time (do not re-execute — even if the balance has changed since).\n- Key seen before with a DIFFERENT account or amount: print \"CONFLICT\".\n\nAfter all commands print \"BALANCE <id> <balance>\" for every account, sorted by id.",
  "roles": [
   "backend"
  ],
  "skills": [
   "api-design",
   "error-handling",
   "distributed-systems"
  ],
  "difficulty": "senior",
  "experienceMin": 6,
  "experienceMax": 40,
  "languages": [
   "python",
   "javascript",
   "typescript",
   "java",
   "cpp",
   "go"
  ],
  "starterCode": {
   "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # TODO: your solution\n\nmain()\n",
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "typescript": "import * as fs from 'fs'\nconst lines: string[] = fs.readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String line; (line = in.readLine()) != null; ) lines.add(line);\n        // TODO: your solution\n    }\n}\n",
   "cpp": "#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<string> lines;\n    for (string line; getline(cin, line); ) lines.push_back(line);\n    // TODO: your solution\n    return 0;\n}\n",
   "go": "package main\n\nimport (\n\t\"bufio\"\n\t\"os\"\n)\n\nfunc main() {\n\tsc := bufio.NewScanner(os.Stdin)\n\tvar lines []string\n\tfor sc.Scan() {\n\t\tlines = append(lines, sc.Text())\n\t}\n\t_ = lines // TODO: your solution\n}\n"
  },
  "minutes": 15,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "ACCOUNT acc1 10000\nCHARGE k1 acc1 2500\nCHARGE k2 acc1 1000\nCHARGE k1 acc1 2500",
    "expected": "OK 7500\nOK 6500\nOK 7500\nBALANCE acc1 6500",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "retry after balance changes replays the original",
    "input": "ACCOUNT a 5000\nCHARGE k1 a 3000\nCREDIT a 9000\nCHARGE k1 a 3000\nCHARGE k2 a 100",
    "expected": "OK 2000\nOK 2000\nOK 10900\nBALANCE a 10900",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "declined stays declined on retry",
    "input": "ACCOUNT a 1000\nCHARGE k1 a 5000\nCREDIT a 10000\nCHARGE k1 a 5000\nCHARGE k2 a 5000",
    "expected": "DECLINED insufficient_funds\nDECLINED insufficient_funds\nOK 6000\nBALANCE a 6000",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "conflicting payloads",
    "input": "ACCOUNT a 9000\nACCOUNT b 9000\nCHARGE k1 a 100\nCHARGE k1 a 200\nCHARGE k1 b 100\nCHARGE k1 a 100",
    "expected": "OK 8900\nCONFLICT\nCONFLICT\nOK 8900\nBALANCE a 8900\nBALANCE b 9000",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "errors and duplicate accounts",
    "input": "ACCOUNT a 500\nACCOUNT a 999999\nCHARGE k1 ghost 10\nCHARGE k2 a 0\nCHARGE k3 a -5\nCHARGE k1 ghost 10\nCREDIT ghost 100\nCHARGE k4 a 500",
    "expected": "ERROR unknown_account\nERROR invalid_amount\nERROR invalid_amount\nERROR unknown_account\nOK 0\nBALANCE a 0",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "mixed retries, conflicts and redefinition",
    "input": "ACCOUNT z 300\nACCOUNT y 100\nCHARGE r1 y 150\nCREDIT y 100\nCHARGE r1 y 150\nCHARGE r1 y 151\nACCOUNT y 0\nCHARGE r2 y 150\nCHARGE r2 z 150\nCHARGE r3 z 300",
    "expected": "DECLINED insufficient_funds\nDECLINED insufficient_funds\nCONFLICT\nOK 50\nCONFLICT\nOK 0\nBALANCE y 50\nBALANCE z 0",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\n\ndef main():\n    balances = {}\n    results = {}   # idempotency key -> ((account, amount), response)\n    out = []\n    for raw in sys.stdin.read().split('\\n'):\n        p = raw.split()\n        if not p:\n            continue\n        cmd = p[0]\n        if cmd == 'ACCOUNT' and len(p) == 3:\n            balances.setdefault(p[1], int(p[2]))\n        elif cmd == 'CREDIT' and len(p) == 3:\n            if p[1] in balances:\n                balances[p[1]] += int(p[2])\n        elif cmd == 'CHARGE' and len(p) == 4:\n            key, account, amount = p[1], p[2], int(p[3])\n            payload = (account, amount)\n            if key in results:\n                stored_payload, response = results[key]\n                out.append(response if stored_payload == payload else 'CONFLICT')\n                continue\n            if account not in balances:\n                response = 'ERROR unknown_account'\n            elif amount <= 0:\n                response = 'ERROR invalid_amount'\n            elif balances[account] < amount:\n                response = 'DECLINED insufficient_funds'\n            else:\n                balances[account] -= amount\n                response = f'OK {balances[account]}'\n            results[key] = (payload, response)\n            out.append(response)\n    for acc in sorted(balances):\n        out.append(f'BALANCE {acc} {balances[acc]}')\n    print('\\n'.join(out))\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Retries replay the stored response verbatim (including errors/declines); never double-charges; payload mismatch is a CONFLICT.",
     "weak": "Re-executes retries, so a retry after a top-up succeeds or charges twice.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Handles retry after balance changes, declined-then-funded retries, duplicate ACCOUNT lines, unknown accounts.",
     "weak": "Only the happy path works.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "structure",
     "strong": "Clear separation between the idempotency layer (key → payload, response) and the business operation.",
     "weak": "Idempotency checks scattered through the charge logic.",
     "weight": 2
    },
    {
     "id": "c4",
     "dimension": "efficiency",
     "strong": "O(1) lookups per command with hash maps.",
     "weak": "Linear scans of past requests.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "code_quality",
     "strong": "Named result strings / small functions; easy to extend with new error types.",
     "weak": "Magic strings duplicated across branches.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "store the response vs re-execute",
     "question": "On a retry, why return the stored response instead of running the charge again?",
     "strongAnswer": "Idempotency means the same request yields the same effect AND the same answer; re-executing could double-charge or give a different answer if state changed (e.g. a decline turning into success after a top-up). Store the first outcome and replay it.",
     "weakSignals": "Thinks checking \"already charged\" is enough; does not consider declines or changed balances."
    },
    {
     "id": "p2",
     "decision": "payload mismatch",
     "question": "What should happen when the same key arrives with a different amount, and why?",
     "strongAnswer": "Reject as a conflict (HTTP 409/422 style) — it is a client bug or key reuse; silently replaying or executing would be wrong either way.",
     "weakSignals": "Executes it as a new charge or replays the old response."
    },
    {
     "id": "p3",
     "decision": "caching failures",
     "question": "Do you cache error and declined responses too?",
     "strongAnswer": "Yes, for deterministic outcomes the client asked about — otherwise a retry could succeed later and charge unexpectedly. Discusses NOT caching transient server failures (5xx/timeouts) so they can be retried.",
     "weakSignals": "Only caches successes without considering the consequence."
    },
    {
     "id": "p4",
     "decision": "production design",
     "question": "How would this work with several API servers and a crash mid-charge?",
     "strongAnswer": "Persist key + request hash + status in the database in the same transaction as the charge (or a unique constraint with an in-progress state), TTL for keys, return 409/retry-later while in progress, and handle concurrent duplicate requests atomically.",
     "weakSignals": "Keeps an in-memory map and assumes one server."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 6,
   "mutants": [
    {
     "name": "account redefinition resets",
     "caughtBy": [
      "errors and duplicate accounts",
      "mixed retries, conflicts and redefinition"
     ]
    },
    {
     "name": "no conflict check",
     "caughtBy": [
      "conflicting payloads",
      "mixed retries, conflicts and redefinition"
     ]
    },
    {
     "name": "only caches success",
     "caughtBy": [
      "declined stays declined on retry",
      "mixed retries, conflicts and redefinition"
     ]
    },
    {
     "name": "reexecutes on retry",
     "caughtBy": [
      "basic",
      "retry after balance changes replays the original",
      "declined stays declined on retry",
      "conflicting payloads",
      "mixed retries, conflicts and redefinition"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "data-junior-sql-revenue",
  "legacyTitle": null,
  "title": "Monthly paid revenue by country (SQL)",
  "prompt": "Finance wants a monthly revenue breakdown by country.\n\nTables (SQLite):\n- customers(id INTEGER, country TEXT)\n- orders(id INTEGER, customer_id INTEGER, ordered_at TEXT \"YYYY-MM-DD\", amount_cents INTEGER, status TEXT — \"paid\", \"refunded\" or \"pending\")\n\nWrite one query that returns, for every country and month with at least one PAID order: country, month (YYYY-MM), the number of paid orders, and total paid revenue in cents. Ignore refunded and pending orders, and ignore orders whose customer does not exist. Sort by month ascending, then revenue descending, then country ascending.\n\nThe output format is SQLite's default: columns separated by \"|\", no header. Use SQLite 3.27-compatible SQL.",
  "roles": [
   "data"
  ],
  "skills": [
   "sql",
   "aggregation",
   "data-quality"
  ],
  "difficulty": "junior",
  "experienceMin": 0,
  "experienceMax": 3,
  "languages": [
   "sql"
  ],
  "starterCode": {
   "sql": "-- Tables: customers(id, country), orders(id, customer_id, ordered_at 'YYYY-MM-DD', amount_cents, status)\n-- Write ONE query. Output columns: country | month (YYYY-MM) | orders | revenue_cents\nSELECT 1;\n"
  },
  "minutes": 10,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "CREATE TABLE customers (id INTEGER PRIMARY KEY, country TEXT NOT NULL);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, ordered_at TEXT, amount_cents INTEGER, status TEXT);\nINSERT INTO customers VALUES (1, 'IN'), (2, 'US'), (3, 'IN');\nINSERT INTO orders VALUES (1, 1, '2026-01-05', 1000, 'paid'), (2, 2, '2026-01-09', 2500, 'paid'), (3, 3, '2026-01-20', 700, 'paid'), (4, 1, '2026-02-01', 300, 'paid');\n",
    "expected": "US|2026-01|1|2500\nIN|2026-01|2|1700\nIN|2026-02|1|300",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "refunded and pending excluded",
    "input": "CREATE TABLE customers (id INTEGER PRIMARY KEY, country TEXT NOT NULL);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, ordered_at TEXT, amount_cents INTEGER, status TEXT);\nINSERT INTO customers VALUES (1, 'DE'), (2, 'FR');\nINSERT INTO orders VALUES (1, 1, '2026-03-01', 5000, 'refunded'), (2, 1, '2026-03-02', 1200, 'paid'), (3, 2, '2026-03-03', 900, 'pending'), (4, 2, '2026-03-04', 400, 'paid'), (5, 2, '2026-03-05', 100, 'refunded');\n",
    "expected": "DE|2026-03|1|1200\nFR|2026-03|1|400",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "orphan orders ignored",
    "input": "CREATE TABLE customers (id INTEGER PRIMARY KEY, country TEXT NOT NULL);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, ordered_at TEXT, amount_cents INTEGER, status TEXT);\nINSERT INTO customers VALUES (1, 'IN');\nINSERT INTO orders VALUES (1, 1, '2026-04-01', 100, 'paid'), (2, 99, '2026-04-02', 99999, 'paid'), (3, 1, '2026-04-03', 50, 'paid');\n",
    "expected": "IN|2026-04|2|150",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "ties and sort order",
    "input": "CREATE TABLE customers (id INTEGER PRIMARY KEY, country TEXT NOT NULL);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, ordered_at TEXT, amount_cents INTEGER, status TEXT);\nINSERT INTO customers VALUES (1, 'BR'), (2, 'AU'), (3, 'CA'), (4, 'AU');\nINSERT INTO orders VALUES (1, 1, '2026-05-10', 500, 'paid'), (2, 2, '2026-05-11', 500, 'paid'), (3, 3, '2026-04-30', 100, 'paid'), (4, 4, '2026-05-12', 800, 'paid'), (5, 1, '2026-05-13', 800, 'paid');\n",
    "expected": "CA|2026-04|1|100\nAU|2026-05|2|1300\nBR|2026-05|2|1300",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "repeat customers count every order",
    "input": "CREATE TABLE customers (id INTEGER PRIMARY KEY, country TEXT NOT NULL);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, ordered_at TEXT, amount_cents INTEGER, status TEXT);\nINSERT INTO customers VALUES (1, 'IN'), (2, 'IN');\nINSERT INTO orders VALUES (1, 1, '2026-06-01', 100, 'paid'), (2, 1, '2026-06-02', 200, 'paid'), (3, 1, '2026-06-03', 300, 'paid'), (4, 2, '2026-06-04', 50, 'paid');\n",
    "expected": "IN|2026-06|4|650",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "mixed month with refunds, orphans and ties",
    "input": "CREATE TABLE customers (id INTEGER PRIMARY KEY, country TEXT NOT NULL);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, ordered_at TEXT, amount_cents INTEGER, status TEXT);\nINSERT INTO customers VALUES (1, 'SG'), (2, 'AE'), (3, 'NZ');\nINSERT INTO orders VALUES (1, 1, '2026-07-01', 400, 'paid'), (2, 2, '2026-07-02', 400, 'paid'), (3, 3, '2026-07-03', 300, 'refunded'), (4, 3, '2026-07-04', 1000, 'paid'), (5, 7, '2026-07-05', 5000, 'paid'), (6, 2, '2026-07-06', 600, 'refunded'), (7, 1, '2026-08-01', 10, 'paid');\n",
    "expected": "NZ|2026-07|1|1000\nAE|2026-07|1|400\nSG|2026-07|1|400\nSG|2026-08|1|10",
    "hidden": true
   }
  ],
  "referenceSolution": "SELECT c.country,\n       substr(o.ordered_at, 1, 7) AS month,\n       COUNT(*) AS orders,\n       SUM(o.amount_cents) AS revenue_cents\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country, month\nORDER BY month ASC, revenue_cents DESC, c.country ASC;\n",
  "referenceLanguage": "sql",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Only paid orders, inner join to customers, correct month bucketing, order count (not customer count) and sum.",
     "weak": "Includes refunds, keeps orphan orders, or counts distinct customers.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Orphan orders and non-paid statuses handled deliberately; ties ordered by the stated keys.",
     "weak": "Relies on default ordering; orphans appear with a NULL country.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "efficiency",
     "strong": "Single aggregation pass; filter before grouping; knows an index on (status, ordered_at) or (customer_id) would help at scale.",
     "weak": "Correlated subqueries per row without reason.",
     "weight": 1
    },
    {
     "id": "c4",
     "dimension": "code_quality",
     "strong": "Readable aliases, explicit JOIN, one clear GROUP BY.",
     "weak": "Implicit joins and positional confusion.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "structure",
     "strong": "Filter → join → group → sort, or a clear CTE.",
     "weak": "Hard-to-follow nesting.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "join type",
     "question": "Why an inner join rather than a left join here?",
     "strongAnswer": "Orders without a matching customer have no country, so they cannot be attributed; an inner join drops them (and in real life you would report them as a data-quality issue). A left join would produce a NULL-country group.",
     "weakSignals": "Cannot explain the difference or says it does not matter."
    },
    {
     "id": "p2",
     "decision": "COUNT(*) vs COUNT(DISTINCT customer_id)",
     "question": "What exactly does your orders column count?",
     "strongAnswer": "Paid orders — COUNT(*) after filtering; COUNT(DISTINCT customer_id) would be paying customers, a different metric.",
     "weakSignals": "Mixes up orders and customers."
    },
    {
     "id": "p3",
     "decision": "refunds",
     "question": "How would you report revenue net of refunds instead?",
     "strongAnswer": "Subtract refunded amounts in the month of the refund (needs a refunded_at) or attribute to the original order month — states which and why finance usually wants one convention consistently.",
     "weakSignals": "Just deletes refunded rows without thinking about timing."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "SQL (alternative query)"
   ],
   "testsAgree": 6,
   "mutants": [
    {
     "name": "counts customers",
     "caughtBy": [
      "orphan orders ignored",
      "ties and sort order",
      "repeat customers count every order"
     ]
    },
    {
     "name": "includes refunds",
     "caughtBy": [
      "refunded and pending excluded",
      "mixed month with refunds, orphans and ties"
     ]
    },
    {
     "name": "left join orphans",
     "caughtBy": [
      "orphan orders ignored",
      "mixed month with refunds, orphans and ties"
     ]
    },
    {
     "name": "sort by country",
     "caughtBy": [
      "basic",
      "mixed month with refunds, orphans and ties"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "data-mid-dau",
  "legacyTitle": "Daily active users from a raw event log (SAMPLE)",
  "title": "Daily active users from a raw event log",
  "prompt": "You maintain a small analytics job. Input (stdin) is a raw event log, one event per line: \"<user_id>,<event_name>,<ISO-8601 timestamp>\" (e.g. u1,login,2026-03-01T10:00:00Z). Lines may be out of order and some are malformed.\n\nPrint, sorted by date ascending, one line per day: \"<YYYY-MM-DD>,<number of distinct users active that day>\". Then print a final line \"skipped=<K>\" with the number of malformed lines you skipped. A line is malformed if it does not have exactly three comma-separated fields, the user id is empty, or the timestamp does not start with a valid YYYY-MM-DD date. Ignore blank lines; trim whitespace around fields.",
  "roles": [
   "data",
   "backend"
  ],
  "skills": [
   "data-quality",
   "aggregation",
   "data-structures"
  ],
  "difficulty": "mid",
  "experienceMin": 1,
  "experienceMax": 7,
  "languages": [
   "python",
   "javascript",
   "typescript",
   "java",
   "go"
  ],
  "starterCode": {
   "python": "import sys\n\ndef main():\n    for raw in sys.stdin.read().split(\"\\n\"):\n        pass  # TODO: parse, validate, aggregate\n\nmain()\n",
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "typescript": "import * as fs from 'fs'\nconst lines: string[] = fs.readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String line; (line = in.readLine()) != null; ) lines.add(line);\n        // TODO: your solution\n    }\n}\n",
   "go": "package main\n\nimport (\n\t\"bufio\"\n\t\"os\"\n)\n\nfunc main() {\n\tsc := bufio.NewScanner(os.Stdin)\n\tvar lines []string\n\tfor sc.Scan() {\n\t\tlines = append(lines, sc.Text())\n\t}\n\t_ = lines // TODO: your solution\n}\n"
  },
  "minutes": 10,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "u1,login,2026-03-01T10:00:00Z\nu2,click,2026-03-01T11:00:00Z\nu1,click,2026-03-01T12:00:00Z\nu1,login,2026-03-02T09:00:00Z",
    "expected": "2026-03-01,2\n2026-03-02,1\nskipped=0",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "malformed lines are skipped",
    "input": "u1,login,2026-03-01T10:00:00Z\nbroken line\n,login,2026-03-01T10:00:00Z\nu3,view,not-a-date\nu4,view,2026-03-01",
    "expected": "2026-03-01,2\nskipped=3",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "unsorted input",
    "input": "u9,a,2026-05-03T00:00:00Z\nu1,a,2026-05-01T23:59:59Z\nu2,a,2026-05-02T00:00:00Z\nu1,b,2026-05-01T01:00:00Z",
    "expected": "2026-05-01,1\n2026-05-02,1\n2026-05-03,1\nskipped=0",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "empty input",
    "input": "",
    "expected": "skipped=0",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "whitespace around fields",
    "input": "  u1 , login , 2026-03-01T10:00:00Z  \nu1,login,2026-03-01T11:00:00Z",
    "expected": "2026-03-01,1\nskipped=0",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "invalid date shapes",
    "input": "u1,login,2026/03/01T10:00:00Z\nu2,login,20260301T10:00:00Z\nu3,login,2026-03-01T10:00:00Z\nu4,view,abcd-ef-ghT00",
    "expected": "2026-03-01,1\nskipped=3",
    "hidden": true
   },
   {
    "id": "t7",
    "name": "duplicates across days, unsorted, padded",
    "input": " u2 ,a, 2026-01-03T00:00:00Z\nu1,a,2026-01-01T00:00:00Z\n\nu2,b,2026-01-01T05:00:00Z\nu1 ,c,2026-01-03T09:00:00Z\nu1,a,2026-01-01T22:00:00Z",
    "expected": "2026-01-01,2\n2026-01-03,2\nskipped=0",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\nfrom collections import defaultdict\n\ndef main():\n    days = defaultdict(set)\n    skipped = 0\n    for raw in sys.stdin.read().split('\\n'):\n        line = raw.strip()\n        if not line:\n            continue\n        parts = [p.strip() for p in line.split(',')]\n        if len(parts) != 3 or not parts[0] or len(parts[2]) < 10:\n            skipped += 1\n            continue\n        user, _event, ts = parts\n        day = ts[:10]\n        if not (day[4] == '-' and day[7] == '-' and day.replace('-', '').isdigit()):\n            skipped += 1\n            continue\n        days[day].add(user)\n    for day in sorted(days):\n        print(f\"{day},{len(days[day])}\")\n    print(f\"skipped={skipped}\")\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Distinct users per day (set per date), dates sorted, skipped count exact.",
     "weak": "Counts events instead of distinct users, or does not sort.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Validates field count, empty user and date shape; trims whitespace; ignores blank lines; handles empty input.",
     "weak": "Crashes on a malformed line or silently counts it.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "efficiency",
     "strong": "Single pass, O(events) time, memory proportional to distinct (day, user) pairs.",
     "weak": "Re-reads or sorts the whole log repeatedly.",
     "weight": 1
    },
    {
     "id": "c4",
     "dimension": "code_quality",
     "strong": "Validation isolated in a small function with a clear rule.",
     "weak": "Nested ad-hoc checks that are hard to read.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "structure",
     "strong": "Parse → validate → aggregate → output as distinct steps.",
     "weak": "Everything in one loop with prints mixed in.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "how distinct users are counted",
     "question": "How does your code make sure a user is counted once per day?",
     "strongAnswer": "A set of user ids per date (dict of sets / defaultdict(set)); duplicates collapse naturally. Can explain memory cost and alternatives (HyperLogLog at scale).",
     "weakSignals": "Counts lines, or de-duplicates globally instead of per day."
    },
    {
     "id": "p2",
     "decision": "malformed-line policy",
     "question": "Why skip malformed lines instead of failing the whole job?",
     "strongAnswer": "Raw logs are dirty; one bad line should not drop a day of metrics. Skip, count and surface the number (or log samples) so data quality is visible; fail only if the skip rate crosses a threshold.",
     "weakSignals": "Never considered it, or would silently drop without counting."
    },
    {
     "id": "p3",
     "decision": "time zones",
     "question": "Which timezone defines \"a day\" in your output?",
     "strongAnswer": "Uses the timestamp's date as given (UTC here) and notes that business reporting may need a fixed timezone conversion before bucketing.",
     "weakSignals": "Unaware that the bucket depends on timezone."
    },
    {
     "id": "p4",
     "decision": "scale",
     "question": "What changes if the log is 500 GB a day?",
     "strongAnswer": "Streams instead of loading everything; partition by date; distributed group-by (Spark/SQL COUNT(DISTINCT)) or approximate distinct counts; incremental daily runs with late-data handling.",
     "weakSignals": "Loads everything into memory on one machine."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 7,
   "mutants": [
    {
     "name": "counts events",
     "caughtBy": [
      "basic",
      "unsorted input",
      "whitespace around fields",
      "duplicates across days, unsorted, padded"
     ]
    },
    {
     "name": "no trim",
     "caughtBy": [
      "whitespace around fields",
      "duplicates across days, unsorted, padded"
     ]
    },
    {
     "name": "no validation",
     "caughtBy": [
      "malformed lines are skipped",
      "invalid date shapes"
     ]
    },
    {
     "name": "unsorted",
     "caughtBy": [
      "unsorted input",
      "duplicates across days, unsorted, padded"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "data-senior-sql-sessions",
  "legacyTitle": null,
  "title": "Sessionize page views (SQL, window functions)",
  "prompt": "Product analytics needs sessions reconstructed from raw page views.\n\nTable (SQLite): page_views(user_id TEXT, ts INTEGER — epoch seconds, page TEXT). Rows are not in any particular order and a user can have several views with the same ts.\n\nA user's session starts at their first view, and a new session starts whenever the gap since that user's previous view is MORE than 1800 seconds (a gap of exactly 1800 stays in the same session).\n\nReturn one row per user: user_id, number of sessions, the largest number of views in any one session, and the total session duration in seconds (sum over the user's sessions of last ts minus first ts). Sort by user_id.\n\nOutput format: SQLite default (\"|\" separated, no header). Use SQLite 3.27-compatible SQL (window functions such as LAG and SUM() OVER are available).",
  "roles": [
   "data",
   "ml"
  ],
  "skills": [
   "sql",
   "data-modeling",
   "aggregation"
  ],
  "difficulty": "senior",
  "experienceMin": 5,
  "experienceMax": 40,
  "languages": [
   "sql"
  ],
  "starterCode": {
   "sql": "-- Table: page_views(user_id TEXT, ts INTEGER epoch seconds, page TEXT)\n-- Output: user_id | sessions | max_views_in_a_session | total_session_seconds\nSELECT 1;\n"
  },
  "minutes": 15,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "CREATE TABLE page_views (user_id TEXT, ts INTEGER, page TEXT);\nINSERT INTO page_views VALUES ('u1', 0, '/'), ('u1', 600, '/a'), ('u1', 5000, '/b'), ('u1', 5100, '/c'), ('u1', 5200, '/d'), ('u2', 100, '/');\n",
    "expected": "u1|2|3|800\nu2|1|1|0",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "gap of exactly 1800 stays in session",
    "input": "CREATE TABLE page_views (user_id TEXT, ts INTEGER, page TEXT);\nINSERT INTO page_views VALUES ('a', 1000, '/'), ('a', 2800, '/x'), ('a', 4601, '/y'), ('a', 6401, '/z');\n",
    "expected": "a|2|2|3600",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "interleaved users",
    "input": "CREATE TABLE page_views (user_id TEXT, ts INTEGER, page TEXT);\nINSERT INTO page_views VALUES ('b', 10, '/'), ('a', 20, '/'), ('b', 2000, '/'), ('a', 30, '/'), ('b', 2100, '/'), ('a', 4000, '/'), ('c', 2050, '/');\n",
    "expected": "a|2|2|10\nb|2|2|100\nc|1|1|0",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "duplicate timestamps and single views",
    "input": "CREATE TABLE page_views (user_id TEXT, ts INTEGER, page TEXT);\nINSERT INTO page_views VALUES ('x', 500, '/'), ('x', 500, '/dup'), ('x', 500, '/dup2'), ('y', 42, '/only'), ('x', 3000, '/later');\n",
    "expected": "x|2|3|0\ny|1|1|0",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "long single session",
    "input": "CREATE TABLE page_views (user_id TEXT, ts INTEGER, page TEXT);\nINSERT INTO page_views VALUES ('z', 0, '/'), ('z', 1700, '/'), ('z', 3400, '/'), ('z', 5100, '/'), ('w', 0, '/'), ('w', 10000, '/');\n",
    "expected": "w|2|1|0\nz|1|4|5100",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "another user's activity must not bridge a gap",
    "input": "CREATE TABLE page_views (user_id TEXT, ts INTEGER, page TEXT);\nINSERT INTO page_views VALUES ('a', 0, '/'), ('b', 1500, '/'), ('a', 3000, '/'), ('b', 2900, '/'), ('c', 4400, '/'), ('a', 6000, '/');\n",
    "expected": "a|3|1|0\nb|1|2|1400\nc|1|1|0",
    "hidden": true
   },
   {
    "id": "t7",
    "name": "chained exact-boundary gaps",
    "input": "CREATE TABLE page_views (user_id TEXT, ts INTEGER, page TEXT);\nINSERT INTO page_views VALUES ('k', 100, '/'), ('k', 1900, '/'), ('k', 3700, '/'), ('k', 5501, '/'), ('m', 7, '/'), ('m', 1807, '/');\n",
    "expected": "k|2|3|3600\nm|1|2|1800",
    "hidden": true
   },
   {
    "id": "t8",
    "name": "busy site, sparse users",
    "input": "CREATE TABLE page_views (user_id TEXT, ts INTEGER, page TEXT);\nINSERT INTO page_views VALUES ('s1', 0, '/'), ('s2', 1000, '/'), ('s3', 2000, '/'), ('s1', 2500, '/'), ('s2', 3200, '/'), ('s3', 4100, '/'), ('s1', 5000, '/');\n",
    "expected": "s1|3|1|0\ns2|2|1|0\ns3|2|1|0",
    "hidden": true
   }
  ],
  "referenceSolution": "WITH ordered AS (\n  SELECT user_id, ts,\n         CASE WHEN ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) <= 1800 THEN 0 ELSE 1 END AS starts_session\n  FROM page_views\n),\nnumbered AS (\n  SELECT user_id, ts,\n         SUM(starts_session) OVER (PARTITION BY user_id ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_no\n  FROM (SELECT * FROM ordered ORDER BY user_id, ts, starts_session DESC)\n),\nsessions AS (\n  SELECT user_id, session_no, COUNT(*) AS views, MAX(ts) - MIN(ts) AS seconds\n  FROM numbered GROUP BY user_id, session_no\n)\nSELECT user_id, COUNT(*) AS sessions, MAX(views) AS max_views_in_a_session, SUM(seconds) AS total_session_seconds\nFROM sessions\nGROUP BY user_id\nORDER BY user_id;\n",
  "referenceLanguage": "sql",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Gap rule exactly (> 1800 starts a session), per-user partitioning, running-sum session ids, correct per-session aggregates.",
     "weak": "Off-by-one on the 1800 boundary, or LAG not partitioned by user.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Duplicate timestamps, single-view sessions (0 seconds), interleaved users.",
     "weak": "Breaks on equal timestamps or users with one view.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "efficiency",
     "strong": "Window functions over a single scan instead of a quadratic self-join; aware an index on (user_id, ts) supports it.",
     "weak": "Self-joins every view with every other view for the same user.",
     "weight": 2
    },
    {
     "id": "c4",
     "dimension": "structure",
     "strong": "Layered CTEs: flag session starts → number sessions → aggregate sessions → aggregate users.",
     "weak": "One giant nested query.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "code_quality",
     "strong": "Clear CTE and column names that explain each step.",
     "weak": "Opaque aliases (a, b, x).",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "session boundary",
     "question": "Walk me through how a view becomes the start of a new session in your query.",
     "strongAnswer": "LAG(ts) partitioned by user ordered by ts; if the gap is > 1800 (or there is no previous view) flag 1; a running SUM of flags gives the session number. Points out <= 1800 vs < 1800 and why exactly 1800 stays in the session.",
     "weakSignals": "Cannot explain the flag-and-running-sum idea or the boundary."
    },
    {
     "id": "p2",
     "decision": "partitioning",
     "question": "What happens if you forget PARTITION BY user_id in the LAG?",
     "strongAnswer": "The previous row could belong to a different user, so a user's first view could be glued onto someone else's session — wrong session counts for interleaved users.",
     "weakSignals": "Unsure what partitioning does."
    },
    {
     "id": "p3",
     "decision": "window functions vs self-join",
     "question": "Why window functions instead of joining each view to earlier views?",
     "strongAnswer": "Single ordered pass per user (O(n log n) with the sort) instead of an O(n²) self-join; easier to reason about; in a warehouse it parallelises by partition.",
     "weakSignals": "No view on cost."
    },
    {
     "id": "p4",
     "decision": "scale and late data",
     "question": "How would you run this daily on billions of events with late-arriving data?",
     "strongAnswer": "Incremental processing per day with a lookback window (sessions can cross midnight), partition by user/date, reprocess affected users when late events arrive, store session ids rather than recomputing history.",
     "weakSignals": "Recomputes everything from scratch every day without considering cost."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "SQL (alternative query)"
   ],
   "testsAgree": 8,
   "mutants": [
    {
     "name": "counts views not sessions",
     "caughtBy": [
      "basic",
      "gap of exactly 1800 stays in session",
      "interleaved users",
      "duplicate timestamps and single views",
      "long single session",
      "another user's activity must not bridge a gap",
      "chained exact-boundary gaps"
     ]
    },
    {
     "name": "duration as views",
     "caughtBy": [
      "basic",
      "gap of exactly 1800 stays in session",
      "interleaved users",
      "duplicate timestamps and single views",
      "long single session",
      "another user's activity must not bridge a gap",
      "chained exact-boundary gaps",
      "busy site, sparse users"
     ]
    },
    {
     "name": "gap inclusive",
     "caughtBy": [
      "gap of exactly 1800 stays in session",
      "chained exact-boundary gaps"
     ]
    },
    {
     "name": "no partition",
     "caughtBy": [
      "another user's activity must not bridge a gap",
      "busy site, sparse users"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "devops-mid-canary-gate",
  "legacyTitle": null,
  "title": "Canary rollout health gate",
  "prompt": "Your deploy pipeline sends a slice of traffic to a canary and must decide automatically whether to promote it.\n\nInput (stdin): one line per minute per version: \"<minute> <version> <requests> <errors> <p99_ms>\", version is \"baseline\" or \"canary\". Lines may be in any order; ignore malformed lines.\n\nA minute is evaluable only if both versions have a line for it, the canary served at least 50 requests, and the baseline served at least 1.\n\nCheck evaluable minutes in ascending order. A minute fails if:\n1. the canary error rate (errors/requests) is MORE than the baseline error rate plus 0.5 percentage points (reason \"error_rate\"), or otherwise\n2. the canary p99 is MORE than 1.2 × the baseline p99 (reason \"latency\").\n\nOutput exactly one line: \"ROLLBACK <minute> <reason>\" for the first failing minute; otherwise \"PROMOTE <evaluable_minutes>\" if there were at least 3 evaluable minutes, else \"HOLD insufficient_data <evaluable_minutes>\".\n\nComparisons are exact: equal to the limit is NOT a failure.",
  "roles": [
   "devops",
   "backend"
  ],
  "skills": [
   "observability",
   "release-engineering",
   "reliability"
  ],
  "difficulty": "mid",
  "experienceMin": 2,
  "experienceMax": 8,
  "languages": [
   "python",
   "go",
   "javascript",
   "java"
  ],
  "starterCode": {
   "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # TODO: your solution\n\nmain()\n",
   "go": "package main\n\nimport (\n\t\"bufio\"\n\t\"os\"\n)\n\nfunc main() {\n\tsc := bufio.NewScanner(os.Stdin)\n\tvar lines []string\n\tfor sc.Scan() {\n\t\tlines = append(lines, sc.Text())\n\t}\n\t_ = lines // TODO: your solution\n}\n",
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String line; (line = in.readLine()) != null; ) lines.add(line);\n        // TODO: your solution\n    }\n}\n"
  },
  "minutes": 12,
  "tests": [
   {
    "id": "t1",
    "name": "basic promote",
    "input": "1 baseline 1000 10 200\n1 canary 100 1 210\n2 baseline 1000 10 200\n2 canary 100 1 220\n3 baseline 1000 12 210\n3 canary 100 1 230",
    "expected": "PROMOTE 3",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "error-rate regression rolls back",
    "input": "1 baseline 1000 5 200\n1 canary 100 0 200\n2 baseline 1000 5 200\n2 canary 100 2 200\n3 baseline 1000 5 200\n3 canary 100 9 900",
    "expected": "ROLLBACK 2 error_rate",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "exact limits are not failures",
    "input": "1 baseline 200 0 100\n1 canary 200 1 120\n2 baseline 400 4 250\n2 canary 100 1 300\n3 baseline 100 1 100\n3 canary 200 3 120",
    "expected": "PROMOTE 3",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "error checked before latency, low traffic skipped",
    "input": "5 canary 20 10 5000\n5 baseline 100 0 100\n6 baseline 100 0 100\n6 canary 100 2 500\n7 baseline 100 0 100",
    "expected": "ROLLBACK 6 error_rate",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "insufficient data holds",
    "input": "1 baseline 100 0 100\n1 canary 60 0 100\n2 canary 60 0 100\n3 baseline 100 0 100\n3 canary 49 0 100\nbroken line\n4 baseline 100 0 100\n4 canary 80 0 110",
    "expected": "HOLD insufficient_data 2",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "unordered lines, incident on both versions",
    "input": "3 canary 100 20 300\n1 canary 100 1 300\n2 baseline 1000 150 300\n1 baseline 1000 10 300\n3 baseline 1000 196 300\n2 canary 100 15 300",
    "expected": "PROMOTE 3",
    "hidden": true
   },
   {
    "id": "t7",
    "name": "equal latency limit then error regression",
    "input": "1 baseline 100 0 500\n1 canary 100 0 600\n2 baseline 100 0 500\n2 canary 100 0 600\n3 baseline 100 1 500\n3 canary 100 2 600\n4 baseline 100 0 500\n4 canary 100 3 601",
    "expected": "ROLLBACK 3 error_rate",
    "hidden": true
   },
   {
    "id": "t8",
    "name": "both rules fail in the same minute",
    "input": "1 baseline 500 5 100\n1 canary 100 1 100\n2 baseline 500 5 100\n2 canary 100 9 999",
    "expected": "ROLLBACK 2 error_rate",
    "hidden": true
   },
   {
    "id": "t9",
    "name": "two clean minutes only",
    "input": "10 baseline 300 3 100\n10 canary 100 1 110\n11 baseline 300 3 100\n11 canary 100 1 115",
    "expected": "HOLD insufficient_data 2",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\n\nMIN_CANARY_REQUESTS = 50\n\ndef main():\n    rows = {}\n    for raw in sys.stdin.read().split('\\n'):\n        p = raw.split()\n        if len(p) != 5 or p[1] not in ('baseline', 'canary'):\n            continue\n        minute, version = int(p[0]), p[1]\n        req, err, p99 = int(p[2]), int(p[3]), int(p[4])\n        rows.setdefault(minute, {})[version] = (req, err, p99)\n    evaluable = 0\n    for minute in sorted(rows):\n        m = rows[minute]\n        if 'baseline' not in m or 'canary' not in m:\n            continue\n        b_req, b_err, b_p99 = m['baseline']\n        c_req, c_err, c_p99 = m['canary']\n        if c_req < MIN_CANARY_REQUESTS or b_req < 1:\n            continue\n        evaluable += 1\n        # canary error rate > baseline error rate + 0.5 percentage points (integer math, no floats)\n        if c_err * b_req * 1000 > b_err * c_req * 1000 + 5 * c_req * b_req:\n            print(f'ROLLBACK {minute} error_rate')\n            return\n        if c_p99 * 10 > b_p99 * 12:\n            print(f'ROLLBACK {minute} latency')\n            return\n    print(f'PROMOTE {evaluable}' if evaluable >= 3 else f'HOLD insufficient_data {evaluable}')\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Relative error-rate rule (baseline + 0.5pp), error check before latency, first failing minute in time order, exact boundaries.",
     "weak": "Absolute error threshold, wrong check order, or picks the worst minute instead of the first.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Missing versions, low-traffic minutes, unordered lines, malformed lines, too little data to decide.",
     "weak": "Promotes with one data point; divides by zero on empty baseline.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "efficiency",
     "strong": "Groups by minute once; integer arithmetic avoids float boundary errors.",
     "weak": "Float comparisons that flip on exact boundaries.",
     "weight": 1
    },
    {
     "id": "c4",
     "dimension": "code_quality",
     "strong": "Thresholds as named constants; the decision is easy to audit.",
     "weak": "Magic numbers scattered.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "structure",
     "strong": "Parse → group → filter evaluable → decide.",
     "weak": "Interleaved parsing and deciding.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "relative vs absolute error threshold",
     "question": "Why compare the canary against the baseline instead of a fixed error-rate limit?",
     "strongAnswer": "Baseline captures current conditions (an upstream incident raises both); comparing relatively isolates the change under test. A fixed limit both false-alarms during incidents and misses regressions on quiet days.",
     "weakSignals": "Cannot say why the baseline matters."
    },
    {
     "id": "p2",
     "decision": "minimum traffic",
     "question": "Why ignore minutes where the canary served fewer than 50 requests?",
     "strongAnswer": "Error rates on tiny samples are noise (1 error in 10 = 10%); a minimum sample size (or a statistical test) prevents flapping. Mentions sequential testing / confidence intervals as the grown-up version.",
     "weakSignals": "Treats every minute equally."
    },
    {
     "id": "p3",
     "decision": "HOLD vs PROMOTE",
     "question": "Why HOLD instead of promoting when nothing failed but there were only two evaluable minutes?",
     "strongAnswer": "Absence of evidence is not evidence of health; promotion should require enough observed traffic. Safe default is to keep the canary small and keep collecting.",
     "weakSignals": "Promotes on no data."
    },
    {
     "id": "p4",
     "decision": "exact comparisons",
     "question": "How do you avoid floating-point mistakes exactly at the limit?",
     "strongAnswer": "Cross-multiply and compare integers (or use decimal/rational math) so equal-to-limit is deterministic.",
     "weakSignals": "Unaware floats can mis-compare at the boundary."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 9,
   "mutants": [
    {
     "name": "equal is violation",
     "caughtBy": [
      "exact limits are not failures",
      "equal latency limit then error regression"
     ]
    },
    {
     "name": "float absolute threshold",
     "caughtBy": [
      "basic promote",
      "exact limits are not failures",
      "unordered lines, incident on both versions",
      "both rules fail in the same minute",
      "two clean minutes only"
     ]
    },
    {
     "name": "ignores min traffic",
     "caughtBy": [
      "error checked before latency, low traffic skipped",
      "insufficient data holds"
     ]
    },
    {
     "name": "latency checked first",
     "caughtBy": [
      "error checked before latency, low traffic skipped",
      "both rules fail in the same minute"
     ]
    },
    {
     "name": "promotes on any data",
     "caughtBy": [
      "insufficient data holds",
      "two clean minutes only"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "frontend-mid-search-race",
  "legacyTitle": null,
  "title": "Search-as-you-type: debounce and stale responses",
  "prompt": "A search box fires API requests as the user types. Two classic bugs: sending a request on every keystroke, and showing results for an old query when responses arrive out of order. Simulate the correct behaviour.\n\nInput (stdin), one event per line, in time order:\n- \"TYPE <t_ms> <query>\" — the search box now contains <query> (a single token).\n- \"RESP <t_ms> <query> <count>\" — a response for <query> arrives with <count> results.\n\nDebounce: a request is sent for a TYPE event only if the next TYPE happens at least 300 ms later, or there is no later TYPE.\n\nOutput (stdout):\n1. One line \"SENT <query>\" for each request sent, in order.\n2. Then, for each RESP line in input order: \"SHOW <query> <count>\" if <query> equals what the search box contains at that moment (the most recent TYPE line above it), otherwise \"IGNORE <query>\" (a stale response must never overwrite newer results).",
  "roles": [
   "frontend",
   "fullstack",
   "mobile"
  ],
  "skills": [
   "state-management",
   "async-ui",
   "performance"
  ],
  "difficulty": "mid",
  "experienceMin": 2,
  "experienceMax": 7,
  "languages": [
   "javascript",
   "typescript",
   "python"
  ],
  "starterCode": {
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "typescript": "import * as fs from 'fs'\nconst lines: string[] = fs.readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # TODO: your solution\n\nmain()\n"
  },
  "minutes": 12,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "TYPE 0 r\nTYPE 120 re\nTYPE 900 rea\nRESP 1000 re 40\nRESP 1300 rea 12",
    "expected": "SENT re\nSENT rea\nIGNORE re\nSHOW rea 12",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "debounce boundary is inclusive",
    "input": "TYPE 0 a\nTYPE 300 ab\nTYPE 599 abc\nTYPE 899 abcd\nRESP 950 ab 5\nRESP 1300 abcd 1",
    "expected": "SENT a\nSENT abc\nSENT abcd\nIGNORE ab\nSHOW abcd 1",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "typed-but-not-sent query blocks older results",
    "input": "TYPE 0 rea\nTYPE 400 reac\nRESP 450 rea 9\nTYPE 500 react\nRESP 520 reac 4\nRESP 900 react 2",
    "expected": "SENT rea\nSENT react\nIGNORE rea\nIGNORE reac\nSHOW react 2",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "user retypes an earlier query",
    "input": "TYPE 0 java\nTYPE 500 javas\nTYPE 600 java\nRESP 700 java 30\nRESP 800 javas 3\nRESP 1200 java 31",
    "expected": "SENT java\nSENT java\nSHOW java 30\nIGNORE javas\nSHOW java 31",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "response before any typing and repeats",
    "input": "RESP 5 x 1\nTYPE 10 x\nRESP 20 x 2\nRESP 30 x 3\nTYPE 2000 y\nRESP 2100 x 9",
    "expected": "SENT x\nSENT y\nIGNORE x\nSHOW x 2\nSHOW x 3\nIGNORE x",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "pauses of exactly 300 ms send",
    "input": "TYPE 0 n\nTYPE 300 ne\nTYPE 600 nex\nTYPE 650 next\nRESP 700 nex 3\nRESP 1000 next 8",
    "expected": "SENT n\nSENT ne\nSENT next\nIGNORE nex\nSHOW next 8",
    "hidden": true
   },
   {
    "id": "t7",
    "name": "newest keystroke still in debounce window",
    "input": "TYPE 0 go\nTYPE 500 gol\nTYPE 560 gola\nRESP 600 gol 7\nRESP 650 go 2\nRESP 900 gola 1",
    "expected": "SENT go\nSENT gola\nIGNORE gol\nIGNORE go\nSHOW gola 1",
    "hidden": true
   },
   {
    "id": "t8",
    "name": "unsent edit makes the last sent result stale",
    "input": "TYPE 0 a\nTYPE 400 ab\nRESP 420 a 5\nTYPE 450 abc\nRESP 900 abc 1",
    "expected": "SENT a\nSENT abc\nIGNORE a\nSHOW abc 1",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\n\nDEBOUNCE_MS = 300\n\ndef main():\n    events = []\n    for raw in sys.stdin.read().split('\\n'):\n        p = raw.split()\n        if len(p) == 3 and p[0] == 'TYPE':\n            events.append(('TYPE', int(p[1]), p[2], None))\n        elif len(p) == 4 and p[0] == 'RESP':\n            events.append(('RESP', int(p[1]), p[2], p[3]))\n    types = [e for e in events if e[0] == 'TYPE']\n    out = []\n    for i, (_, t, q, _) in enumerate(types):\n        nxt = types[i + 1][1] if i + 1 < len(types) else None\n        if nxt is None or nxt - t >= DEBOUNCE_MS:\n            out.append(f'SENT {q}')\n    box = None\n    for kind, t, q, count in events:\n        if kind == 'TYPE':\n            box = q\n        else:\n            out.append(f'SHOW {q} {count}' if q == box else f'IGNORE {q}')\n    print('\\n'.join(out))\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Debounce boundary exactly (>= 300 sends); responses compared with the CURRENT box contents, not the last sent query.",
     "weak": "Shows every response, or compares with the last sent query.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Out-of-order responses, a user retyping an earlier query, responses before any TYPE, repeated responses.",
     "weak": "Assumes responses arrive in request order.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "structure",
     "strong": "State held explicitly (current query; pending/sent requests) — maps directly to a component's state or a reducer.",
     "weak": "Ad-hoc flags that would be hard to move into UI state.",
     "weight": 2
    },
    {
     "id": "c4",
     "dimension": "efficiency",
     "strong": "Linear pass; no re-scanning of earlier events per response.",
     "weak": "Quadratic look-backs.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "code_quality",
     "strong": "Debounce interval as a named constant; small helpers.",
     "weak": "Magic numbers inline.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "stale-response check",
     "question": "Why compare a response with what is in the box now rather than with the last request you sent?",
     "strongAnswer": "The user may have typed something newer that is still inside the debounce window (not sent yet); the results must match what the user sees. Mentions alternatives: request ids / AbortController to cancel stale requests.",
     "weakSignals": "Thinks last-sent is equivalent, or relies on responses arriving in order."
    },
    {
     "id": "p2",
     "decision": "debounce interval",
     "question": "How did you decide what counts as \"300 ms later\", and what would you change in a real UI?",
     "strongAnswer": ">= 300 ms gap sends (explains the boundary); in a real UI tunes the delay, sends immediately on Enter, and may add a minimum query length and caching of recent queries.",
     "weakSignals": "Unsure about the boundary; no UX reasoning."
    },
    {
     "id": "p3",
     "decision": "cancellation",
     "question": "How would you implement this with real fetch calls in React?",
     "strongAnswer": "useEffect with a timer cleared on each keystroke, AbortController to cancel in-flight requests when a newer query is sent, and/or a request counter so only the latest response sets state; cleanup on unmount.",
     "weakSignals": "No cleanup; sets state from every promise."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 8,
   "mutants": [
    {
     "name": "compares latest sent",
     "caughtBy": [
      "typed-but-not-sent query blocks older results",
      "unsent edit makes the last sent result stale"
     ]
    },
    {
     "name": "no debounce",
     "caughtBy": [
      "basic",
      "debounce boundary is inclusive",
      "typed-but-not-sent query blocks older results",
      "user retypes an earlier query",
      "pauses of exactly 300 ms send",
      "newest keystroke still in debounce window",
      "unsent edit makes the last sent result stale"
     ]
    },
    {
     "name": "shows everything",
     "caughtBy": [
      "basic",
      "debounce boundary is inclusive",
      "typed-but-not-sent query blocks older results",
      "user retypes an earlier query",
      "response before any typing and repeats",
      "pauses of exactly 300 ms send",
      "newest keystroke still in debounce window",
      "unsent edit makes the last sent result stale"
     ]
    },
    {
     "name": "strict debounce",
     "caughtBy": [
      "debounce boundary is inclusive",
      "pauses of exactly 300 ms send"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "fullstack-mid-cart-pricing",
  "legacyTitle": null,
  "title": "Cart pricing with promo codes",
  "prompt": "Checkout must compute the order total with promo codes — the same logic powers the cart UI preview and the order API, so it has to be exact.\n\nInput (stdin):\n- \"ITEM <sku> <unit_price_cents> <quantity>\" — the same sku may appear again; add the quantities and keep the first unit price.\n- \"PROMO <code>\" — a code the shopper entered.\n\nPromo codes (each applies at most once; repeated codes are ignored, not invalid):\n- \"BOGO-<sku>\": buy one get one free on that sku — floor(quantity / 2) units are free. Only valid if the sku is in the cart.\n- \"SAVE10\": 10% off the subtotal AFTER BOGO discounts, rounded DOWN to the cent.\n- \"FREESHIP\": free shipping.\nAny other code is invalid.\n\nShipping is 499 cents unless the subtotal (before any discount) is at least 5000 cents, or FREESHIP applies.\n\nOutput (stdout):\nsubtotal=<sum of unit price × quantity>\ndiscount=<total discount>\nshipping=<cents>\ntotal=<subtotal - discount + shipping>\nthen \"INVALID <code>\" for each invalid code, in input order.\n\nAll amounts are integer cents.",
  "roles": [
   "fullstack",
   "backend",
   "frontend"
  ],
  "skills": [
   "api-design",
   "data-modeling",
   "error-handling"
  ],
  "difficulty": "mid",
  "experienceMin": 2,
  "experienceMax": 7,
  "languages": [
   "javascript",
   "typescript",
   "python",
   "java",
   "go"
  ],
  "starterCode": {
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "typescript": "import * as fs from 'fs'\nconst lines: string[] = fs.readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # TODO: your solution\n\nmain()\n",
   "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String line; (line = in.readLine()) != null; ) lines.add(line);\n        // TODO: your solution\n    }\n}\n",
   "go": "package main\n\nimport (\n\t\"bufio\"\n\t\"os\"\n)\n\nfunc main() {\n\tsc := bufio.NewScanner(os.Stdin)\n\tvar lines []string\n\tfor sc.Scan() {\n\t\tlines = append(lines, sc.Text())\n\t}\n\t_ = lines // TODO: your solution\n}\n"
  },
  "minutes": 12,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "ITEM shirt 1500 2\nITEM socks 300 3\nPROMO SAVE10",
    "expected": "subtotal=3900\ndiscount=390\nshipping=499\ntotal=4009",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "BOGO then percentage, merged SKUs",
    "input": "ITEM mug 1200 1\nITEM mug 1200 2\nITEM tea 499 1\nPROMO BOGO-mug\nPROMO SAVE10",
    "expected": "subtotal=4099\ndiscount=1489\nshipping=499\ntotal=3109",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "shipping threshold uses the pre-discount subtotal",
    "input": "ITEM lamp 5000 1\nPROMO SAVE10",
    "expected": "subtotal=5000\ndiscount=500\nshipping=0\ntotal=4500",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "repeated and invalid codes",
    "input": "ITEM pen 199 5\nPROMO SAVE10\nPROMO SAVE10\nPROMO BOGO-book\nPROMO WELCOME\nPROMO FREESHIP\nPROMO BOGO-pen\nPROMO BOGO-pen",
    "expected": "subtotal=995\ndiscount=457\nshipping=0\ntotal=538\nINVALID BOGO-book\nINVALID WELCOME",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "floor rounding",
    "input": "ITEM a 333 1\nITEM b 1 6\nPROMO SAVE10",
    "expected": "subtotal=339\ndiscount=33\nshipping=499\ntotal=805",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "empty cart",
    "input": "PROMO SAVE10\nPROMO NOPE",
    "expected": "subtotal=0\ndiscount=0\nshipping=499\ntotal=499\nINVALID NOPE",
    "hidden": true
   },
   {
    "id": "t7",
    "name": "BOGO pushes total under threshold, shipping still free",
    "input": "ITEM a 2600 2\nPROMO BOGO-a",
    "expected": "subtotal=5200\ndiscount=2600\nshipping=0\ntotal=2600",
    "hidden": true
   },
   {
    "id": "t8",
    "name": "percentage code entered twice",
    "input": "ITEM b 1000 3\nPROMO SAVE10\nPROMO SAVE10",
    "expected": "subtotal=3000\ndiscount=300\nshipping=499\ntotal=3199",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\n\nSHIPPING_CENTS = 499\nFREE_SHIPPING_FROM = 5000\n\ndef main():\n    price, qty, order = {}, {}, []\n    promos, invalid = [], []\n    for raw in sys.stdin.read().split('\\n'):\n        p = raw.split()\n        if len(p) == 4 and p[0] == 'ITEM' and p[2].isdigit() and p[3].isdigit():\n            sku = p[1]\n            if sku not in price:\n                price[sku] = int(p[2]); qty[sku] = 0; order.append(sku)\n            qty[sku] += int(p[3])\n        elif len(p) == 2 and p[0] == 'PROMO':\n            promos.append(p[1])\n    subtotal = sum(price[s] * qty[s] for s in order)\n    applied = set()\n    bogo = 0\n    for code in promos:\n        if code in applied:\n            continue\n        if code == 'SAVE10' or code == 'FREESHIP':\n            applied.add(code)\n        elif code.startswith('BOGO-') and code[5:] in price:\n            applied.add(code)\n            sku = code[5:]\n            bogo += (qty[sku] // 2) * price[sku]\n        else:\n            invalid.append(code)\n    after_bogo = subtotal - bogo\n    save10 = after_bogo * 10 // 100 if 'SAVE10' in applied else 0\n    discount = bogo + save10\n    shipping = 0 if ('FREESHIP' in applied or subtotal >= FREE_SHIPPING_FROM) else SHIPPING_CENTS\n    total = max(0, subtotal - discount) + shipping\n    print(f'subtotal={subtotal}\\ndiscount={discount}\\nshipping={shipping}\\ntotal={total}')\n    for code in invalid:\n        print(f'INVALID {code}')\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Promo order (BOGO then SAVE10 on the reduced amount), floor rounding, shipping threshold on the pre-discount subtotal, codes applied once.",
     "weak": "Applies SAVE10 to the full subtotal, rounds half-up, or stacks repeated codes.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Odd quantities, merged duplicate SKUs, BOGO for an absent SKU, repeated codes, empty cart.",
     "weak": "Breaks on duplicates or odd quantities.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "structure",
     "strong": "Pricing as a pure function of cart + codes (reusable by UI preview and API); promo rules isolated so new codes are easy to add.",
     "weak": "Rules hard-coded inside the output loop.",
     "weight": 2
    },
    {
     "id": "c4",
     "dimension": "code_quality",
     "strong": "Integer cents only; named constants for shipping fee and threshold.",
     "weak": "Floats for money.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "efficiency",
     "strong": "Linear in items + codes.",
     "weak": "Recomputes totals per promo.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "promotion order",
     "question": "Why apply BOGO before the 10% discount?",
     "strongAnswer": "Percentage discounts should apply to what the shopper actually pays for; applying 10% to free items over-discounts. States that promo ordering is a business rule that must be explicit and consistent between UI and API.",
     "weakSignals": "Order was accidental; unaware it changes the total."
    },
    {
     "id": "p2",
     "decision": "money representation and rounding",
     "question": "How do you represent money and round the 10%?",
     "strongAnswer": "Integer minor units (cents), never floats; floor explicitly as specified; would centralise rounding policy (banker's vs half-up vs floor) because finance and tax depend on it.",
     "weakSignals": "Uses floats and rounds ad hoc."
    },
    {
     "id": "p3",
     "decision": "shared logic between UI and API",
     "question": "The cart page and the order API both need this — where should the logic live?",
     "strongAnswer": "Server is the source of truth (the client can be tampered with); share a pure pricing module or have the UI call a pricing endpoint for previews; never trust a client-computed total.",
     "weakSignals": "Trusts totals sent by the browser."
    },
    {
     "id": "p4",
     "decision": "invalid codes",
     "question": "What should the shopper see for an invalid or inapplicable code?",
     "strongAnswer": "Reject with a specific reason (unknown vs not applicable to cart vs already applied) without failing checkout; log for abuse detection; idempotent re-application.",
     "weakSignals": "Fails the whole order or silently ignores."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 8,
   "mutants": [
    {
     "name": "bogo rounds up",
     "caughtBy": [
      "BOGO then percentage, merged SKUs",
      "repeated and invalid codes"
     ]
    },
    {
     "name": "duplicate codes stack",
     "caughtBy": [
      "repeated and invalid codes",
      "percentage code entered twice"
     ]
    },
    {
     "name": "percent before bogo",
     "caughtBy": [
      "BOGO then percentage, merged SKUs",
      "repeated and invalid codes"
     ]
    },
    {
     "name": "rounds half up",
     "caughtBy": [
      "BOGO then percentage, merged SKUs",
      "repeated and invalid codes",
      "floor rounding"
     ]
    },
    {
     "name": "shipping after discount",
     "caughtBy": [
      "shipping threshold uses the pre-discount subtotal",
      "BOGO pushes total under threshold, shipping still free"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "ml-mid-classifier-metrics",
  "legacyTitle": null,
  "title": "Evaluate a multi-class classifier",
  "prompt": "Before a model ships, you report per-class errors and a summary score on the held-out set.\n\nInput (stdin): one prediction per line: \"<true_label> <predicted_label>\" (labels are single tokens). Ignore lines that do not have exactly two tokens. If there are no valid lines print \"no_data\".\n\nClasses are all labels that appear as either a true or a predicted label. For each class c, sorted alphabetically, print \"<c> tp=<n> fp=<n> fn=<n>\" where tp = true c predicted c, fp = predicted c but true label differs, fn = true c but predicted something else.\n\nThen print:\naccuracy_permille=<floor(1000 × correct / total)>\nmacro_f1_permille=<floor(1000 × macro F1)>\nwhere macro F1 is the unweighted mean over all classes of F1_c = 2·tp / (2·tp + fp + fn).\n\nCompute exactly (no rounding before the final floor).",
  "roles": [
   "ml",
   "data"
  ],
  "skills": [
   "model-evaluation",
   "statistics",
   "data-structures"
  ],
  "difficulty": "mid",
  "experienceMin": 1,
  "experienceMax": 7,
  "languages": [
   "python",
   "javascript",
   "java",
   "cpp"
  ],
  "starterCode": {
   "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # TODO: your solution\n\nmain()\n",
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String line; (line = in.readLine()) != null; ) lines.add(line);\n        // TODO: your solution\n    }\n}\n",
   "cpp": "#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<string> lines;\n    for (string line; getline(cin, line); ) lines.push_back(line);\n    // TODO: your solution\n    return 0;\n}\n"
  },
  "minutes": 12,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "cat cat\ncat dog\ndog dog\nbird bird\nbird cat",
    "expected": "bird tp=1 fp=0 fn=1\ncat tp=1 fp=1 fn=1\ndog tp=1 fp=1 fn=0\naccuracy_permille=600\nmacro_f1_permille=611",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "predicted-only class counts",
    "input": "a a\na a\nb a\nb c\nb b",
    "expected": "a tp=2 fp=1 fn=0\nb tp=1 fp=0 fn=2\nc tp=0 fp=1 fn=0\naccuracy_permille=600\nmacro_f1_permille=433",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "imbalanced classes (macro ≠ micro)",
    "input": "spam spam\nspam spam\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nham ham\nspam ham\nspam ham\nham spam",
    "expected": "ham tp=16 fp=2 fn=1\nspam tp=2 fp=1 fn=2\naccuracy_permille=857\nmacro_f1_permille=742",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "malformed lines and single class",
    "input": "x x\nx x y\n\nx\nx x",
    "expected": "x tp=2 fp=0 fn=0\naccuracy_permille=1000\nmacro_f1_permille=1000",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "empty input",
    "input": "",
    "expected": "no_data",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "floor sits just below a boundary",
    "input": "p p\np q\nq q\nq r\nr r\nr p",
    "expected": "p tp=1 fp=1 fn=1\nq tp=1 fp=1 fn=1\nr tp=1 fp=1 fn=1\naccuracy_permille=500\nmacro_f1_permille=500",
    "hidden": true
   },
   {
    "id": "t7",
    "name": "never-true label still scored",
    "input": "u u\nv z\nv v\nu z",
    "expected": "u tp=1 fp=0 fn=1\nv tp=1 fp=0 fn=1\nz tp=0 fp=2 fn=0\naccuracy_permille=500\nmacro_f1_permille=444",
    "hidden": true
   },
   {
    "id": "t8",
    "name": "two-thirds boundary floors down",
    "input": "x x\nx y\ny y",
    "expected": "x tp=1 fp=0 fn=1\ny tp=1 fp=1 fn=0\naccuracy_permille=666\nmacro_f1_permille=666",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\nfrom fractions import Fraction\n\ndef main():\n    rows = []\n    for raw in sys.stdin.read().split('\\n'):\n        p = raw.split()\n        if len(p) == 2:\n            rows.append((p[0], p[1]))\n    if not rows:\n        print('no_data')\n        return\n    classes = sorted({t for t, _ in rows} | {p for _, p in rows})\n    tp = {c: 0 for c in classes}; fp = dict(tp); fn = dict(tp)\n    for truth, pred in rows:\n        if truth == pred:\n            tp[truth] += 1\n        else:\n            fp[pred] += 1\n            fn[truth] += 1\n    out = [f'{c} tp={tp[c]} fp={fp[c]} fn={fn[c]}' for c in classes]\n    correct = sum(tp.values())\n    macro = sum(Fraction(2 * tp[c], 2 * tp[c] + fp[c] + fn[c]) for c in classes) / len(classes)\n    out.append(f'accuracy_permille={(1000 * correct) // len(rows)}')\n    out.append(f'macro_f1_permille={int(macro * 1000 // 1)}')\n    print('\\n'.join(out))\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Classes include predicted-only labels; macro F1 as the mean of per-class F1; exact floor at the end.",
     "weak": "Micro F1 or F1 of averaged precision/recall; drops predicted-only classes.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "Malformed lines, single class, a class never predicted, empty input.",
     "weak": "Division by zero on a class with no predictions.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "efficiency",
     "strong": "One pass for counts; per-class arithmetic afterwards.",
     "weak": "Re-scans predictions per class.",
     "weight": 1
    },
    {
     "id": "c4",
     "dimension": "code_quality",
     "strong": "Exact arithmetic (fractions/integers) chosen deliberately; clear metric definitions.",
     "weak": "Float rounding that flips at boundaries.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "structure",
     "strong": "Confusion counts separated from metric computation.",
     "weak": "Metrics computed inline while parsing.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "macro vs micro averaging",
     "question": "Why report macro F1 rather than micro F1 or accuracy?",
     "strongAnswer": "Macro weights every class equally, so poor performance on rare classes is visible; micro/accuracy are dominated by frequent classes (in single-label multi-class micro F1 equals accuracy). Chooses based on whether rare classes matter for the product.",
     "weakSignals": "Thinks they are the same, or cannot say when each is appropriate."
    },
    {
     "id": "p2",
     "decision": "predicted-only classes",
     "question": "A label appears only in predictions, never in the ground truth. Does it count, and why?",
     "strongAnswer": "Yes — it is a real class the model emits; its F1 is 0 (all false positives) and ignoring it hides a failure mode.",
     "weakSignals": "Only iterates over true labels."
    },
    {
     "id": "p3",
     "decision": "exact arithmetic",
     "question": "Why did you avoid floating point (or how did you handle it)?",
     "strongAnswer": "Floors at exact boundaries can flip with float error; fractions or integer cross-multiplication give deterministic results; otherwise round only at presentation.",
     "weakSignals": "No awareness of float error."
    },
    {
     "id": "p4",
     "decision": "beyond the numbers",
     "question": "What else would you check before shipping this model?",
     "strongAnswer": "Confusion matrix patterns, per-segment metrics (fairness/slices), calibration, class imbalance and threshold choice, confidence intervals on a small test set, and data leakage.",
     "weakSignals": "Only the headline number."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 8,
   "mutants": [
    {
     "name": "classes from truth only",
     "caughtBy": [
      "predicted-only class counts",
      "never-true label still scored"
     ]
    },
    {
     "name": "f1 of macro p r",
     "caughtBy": [
      "basic",
      "predicted-only class counts",
      "imbalanced classes (macro ≠ micro)",
      "two-thirds boundary floors down"
     ]
    },
    {
     "name": "micro f1",
     "caughtBy": [
      "basic",
      "predicted-only class counts",
      "imbalanced classes (macro ≠ micro)",
      "never-true label still scored"
     ]
    },
    {
     "name": "rounds instead of floor",
     "caughtBy": [
      "imbalanced classes (macro ≠ micro)",
      "two-thirds boundary floors down"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 },
 {
  "key": "mobile-mid-offline-sync",
  "legacyTitle": null,
  "title": "Offline edits: sync and conflict handling",
  "prompt": "A notes app lets people edit fields offline. When the phone reconnects, its queued edits are replayed against the server, which may have changed in the meantime. Each field has a version number.\n\nInput (stdin), one per line (order of kinds may be mixed):\n- \"SERVER <field> <value> <version>\" — the server's state when the phone went offline.\n- \"REMOTE <field> <value>\" — a change another device made while this phone was offline: the field takes the value and its version increases by 1 (a new field starts at version 1).\n- \"LOCAL <field> <value> <base_version>\" — an edit queued on the phone, made when the phone believed the field was at <base_version>.\n\nSync: first apply ALL REMOTE changes (in input order), then replay the LOCAL edits in input order. A missing field has version 0. A local edit APPLIES if its base_version equals the field's current version, or if the field's current version was produced by this phone's own previous applied edit during this replay (the phone is building on its own write). When it applies, the field takes the value and its version increases by 1. Otherwise it is a conflict and the server value is kept.\n\nOutput: for each LOCAL edit in order, \"APPLIED <field>\" or \"CONFLICT <field> server=<current server value or ->\". Then \"STATE <field>=<value>@<version>\" for every field, sorted by field name.",
  "roles": [
   "mobile",
   "frontend",
   "fullstack"
  ],
  "skills": [
   "offline-sync",
   "state-management",
   "data-modeling"
  ],
  "difficulty": "mid",
  "experienceMin": 2,
  "experienceMax": 8,
  "languages": [
   "javascript",
   "typescript",
   "python",
   "java"
  ],
  "starterCode": {
   "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "typescript": "import * as fs from 'fs'\nconst lines: string[] = fs.readFileSync(0, 'utf8').split('\\n')\n// TODO: your solution\n",
   "python": "import sys\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # TODO: your solution\n\nmain()\n",
   "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String line; (line = in.readLine()) != null; ) lines.add(line);\n        // TODO: your solution\n    }\n}\n"
  },
  "minutes": 14,
  "tests": [
   {
    "id": "t1",
    "name": "basic",
    "input": "SERVER title Groceries 3\nSERVER body milk 5\nREMOTE body milk,eggs\nLOCAL title Shopping 3\nLOCAL body bread 5",
    "expected": "APPLIED title\nCONFLICT body server=milk,eggs\nSTATE body=milk,eggs@6\nSTATE title=Shopping@4",
    "hidden": false
   },
   {
    "id": "t2",
    "name": "own consecutive edits rebase",
    "input": "SERVER t a 3\nLOCAL t b 3\nLOCAL t c 3\nLOCAL t d 3",
    "expected": "APPLIED t\nAPPLIED t\nAPPLIED t\nSTATE t=d@6",
    "hidden": true
   },
   {
    "id": "t3",
    "name": "remote change between own edits order",
    "input": "LOCAL t mine 2\nSERVER t base 2\nREMOTE t theirs\nLOCAL t mine2 2",
    "expected": "CONFLICT t server=theirs\nCONFLICT t server=theirs\nSTATE t=theirs@3",
    "hidden": true
   },
   {
    "id": "t4",
    "name": "new fields and remote-only fields",
    "input": "SERVER a x 1\nLOCAL n1 hello 0\nLOCAL n2 oops 4\nREMOTE r1 remote\nLOCAL r1 mine 0\nLOCAL r1 again 1",
    "expected": "APPLIED n1\nCONFLICT n2 server=-\nCONFLICT r1 server=remote\nAPPLIED r1\nSTATE a=x@1\nSTATE n1=hello@1\nSTATE r1=again@2",
    "hidden": true
   },
   {
    "id": "t5",
    "name": "conflict then later own edit",
    "input": "SERVER f v1 1\nREMOTE f v2\nLOCAL f mine 1\nLOCAL f mine2 2\nLOCAL f mine3 2",
    "expected": "CONFLICT f server=v2\nAPPLIED f\nAPPLIED f\nSTATE f=mine3@4",
    "hidden": true
   },
   {
    "id": "t6",
    "name": "remote line listed after the local edit still happened first",
    "input": "SERVER k a 1\nLOCAL k mine 1\nREMOTE k theirs\nSERVER j b 4\nLOCAL j ok 4",
    "expected": "CONFLICT k server=theirs\nAPPLIED j\nSTATE j=ok@5\nSTATE k=theirs@2",
    "hidden": true
   }
  ],
  "referenceSolution": "import sys\n\ndef main():\n    value, version = {}, {}\n    remote, local = [], []\n    for raw in sys.stdin.read().split('\\n'):\n        p = raw.split()\n        if len(p) == 4 and p[0] == 'SERVER':\n            value[p[1]], version[p[1]] = p[2], int(p[3])\n        elif len(p) == 3 and p[0] == 'REMOTE':\n            remote.append((p[1], p[2]))\n        elif len(p) == 4 and p[0] == 'LOCAL':\n            local.append((p[1], p[2], int(p[3])))\n    # 1. Changes other devices made while we were offline.\n    for field, v in remote:\n        value[field] = v\n        version[field] = version.get(field, 0) + 1\n    # 2. Replay our queued edits in order.\n    own_write = {}   # field -> version produced by OUR last applied edit\n    out = []\n    for field, v, base in local:\n        current = version.get(field, 0)\n        if base == current or own_write.get(field) == current:\n            value[field] = v\n            version[field] = current + 1\n            own_write[field] = current + 1\n            out.append(f'APPLIED {field}')\n        else:\n            out.append(f'CONFLICT {field} server={value.get(field, \"-\")}')\n    for field in sorted(value):\n        out.append(f'STATE {field}={value[field]}@{version[field]}')\n    print('\\n'.join(out))\n\nmain()\n",
  "referenceLanguage": "python",
  "rubric": {
   "criteria": [
    {
     "id": "c1",
     "dimension": "correctness",
     "strong": "Optimistic concurrency by version; remote changes applied first; own consecutive edits rebase; conflicts keep the server value.",
     "weak": "Last-write-wins (silently overwrites other devices) or rejects the phone's own follow-up edits.",
     "weight": 3
    },
    {
     "id": "c2",
     "dimension": "edge_cases",
     "strong": "New fields (version 0), several local edits to one field, remote-only fields, mixed input order.",
     "weak": "Assumes every field exists on the server.",
     "weight": 2
    },
    {
     "id": "c3",
     "dimension": "structure",
     "strong": "Clear model of server state vs local queue; sync as an explicit two-phase step.",
     "weak": "Processes lines in arrival order without modelling time.",
     "weight": 2
    },
    {
     "id": "c4",
     "dimension": "code_quality",
     "strong": "Versions as integers; outputs built from one state map.",
     "weak": "Ad-hoc string state.",
     "weight": 1
    },
    {
     "id": "c5",
     "dimension": "efficiency",
     "strong": "Hash maps; linear time.",
     "weak": "Rescans the queue per edit.",
     "weight": 1
    }
   ],
   "probes": [
    {
     "id": "p1",
     "decision": "conflict policy",
     "question": "Why not simply let the last write win?",
     "strongAnswer": "Last-write-wins silently destroys another device's change; version checks (optimistic concurrency) detect the conflict so the app can show it, merge, or ask the user. Mentions field-level vs document-level granularity and CRDTs/three-way merge as richer options.",
     "weakSignals": "Thinks overwriting is fine because the phone is the newest."
    },
    {
     "id": "p2",
     "decision": "rebasing own edits",
     "question": "Two queued edits on the same field both say base_version 3. Why does the second one apply?",
     "strongAnswer": "The second edit was made on top of the phone's own first edit; after the first applies the version moved because of us, not another device, so it is not a real conflict. Without this, every multi-edit offline session would self-conflict. Alternative: coalesce the queue to the last edit per field.",
     "weakSignals": "Cannot explain why the second edit is not a conflict."
    },
    {
     "id": "p3",
     "decision": "ordering",
     "question": "Why apply all remote changes before replaying local ones?",
     "strongAnswer": "Remote changes happened on the server while the phone was offline — they precede the phone's sync in server time; interleaving by line order would pretend the phone was online.",
     "weakSignals": "Processes in input order without thinking about time."
    },
    {
     "id": "p4",
     "decision": "user experience",
     "question": "What should the user see on a conflict?",
     "strongAnswer": "Do not lose their text: keep a local copy, show the server version, offer keep-mine / keep-theirs / merge; make sync status visible; retry safely (idempotent mutations with ids).",
     "weakSignals": "Drops the local edit silently."
    }
   ]
  },
  "qa": {
   "independentSolutions": [
    "JavaScript"
   ],
   "testsAgree": 6,
   "mutants": [
    {
     "name": "interleaves in input order",
     "caughtBy": [
      "remote change between own edits order",
      "remote line listed after the local edit still happened first"
     ]
    },
    {
     "name": "last write wins",
     "caughtBy": [
      "basic",
      "remote change between own edits order",
      "new fields and remote-only fields",
      "conflict then later own edit",
      "remote line listed after the local edit still happened first"
     ]
    },
    {
     "name": "no rebase on own writes",
     "caughtBy": [
      "own consecutive edits rebase",
      "conflict then later own edit"
     ]
    },
    {
     "name": "remote keeps version",
     "caughtBy": [
      "basic",
      "remote change between own edits order",
      "new fields and remote-only fields",
      "conflict then later own edit",
      "remote line listed after the local edit still happened first"
     ]
    }
   ],
   "checkedOn": "2026-11-05"
  }
 }
]

export const STARTER_SKILL_MAPS: { role: string; title: string; skills: unknown[] }[] = [
 {
  "role": "backend",
  "title": "Backend engineer",
  "skills": [
   {
    "id": "api-design",
    "name": "API design",
    "aliases": [
     "rest",
     "restful",
     "api",
     "apis",
     "grpc",
     "graphql",
     "http",
     "endpoints",
     "openapi",
     "swagger",
     "microservice apis"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How would you version this API without breaking clients?",
     "How do you make this endpoint idempotent under retries?"
    ],
    "adjacent": [
     "error-handling",
     "databases"
    ]
   },
   {
    "id": "data-structures",
    "name": "Data structures & algorithms",
    "aliases": [
     "algorithms",
     "dsa",
     "hash map",
     "hashmap",
     "queue",
     "deque",
     "complexity",
     "big o",
     "problem solving"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "What is the worst-case complexity, and when does it bite?"
    ],
    "adjacent": [
     "performance"
    ]
   },
   {
    "id": "databases",
    "name": "Databases & SQL",
    "aliases": [
     "sql",
     "postgres",
     "postgresql",
     "mysql",
     "mariadb",
     "oracle",
     "mongodb",
     "nosql",
     "dynamodb",
     "cassandra",
     "indexing",
     "orm",
     "hibernate",
     "jpa",
     "prisma",
     "database design"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "Which index would you add and what does it cost on writes?",
     "How do you avoid N+1 queries here?"
    ],
    "adjacent": [
     "caching"
    ]
   },
   {
    "id": "languages",
    "name": "Backend language proficiency",
    "aliases": [
     "java",
     "python",
     "go",
     "golang",
     "node",
     "node.js",
     "nodejs",
     "typescript",
     "c#",
     ".net",
     "kotlin",
     "ruby",
     "php",
     "rust",
     "scala",
     "spring",
     "spring boot",
     "django",
     "flask",
     "fastapi",
     "express",
     "nestjs",
     "rails",
     "laravel"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "What would you do differently in this code in production?"
    ],
    "adjacent": [
     "testing"
    ]
   },
   {
    "id": "concurrency",
    "name": "Concurrency",
    "aliases": [
     "threads",
     "multithreading",
     "async",
     "asynchronous",
     "locking",
     "race condition",
     "parallelism",
     "goroutines",
     "coroutines",
     "reactive"
    ],
    "priority": 2,
    "dependsOn": [
     "data-structures"
    ],
    "deeperProbes": [
     "Where could two requests race here, and how would you prevent it?"
    ],
    "adjacent": [
     "distributed-systems"
    ]
   },
   {
    "id": "caching",
    "name": "Caching",
    "aliases": [
     "redis",
     "memcached",
     "cache",
     "caching",
     "cdn"
    ],
    "priority": 2,
    "dependsOn": [
     "databases"
    ],
    "deeperProbes": [
     "How do you invalidate this cache safely?"
    ],
    "adjacent": [
     "performance"
    ]
   },
   {
    "id": "rate-limiting",
    "name": "Rate limiting & throttling",
    "aliases": [
     "throttling",
     "rate limit",
     "rate limiting",
     "quota",
     "backpressure"
    ],
    "priority": 2,
    "dependsOn": [
     "data-structures"
    ],
    "deeperProbes": [
     "How does this work across several servers?"
    ],
    "adjacent": [
     "distributed-systems"
    ]
   },
   {
    "id": "distributed-systems",
    "name": "Distributed systems",
    "aliases": [
     "microservices",
     "kafka",
     "rabbitmq",
     "sqs",
     "pubsub",
     "messaging",
     "event-driven",
     "event driven",
     "consistency",
     "eventual consistency",
     "system design",
     "scalability",
     "high availability"
    ],
    "priority": 2,
    "dependsOn": [
     "concurrency"
    ],
    "deeperProbes": [
     "What happens to in-flight messages if a consumer crashes?"
    ],
    "adjacent": [
     "observability"
    ]
   },
   {
    "id": "error-handling",
    "name": "Error handling & resilience",
    "aliases": [
     "retries",
     "timeouts",
     "circuit breaker",
     "fault tolerance",
     "resilience",
     "idempotency",
     "idempotent"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "Which errors should be retried, and which must not be?"
    ],
    "adjacent": [
     "observability"
    ]
   },
   {
    "id": "security",
    "name": "Security",
    "aliases": [
     "authentication",
     "authorization",
     "oauth",
     "jwt",
     "owasp",
     "encryption",
     "auth"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How would an attacker abuse this endpoint?"
    ],
    "adjacent": [
     "api-design"
    ]
   },
   {
    "id": "cloud",
    "name": "Cloud & deployment",
    "aliases": [
     "aws",
     "gcp",
     "azure",
     "docker",
     "kubernetes",
     "k8s",
     "serverless",
     "lambda",
     "ci/cd"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "How would you deploy this with zero downtime?"
    ],
    "adjacent": [
     "observability"
    ]
   },
   {
    "id": "testing",
    "name": "Testing",
    "aliases": [
     "unit tests",
     "unit testing",
     "integration tests",
     "tdd",
     "junit",
     "pytest",
     "jest",
     "mocking"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "What would you mock here, and what would you test for real?"
    ],
    "adjacent": []
   },
   {
    "id": "observability",
    "name": "Observability",
    "aliases": [
     "logging",
     "metrics",
     "tracing",
     "monitoring",
     "prometheus",
     "grafana",
     "datadog",
     "opentelemetry",
     "alerting"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "Which metric would page you for this service?"
    ],
    "adjacent": []
   }
  ]
 },
 {
  "role": "data",
  "title": "Data engineer",
  "skills": [
   {
    "id": "sql",
    "name": "SQL",
    "aliases": [
     "sql",
     "sql optimization",
     "query optimization",
     "queries",
     "joins",
     "window functions",
     "postgres",
     "postgresql",
     "mysql",
     "snowflake",
     "bigquery",
     "redshift",
     "databricks sql",
     "t-sql",
     "plsql"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How would you make this query faster on a 1B-row table?"
    ],
    "adjacent": [
     "data-modeling"
    ]
   },
   {
    "id": "data-modeling",
    "name": "Data modeling",
    "aliases": [
     "schema",
     "schema design",
     "star schema",
     "snowflake schema",
     "dimensional modeling",
     "dimensional modelling",
     "normalization",
     "data warehouse",
     "data warehousing",
     "kimball",
     "data vault",
     "scd"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How would you model slowly changing dimensions here?"
    ],
    "adjacent": [
     "sql"
    ]
   },
   {
    "id": "etl",
    "name": "Pipelines / ETL",
    "aliases": [
     "etl",
     "elt",
     "pipeline",
     "pipelines",
     "data pipelines",
     "airflow",
     "dagster",
     "prefect",
     "dbt",
     "spark",
     "pyspark",
     "orchestration",
     "batch processing",
     "glue",
     "informatica",
     "talend",
     "ssis"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How do you make this pipeline idempotent on reruns?",
     "How do you handle late-arriving data?"
    ],
    "adjacent": [
     "data-quality"
    ]
   },
   {
    "id": "data-quality",
    "name": "Data quality",
    "aliases": [
     "data quality",
     "validation",
     "data validation",
     "malformed",
     "dedupe",
     "deduplication",
     "data cleaning",
     "great expectations",
     "data contracts",
     "data governance"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "At what bad-row rate should the job fail instead of skipping?"
    ],
    "adjacent": [
     "observability"
    ]
   },
   {
    "id": "aggregation",
    "name": "Aggregation & analytics",
    "aliases": [
     "group by",
     "metrics",
     "kpi",
     "kpis",
     "distinct count",
     "analytics",
     "reporting",
     "dashboards",
     "bi",
     "power bi",
     "tableau",
     "looker"
    ],
    "priority": 2,
    "dependsOn": [
     "sql"
    ],
    "deeperProbes": [
     "How would you compute this approximately at huge scale?"
    ],
    "adjacent": [
     "performance"
    ]
   },
   {
    "id": "programming",
    "name": "Programming for data",
    "aliases": [
     "python",
     "pandas",
     "numpy",
     "scala",
     "java",
     "pyspark"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How would you test this transformation?"
    ],
    "adjacent": [
     "data-quality"
    ]
   },
   {
    "id": "data-structures",
    "name": "Data structures",
    "aliases": [
     "hash map",
     "sets",
     "dictionaries",
     "algorithms"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "What is the memory cost of this structure?"
    ],
    "adjacent": [
     "performance"
    ]
   },
   {
    "id": "streaming",
    "name": "Streaming",
    "aliases": [
     "kafka",
     "kinesis",
     "flink",
     "spark streaming",
     "real-time",
     "realtime",
     "streaming",
     "event streaming",
     "cdc",
     "debezium"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How do you handle out-of-order events?"
    ],
    "adjacent": [
     "etl"
    ]
   },
   {
    "id": "performance",
    "name": "Performance & scale",
    "aliases": [
     "partitioning",
     "spark tuning",
     "big data",
     "hadoop",
     "hive",
     "distributed processing",
     "optimization"
    ],
    "priority": 2,
    "dependsOn": [
     "etl"
    ],
    "deeperProbes": [
     "Where is the shuffle, and how would you reduce it?"
    ],
    "adjacent": []
   },
   {
    "id": "cloud-data",
    "name": "Cloud data platforms",
    "aliases": [
     "aws",
     "gcp",
     "azure",
     "s3",
     "gcs",
     "adls",
     "emr",
     "dataproc",
     "lakehouse",
     "delta lake",
     "iceberg"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "How would you lay out this data in a lake for cost and speed?"
    ],
    "adjacent": []
   },
   {
    "id": "observability",
    "name": "Pipeline observability",
    "aliases": [
     "monitoring",
     "alerts",
     "alerting",
     "sla",
     "slas",
     "freshness",
     "data observability",
     "lineage"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "How would you detect that yesterday's data is silently missing?"
    ],
    "adjacent": []
   }
  ]
 },
 {
  "role": "frontend",
  "title": "Frontend engineer",
  "skills": [
   {
    "id": "javascript",
    "name": "JavaScript & TypeScript",
    "aliases": [
     "javascript",
     "js",
     "typescript",
     "ts",
     "es6",
     "ecmascript"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "What does this closure capture, and when could that bite you?"
    ],
    "adjacent": [
     "state-management"
    ]
   },
   {
    "id": "frameworks",
    "name": "UI frameworks",
    "aliases": [
     "react",
     "react.js",
     "reactjs",
     "next.js",
     "nextjs",
     "angular",
     "vue",
     "vue.js",
     "svelte",
     "redux",
     "hooks"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "When would you reach for a reducer instead of local state?"
    ],
    "adjacent": [
     "state-management"
    ]
   },
   {
    "id": "state-management",
    "name": "State management",
    "aliases": [
     "state management",
     "redux",
     "zustand",
     "mobx",
     "context api",
     "recoil",
     "ngrx",
     "vuex",
     "pinia",
     "store"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "Where should this state live, and who owns updating it?"
    ],
    "adjacent": [
     "async-ui"
    ]
   },
   {
    "id": "async-ui",
    "name": "Async UI & data fetching",
    "aliases": [
     "fetch",
     "axios",
     "react query",
     "tanstack query",
     "swr",
     "debounce",
     "throttle",
     "race conditions",
     "websockets",
     "promises",
     "async/await"
    ],
    "priority": 1,
    "dependsOn": [
     "javascript"
    ],
    "deeperProbes": [
     "How do you cancel a request that is no longer needed?"
    ],
    "adjacent": [
     "performance"
    ]
   },
   {
    "id": "html-css",
    "name": "HTML & CSS",
    "aliases": [
     "html",
     "html5",
     "css",
     "css3",
     "sass",
     "scss",
     "tailwind",
     "tailwindcss",
     "styled-components",
     "flexbox",
     "grid",
     "responsive design"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How would you build this layout to work from 320px to 1440px?"
    ],
    "adjacent": [
     "accessibility"
    ]
   },
   {
    "id": "accessibility",
    "name": "Accessibility",
    "aliases": [
     "accessibility",
     "a11y",
     "wcag",
     "aria",
     "screen readers",
     "keyboard navigation"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How would a keyboard-only user operate this component?"
    ],
    "adjacent": [
     "html-css"
    ]
   },
   {
    "id": "performance",
    "name": "Web performance",
    "aliases": [
     "performance",
     "web vitals",
     "core web vitals",
     "lazy loading",
     "code splitting",
     "bundle size",
     "webpack",
     "vite",
     "memoization",
     "rendering performance"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "What would you measure first if this page felt slow?"
    ],
    "adjacent": [
     "async-ui"
    ]
   },
   {
    "id": "testing",
    "name": "Frontend testing",
    "aliases": [
     "jest",
     "vitest",
     "react testing library",
     "cypress",
     "playwright",
     "unit tests",
     "e2e"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "What would you test at the unit level versus end-to-end?"
    ],
    "adjacent": []
   },
   {
    "id": "design-systems",
    "name": "Design systems",
    "aliases": [
     "design system",
     "component library",
     "storybook",
     "figma",
     "ui components"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "How do you change a shared component without breaking every screen?"
    ],
    "adjacent": []
   }
  ]
 },
 {
  "role": "fullstack",
  "title": "Full-stack engineer",
  "skills": [
   {
    "id": "api-design",
    "name": "API design",
    "aliases": [
     "rest",
     "api",
     "apis",
     "graphql",
     "trpc",
     "endpoints",
     "http"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "Which logic belongs on the server versus the client here?"
    ],
    "adjacent": [
     "frontend"
    ]
   },
   {
    "id": "frontend",
    "name": "Frontend",
    "aliases": [
     "react",
     "next.js",
     "nextjs",
     "angular",
     "vue",
     "javascript",
     "typescript",
     "html",
     "css",
     "tailwind"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How do you keep the UI consistent with the server state?"
    ],
    "adjacent": [
     "state-management"
    ]
   },
   {
    "id": "backend",
    "name": "Backend",
    "aliases": [
     "node",
     "node.js",
     "nodejs",
     "express",
     "nestjs",
     "django",
     "rails",
     "spring",
     "python",
     "java",
     "go",
     ".net"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "What would fail first under 10x traffic?"
    ],
    "adjacent": [
     "databases"
    ]
   },
   {
    "id": "databases",
    "name": "Databases",
    "aliases": [
     "sql",
     "postgres",
     "postgresql",
     "mysql",
     "mongodb",
     "prisma",
     "orm",
     "schema design"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How would you migrate this schema with zero downtime?"
    ],
    "adjacent": [
     "data-modeling"
    ]
   },
   {
    "id": "data-modeling",
    "name": "Data modeling",
    "aliases": [
     "data modeling",
     "schema",
     "normalization",
     "domain modeling"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "What invariants should the database enforce?"
    ],
    "adjacent": [
     "databases"
    ]
   },
   {
    "id": "state-management",
    "name": "State management",
    "aliases": [
     "redux",
     "zustand",
     "react query",
     "context",
     "state management"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "Where is the source of truth for this data?"
    ],
    "adjacent": [
     "frontend"
    ]
   },
   {
    "id": "error-handling",
    "name": "Error handling & validation",
    "aliases": [
     "validation",
     "zod",
     "error handling",
     "idempotency",
     "retries"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "What should the user see when this fails halfway?"
    ],
    "adjacent": [
     "api-design"
    ]
   },
   {
    "id": "auth",
    "name": "Auth & security",
    "aliases": [
     "authentication",
     "authorization",
     "oauth",
     "jwt",
     "sessions",
     "owasp",
     "security"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "Where would you enforce this permission, and why there?"
    ],
    "adjacent": [
     "api-design"
    ]
   },
   {
    "id": "deployment",
    "name": "Deployment & cloud",
    "aliases": [
     "docker",
     "aws",
     "vercel",
     "ci/cd",
     "kubernetes",
     "serverless"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "How do you roll this back safely?"
    ],
    "adjacent": []
   },
   {
    "id": "testing",
    "name": "Testing",
    "aliases": [
     "jest",
     "playwright",
     "cypress",
     "unit tests",
     "integration tests"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "Which test would have caught the last production bug?"
    ],
    "adjacent": []
   }
  ]
 },
 {
  "role": "devops",
  "title": "DevOps / SRE",
  "skills": [
   {
    "id": "observability",
    "name": "Observability",
    "aliases": [
     "monitoring",
     "observability",
     "prometheus",
     "grafana",
     "datadog",
     "new relic",
     "elk",
     "opentelemetry",
     "logging",
     "metrics",
     "tracing",
     "alerting",
     "splunk"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "Which SLO and alert would you set for this service?"
    ],
    "adjacent": [
     "reliability"
    ]
   },
   {
    "id": "release-engineering",
    "name": "Release engineering",
    "aliases": [
     "ci/cd",
     "cicd",
     "continuous delivery",
     "continuous deployment",
     "jenkins",
     "github actions",
     "gitlab ci",
     "argo cd",
     "argocd",
     "spinnaker",
     "canary",
     "blue-green",
     "blue green",
     "feature flags",
     "deployments"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How would you make this rollout automatically reversible?"
    ],
    "adjacent": [
     "reliability"
    ]
   },
   {
    "id": "reliability",
    "name": "Reliability engineering",
    "aliases": [
     "sre",
     "reliability",
     "slo",
     "slos",
     "sla",
     "error budget",
     "incident management",
     "on-call",
     "postmortem",
     "chaos engineering",
     "high availability",
     "disaster recovery"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How do you decide between shipping features and spending error budget?"
    ],
    "adjacent": [
     "observability"
    ]
   },
   {
    "id": "containers",
    "name": "Containers & orchestration",
    "aliases": [
     "docker",
     "kubernetes",
     "k8s",
     "helm",
     "eks",
     "gke",
     "aks",
     "openshift",
     "containers"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "What happens to in-flight requests when a pod is rescheduled?"
    ],
    "adjacent": [
     "infrastructure-as-code"
    ]
   },
   {
    "id": "infrastructure-as-code",
    "name": "Infrastructure as code",
    "aliases": [
     "terraform",
     "pulumi",
     "cloudformation",
     "ansible",
     "chef",
     "puppet",
     "iac",
     "infrastructure as code"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How do you prevent drift between code and reality?"
    ],
    "adjacent": [
     "cloud"
    ]
   },
   {
    "id": "cloud",
    "name": "Cloud platforms",
    "aliases": [
     "aws",
     "gcp",
     "azure",
     "ec2",
     "s3",
     "vpc",
     "iam",
     "cloud"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How would you cut this bill by 30% without hurting reliability?"
    ],
    "adjacent": [
     "networking"
    ]
   },
   {
    "id": "networking",
    "name": "Networking",
    "aliases": [
     "networking",
     "dns",
     "load balancer",
     "load balancing",
     "tcp/ip",
     "http",
     "nginx",
     "envoy",
     "service mesh",
     "istio",
     "cdn",
     "tls"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "A request times out intermittently — where do you look first?"
    ],
    "adjacent": [
     "observability"
    ]
   },
   {
    "id": "scripting",
    "name": "Scripting & automation",
    "aliases": [
     "bash",
     "shell",
     "python",
     "go",
     "scripting",
     "automation"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How would you make this script safe to re-run?"
    ],
    "adjacent": []
   },
   {
    "id": "security",
    "name": "Platform security",
    "aliases": [
     "secrets management",
     "vault",
     "iam",
     "least privilege",
     "devsecops",
     "vulnerability scanning",
     "compliance"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "How do secrets reach the app without living in the repo?"
    ],
    "adjacent": []
   }
  ]
 },
 {
  "role": "mobile",
  "title": "Mobile engineer",
  "skills": [
   {
    "id": "platform",
    "name": "Mobile platforms",
    "aliases": [
     "android",
     "ios",
     "kotlin",
     "swift",
     "objective-c",
     "java",
     "swiftui",
     "jetpack compose",
     "uikit"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How does the OS lifecycle affect this screen?"
    ],
    "adjacent": [
     "state-management"
    ]
   },
   {
    "id": "cross-platform",
    "name": "Cross-platform frameworks",
    "aliases": [
     "react native",
     "flutter",
     "dart",
     "expo",
     "xamarin",
     "kotlin multiplatform"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "What would push you to write this part natively?"
    ],
    "adjacent": [
     "platform"
    ]
   },
   {
    "id": "state-management",
    "name": "State management",
    "aliases": [
     "state management",
     "redux",
     "bloc",
     "provider",
     "mvvm",
     "mvi",
     "viewmodel",
     "livedata",
     "combine",
     "riverpod"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "Where does this state survive a process death?"
    ],
    "adjacent": [
     "offline-sync"
    ]
   },
   {
    "id": "offline-sync",
    "name": "Offline & sync",
    "aliases": [
     "offline",
     "offline-first",
     "sync",
     "synchronization",
     "conflict resolution",
     "local storage",
     "sqlite",
     "realm",
     "room",
     "core data",
     "caching"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How do you resolve two devices editing the same record?"
    ],
    "adjacent": [
     "networking"
    ]
   },
   {
    "id": "networking",
    "name": "Networking & APIs",
    "aliases": [
     "rest",
     "graphql",
     "retrofit",
     "alamofire",
     "okhttp",
     "websockets",
     "push notifications",
     "fcm",
     "apns"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How do you handle a flaky network mid-request?"
    ],
    "adjacent": [
     "offline-sync"
    ]
   },
   {
    "id": "performance",
    "name": "App performance",
    "aliases": [
     "performance",
     "memory leaks",
     "battery",
     "startup time",
     "rendering",
     "profiling",
     "instruments",
     "android profiler"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "What would you measure if the list scrolls janky?"
    ],
    "adjacent": [
     "platform"
    ]
   },
   {
    "id": "data-modeling",
    "name": "Local data modeling",
    "aliases": [
     "data modeling",
     "schema migrations",
     "database migrations",
     "persistence"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How do you migrate the local DB across app versions?"
    ],
    "adjacent": [
     "offline-sync"
    ]
   },
   {
    "id": "release",
    "name": "App release",
    "aliases": [
     "app store",
     "play store",
     "testflight",
     "fastlane",
     "ci/cd",
     "crashlytics",
     "feature flags"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "How do you roll back a bad release when users do not update?"
    ],
    "adjacent": []
   },
   {
    "id": "testing",
    "name": "Mobile testing",
    "aliases": [
     "espresso",
     "xctest",
     "detox",
     "unit tests",
     "ui tests"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "What is worth an on-device UI test here?"
    ],
    "adjacent": []
   }
  ]
 },
 {
  "role": "ml",
  "title": "ML / AI engineer",
  "skills": [
   {
    "id": "model-evaluation",
    "name": "Model evaluation",
    "aliases": [
     "evaluation",
     "metrics",
     "precision",
     "recall",
     "f1",
     "auc",
     "roc",
     "cross-validation",
     "validation",
     "a/b testing",
     "offline evaluation",
     "benchmarks"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "Which metric would you optimise here, and what could it hide?"
    ],
    "adjacent": [
     "statistics"
    ]
   },
   {
    "id": "ml-fundamentals",
    "name": "ML fundamentals",
    "aliases": [
     "machine learning",
     "ml",
     "supervised learning",
     "classification",
     "regression",
     "feature engineering",
     "overfitting",
     "regularization",
     "scikit-learn",
     "sklearn",
     "xgboost",
     "lightgbm"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "How would you tell overfitting from a data leak?"
    ],
    "adjacent": [
     "model-evaluation"
    ]
   },
   {
    "id": "deep-learning",
    "name": "Deep learning",
    "aliases": [
     "deep learning",
     "neural networks",
     "pytorch",
     "tensorflow",
     "keras",
     "transformers",
     "cnn",
     "rnn",
     "fine-tuning",
     "nlp",
     "computer vision"
    ],
    "priority": 1,
    "dependsOn": [],
    "deeperProbes": [
     "Why this architecture over a simpler baseline?"
    ],
    "adjacent": [
     "ml-fundamentals"
    ]
   },
   {
    "id": "statistics",
    "name": "Statistics",
    "aliases": [
     "statistics",
     "probability",
     "hypothesis testing",
     "statistical significance",
     "bayesian",
     "experimentation",
     "confidence intervals"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How confident are you in this difference between two models?"
    ],
    "adjacent": [
     "model-evaluation"
    ]
   },
   {
    "id": "data-processing",
    "name": "Data processing",
    "aliases": [
     "python",
     "pandas",
     "numpy",
     "sql",
     "spark",
     "feature stores",
     "data pipelines",
     "data preprocessing"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How do you guarantee training and serving features match?"
    ],
    "adjacent": [
     "mlops"
    ]
   },
   {
    "id": "mlops",
    "name": "MLOps & deployment",
    "aliases": [
     "mlops",
     "model serving",
     "model deployment",
     "mlflow",
     "kubeflow",
     "sagemaker",
     "vertex ai",
     "monitoring",
     "drift",
     "model monitoring",
     "docker"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How would you detect this model degrading in production?"
    ],
    "adjacent": [
     "data-processing"
    ]
   },
   {
    "id": "llm",
    "name": "LLMs & generative AI",
    "aliases": [
     "llm",
     "llms",
     "large language models",
     "generative ai",
     "genai",
     "rag",
     "prompt engineering",
     "embeddings",
     "vector database",
     "langchain",
     "openai",
     "anthropic"
    ],
    "priority": 2,
    "dependsOn": [],
    "deeperProbes": [
     "How do you evaluate an LLM feature before shipping it?"
    ],
    "adjacent": [
     "model-evaluation"
    ]
   },
   {
    "id": "data-structures",
    "name": "Algorithms & data structures",
    "aliases": [
     "algorithms",
     "data structures",
     "hash map"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "What is the complexity of this evaluation for 10M predictions?"
    ],
    "adjacent": []
   },
   {
    "id": "responsible-ai",
    "name": "Responsible AI",
    "aliases": [
     "fairness",
     "bias",
     "explainability",
     "shap",
     "interpretability",
     "responsible ai",
     "privacy"
    ],
    "priority": 3,
    "dependsOn": [],
    "deeperProbes": [
     "How would you check this model for bias across user groups?"
    ],
    "adjacent": []
   }
  ]
 }
]
