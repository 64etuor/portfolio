'use client'

import type React from 'react'
import type { Locale } from '@/i18n/content'
import { localizeSceneText } from '../_host/localize'
import { SceneHost } from '../_host/SceneHost'
import { DEV, FIELD } from './constants'
import type { ProcNode, Screen } from './types'
import s from './scene.module.css'

function ProcPanel({
  item,
  refs,
  index,
  locale,
}: {
  item: Screen
  refs: React.MutableRefObject<ProcNode[]>
  index: number
  locale: Locale
}) {
  return (
    <div
      className={s.proc}
      ref={(el) => {
        refs.current[index].root = el
      }}
    >
      <div className={s.cap}>
        <span className={s.dot} />
        <b>{localizeSceneText(item.title, locale)}</b>
        <span className={s.tg}>{item.tag}</span>
      </div>
      <div
        className={s.scr}
        ref={(el) => {
          refs.current[index].scr = el
        }}
      >
        <iframe
          scrolling="no"
          title={localizeSceneText(item.title, locale)}
          ref={(el) => {
            refs.current[index].iframe = el
          }}
        />
      </div>
    </div>
  )
}

export interface PerspectivesViewProps {
  locale: Locale
  canvasRef: React.Ref<HTMLCanvasElement>
  fieldHeroRef: React.MutableRefObject<HTMLDivElement | null>
  devHeroRef: React.MutableRefObject<HTMLDivElement | null>
  fieldDimRefs: React.MutableRefObject<Array<HTMLSpanElement | null>>
  devDimRefs: React.MutableRefObject<Array<HTMLSpanElement | null>>
  fieldProcRefs: React.MutableRefObject<ProcNode[]>
  devProcRefs: React.MutableRefObject<ProcNode[]>
  vlabelRef: React.MutableRefObject<HTMLSpanElement | null>
  puckRef: React.MutableRefObject<HTMLSpanElement | null>
}

export function PerspectivesView({
  locale,
  canvasRef,
  fieldHeroRef,
  devHeroRef,
  fieldDimRefs,
  devDimRefs,
  fieldProcRefs,
  devProcRefs,
  vlabelRef,
  puckRef
}: PerspectivesViewProps) {
  const en = locale === 'en'
  // Callback refs for the blurred ("dim") words — same slots in both languages.
  const fieldDim = (i: number) => (el: HTMLSpanElement | null) => {
    fieldDimRefs.current[i] = el
  }
  const devDim = (i: number) => (el: HTMLSpanElement | null) => {
    devDimRefs.current[i] = el
  }
  return (
    <SceneHost
      className={s.stage}
      bg="#050505"
      overlay={{
        grain: { opacity: 0.045, z: 69, dur: '1.12s' },
        scan: {
          bg: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.2) 3px, rgba(0, 0, 0, 0) 4px)',
          z: 70,
          opacity: 0.5,
        },
        vignette: {
          bg: 'radial-gradient(ellipse 140% 124% at 50% 50%, rgba(0, 0, 0, 0) 56%, rgba(0, 0, 0, 0.62) 100%)',
          z: 71,
        },
      }}
    >
      <canvas ref={canvasRef} className={s.c} />

      <div className={s.kicker}>
        <span className={s.kr}>{en ? 'SCENE 05 · PERSPECTIVES' : 'SCENE 05 · 관점 — PERSPECTIVES'}</span>
        <span className={s.sep}>/</span>
        <span className={s.rec} />
        <span className={s.vlabel} ref={vlabelRef}>
          {en ? 'Field-expert perspective' : '실무자 관점 · FIELD EXPERT'}
        </span>
      </div>

      {en ? (
        <div className={`${s.hero} ${s.fieldHero}`} ref={fieldHeroRef}>
          <h1 className={`${s.l1} ${s.kr}`}>
            Field experts know <em>the work</em> best.
          </h1>
          <h2 className={`${s.l2} ${s.kr}`}>
            But{' '}
            <span className={s.dim} ref={fieldDim(0)}>
              the language of systems
            </span>{' '}
            and{' '}
            <span className={s.dim} ref={fieldDim(1)}>
              development processes
            </span>{' '}
            feel <span className={s.strange}>unfamiliar</span>.
          </h2>
        </div>
      ) : (
        <div className={`${s.hero} ${s.fieldHero}`} ref={fieldHeroRef}>
          <h1 className={`${s.l1} ${s.kr}`}>
            현업은 <em>업무</em>를 가장 잘 압니다.
          </h1>
          <h2 className={`${s.l2} ${s.kr}`}>
            하지만{' '}
            <span className={s.dim} ref={fieldDim(0)}>
              시스템 언어
            </span>
            와{' '}
            <span className={s.dim} ref={fieldDim(1)}>
              개발 프로세스
            </span>
            는 <span className={s.strange}>낯설게</span> 느껴집니다.
          </h2>
        </div>
      )}

      {en ? (
        <div className={`${s.hero} ${s.devHero}`} ref={devHeroRef}>
          <h1 className={`${s.l1} ${s.kr}`}>
            Developers know <em>technology</em> best.
          </h1>
          <h2 className={`${s.l2} ${s.kr}`}>
            But the complex work of the manufacturing{' '}
            <span className={s.dim} ref={devDim(0)}>
              floor
            </span>{' '}
            and its{' '}
            <span className={s.dim} ref={devDim(1)}>
              hard-won experience
            </span>{' '}
            are <span className={s.strange}>hard to see.</span>
          </h2>
        </div>
      ) : (
        <div className={`${s.hero} ${s.devHero}`} ref={devHeroRef}>
          <h1 className={`${s.l1} ${s.kr}`}>
            개발자는 <em>기술</em>을 가장 잘 압니다.
          </h1>
          <h2 className={`${s.l2} ${s.kr}`}>
            하지만 제조{' '}
            <span className={s.dim} ref={devDim(0)}>
              현장
            </span>
            의 복잡한 업무와{' '}
            <span className={s.dim} ref={devDim(1)}>
              경험
            </span>
            은 <span className={s.strange}>알기 어렵습니다.</span>
          </h2>
        </div>
      )}

      <div className={`${s.procs} ${s.fieldProcs}`}>
        {FIELD.map((item, index) => (
          <ProcPanel item={item} refs={fieldProcRefs} index={index} key={item.file} locale={locale} />
        ))}
      </div>
      <div className={`${s.procs} ${s.devProcs}`}>
        {DEV.map((item, index) => (
          <ProcPanel item={item} refs={devProcRefs} index={index} key={item.file} locale={locale} />
        ))}
      </div>

      <div className={s.rail}>
        <div className={s.ends}>
          <span className={s.lf}>
            {en ? 'Field' : '현장'}<small>{en ? 'FIELD · manufacturing / process' : 'FIELD · 제조 / 공정'}</small>
          </span>
          <span className={s.rt}>
            {en ? 'System' : '시스템'}<small>{en ? 'SYSTEM · code / architecture' : 'SYSTEM · 코드 / 아키텍처'}</small>
          </span>
        </div>
        <div className={s.track}>
          <span className={s.tick} style={{ left: '0%' }} />
          <span className={s.tick} style={{ left: '50%' }} />
          <span className={s.tick} style={{ left: '100%' }} />
          <span className={s.puck} ref={puckRef} />
        </div>
      </div>

      <div className={`${s.footer} ${s.kr}`}>
        {en ? (
          <>
            Neither side <b>fully</b> understands the other — which is why it takes <b>someone who connects them</b>.
          </>
        ) : (
          <>
            두 관점은 서로를 <b>완전히</b> 알지 못합니다 — 그래서 <b>잇는 사람</b>이 필요합니다
          </>
        )}
      </div>

    </SceneHost>
  )
}
