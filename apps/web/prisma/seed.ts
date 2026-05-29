import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number, hour = 14, minute = 30): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, minute, 0, 0)
  return d
}

async function main() {
  console.log('🌱 Seeding database...')

  // ── Clear existing data (respect FK constraints) ──────────────────────
  await prisma.positionReport.deleteMany()
  await prisma.report.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.questionSet.deleteMany()
  await prisma.candidate.deleteMany()
  await prisma.position.deleteMany()
  await prisma.user.deleteMany()
  await prisma.agency.deleteMany()

  console.log('  cleared existing data')

  // ── Agency ────────────────────────────────────────────────────────────
  const agency = await prisma.agency.create({
    data: {
      name: 'HireEdge Recruitment',
      website: 'https://hireedge.example.com',
      plan: 'agency',
    },
  })
  console.log('  created agency', agency.name)

  // ── Positions ─────────────────────────────────────────────────────────
  const positionBI = await prisma.position.create({
    data: {
      title: 'Technology Manager — Business Intelligence',
      company: 'FinEdge Technologies',
      department: 'Data & Analytics',
      roleType: 'Team Lead',
      experienceLevel: '8–12 years',
      primaryDomain: 'Business Intelligence',
      techStack: ['Snowflake', 'dbt', 'Tableau', 'Airflow', 'Python'],
      goodToHave: ['Kafka', 'Spark', 'AWS'],
      domainContext: 'Fintech',
      companyStage: 'Scale-up',
      workMode: 'hybrid',
      interviewDuration: 30,
      status: 'active',
      techLeadApproved: true,
      hrApproved: true,
      techLeadEmail: 'techlead@finedge.com',
      hrEmail: 'hr@finedge.com',
      dynamicIntensity: 'standard',
      agencyId: agency.id,
      jdText:
        'FinEdge Technologies is hiring a Technology Manager — Business Intelligence to lead our analytics platform. You will own the Snowflake + dbt stack, mentor a team of BI engineers, and partner with Finance and Product leadership to deliver executive-grade reporting.',
    },
  })

  const positionRisk = await prisma.position.create({
    data: {
      title: 'IT Risk & Compliance Manager',
      company: 'SecureAxis Technologies',
      department: 'GRC',
      roleType: 'People Manager',
      experienceLevel: '8–12 years',
      primaryDomain: 'IT Risk & Compliance',
      techStack: ['SOX ITGC', 'SOC 2', 'HITRUST', 'Vanta', 'AuditBoard'],
      goodToHave: ['ISO 27001', 'ServiceNow GRC'],
      domainContext: 'Enterprise IT',
      companyStage: 'Large Enterprise',
      workMode: 'hybrid',
      interviewDuration: 30,
      status: 'active',
      techLeadApproved: true,
      hrApproved: true,
      techLeadEmail: 'ciso@secureaxis.com',
      hrEmail: 'hr@secureaxis.com',
      dynamicIntensity: 'standard',
      agencyId: agency.id,
      jdText:
        'SecureAxis Technologies seeks an IT Risk & Compliance Manager to lead our SOX, SOC 2, and HITRUST programs. You will manage a team of analysts, partner with external auditors, and own ITGC evidence collection workflows in Vanta and AuditBoard.',
    },
  })

  const positionDE = await prisma.position.create({
    data: {
      title: 'Senior Data Engineer',
      company: 'PayScale India',
      department: 'Engineering',
      roleType: 'IC',
      experienceLevel: '5–8 years',
      primaryDomain: 'Data Engineering',
      techStack: ['Spark', 'Kafka', 'Databricks', 'Python', 'AWS'],
      goodToHave: ['Airflow', 'dbt', 'Snowflake'],
      domainContext: 'Fintech',
      companyStage: 'Growth Stage',
      workMode: 'hands-on',
      interviewDuration: 30,
      status: 'pending_approval',
      techLeadApproved: true,
      hrApproved: false,
      techLeadEmail: 'engmgr@payscale.in',
      hrEmail: 'hr@payscale.in',
      dynamicIntensity: 'standard',
      agencyId: agency.id,
      jdText:
        'PayScale India is hiring a Senior Data Engineer to scale our event-driven analytics platform. You will own Kafka streaming pipelines, Spark transformations on Databricks, and AWS-based data infrastructure.',
    },
  })

  console.log('  created 3 positions')

  // ── Candidates ────────────────────────────────────────────────────────
  const divya = await prisma.candidate.create({
    data: {
      name: 'Divya Sharma',
      email: 'divya.sharma@email.com',
      phone: '+91 98111 22001',
      linkedIn: 'https://linkedin.com/in/divya-sharma-bi',
      currentTitle: 'Senior BI Manager',
      currentCompany: 'DataScale India',
      totalYears: 11,
      topSkills: ['Snowflake', 'dbt', 'Tableau', 'Python', 'SQL'],
      educationSummary: 'B.Tech CS, IIT Bombay · MBA, ISB Hyderabad',
      positionId: positionBI.id,
      status: 'completed',
      uploadedAt: daysAgo(5),
      invitedAt: daysAgo(5),
      scheduledAt: daysAgo(3),
      interviewedAt: daysAgo(3),
      score: 91,
      recommendation: 'strong_yes',
    },
  })

  const rohan = await prisma.candidate.create({
    data: {
      name: 'Rohan Krishnamurthy',
      email: 'rohan.k@email.com',
      phone: '+91 98111 22002',
      linkedIn: 'https://linkedin.com/in/rohan-krishnamurthy',
      currentTitle: 'Manager — Business Intelligence',
      currentCompany: 'FinCloud Analytics',
      totalYears: 9,
      topSkills: ['Snowflake', 'dbt', 'Tableau', 'Airflow', 'Python'],
      educationSummary: 'B.E. Computer Science, BITS Pilani',
      positionId: positionBI.id,
      status: 'completed',
      uploadedAt: daysAgo(5),
      invitedAt: daysAgo(5),
      scheduledAt: daysAgo(3),
      interviewedAt: daysAgo(3),
      score: 82,
      recommendation: 'yes',
    },
  })

  const priya = await prisma.candidate.create({
    data: {
      name: 'Priya Venkatesh',
      email: 'priya.v@email.com',
      phone: '+91 98111 22003',
      currentTitle: 'BI Lead',
      currentCompany: 'Analytics Hub',
      totalYears: 8,
      topSkills: ['Tableau', 'SQL', 'Power BI', 'Python'],
      educationSummary: 'B.Tech, NIT Trichy',
      positionId: positionBI.id,
      status: 'completed',
      uploadedAt: daysAgo(5),
      invitedAt: daysAgo(5),
      scheduledAt: daysAgo(2),
      interviewedAt: daysAgo(2),
      score: 74,
      recommendation: 'maybe',
    },
  })

  const archita = await prisma.candidate.create({
    data: {
      name: 'Archita Mishra',
      email: 'archita.mishra@email.com',
      phone: '+91 98111 22004',
      linkedIn: 'https://linkedin.com/in/archita-mishra-grc',
      currentTitle: 'Senior IT Risk Consultant',
      currentCompany: 'SecureAudit LLP',
      totalYears: 9,
      topSkills: ['SOX ITGC', 'SOC 2', 'HITRUST', 'Vanta', 'CISA'],
      educationSummary: 'B.Com, Delhi University · CISA Certified',
      positionId: positionRisk.id,
      status: 'scheduled',
      uploadedAt: daysAgo(2),
      invitedAt: daysAgo(2),
      scheduledAt: daysFromNow(1, 14, 30),
    },
  })

  const rahul = await prisma.candidate.create({
    data: {
      name: 'Rahul Shetty',
      email: 'rahul.shetty@email.com',
      phone: '+91 98111 22005',
      currentTitle: 'IT Audit Manager',
      currentCompany: 'RiskFirst Consulting',
      totalYears: 7,
      topSkills: ['SOX', 'ISO 27001', 'ServiceNow GRC'],
      educationSummary: 'B.Com, Mumbai University · CIA Certified',
      positionId: positionRisk.id,
      status: 'pending',
      uploadedAt: daysAgo(1),
    },
  })

  const karan = await prisma.candidate.create({
    data: {
      name: 'Karan Mehta',
      email: 'karan.mehta@email.com',
      phone: '+91 98111 22006',
      currentTitle: 'Data Engineer',
      currentCompany: 'PayScale India',
      totalYears: 6,
      topSkills: ['Spark', 'Kafka', 'Python', 'AWS', 'Databricks'],
      educationSummary: 'B.Tech, IIIT Hyderabad',
      positionId: positionDE.id,
      status: 'pending',
      uploadedAt: daysAgo(1),
    },
  })

  console.log('  created 6 candidates')

  // ── Interviews (for completed candidates) ─────────────────────────────
  await prisma.interview.create({
    data: {
      candidateId: divya.id,
      positionId: positionBI.id,
      status: 'completed',
      scheduledAt: daysAgo(3),
      startedAt: daysAgo(3),
      completedAt: daysAgo(3),
      duration: 30,
      actualDuration: 32,
      agentOnline: true,
      candidateJoined: true,
      runningScore: 91,
    },
  })

  await prisma.interview.create({
    data: {
      candidateId: rohan.id,
      positionId: positionBI.id,
      status: 'completed',
      scheduledAt: daysAgo(3),
      startedAt: daysAgo(3),
      completedAt: daysAgo(3),
      duration: 30,
      actualDuration: 29,
      agentOnline: true,
      candidateJoined: true,
      runningScore: 82,
    },
  })

  await prisma.interview.create({
    data: {
      candidateId: priya.id,
      positionId: positionBI.id,
      status: 'completed',
      scheduledAt: daysAgo(2),
      startedAt: daysAgo(2),
      completedAt: daysAgo(2),
      duration: 30,
      actualDuration: 31,
      agentOnline: true,
      candidateJoined: true,
      runningScore: 74,
    },
  })

  // Scheduled interview for Archita
  await prisma.interview.create({
    data: {
      candidateId: archita.id,
      positionId: positionRisk.id,
      status: 'scheduled',
      scheduledAt: daysFromNow(1, 14, 30),
      duration: 30,
      agentOnline: false,
      candidateJoined: false,
    },
  })

  console.log('  created 4 interviews')

  // ── Reports for completed candidates ──────────────────────────────────
  await prisma.report.create({
    data: {
      candidateId: divya.id,
      overallScore: 91,
      recommendation: 'strong_yes',
      professionalSummary:
        'Divya presents as an exceptionally strong candidate for the Technology Manager — BI role. With 11 years of experience, she demonstrated deep hands-on expertise in Snowflake and dbt, articulated a clear vision for data governance, and showed strong stakeholder management capabilities. Her answers on data mesh architecture and cross-functional collaboration were particularly impressive.',
      sectionScores: {
        technical: { score: 88, outOf: 100 },
        scenario: { score: 92, outOf: 100 },
        behavioral: { score: 91, outOf: 100 },
        eq: { score: 94, outOf: 100 },
        whiteboard: { score: 89, outOf: 100 },
      },
      strengthAreas: [
        'Deep Snowflake and dbt expertise with production-scale implementation experience',
        'Exceptional stakeholder management — clearly articulated how she aligns business and technical priorities',
        'Strong self-awareness and emotional intelligence — handled failure scenario with maturity',
        'Proactive approach to data quality and governance',
      ],
      concernAreas: [
        'Limited exposure to streaming data architectures (Kafka/Flink)',
        'Could strengthen knowledge of data mesh organizational patterns',
      ],
      questionWiseEvaluation: [
        {
          questionId: 'tq1',
          questionText: 'Walk me through how you optimised Snowflake compute costs at scale.',
          score: 9,
          evaluatorNote: 'Quantified the impact with a ₹18L cost reduction figure.',
        },
        {
          questionId: 'sq1',
          questionText: 'Design a real-time analytics pipeline for 10M daily transactions.',
          score: 9,
          evaluatorNote: 'Strong architectural choice with Kafka + Snowpipe.',
        },
        {
          questionId: 'bq1',
          questionText: 'Tell me about influencing senior stakeholders on tech debt.',
          score: 9,
          evaluatorNote: 'Excellent — translated tech debt into Finance language.',
        },
      ],
      transcriptHighlights: [
        {
          quote:
            'We reduced Snowflake compute by ₹18 lakhs through warehouse right-sizing and 60-second auto-suspend.',
          context: 'Technical — cost optimisation',
        },
        {
          quote:
            'I translated tech debt risk into SLA penalty exposure — Finance got onboard immediately.',
          context: 'Behavioral — stakeholder influence',
        },
      ],
      hrNote:
        'Divya is a standout candidate. Recommend fast-tracking to final round. She mentioned she is actively interviewing and has a competing offer timeline of 10 days.',
      l2Recommendation:
        'Strong Hire. Divya has the technical depth, leadership maturity, and communication skills to excel in this role. Her track record of building BI functions from scratch at DataScale India is directly relevant. Recommend proceeding immediately.',
    },
  })

  await prisma.report.create({
    data: {
      candidateId: rohan.id,
      overallScore: 82,
      recommendation: 'yes',
      professionalSummary:
        'Rohan is a solid candidate with strong technical fundamentals and good practical experience. He demonstrated clear understanding of the BI stack and showed good judgment in scenario questions. Some answers lacked the strategic depth expected at the senior manager level, but his hands-on execution capability is evident.',
      sectionScores: {
        technical: { score: 84, outOf: 100 },
        scenario: { score: 80, outOf: 100 },
        behavioral: { score: 82, outOf: 100 },
        eq: { score: 79, outOf: 100 },
        whiteboard: { score: 85, outOf: 100 },
      },
      strengthAreas: [
        'Strong technical hands-on capability across the BI stack',
        'Good problem-solving approach — structured and methodical',
        'Demonstrated ability to work cross-functionally',
      ],
      concernAreas: [
        'Strategic thinking could be stronger — tends to stay in execution mode',
        'Limited experience managing large teams (currently leads 3 people)',
      ],
      questionWiseEvaluation: [
        {
          questionId: 'tq1',
          questionText: 'Snowflake clustering and cost governance.',
          score: 8,
          evaluatorNote: 'Solid but no concrete cost numbers shared.',
        },
        {
          questionId: 'bq1',
          questionText: 'Time you influenced product on tech debt.',
          score: 7,
          evaluatorNote: 'Reasonable approach but lacked specific outcomes.',
        },
      ],
      transcriptHighlights: [
        {
          quote:
            "We used resource monitors and clustering keys to keep Snowflake spend predictable.",
          context: 'Technical — Snowflake governance',
        },
      ],
      hrNote: 'Good candidate, recommend proceeding. Not as strong as Divya but a solid second option.',
      l2Recommendation:
        'Hire. Rohan has the fundamentals and will grow into the strategic aspects of the role. Recommend proceeding with an L2 panel focused on leadership scenarios.',
    },
  })

  await prisma.report.create({
    data: {
      candidateId: priya.id,
      overallScore: 74,
      recommendation: 'maybe',
      professionalSummary:
        'Priya showed good technical foundations but the interview revealed gaps in some areas expected at the Technology Manager level. She is stronger on the visualization side (Tableau) than on the data engineering and pipeline side. Her behavioral answers were adequate but lacked depth.',
      sectionScores: {
        technical: { score: 70, outOf: 100 },
        scenario: { score: 75, outOf: 100 },
        behavioral: { score: 76, outOf: 100 },
        eq: { score: 74, outOf: 100 },
        whiteboard: { score: 72, outOf: 100 },
      },
      strengthAreas: [
        'Strong Tableau skills and dashboard design experience',
        'Good stakeholder communication for reporting purposes',
      ],
      concernAreas: [
        'Limited Snowflake experience — mostly SQL-based warehousing',
        'No hands-on dbt experience — critical for this role',
        'Answers on team leadership lacked concrete examples',
      ],
      questionWiseEvaluation: [
        {
          questionId: 'tq1',
          questionText: 'Snowflake optimisation experience.',
          score: 6,
          evaluatorNote: 'Analyst-level depth — no platform administration shown.',
        },
      ],
      transcriptHighlights: [
        {
          quote: "I haven't worked on dbt directly — we use stored procedures in our warehouse.",
          context: 'Technical — transformation tooling',
        },
      ],
      hrNote: 'Borderline. Would recommend only if Divya and Rohan are not available.',
      l2Recommendation:
        'Hold. Priya does not meet the technical bar for this role as defined. Her Snowflake and dbt gaps are concerning given the tech stack. Recommend holding unless the other candidates fall through.',
    },
  })

  console.log('  created 3 reports')

  // ── Position report for Position 1 ────────────────────────────────────
  await prisma.positionReport.create({
    data: {
      positionId: positionBI.id,
      poolStrengths: [
        'Strong Snowflake adoption across all three candidates',
        'Good stakeholder communication skills evident in the pool',
        'All candidates have production BI experience at scale',
      ],
      poolGaps: [
        'Streaming/real-time data experience is limited across the pool',
        'Data mesh and data product thinking is nascent — only Divya showed awareness',
        'Regulatory/compliance data handling experience was not evident',
      ],
      marketObservation:
        'The BI Manager talent pool in Bengaluru is competitive. Candidates with strong Snowflake + dbt experience are in high demand and are receiving multiple competing offers. Recommendation: move Divya to final round within 5 business days to avoid losing her to a competing offer.',
      questionHealthFlags: [
        {
          questionId: 'w1',
          flag:
            'The whiteboard question on data mesh architecture was too advanced for the candidate pool — all three candidates showed partial knowledge at best. Consider replacing with a more practical pipeline design question.',
        },
      ],
      hiringRecommendation:
        'Hire Divya Sharma (Score: 91) — strong hire with the right technical depth and leadership maturity. Rohan Krishnamurthy (Score: 82) is a viable backup. Do not proceed with Priya Venkatesh (Score: 74) unless the top two candidates are unavailable.',
    },
  })

  console.log('  created 1 position report')

  // ── QuestionSets for all 3 positions ──────────────────────────────────
  await prisma.questionSet.create({
    data: {
      positionId: positionBI.id,
      technicalQuestions: [
        {
          id: 'bi-t1',
          question:
            'Walk me through how you have optimised Snowflake warehouse costs in production at scale.',
          expectedKeyPoints: [
            'Warehouse sizing strategy',
            'Auto-suspend / auto-resume tuning',
            'Resource monitors',
            'Clustering keys for fact tables',
          ],
          followUp: 'Can you quantify the cost impact with concrete numbers?',
          difficulty: 'advanced',
          techTag: 'Snowflake',
          estimatedMinutes: 3,
        },
        {
          id: 'bi-t2',
          question:
            'Describe the structure of a complex dbt project you have led — how do you organise models, tests, and documentation?',
          expectedKeyPoints: [
            'Staging / intermediate / marts layering',
            'Test coverage strategy',
            'Documentation discipline',
            'CI/CD for dbt',
          ],
          followUp: 'How do you manage breaking schema changes downstream?',
          difficulty: 'advanced',
          techTag: 'dbt',
          estimatedMinutes: 3,
        },
        {
          id: 'bi-t3',
          question:
            'How do you handle slow Tableau dashboards backed by a Snowflake warehouse — what is your debugging playbook?',
          expectedKeyPoints: [
            'Query profile analysis',
            'Extracts vs live connections',
            'Materialised views',
            'Tableau performance recorder',
          ],
          followUp: 'When would you push aggregation into Snowflake vs Tableau?',
          difficulty: 'intermediate',
          techTag: 'Tableau',
          estimatedMinutes: 2,
        },
        {
          id: 'bi-t4',
          question:
            'Walk me through how you would design an Airflow DAG for a daily revenue reporting pipeline with 30+ dependencies.',
          expectedKeyPoints: [
            'Task grouping and SLA',
            'Retry and alerting strategy',
            'Idempotency',
            'Sensors vs explicit dependencies',
          ],
          followUp: 'How do you handle backfills without breaking downstream marts?',
          difficulty: 'intermediate',
          techTag: 'Airflow',
          estimatedMinutes: 3,
        },
        {
          id: 'bi-t5',
          question:
            'Describe how you would architect a single source of truth for revenue across Finance, Product, and Sales teams.',
          expectedKeyPoints: [
            'Conformed dimensions',
            'Semantic layer / metrics store',
            'Governance and ownership model',
            'Reconciliation strategy',
          ],
          followUp: 'How do you handle disagreements on metric definitions?',
          difficulty: 'advanced',
          techTag: 'Architecture',
          estimatedMinutes: 3,
        },
        {
          id: 'bi-t6',
          question:
            'How have you used Python in your BI workflows — beyond ad-hoc analysis?',
          expectedKeyPoints: [
            'Data validation tooling',
            'Custom Airflow operators',
            'Programmatic dbt orchestration',
            'Notebook-to-production patterns',
          ],
          followUp: 'When do you choose Python over SQL for transformation work?',
          difficulty: 'intermediate',
          techTag: 'Python',
          estimatedMinutes: 2,
        },
      ],
      scenarioQuestions: [
        {
          id: 'bi-s1',
          question:
            'A C-level exec says the revenue dashboard does not match the Finance close numbers. Walk me through the next 24 hours.',
          expectedKeyPoints: [
            'Reconciliation discipline',
            'Stakeholder communication cadence',
            'Root cause investigation',
            'Trust restoration',
          ],
          followUp: 'How do you prevent this from recurring next quarter?',
          difficulty: 'advanced',
          techTag: 'Scenario',
          estimatedMinutes: 4,
        },
        {
          id: 'bi-s2',
          question:
            'Your BI team of 6 is stretched. Finance is asking for daily reports and Product wants a new analytics product. How do you decide?',
          expectedKeyPoints: [
            'Prioritisation framework',
            'Capacity planning',
            'Stakeholder negotiation',
            'Trade-off transparency',
          ],
          followUp: 'How do you say no without damaging the relationship?',
          difficulty: 'advanced',
          techTag: 'Scenario',
          estimatedMinutes: 4,
        },
        {
          id: 'bi-s3',
          question:
            'Your dbt models are taking 4+ hours to run and breaking the SLA. What is your action plan?',
          expectedKeyPoints: [
            'Incremental models',
            'Warehouse sizing',
            'Materialisation strategy',
            'Test pruning',
          ],
          followUp: 'How do you communicate the timeline to business stakeholders?',
          difficulty: 'intermediate',
          techTag: 'Scenario',
          estimatedMinutes: 3,
        },
      ],
      behavioralQuestions: [
        {
          id: 'bi-b1',
          question:
            'Tell me about a time you had to influence senior stakeholders to prioritise tech debt over new features.',
          expectedKeyPoints: [
            'Tech debt as business risk framing',
            'Quantified impact',
            'Cross-functional alignment',
            'Outcome focus',
          ],
          followUp: 'Looking back, what would you have done differently?',
          difficulty: 'advanced',
          techTag: 'Leadership',
          estimatedMinutes: 4,
        },
        {
          id: 'bi-b2',
          question:
            'Describe a project that failed or was significantly behind schedule — what happened and what did you learn?',
          expectedKeyPoints: [
            'Self-awareness',
            'Specific recovery actions',
            'Lessons applied since',
            'Accountability',
          ],
          followUp: 'How did you communicate the slip to leadership?',
          difficulty: 'advanced',
          techTag: 'Leadership',
          estimatedMinutes: 4,
        },
        {
          id: 'bi-b3',
          question:
            'Tell me about hiring a BI engineer who did not work out — what was the gap and how did you handle it?',
          expectedKeyPoints: [
            'Honest reflection on hiring miss',
            'Performance management discipline',
            'Compassionate exit',
            'Process improvement',
          ],
          followUp: 'How has your hiring bar changed since?',
          difficulty: 'advanced',
          techTag: 'Leadership',
          estimatedMinutes: 4,
        },
      ],
      eqQuestions: [
        {
          id: 'bi-e1',
          question:
            'How do you typically respond when a junior engineer pushes back on your technical decision in front of the team?',
          expectedKeyPoints: [
            'Ego management',
            'Curiosity over defensiveness',
            'Public response vs private follow-up',
          ],
          followUp: 'Can you describe a specific time this happened?',
          difficulty: 'advanced',
          techTag: 'EQ',
          estimatedMinutes: 3,
        },
        {
          id: 'bi-e2',
          question:
            'Describe a time when a project you cared about was cancelled — how did you process that?',
          expectedKeyPoints: [
            'Emotional regulation',
            'Healthy disengagement',
            'Rapid pivot',
            'Team morale management',
          ],
          followUp: 'How did you keep your team motivated afterwards?',
          difficulty: 'advanced',
          techTag: 'EQ',
          estimatedMinutes: 3,
        },
      ],
      whiteboardQuestions: [],
      timeAllocation: {
        technical: 12,
        scenario: 6,
        behavioral: 6,
        eq: 4,
        whiteboard: 0,
      },
    },
  })

  await prisma.questionSet.create({
    data: {
      positionId: positionRisk.id,
      technicalQuestions: [
        {
          id: 'risk-t1',
          question:
            'Walk me through the end-to-end SOX ITGC testing cycle you have led — from scoping to issue remediation.',
          expectedKeyPoints: [
            'Risk-based scoping',
            'Sample selection methodology',
            'Evidence collection workflow',
            'Issue triage and remediation tracking',
          ],
          followUp: 'How do you handle a control owner who is unresponsive during fieldwork?',
          difficulty: 'advanced',
          techTag: 'SOX ITGC',
          estimatedMinutes: 3,
        },
        {
          id: 'risk-t2',
          question:
            'How does a SOC 2 Type II audit differ from Type I in your day-to-day operational impact?',
          expectedKeyPoints: [
            'Operating effectiveness over time',
            'Evidence continuity',
            'Control gap identification',
            'Auditor engagement model',
          ],
          followUp: 'What is the most painful SOC 2 control to maintain consistently?',
          difficulty: 'intermediate',
          techTag: 'SOC 2',
          estimatedMinutes: 3,
        },
        {
          id: 'risk-t3',
          question:
            'Describe how you have used Vanta or AuditBoard to automate evidence collection for a multi-framework audit.',
          expectedKeyPoints: [
            'Integration setup',
            'Evidence automation coverage',
            'Manual evidence triangulation',
            'Audit-ready posture',
          ],
          followUp: 'What evidence types still resist automation in your experience?',
          difficulty: 'intermediate',
          techTag: 'Vanta / AuditBoard',
          estimatedMinutes: 3,
        },
        {
          id: 'risk-t4',
          question:
            'How do you scope a HITRUST assessment differently from a SOC 2 — particularly for healthcare data flows?',
          expectedKeyPoints: [
            'HITRUST CSF maturity model',
            'Inheritance of common controls',
            'PHI handling specifics',
            'Reciprocity strategy',
          ],
          followUp: 'How do you avoid duplicating effort across frameworks?',
          difficulty: 'advanced',
          techTag: 'HITRUST',
          estimatedMinutes: 3,
        },
        {
          id: 'risk-t5',
          question:
            'Describe a time you identified a critical ITGC deficiency that the control owners disputed — how did you resolve it?',
          expectedKeyPoints: [
            'Evidence-based judgement',
            'Stakeholder management',
            'Materiality assessment',
            'Documentation discipline',
          ],
          followUp: 'How did you preserve the relationship with the control owner after?',
          difficulty: 'advanced',
          techTag: 'Audit Judgement',
          estimatedMinutes: 3,
        },
        {
          id: 'risk-t6',
          question:
            'How do you brief a non-technical CFO on a critical IT control deficiency without overwhelming them?',
          expectedKeyPoints: [
            'Risk in business language',
            'Materiality framing',
            'Remediation timeline clarity',
            'Decision-ready summary',
          ],
          followUp: 'How long is the right length for a board-level risk memo?',
          difficulty: 'advanced',
          techTag: 'Executive Communication',
          estimatedMinutes: 2,
        },
      ],
      scenarioQuestions: [
        {
          id: 'risk-s1',
          question:
            'The external auditor flags a critical SOX deficiency on day 3 of fieldwork. Your CISO is travelling and the control owner is on leave. Walk me through the next 24 hours.',
          expectedKeyPoints: [
            'Triage and severity assessment',
            'Escalation path',
            'Interim mitigations',
            'Stakeholder communication',
          ],
          followUp: 'When do you involve external counsel?',
          difficulty: 'advanced',
          techTag: 'Crisis Scenario',
          estimatedMinutes: 5,
        },
        {
          id: 'risk-s2',
          question:
            'A new Head of Engineering is pushing back on ITGC change-management controls, saying they slow down releases. How do you handle it?',
          expectedKeyPoints: [
            'Risk-based dialogue',
            'Control redesign vs removal',
            'Compensating controls',
            'Executive escalation if needed',
          ],
          followUp: 'When is it appropriate to redesign vs hold the line?',
          difficulty: 'advanced',
          techTag: 'Stakeholder Scenario',
          estimatedMinutes: 4,
        },
        {
          id: 'risk-s3',
          question:
            'You discover that production access controls have been routinely bypassed for the last 6 months. What is your action plan?',
          expectedKeyPoints: [
            'Root cause investigation',
            'Materiality and disclosure assessment',
            'Remediation roadmap',
            'Audit committee briefing',
          ],
          followUp: 'How do you avoid alienating engineering during the response?',
          difficulty: 'advanced',
          techTag: 'Incident Scenario',
          estimatedMinutes: 4,
        },
      ],
      behavioralQuestions: [
        {
          id: 'risk-b1',
          question:
            'Tell me about a time you had to deliver bad news about a control failure to senior leadership.',
          expectedKeyPoints: [
            'Direct communication',
            'Solution orientation',
            'Stakeholder management',
            'Outcome',
          ],
          followUp: 'How did you frame the message to drive action without panic?',
          difficulty: 'advanced',
          techTag: 'Leadership',
          estimatedMinutes: 4,
        },
        {
          id: 'risk-b2',
          question:
            'Describe a time you disagreed with an external auditor on a finding — how did you handle it?',
          expectedKeyPoints: [
            'Evidence-based judgement',
            'Professional respect',
            'Escalation discipline',
            'Resolution',
          ],
          followUp: 'How did the relationship evolve afterwards?',
          difficulty: 'advanced',
          techTag: 'Leadership',
          estimatedMinutes: 4,
        },
        {
          id: 'risk-b3',
          question:
            'Tell me about a team member you had to performance manage out — what was the gap and how did you handle it?',
          expectedKeyPoints: [
            'Clear expectations',
            'Documented coaching',
            'Compassionate exit',
            'Learning',
          ],
          followUp: 'What signals did you miss earlier?',
          difficulty: 'advanced',
          techTag: 'People Leadership',
          estimatedMinutes: 4,
        },
      ],
      eqQuestions: [
        {
          id: 'risk-e1',
          question:
            'How do you handle the emotional weight of being the bearer of bad news to executives multiple times a year?',
          expectedKeyPoints: [
            'Self-awareness',
            'Healthy detachment',
            'Support systems',
            'Sustainable rhythm',
          ],
          followUp: 'How has this changed over your career?',
          difficulty: 'advanced',
          techTag: 'EQ',
          estimatedMinutes: 3,
        },
        {
          id: 'risk-e2',
          question:
            'Describe a time you received critical feedback from a junior team member — how did you respond?',
          expectedKeyPoints: [
            'Curiosity over defensiveness',
            'Specific action taken',
            'Power dynamic awareness',
          ],
          followUp: 'What did the feedback reveal about your blind spots?',
          difficulty: 'advanced',
          techTag: 'EQ',
          estimatedMinutes: 3,
        },
      ],
      whiteboardQuestions: [],
      timeAllocation: {
        technical: 12,
        scenario: 6,
        behavioral: 6,
        eq: 4,
        whiteboard: 0,
      },
    },
  })

  await prisma.questionSet.create({
    data: {
      positionId: positionDE.id,
      technicalQuestions: [
        {
          id: 'de-t1',
          question:
            'Walk me through a Spark job you have written that processes 100GB+ data daily — what optimisations did you apply?',
          expectedKeyPoints: [
            'Partitioning strategy',
            'Broadcast joins',
            'Caching and persistence',
            'Skew handling',
          ],
          followUp: 'How do you debug a slow stage in production Spark UI?',
          difficulty: 'advanced',
          techTag: 'Spark',
          estimatedMinutes: 3,
        },
        {
          id: 'de-t2',
          question:
            'How do you design a Kafka topic and consumer group for at-least-once delivery with idempotent downstream writes?',
          expectedKeyPoints: [
            'Partition key strategy',
            'Consumer group rebalancing',
            'Idempotency keys',
            'Retry / DLQ pattern',
          ],
          followUp: 'When would you choose exactly-once over at-least-once?',
          difficulty: 'advanced',
          techTag: 'Kafka',
          estimatedMinutes: 3,
        },
        {
          id: 'de-t3',
          question:
            'Describe how you would set up a Databricks workspace for a 10-person data team — including cluster strategy and cost guardrails.',
          expectedKeyPoints: [
            'Cluster pools and policies',
            'Job vs interactive clusters',
            'Photon adoption',
            'Cost tagging',
          ],
          followUp: 'How do you prevent runaway cluster spend?',
          difficulty: 'intermediate',
          techTag: 'Databricks',
          estimatedMinutes: 3,
        },
        {
          id: 'de-t4',
          question:
            'How do you structure a production-grade Python data pipeline for testing, packaging, and deployment?',
          expectedKeyPoints: [
            'Module structure',
            'pytest + fixtures',
            'CI/CD',
            'Containerisation',
          ],
          followUp: 'How do you mock external dependencies (Kafka, S3) in tests?',
          difficulty: 'intermediate',
          techTag: 'Python',
          estimatedMinutes: 2,
        },
        {
          id: 'de-t5',
          question:
            'Describe how you would build a Lambda + S3 + Glue architecture for streaming ingestion with cost optimisation.',
          expectedKeyPoints: [
            'Event-driven design',
            'Partitioning and compaction',
            'Glue job concurrency',
            'Cost monitoring',
          ],
          followUp: 'When would you reach for Kinesis Firehose instead?',
          difficulty: 'intermediate',
          techTag: 'AWS',
          estimatedMinutes: 3,
        },
        {
          id: 'de-t6',
          question:
            'Walk me through a data quality framework you have built — how do you catch bad data before it reaches consumers?',
          expectedKeyPoints: [
            'Schema validation',
            'Row-level expectations',
            'Anomaly detection',
            'Alerting and quarantine',
          ],
          followUp: 'How do you measure data quality coverage?',
          difficulty: 'advanced',
          techTag: 'Data Quality',
          estimatedMinutes: 3,
        },
      ],
      scenarioQuestions: [
        {
          id: 'de-s1',
          question:
            'A Kafka consumer in production is lagging by 4 hours and growing. Walk me through your triage.',
          expectedKeyPoints: [
            'Lag analysis',
            'Throughput scaling',
            'Backpressure handling',
            'Stakeholder communication',
          ],
          followUp: 'How do you avoid this in future?',
          difficulty: 'advanced',
          techTag: 'Production Scenario',
          estimatedMinutes: 4,
        },
        {
          id: 'de-s2',
          question:
            'Product wants a new event stream that triples your Kafka traffic. The CFO is concerned about AWS spend. How do you respond?',
          expectedKeyPoints: [
            'Capacity planning',
            'Cost forecasting',
            'Trade-off conversation',
            'Phased rollout',
          ],
          followUp: 'How do you negotiate with Product without saying no?',
          difficulty: 'advanced',
          techTag: 'Scaling Scenario',
          estimatedMinutes: 4,
        },
        {
          id: 'de-s3',
          question:
            'A Spark job that has run reliably for 18 months suddenly starts failing nightly. Where do you start?',
          expectedKeyPoints: [
            'Recent changes audit',
            'Data shape changes',
            'Cluster / dependency drift',
            'Reproducibility',
          ],
          followUp: 'How do you keep production debugging from blocking new work?',
          difficulty: 'intermediate',
          techTag: 'Debugging Scenario',
          estimatedMinutes: 3,
        },
      ],
      behavioralQuestions: [
        {
          id: 'de-b1',
          question:
            'Tell me about the most complex pipeline you have built end-to-end — what made it complex and how did you ship it?',
          expectedKeyPoints: [
            'Scope and complexity drivers',
            'Trade-offs made',
            'Outcome',
            'What you would change',
          ],
          followUp: 'How did you keep the project on track when blockers appeared?',
          difficulty: 'advanced',
          techTag: 'Delivery',
          estimatedMinutes: 4,
        },
        {
          id: 'de-b2',
          question:
            'Describe a time a production incident was traced back to code you wrote — how did you handle it?',
          expectedKeyPoints: [
            'Accountability',
            'Specific recovery actions',
            'Lessons applied',
            'Communication',
          ],
          followUp: 'What process changed as a result?',
          difficulty: 'advanced',
          techTag: 'Accountability',
          estimatedMinutes: 4,
        },
        {
          id: 'de-b3',
          question:
            'Tell me about a time you mentored a junior engineer through a hard technical challenge.',
          expectedKeyPoints: [
            'Specific coaching approach',
            'Patience and clarity',
            'Outcome for the engineer',
            'Reflection on style',
          ],
          followUp: 'How do you balance mentorship with shipping pressure?',
          difficulty: 'intermediate',
          techTag: 'Mentorship',
          estimatedMinutes: 4,
        },
      ],
      eqQuestions: [
        {
          id: 'de-e1',
          question:
            'How do you manage your energy and focus when working on long, undefined problems with no clear end?',
          expectedKeyPoints: [
            'Self-management',
            'Decomposition strategy',
            'Sustainable rhythm',
          ],
          followUp: 'When do you decide to ask for help vs push through?',
          difficulty: 'advanced',
          techTag: 'EQ',
          estimatedMinutes: 3,
        },
        {
          id: 'de-e2',
          question:
            'Tell me about a time you made a significant technical mistake — what happened and what did you do?',
          expectedKeyPoints: [
            'Honest self-reflection',
            'Specific recovery',
            'Lessons internalised',
          ],
          followUp: 'How did you rebuild trust afterwards?',
          difficulty: 'advanced',
          techTag: 'EQ',
          estimatedMinutes: 3,
        },
      ],
      whiteboardQuestions: [],
      timeAllocation: {
        technical: 12,
        scenario: 6,
        behavioral: 6,
        eq: 4,
        whiteboard: 0,
      },
    },
  })

  console.log('  created 3 question sets')

  console.log('✅ Seed complete')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
