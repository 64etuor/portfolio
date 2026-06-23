'use client'

// pipeline-dag — static JSX shell (structure only; imperative content injected by Scene.tsx)

import type { RefCallback, RefObject } from 'react'
import { SceneHost } from '../_host/SceneHost'
import s from './scene.module.css'

interface PanelRefs {
  panelRef: RefObject<HTMLDivElement | null>
  piconRef: RefObject<HTMLDivElement | null>
  pnameRef: RefObject<HTMLDivElement | null>
  pmetaRef: RefObject<HTMLDivElement | null>
  pbodyRef: RefObject<HTMLDivElement | null>
}

interface ViewProps {
  canvasRef: RefCallback<HTMLCanvasElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  worldRef: RefObject<HTMLDivElement | null>
  edgesSvgRef: RefObject<SVGSVGElement | null>
  nodesLayRef: RefObject<HTMLDivElement | null>
  runbarRef: RefObject<HTMLDivElement | null>
  runBtnRef: RefObject<HTMLButtonElement | null>
  zlabelRef: RefObject<HTMLDivElement | null>
  hintRef: RefObject<HTMLDivElement | null>
  schemaRef: RefObject<HTMLDivElement | null>
  minimapSvgRef: RefObject<SVGSVGElement | null>
  legendRef: RefObject<HTMLDivElement | null>
  panel: PanelRefs
  onFit: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

export function PipelineDagView({
  canvasRef,
  stageRef,
  worldRef,
  edgesSvgRef,
  nodesLayRef,
  runbarRef,
  runBtnRef,
  zlabelRef,
  hintRef,
  schemaRef,
  minimapSvgRef,
  legendRef,
  panel,
  onFit,
  onZoomIn,
  onZoomOut,
}: ViewProps) {
  return (
    <SceneHost className={s.root} bg="#0a0e14">
      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.brand}>
          <span className={s.brandDot} />
          <b className={s.brandB}>notion-os</b>
          <span className={s.brandPath}>/ notion-os.dag</span>
        </div>
        <div className={s.tbSep} />
        <div className={s.tbMeta}>
          <span><span className="k">project:</span> <span className="v">Notion OS</span></span>
          <span><span className="k">domain:</span> <span className="v">조직 운영 시스템 · 의사결정 OS</span></span>
          <span><span className="k">schedule:</span> <span className="v">@continuous</span></span>
        </div>
        <div className={s.spacer} />
        <div className={s.banner}><span className={s.bannerOk} />SSOT: Notion · GitHub · Drive · 운영 중</div>
        <button ref={runBtnRef} className={`${s.btn} ${s.btnRun}`}>
          <span className={s.btnTri}>&#9654;</span> RUN PIPELINE
        </button>
        <button className={s.btnGhost} onClick={onFit} title="reset view">&#10562; fit</button>
      </div>

      {/* Run progress bar */}
      <div ref={runbarRef} className={s.runbar} />

      {/* Stage */}
      <div ref={stageRef} className={s.stage}>
        {/* Grid background canvas */}
        <canvas ref={canvasRef} className={s.c} />
        {/* World (pan/zoom container) */}
        <div ref={worldRef} className={s.world}>
          <svg ref={edgesSvgRef} className={s.edgesSvg} />
          <div ref={nodesLayRef} className={s.nodesLayer} />
        </div>
      </div>

      {/* Zoom controls */}
      <div className={s.zoomCtl}>
        <button className={s.zoomBtn} onClick={onZoomIn}>+</button>
        <button className={s.zoomBtn} onClick={onZoomOut}>&#8722;</button>
        <button className={`${s.zoomBtn} ${s.zoomBtnLast}`} onClick={onFit}>FIT</button>
      </div>
      <div ref={zlabelRef} className={s.zLabel}>100%</div>

      {/* Hint */}
      <div ref={hintRef} className={s.hint}>
        드래그로 이동 · 휠로 줌 · 노드 클릭으로 상세 · <span className={s.kbd}>RUN</span> 으로 파이프라인 실행
      </div>

      {/* Schema tooltip */}
      <div ref={schemaRef} className={s.schema} style={{ display: 'none', position: 'fixed' }} />

      {/* Minimap */}
      <div className={s.minimap}>
        <div className={s.minimapH}><span>MINIMAP</span><span>overview</span></div>
        <svg ref={minimapSvgRef} className={s.mmSvg} />
      </div>

      {/* Legend */}
      <div ref={legendRef} className={s.legend}>
        <span className={s.leg}><span className={s.legD} style={{ background: '#4aa8ff' }} />input</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#b08cff' }} />decision</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#36d9d9' }} />execution</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#f0b429' }} />ai</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#5ee3a1' }} />metric</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#ff7eb6' }} />sink</span>
      </div>

      {/* Detail panel — static structure; body filled imperatively */}
      <aside ref={panel.panelRef} className={s.panel}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:11, padding:'18px 18px 14px', borderBottom:'1px solid #1f2733' }}>
          <div ref={panel.piconRef} style={{ width:40, height:40, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, background:'rgba(255,255,255,.04)', border:'1px solid #1f2733', flexShrink:0 }}>&#11041;</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div ref={panel.pnameRef} style={{ fontSize:15, fontWeight:700, color:'#fff', lineHeight:1.3 }}>node</div>
            <div ref={panel.pmetaRef} style={{ fontSize:10.5, color:'#6b7787', marginTop:4, display:'flex', gap:8, flexWrap:'wrap' }} />
          </div>
          <div id="pclose" style={{ marginLeft:'auto', cursor:'pointer', color:'#6b7787', fontSize:18, lineHeight:1, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, flexShrink:0 }}>&#10005;</div>
        </div>
        <div ref={panel.pbodyRef} style={{ overflowY:'auto', padding:'16px 18px 28px', flex:1 }} />
      </aside>
    </SceneHost>
  )
}
