import type React from 'react'

export type InterlockPhase = 'blocked' | 'checking' | 'green'

export interface PanelState {
  open: boolean
  tag: string
  title: string
  type: string
  body: string
}

export interface PidRuntimeRefs {
  smStateRef: React.MutableRefObject<SVGTextElement | null>
  smBackoffRef: React.MutableRefObject<SVGTextElement | null>
  smBarRef: React.MutableRefObject<SVGTextElement | null>
  applyFillRef: React.MutableRefObject<SVGRectElement | null>
  tickerDotRef: React.MutableRefObject<SVGCircleElement | null>
  tickerHzRef: React.MutableRefObject<SVGTextElement | null>
  ilBoxRef: React.MutableRefObject<SVGRectElement | null>
  ilGaugeRef: React.MutableRefObject<SVGCircleElement | null>
  ilPctRef: React.MutableRefObject<SVGTextElement | null>
  ilStatusRef: React.MutableRefObject<SVGTextElement | null>
  deployRORef: React.MutableRefObject<HTMLDivElement | null>
}
