export type CounterKey = 'ev' | 'tool'
export type EventKind = 'emit' | 'gate' | 'ok' | 'tool' | 'deny'
export type BuiltEvent = { id: string; type: EventKind; msg: string; counterKey: CounterKey; ts: string }
export type RuntimeState = {
  evId: number
  toolId: number
  jobOk: number
  jobFail: number
  latch: number
  capture: number
  tickerOn: boolean
  gateRelease: boolean
  autonomyClosed: boolean
  acp: 'awaiting' | 'approved' | 'denied'
  stage: number
}
export type Agent = { g: string; name: string; scope: string; status: import('./data').AgentStatus }
export type Reg = { n: string; h: 'healthy' | 'armed' | 'awaiting' | 'fired' }
export type PipeNode = { x: number; y: number; r: number; name: string }
export type PipeEvent = { seg: number; p: number; color: string; born: number }
export type GraphNode = {
  x: number
  y: number
  vx: number
  vy: number
  c: number
  r: number
  label: string
  cx: number
  cy: number
  lit: number
}
export type GraphEdge = [number, number, number]
export type LiveState = {
  bpm: number
  bpmTarget: number
  capture: number
  captureTarget: number
  jobPSmooth: number
  evAcc: number
  toolAcc: number
  spawnAcc: number
  jobAcc: number
  stageAcc: number
  gateAcc: number
  latchAcc: number
  capAcc: number
  sigAcc: number
  nzAcc: number
  auditAcc: number
  lintAcc: number
  clockAcc: number
  evQueue: BuiltEvent[]
  toolQueue: BuiltEvent[]
}

export type ElementKey =
  | 'agentList'
  | 'regList'
  | 'sStat'
  | 'lintChip'
  | 'jobOk'
  | 'jobFail'
  | 'latchCt'
  | 'capCt'
  | 'clock'
  | 'fleetActive'
  | 'jobId'
  | 'jobBadge'
  | 'jobProg'
  | 'jobCost'
  | 'jobTurns'
  | 'killTicker'
  | 'killNote'
  | 'evHead'
  | 'gateLed'
  | 'gateTxt'
  | 'tickLed'
  | 'tickTxt'
  | 'autLed'
  | 'autTxt'
  | 'latchLed'
  | 'latchTxt'
  | 'bpm'
  | 'rawCt'
  | 'wikiCt'
  | 'schCt'
  | 'gtrace'
  | 'acp'
  | 'acpState'
  | 'acpQ'
  | 'envWrite'
  | 'envWriteTail'
  | 'envPrio'
  | 'envPrioTail'
  | 'evTotal'
  | 'toolTotal'
  | 'evFeed'
  | 'toolFeed'
  | 'lintPin'
  | 'lintNum'
  | 'nzPin'
  | 'nzList'
  | 'nzBal'
  | 'cronPin'
  | 'sig0'
  | 'sig1'
  | 'sig2'
  | 'sig3'
  | 'sig4'
  | 'auditPin'
  | 'auditFeed'
