import { C } from './data'
import type { AgentStatus } from './data'
import type { BuiltEvent, CounterKey, EventKind } from './types'

export const IV = {
  ev: 0.9,
  tool: 1.3,
  spawn: 1.4,
  job: 1.1,
  stage: 4.2,
  gate: 3.0,
  latch: 5.2,
  cap: 1.7,
  sig: 2.1,
  nz: 4.8,
  audit: 5.6,
  lint: 6.4,
  clock: 1.0,
}

export const COMM = [C.hueA, C.hueB, C.hueC]

export const rootBg =
  'radial-gradient(1200px 600px at 78% -10%, rgba(54,224,164,.06), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(90,169,230,.05), transparent 60%), linear-gradient(#0a0e15,#06080c)'

export const statusColor = (status: AgentStatus): string =>
  status === 'run' ? C.signal : status === 'await' ? C.amber : status === 'done' ? C.hueA : C.ink3

export function nowTs(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${ms}`
}

export function nullEvent(): BuiltEvent {
  return { id: '', type: 'emit' as EventKind, msg: '', counterKey: 'ev' as CounterKey, ts: '' }
}
