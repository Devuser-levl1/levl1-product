// Agent substrate entrypoint. Importing this module registers every agent
// executor (so the approvals pipeline can dispatch by proposal type). API routes
// and workflows import from here to guarantee executors are wired up.
import './resume-intake' // registers the 'resume_intake' executor

export * from './approvals'
export * from './tools'
