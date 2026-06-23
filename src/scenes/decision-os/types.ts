// Decision OS — internal runtime types shared between Scene.tsx and the
// extracted draw/runtime modules. These describe the effect-local state object
// and the DOM-query context that builder functions are threaded with.

/** Scoped element-query helper bound to the ref container. */
export type QuerySel = <T extends Element = HTMLElement>(sel: string) => T | null

/** DOM context for builder functions: the root container, scoped query, and SVG. */
export interface SceneCtx {
  root: HTMLDivElement
  $: QuerySel
  $svg: SVGSVGElement
}

/** Mutable view/transform state owned by the effect and threaded into builders. */
export interface SceneState {
  viewMode: 'tree' | 'rank'
  selId: string
  tx: number
  ty: number
  scale: number
  positions: Record<string, { x: number; y: number }>
}
