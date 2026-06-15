import { BoardConnector, PostResult } from '../index'

// Tier B — generic "custom job board (email / XML feed)" connector, stubbed as
// "coming soon". Will let a tenant push jobs to any board via an email address
// or an XML feed endpoint once implemented.
export const customConnector: BoardConnector = {
  board: 'custom',
  label: 'Custom board (email / XML feed)',
  tier: 'B',
  mode: 'assisted',
  comingSoon: true,
  async post(): Promise<PostResult> {
    return { status: 'failed', error: 'Custom board (email / XML feed) is coming soon.' }
  },
}
