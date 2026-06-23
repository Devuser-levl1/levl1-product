import { prisma } from '@/lib/prisma'
import { computeDealSize, hasEconomics, type DealEconomics } from '@/lib/hire/deal-economics'

const num = (v: unknown): number | null => {
  if (v === '' || v == null) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

/**
 * Parse structured deal-economics fields from a request body and, when present,
 * compute the auto-calculated deal size. Returns the Prisma data fields plus the
 * computed value (or null if no economics were supplied).
 */
export function parseEconomics(body: Record<string, unknown>): {
  fields: {
    positions: number | null; billRate: number | null; hoursPerWeek: number | null
    durationValue: number | null; durationUnit: string | null; margin: number | null
  }
  computedValue: number | null
} {
  const econ: DealEconomics = {
    positions: num(body.positions),
    billRate: num(body.billRate),
    hoursPerWeek: num(body.hoursPerWeek),
    durationValue: num(body.durationValue),
    durationUnit: body.durationUnit === 'months' ? 'months' : body.durationUnit === 'weeks' ? 'weeks' : null,
    margin: num(body.margin),
  }
  const fields = {
    positions: econ.positions ?? null,
    billRate: econ.billRate ?? null,
    hoursPerWeek: econ.hoursPerWeek ?? null,
    durationValue: econ.durationValue ?? null,
    durationUnit: econ.durationUnit ?? null,
    margin: econ.margin ?? null,
  }
  return { fields, computedValue: hasEconomics(econ) ? computeDealSize(econ) : null }
}

/** Filter requested job ids to those that actually belong to the tenant. */
export async function validJobIds(tenantId: string, jobIds: unknown): Promise<string[]> {
  if (!Array.isArray(jobIds) || jobIds.length === 0) return []
  const ids = jobIds.filter((x): x is string => typeof x === 'string')
  if (!ids.length) return []
  const found = await prisma.hireJob.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } })
  return found.map((j) => j.id)
}
