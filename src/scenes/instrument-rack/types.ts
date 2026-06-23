export type SvgAttrs = Record<string, string | number>
export type WfBar = { rect: SVGRectElement; yTop: number; yBot: number; h: number }
export type DigitRoll = { el: HTMLSpanElement; col: HTMLDivElement; target: number }
export type ScopeParts = { trace: SVGPathElement; dot: SVGCircleElement; len: number }
export type GaugeParts = { needle: SVGLineElement; val: SVGTextElement }
