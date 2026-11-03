'use client'

import { useState } from 'react'
import { Plus, Download, Trash2, Briefcase, Search } from 'lucide-react'
import {
  Button, ButtonLink, Field, Input, Select, Textarea, Checkbox, Radio, RadioGroup, Card, Eyebrow,
  Page, PageHeader, ActionBar, Badge, Alert, EmptyState, Spinner, Skeleton, LoadingBlock, Modal, Drawer, Tabs, TabPanel, Table,
} from '@/components/screen/ui'

type Row = { id: string; name: string; position: string; score: number; status: 'Completed' | 'Scheduled' | 'Flagged' }
const ROWS: Row[] = [
  { id: '1', name: 'Priya Sharma', position: 'Senior Backend Engineer', score: 82, status: 'Completed' },
  { id: '2', name: 'Arjun Rao', position: 'Data Engineer', score: 64, status: 'Flagged' },
  { id: '3', name: 'Meera Iyer', position: 'Product Analyst', score: 0, status: 'Scheduled' },
]

export function Gallery() {
  const [tab, setTab] = useState<'buttons' | 'forms' | 'data' | 'feedback'>('buttons')
  const [agree, setAgree] = useState(false)
  const [mode, setMode] = useState('hybrid')
  const [modal, setModal] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [dark, setDark] = useState(false)
  return (
    <div data-lv-theme={dark ? 'dark' : undefined} style={{ minHeight: '100vh', background: 'var(--lv-bg)', fontFamily: 'var(--lv-font-sans)' }}>
      <Page>
        <PageHeader eyebrow="Design system · Pass 2" title="Screen components" description="Canonical components on --lv-* tokens. Dev-only gallery."
          actions={<>
            <Button variant="secondary" onClick={() => setDark((d) => !d)}>{dark ? 'Light preview' : 'Dark preview'}</Button>
            <Button leftIcon={<Plus size={16} />}>New Position</Button>
          </>} />
        <Tabs label="Gallery sections" value={tab} onChange={setTab} items={[
          { key: 'buttons', label: 'Buttons' }, { key: 'forms', label: 'Forms', count: 6 }, { key: 'data', label: 'Data' }, { key: 'feedback', label: 'Feedback' },
        ]} />
        <div style={{ height: 24 }} />

        {tab === 'buttons' && <TabPanel tabKey="buttons"><Card title="Buttons" subtitle="Primary is the one obvious action; destructive is never primary.">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="tertiary">Tertiary</Button>
            <Button variant="destructive" leftIcon={<Trash2 size={15} />}>Delete</Button><Button variant="ghost" iconOnly aria-label="Search"><Search size={16} /></Button>
            <Button loading>Saving</Button><Button disabled>Disabled</Button><Button size="sm">Small</Button>
            <ButtonLink href="/api/reports/export" variant="secondary" leftIcon={<Download size={15} />}>Export CSV</ButtonLink>
          </div>
          <div style={{ height: 16 }} />
          <ActionBar start={<Button variant="destructive">Delete position</Button>}><Button variant="secondary">Cancel</Button><Button>Save changes</Button></ActionBar>
        </Card></TabPanel>}

        {tab === 'forms' && <TabPanel tabKey="forms"><Card title="Form controls">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Position title" required hint="As candidates will see it"><Input placeholder="e.g. Senior Java Engineer" /></Field>
            <Field label="Work email" error="Please use your work email."><Input type="email" defaultValue="me@gmail.com" /></Field>
            <Field label="Experience level"><Select defaultValue="mid"><option value="junior">0–3 years</option><option value="mid">3–6 years</option></Select></Field>
            <Field label="Disabled"><Input disabled value="Read-only value" readOnly /></Field>
            <Field label="Notes" style={{ gridColumn: '1 / -1' }}><Textarea placeholder="Anything the interviewer should probe…" /></Field>
          </div>
          <div style={{ height: 12 }} />
          <Checkbox checked={agree} onChange={setAgree} variant="card">I consent to this interview being <strong>recorded and evaluated</strong>.</Checkbox>
          <RadioGroup label="Work mode">
            {['onsite', 'hybrid', 'remote'].map((m) => <Radio key={m} name="mode" checked={mode === m} onChange={() => setMode(m)} description={m === 'hybrid' ? '3 days in office' : undefined}>{m[0].toUpperCase() + m.slice(1)}</Radio>)}
          </RadioGroup>
          <div style={{ height: 8 }} />
          <ActionBar><Button variant="secondary">Back</Button><Button>Continue</Button></ActionBar>
        </Card></TabPanel>}

        {tab === 'data' && <TabPanel tabKey="data"><div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Table<Row> caption="Candidates" rows={ROWS} rowKey={(r) => r.id} onRowClick={() => setDrawer(true)} columns={[
            { key: 'name', header: 'Candidate', render: (r) => <strong style={{ color: 'var(--lv-text)' }}>{r.name}</strong> },
            { key: 'pos', header: 'Position', render: (r) => r.position },
            { key: 'status', header: 'Status', render: (r) => <Badge dot tone={r.status === 'Completed' ? 'success' : r.status === 'Flagged' ? 'danger' : 'brand'}>{r.status}</Badge> },
            { key: 'score', header: 'Score', numeric: true, render: (r) => (r.score ? r.score : '—') },
          ]} />
          <Table<Row> caption="Loading" rows={[]} rowKey={(r) => r.id} loading columns={[{ key: 'a', header: 'Candidate', render: () => null }, { key: 'b', header: 'Score', numeric: true, render: () => null }]} />
          <EmptyState icon={<Briefcase size={22} />} title="No positions yet" description="Create your first position to start screening candidates." action={<Button leftIcon={<Plus size={16} />}>Create position</Button>} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(['neutral', 'brand', 'success', 'warning', 'danger', 'info'] as const).map((t) => <Badge key={t} tone={t}>{t}</Badge>)}</div>
          <Card title="Interactive card" subtitle="Click or press Enter" onClick={() => setModal(true)}><Eyebrow>Opens a modal</Eyebrow></Card>
        </div></TabPanel>}

        {tab === 'feedback' && <TabPanel tabKey="feedback"><div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Alert tone="info" title="Heads up">Questions are generated from your JD.</Alert>
          <Alert tone="success">Position saved.</Alert>
          <Alert tone="warning" title="Regenerate questions" action={<Button size="sm" variant="secondary">Regenerate</Button>}>Must-haves changed after questions were generated.</Alert>
          <Alert tone="danger" title="Couldn’t load reports">Check your connection and try again.</Alert>
          <Card><div style={{ display: 'flex', gap: 16, alignItems: 'center' }}><Spinner /><Spinner size="lg" /><div style={{ flex: 1 }}><Skeleton lines={3} /></div></div></Card>
          <Card padded={false}><LoadingBlock label="Loading candidates…" /></Card>
          <ActionBar><Button variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button><Button onClick={() => setModal(true)}>Open modal</Button></ActionBar>
        </div></TabPanel>}
      </Page>

      <Modal open={modal} onClose={() => setModal(false)} title="Delete this position?" description="Candidates and reports stay in your account." size="sm"
        footer={<ActionBar><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button variant="destructive" onClick={() => setModal(false)}>Delete position</Button></ActionBar>}>
        This removes the position from your list. You can’t undo this.
      </Modal>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Priya Sharma" description="Senior Backend Engineer · FinEdge"
        footer={<ActionBar><Button variant="secondary" onClick={() => setDrawer(false)}>Close</Button><Button>Open report</Button></ActionBar>}>
        <Card title="Live signals"><Badge tone="success" dot>Real human present</Badge></Card>
      </Drawer>
    </div>
  )
}
