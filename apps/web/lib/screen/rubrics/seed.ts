import type { RubricContent } from './types'

// ── Levl1 SAMPLE rubrics (Screen-scoped) ───────────────────────────────────
// Examples of the proficiency-statement template for two areas. They are
// SAMPLES: loaded into an agency as draft + isSample, and must be reviewed by
// someone who knows the domain before they can be selected for a live
// interview. This is NOT a production library — the library's value is
// curated content written and reviewed by domain experts.

export interface SampleRubric extends RubricContent { key: string }

export const SAMPLE_RUBRICS: SampleRubric[] = [
  /* ── Oracle E-Business Suite ─────────────────────────────────────────── */
  {
    key: 'oracle-integration-dev',
    area: 'Oracle E-Business Suite', subSkill: 'Oracle Integration Development',
    proficientIn: 'PL/SQL, Oracle Integration Cloud / SOA Suite, open interfaces and public APIs, concurrent programs and XML/BI Publisher',
    ableTo: 'design, build and troubleshoot inbound and outbound integrations between EBS and external systems, including error handling and reprocessing',
    practices: 'using standard open interfaces and APIs instead of direct base-table writes, idempotent and restartable loads, and clear error logging',
    strong: 'Names specific open interface tables or APIs they used, explains validation and error tables, describes how failed records were reprocessed, and why base tables are never written directly.',
    weak: 'Talks about "inserting into the tables" with no mention of interfaces, APIs or validation; no story about handling failed or duplicate records.',
    keywords: ['Oracle EBS', 'E-Business Suite', 'PL/SQL', 'Oracle Integration Cloud', 'SOA Suite', 'open interface', 'concurrent program', 'BI Publisher'],
    probes: [
      { question: 'Walk me through an inbound integration you built into EBS. How did data get from the source system into the base tables?', strongAnswer: 'Staging → open interface or public API → standard import program; validation and error tables; reprocessing of rejected rows.', weakSignals: 'Direct inserts into base tables; no validation or error path.' },
      { question: 'An integration run fails halfway. How do you make sure re-running it doesn\'t create duplicates?', strongAnswer: 'Idempotency keys or status flags, restartable batches, reconciling counts against the source.', weakSignals: '"We just rerun it" with no duplicate protection.' },
    ],
  },
  {
    key: 'oracle-ebs-wms',
    area: 'Oracle E-Business Suite', subSkill: 'EBS Warehouse Management (WMS)',
    proficientIn: 'Oracle WMS setup — subinventories and locators, rules engine (picking and putaway), LPNs, task types and mobile transactions',
    ableTo: 'configure and troubleshoot warehouse flows from receiving through putaway, picking, packing and shipping',
    practices: 'rule-based allocation over manual overrides, testing rule changes in a sandbox before production, and reconciling on-hand to physical counts',
    strong: 'Explains how the rules engine chooses locators or lots, how LPNs move through the flow, and a real issue they debugged (e.g. allocation picking the wrong lot).',
    weak: 'Only generic inventory terms; cannot explain picking or putaway rules or LPN behaviour.',
    keywords: ['Oracle WMS', 'WMS', 'Warehouse Management', 'LPN', 'putaway', 'picking rules', 'rules engine', 'locator'],
    probes: [
      { question: 'How does the WMS rules engine decide where to put away a received item?', strongAnswer: 'Putaway rules with restrictions and sort criteria, strategy assignment, capacity and locator checks.', weakSignals: '"The system decides" — no rules or strategy detail.' },
      { question: 'Pickers keep getting directed to an expired lot. Where do you look?', strongAnswer: 'Picking rule sort (FEFO/FIFO), lot status and expiry setup, strategy assignment order.', weakSignals: 'Suggests manual overrides with no root cause.' },
    ],
  },
  {
    key: 'oracle-inventory-order-lifecycle',
    area: 'Oracle E-Business Suite', subSkill: 'Inventory & Order Lifecycle (O2C)',
    proficientIn: 'Order Management, Shipping Execution, Inventory and AR touchpoints — order types, workflows, holds, reservations, pick release and ship confirm',
    ableTo: 'trace an order end to end from booking to invoice and diagnose where it is stuck',
    practices: 'reading order and line workflow status before changing data, using standard progression APIs, and root-causing recurring holds',
    strong: 'Traces an order through booking, scheduling, pick release, ship confirm, interface trip stop and AutoInvoice; names the workflow statuses and tables they check.',
    weak: 'Knows the process only at slide level; no idea how to find where an order is stuck.',
    keywords: ['Order Management', 'Order to Cash', 'O2C', 'Shipping Execution', 'pick release', 'ship confirm', 'AutoInvoice', 'Oracle Inventory'],
    probes: [
      { question: 'An order line has been "Awaiting Shipping" for two days. How do you investigate?', strongAnswer: 'Check delivery and pick release status, reservations and on-hand, holds, workflow status and the shipping exceptions report.', weakSignals: 'Jumps to updating the status directly.' },
    ],
  },
  {
    key: 'oracle-financials-gl-ap-ar',
    area: 'Oracle E-Business Suite', subSkill: 'Financials (GL / AP / AR)',
    proficientIn: 'General Ledger, Payables and Receivables setup — ledgers, calendars, accounting flexfields, Subledger Accounting and period close',
    ableTo: 'configure and support the period-close process and resolve subledger-to-GL reconciliation differences',
    practices: 'SLA-based accounting rules over manual journals, documented close checklists, and reconciling subledger to GL before close',
    strong: 'Explains how a transaction flows through SLA into GL, describes a close they ran, and how they reconciled an AP or AR difference.',
    weak: 'Only accounting theory, or describes posting manual journals to "fix" differences.',
    keywords: ['Oracle Financials', 'General Ledger', 'Payables', 'Receivables', 'Subledger Accounting', 'SLA', 'period close'],
    probes: [
      { question: 'AP and GL don\'t reconcile at month end. Walk me through how you find the difference.', strongAnswer: 'Unaccounted transactions, the Create Accounting run, SLA journal entries, trial balance vs GL account analysis, transfer status.', weakSignals: 'Posts an adjusting journal without finding the cause.' },
    ],
  },
  {
    key: 'oracle-hcm-core',
    area: 'Oracle E-Business Suite', subSkill: 'HCM (Core HR & Payroll)',
    proficientIn: 'Core HR — people, assignments, organisations, jobs and positions, date-tracking, and payroll elements and processing',
    ableTo: 'configure HR and payroll setups and support payroll runs, including retro pay and costing issues',
    practices: 'respecting date-track history (correction vs update), parallel runs before payroll changes go live, and secure handling of employee data',
    strong: 'Explains date-track correction vs update with an example, how elements and links drive payroll, and how they validated a payroll change.',
    weak: 'Cannot explain date-tracking; treats payroll changes as simple data edits.',
    keywords: ['Oracle HCM', 'Oracle HRMS', 'Core HR', 'Oracle Payroll', 'date-track', 'payroll elements'],
    probes: [
      { question: 'An employee\'s salary change was entered with the wrong effective date. How do you correct it?', strongAnswer: 'Date-track correction vs update, impact on processed payrolls, retro pay handling.', weakSignals: 'Edits the record with no thought for history or retro.' },
    ],
  },

  /* ── .NET Full Stack ─────────────────────────────────────────────────── */
  {
    key: 'dotnet-csharp-core',
    area: '.NET Full Stack', subSkill: 'C# & .NET Core fundamentals',
    proficientIn: 'C# (generics, LINQ, async/await, nullable reference types) and the .NET runtime — dependency injection, configuration and logging',
    ableTo: 'write and debug idiomatic, async-safe C# services and explain what the runtime does under the hood',
    practices: 'async all the way (no .Result or .Wait()), disposing resources correctly, and constructor-injected dependencies with explicit lifetimes',
    strong: 'Explains why blocking on async causes deadlocks or thread starvation, chooses scoped vs singleton correctly, and uses LINQ without hidden multiple enumeration.',
    weak: 'Uses .Result to "make it work"; cannot explain DI lifetimes or what async/await actually does.',
    keywords: ['C#', '.NET', '.NET Core', 'LINQ', 'async/await', 'dependency injection'],
    probes: [
      { question: 'A request handler calls an async method with .Result and the service slows down under load. What\'s happening?', strongAnswer: 'Thread-pool starvation or sync-over-async deadlock; await through the call chain.', weakSignals: '"Add more threads" or no idea.' },
      { question: 'When would you register a service as scoped rather than singleton?', strongAnswer: 'Per-request state such as DbContext; the captive-dependency problem of injecting scoped into singleton.', weakSignals: 'Treats lifetimes as interchangeable.' },
    ],
  },
  {
    key: 'dotnet-aspnet-core-api',
    area: '.NET Full Stack', subSkill: 'ASP.NET Core Web APIs',
    proficientIn: 'ASP.NET Core — routing, middleware, model binding and validation, authentication/authorization, and REST API design',
    ableTo: 'design and build secure, versioned REST APIs and debug request-pipeline issues',
    practices: 'consistent resource-oriented design, proper status codes and problem details, input validation at the boundary, and least-privilege authorization',
    strong: 'Describes the middleware order and why it matters (auth before endpoints), designs idempotent endpoints, and handles validation and errors consistently.',
    weak: 'Returns 200 for everything; puts auth checks inside controllers ad hoc; cannot describe the pipeline.',
    keywords: ['ASP.NET', 'ASP.NET Core', 'Web API', 'REST', 'middleware', 'JWT'],
    probes: [
      { question: 'Design the endpoints for creating and paying an order. How do you stop a double-charge when the client retries?', strongAnswer: 'Idempotency key, correct status codes, transactional handling, returning the original result on retry.', weakSignals: 'No retry or idempotency thinking.' },
    ],
  },
  {
    key: 'dotnet-ef-sqlserver',
    area: '.NET Full Stack', subSkill: 'Entity Framework Core & SQL Server',
    proficientIn: 'EF Core (migrations, tracking, loading strategies) and SQL Server (indexes, execution plans, transactions)',
    ableTo: 'model data, write efficient queries and diagnose slow or N+1 data access',
    practices: 'projecting only needed columns, avoiding N+1 with explicit loading strategies, reviewing generated SQL, and versioned migrations',
    strong: 'Spots N+1 from a code sample, reads an execution plan, chooses AsNoTracking for reads, and explains an index they added and why.',
    weak: 'Loads whole tables into memory and filters in C#; has never looked at generated SQL.',
    keywords: ['Entity Framework', 'EF Core', 'SQL Server', 'T-SQL', 'migrations', 'indexes'],
    probes: [
      { question: 'A page that lists orders with customer names is slow. What do you check first?', strongAnswer: 'N+1 queries, Include or projection, generated SQL, indexes on the join and filter columns.', weakSignals: 'Adds caching without measuring.' },
    ],
  },
  {
    key: 'dotnet-angular-frontend',
    area: '.NET Full Stack', subSkill: 'Angular front end',
    proficientIn: 'Angular (components, RxJS, services, routing, forms) and TypeScript',
    ableTo: 'build maintainable, performant UI features that integrate with .NET APIs',
    practices: 'unsubscribing or using the async pipe, OnPush change detection where it fits, typed reactive forms, and keeping logic in services',
    strong: 'Explains subscription leaks and how they avoid them, when to use switchMap vs mergeMap, and how they structured state.',
    weak: 'Subscribes everywhere without cleanup; puts API calls directly in components.',
    keywords: ['Angular', 'TypeScript', 'RxJS', 'reactive forms'],
    probes: [
      { question: 'A search box fires an API call on every keystroke and results arrive out of order. How do you fix it?', strongAnswer: 'debounceTime plus distinctUntilChanged plus switchMap, which cancels stale requests.', weakSignals: 'A setTimeout hack; no idea about stale responses.' },
    ],
  },
  {
    key: 'dotnet-azure-devops',
    area: '.NET Full Stack', subSkill: 'Azure deployment & CI/CD',
    proficientIn: 'Azure App Service or containers, Azure SQL, Key Vault and CI/CD pipelines (Azure DevOps or GitHub Actions)',
    ableTo: 'deploy, configure and monitor .NET applications safely across environments',
    practices: 'secrets in Key Vault (never in config files), infrastructure as code, automated tests in the pipeline, and staged rollouts with rollback',
    strong: 'Describes their pipeline stages, how secrets reach the app, and a rollback they performed.',
    weak: 'Deploys from Visual Studio by hand; keeps connection strings in appsettings in source control.',
    keywords: ['Azure', 'Azure DevOps', 'CI/CD', 'App Service', 'Key Vault', 'GitHub Actions'],
    probes: [
      { question: 'How does your app get its database password in production?', strongAnswer: 'Managed identity plus Key Vault references; nothing in source control; rotation.', weakSignals: 'appsettings.json committed or a shared secret file.' },
    ],
  },
]
