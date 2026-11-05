// ── SAMPLE technical content (Screen-scoped) ───────────────────────────────
// Working EXAMPLES of the task-bank structure — NOT a production bank. They load
// as status "draft" with isSample=true and must be human-reviewed (by someone
// who hires for the role) before being marked active. Test expected outputs
// were produced by running the reference solutions, not written by hand.
// Real content is authored separately into this structure.

export interface SampleTask {
  key: string; title: string; prompt: string; roles: string[]; skills: string[]
  difficulty: string; experienceMin: number; experienceMax: number; languages: string[]
  starterCode: Record<string, string>
  tests: { id: string; name: string; input: string; expected: string; hidden: boolean }[]
  referenceSolution: string; referenceLanguage: string; minutes: number
  rubric: { criteria: unknown[]; probes: unknown[] }
}

export const SAMPLE_TASKS: SampleTask[] = [
  {
    "key": "sample-rate-limiter",
    "title": "Per-client rate limiter (SAMPLE)",
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
      "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\nconst [n, w] = lines[0].split(' ').map(Number)\n// TODO: decide ALLOW / DENY for each request\n"
    },
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
      }
    ],
    "referenceSolution": "import sys\nfrom collections import deque, defaultdict\n\ndef main():\n    data = sys.stdin.read().split('\\n')\n    first = data[0].split()\n    n, w = int(first[0]), int(first[1])\n    allowed = defaultdict(deque)   # client -> timestamps of ALLOWED requests\n    out = []\n    for line in data[1:]:\n        parts = line.split()\n        if len(parts) != 2:\n            continue\n        client, t = parts[0], int(parts[1])\n        q = allowed[client]\n        while q and q[0] <= t - w:      # window is (t - w, t]\n            q.popleft()\n        if len(q) < n:\n            q.append(t)\n            out.append('ALLOW')\n        else:\n            out.append('DENY')\n    print('\\n'.join(out))\n\nmain()\n",
    "referenceLanguage": "python",
    "minutes": 12,
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
    }
  },
  {
    "key": "sample-dau",
    "title": "Daily active users from a raw event log (SAMPLE)",
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
      "python": "import sys\n\ndef main():\n    for raw in sys.stdin.read().split(\"\\n\"):\n        pass  # TODO: parse, validate, aggregate\n\nmain()\n"
    },
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
      }
    ],
    "referenceSolution": "import sys\nfrom collections import defaultdict\n\ndef main():\n    days = defaultdict(set)\n    skipped = 0\n    for raw in sys.stdin.read().split('\\n'):\n        line = raw.strip()\n        if not line:\n            continue\n        parts = [p.strip() for p in line.split(',')]\n        if len(parts) != 3 or not parts[0] or len(parts[2]) < 10:\n            skipped += 1\n            continue\n        user, _event, ts = parts\n        day = ts[:10]\n        if not (day[4] == '-' and day[7] == '-' and day.replace('-', '').isdigit()):\n            skipped += 1\n            continue\n        days[day].add(user)\n    for day in sorted(days):\n        print(f\"{day},{len(days[day])}\")\n    print(f\"skipped={skipped}\")\n\nmain()\n",
    "referenceLanguage": "python",
    "minutes": 10,
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
    }
  }
]

export const SAMPLE_SKILL_MAPS: { role: string; title: string; skills: unknown[] }[] = [
  {
    "role": "backend",
    "title": "Backend engineer (SAMPLE)",
    "skills": [
      {
        "id": "api-design",
        "name": "API design",
        "aliases": [
          "rest",
          "api",
          "grpc",
          "http",
          "endpoints"
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
          "hash map",
          "queue",
          "deque",
          "complexity"
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
          "indexing",
          "orm"
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
        "id": "concurrency",
        "name": "Concurrency",
        "aliases": [
          "threads",
          "async",
          "locking",
          "race condition",
          "parallelism"
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
          "cache"
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
          "quota"
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
          "messaging",
          "consistency",
          "event-driven"
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
          "fault tolerance"
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
        "id": "testing",
        "name": "Testing",
        "aliases": [
          "unit tests",
          "integration tests",
          "tdd"
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
          "monitoring"
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
    "title": "Data engineer (SAMPLE)",
    "skills": [
      {
        "id": "sql",
        "name": "SQL",
        "aliases": [
          "sql optimization",
          "query",
          "joins",
          "window functions",
          "postgres",
          "snowflake",
          "bigquery"
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
          "star schema",
          "dimensional",
          "normalization"
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
          "pipeline",
          "airflow",
          "dbt",
          "spark",
          "orchestration",
          "batch"
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
          "validation",
          "malformed",
          "dedupe",
          "deduplication",
          "data cleaning"
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
          "distinct count"
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
        "id": "data-structures",
        "name": "Data structures",
        "aliases": [
          "hash map",
          "sets",
          "dictionaries"
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
        "id": "performance",
        "name": "Performance & scale",
        "aliases": [
          "partitioning",
          "spark tuning",
          "big data",
          "streaming"
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
        "id": "observability",
        "name": "Pipeline observability",
        "aliases": [
          "monitoring",
          "alerts",
          "sla",
          "freshness"
        ],
        "priority": 3,
        "dependsOn": [],
        "deeperProbes": [
          "How would you detect that yesterday's data is silently missing?"
        ],
        "adjacent": []
      }
    ]
  }
]
