export interface PlanLimits { recruiters: number; activeJobs: number; candidatesPerMonth: number; aiInterviewsPerMonth: number }

export const HIRE_PLANS = {
  STARTER: { id: 'STARTER', name: 'Starter', price: 499900, priceDisplay: 'Rs 4,999', interval: 'month',
    limits: { recruiters: 2, activeJobs: 5, candidatesPerMonth: 200, aiInterviewsPerMonth: 25 },
    features: ['2 recruiter seats', '5 active jobs', '200 candidates/month', '25 AI interviews/month', 'AI resume scoring', 'Kanban pipeline + CRM', 'Email support'] },
  GROWTH: { id: 'GROWTH', name: 'Growth', price: 1199900, priceDisplay: 'Rs 11,999', interval: 'month', popular: true,
    limits: { recruiters: 8, activeJobs: 25, candidatesPerMonth: 1000, aiInterviewsPerMonth: 100 },
    features: ['8 recruiter seats', '25 active jobs', '1,000 candidates/month', '100 AI interviews/month', 'Everything in Starter', 'Analytics dashboard', 'Bulk import + automation', 'Priority support'] },
  SCALE: { id: 'SCALE', name: 'Scale', price: 2299900, priceDisplay: 'Rs 22,999', interval: 'month',
    limits: { recruiters: 25, activeJobs: 100, candidatesPerMonth: 5000, aiInterviewsPerMonth: 400 },
    features: ['25 recruiter seats', '100 active jobs', '5,000 candidates/month', '400 AI interviews/month', 'Everything in Growth', 'Advanced analytics + export', 'Email campaigns', 'Dedicated success manager'] },
} as const

export type HirePlanId = keyof typeof HIRE_PLANS

export const TRIAL_LIMITS = { recruiters: 2, activeJobs: 5, candidatesPerMonth: 50, aiInterviewsPerMonth: 5, trialDays: 14 }
