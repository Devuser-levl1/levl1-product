import { BoardConnector, PostResult } from '../index'

// Tier B — connector stubbed, surfaced as "coming soon" in the UI. The UI
// prevents posting; post() defends the boundary if ever called directly.
export const ziprecruiterConnector: BoardConnector = {
  board: 'ziprecruiter',
  label: 'ZipRecruiter',
  tier: 'B',
  mode: 'assisted',
  comingSoon: true,
  async post(): Promise<PostResult> {
    return { status: 'failed', error: 'ZipRecruiter integration is coming soon.' }
  },
}
