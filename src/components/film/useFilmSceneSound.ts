import { useEffect, useMemo } from 'react'
import { sfx, SoundEventMapper, type FilmClockSource, type SfxEventLog } from '@/lib/sfx'
import { setSoundSink } from '@/scenes/_host/sceneSound'
import { FILM_SCHEDULE } from './schedule'

/** scene file → its FILM_SCHEDULE act id (the eventMap's section colour) */
const ACT_OF_FILE: ReadonlyMap<string, string> = new Map(FILM_SCHEDULE.map((s) => [s.file, s.actId]))

type DebugWindow = Window & { __sceneSfxLog?: SfxEventLog[] }

interface Args {
  clock: FilmClockSource
  paused: boolean
  ended: boolean
  /** bumps on each PICTURE cut (useSceneBuffer.cutId) */
  cutId: number
  /** ?sfx=debug — mirror every event into window.__sceneSfxLog */
  debug: boolean
}

/**
 * useFilmSceneSound — installs the scene-sound sink for the film's lifetime.
 *
 * Scenes emit semantic events (sceneSound.ts) through their slot's SceneClock.emit, which Film
 * sets only on the visible, running slot. Here every event goes through the eventMap
 * (meaning → sound, etiquette rules) into the sfx engine, so it follows the same mute (M /
 * toggle), blocked-until-gesture, pause fade and master limiter as the rest of the film.
 * Returns the mapper (its log feeds the ?sfx=debug ticker).
 */
export function useFilmSceneSound({ clock, paused, ended, cutId, debug }: Args): SoundEventMapper {
  const mapper = useMemo(
    () =>
      new SoundEventMapper({
        play: (name, opts) => sfx.play(name, opts),
        duck: (t, depth, hold, release) => sfx.duck(t, depth, hold, release),
        hush: (t, depth) => sfx.hush(t, depth),
        fadeTextures: () => sfx.fadeTextures(),
        actOf: (scene) => ACT_OF_FILE.get(scene),
        audioNow: () => sfx.musicTarget()?.ctx.currentTime ?? null,
        outputLag: () => sfx.outputLag(),
        audible: () => sfx.state === 'on',
        filmNowMs: () => clock.nowMs(),
        // dev / ?sfx=debug: mirror every event for QA (Playwright reads window.__sceneSfxLog)
        onLog:
          debug || process.env.NODE_ENV === 'development'
            ? (e) => {
                const w = window as DebugWindow
                ;(w.__sceneSfxLog ??= []).push(e)
              }
            : undefined,
      }),
    [clock, debug],
  )

  useEffect(() => {
    // Pause/visibility gating lives in Film (only the visible running slot has an emitter). Not
    // re-checked against clock.state() here: a resumed scene's effects run before the clock's own
    // resume effect, so its first event would be dropped on the floor.
    setSoundSink((e) => {
      if (clock.state() === 'ended') return
      mapper.handle(e)
    })
    return () => setSoundSink(null)
  }, [mapper, clock])

  // picture cut → open the cut guard (the first cutId value is the opening shot, not a cut)
  useEffect(() => {
    if (cutId > 0) mapper.markCut()
  }, [cutId, mapper])

  useEffect(() => {
    if (paused || ended) mapper.reset()
  }, [paused, ended, mapper])

  return mapper
}
