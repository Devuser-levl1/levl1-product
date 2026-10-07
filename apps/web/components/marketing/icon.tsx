import {
  Mic, Code2, PenTool, Users, Clock, CalendarCheck, FileText, ShieldCheck, Eye, ScanFace, ClipboardPaste, Timer,
  Gauge, Sparkles, Bot, Inbox, Send, BellRing, HeartHandshake, LayoutDashboard, Globe, Megaphone, Briefcase,
  Building2, Target, Lock, KeyRound, UserCheck, ScrollText, Server, Workflow, MessageSquare, Layers, ListChecks,
  Scale, Search, Brain, Handshake, Wand2, Video, PlayCircle, AlertTriangle, Fingerprint, SlidersHorizontal,
  KanbanSquare, Mail, Puzzle, BadgeCheck, Hourglass, ClipboardCheck, BarChart3, Compass, type LucideIcon,
} from 'lucide-react'
import type { IconName } from '@/config/site'

const MAP: Record<IconName, LucideIcon> = {
  mic: Mic, code: Code2, pen: PenTool, users: Users, clock: Clock, calendar: CalendarCheck, file: FileText,
  shield: ShieldCheck, eye: Eye, scanFace: ScanFace, paste: ClipboardPaste, timer: Timer, gauge: Gauge,
  sparkles: Sparkles, bot: Bot, inbox: Inbox, send: Send, bell: BellRing, heart: HeartHandshake,
  dashboard: LayoutDashboard, globe: Globe, megaphone: Megaphone, briefcase: Briefcase, building: Building2,
  target: Target, lock: Lock, key: KeyRound, userCheck: UserCheck, scroll: ScrollText, server: Server,
  workflow: Workflow, message: MessageSquare, layers: Layers, list: ListChecks, scale: Scale, search: Search,
  brain: Brain, handshake: Handshake, wand: Wand2, video: Video, play: PlayCircle, alert: AlertTriangle,
  fingerprint: Fingerprint, sliders: SlidersHorizontal, kanban: KanbanSquare, mail: Mail, puzzle: Puzzle,
  badge: BadgeCheck, hourglass: Hourglass, clipboard: ClipboardCheck, chart: BarChart3, compass: Compass,
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }: { name: IconName; className?: string; strokeWidth?: number }) {
  const C = MAP[name]
  return <C aria-hidden className={className} strokeWidth={strokeWidth} />
}
