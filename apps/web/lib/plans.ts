export interface Plan {
  id:                  string
  name:                string
  price:               number   // in paise (₹ × 100)
  currency:            string
  interviewsPerMonth:  number
  features:            string[]
  cashfreePlanId:      string
  popular?:            boolean
}

export const PLANS: Record<string, Plan> = {
  starter: {
    id:                 'starter',
    name:               'Starter',
    price:              1_500_000,   // ₹15,000 in paise
    currency:           'INR',
    interviewsPerMonth: 50,
    features: [
      '50 interviews/month',
      '5 active positions',
      'AI question generation',
      'Evaluation reports',
      'Email support',
    ],
    cashfreePlanId: 'levl1_starter_monthly',
  },
  professional: {
    id:                 'professional',
    name:               'Professional',
    price:              4_500_000,   // ₹45,000 in paise
    currency:           'INR',
    interviewsPerMonth: 200,
    features: [
      '200 interviews/month',
      'Unlimited positions',
      'White-label reports',
      'Multi-client management',
      'L2 handoff workflow',
      'Priority support',
    ],
    cashfreePlanId:  'levl1_professional_monthly',
    popular:         true,
  },
}

export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export const PLAN_LIMITS: Record<string, number> = {
  trial:        5,
  starter:      50,
  professional: 200,
  enterprise:   Infinity,
}
