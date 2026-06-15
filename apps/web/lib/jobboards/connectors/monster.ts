import { BoardConnector, PostResult } from '../index'

// Tier B — stubbed, "coming soon".
export const monsterConnector: BoardConnector = {
  board: 'monster',
  label: 'Monster',
  tier: 'B',
  mode: 'assisted',
  comingSoon: true,
  async post(): Promise<PostResult> {
    return { status: 'failed', error: 'Monster integration is coming soon.' }
  },
}
