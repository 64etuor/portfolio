# Scene Module Conventions

Use this pattern for interactive scenes unless a scene has a specific reason to differ.

## Canonical Shape

`Scene.tsx` should be a thin orchestrator:

- Create refs and stable runtime state.
- Call host hooks such as `useSceneReady` and `useSceneCanvas`.
- Mount the runtime in effects.
- Render the view component.

The canonical runtime entry is:

```ts
const runtime = createRuntime(refs, state)
```

`createRuntime(refs, state): Runtime` should return named lifecycle and event methods, for example `mount()`, `cleanup()`, `tick(frame)`, or handlers used by `view.tsx`. A runtime may instead return a cleanup function when the scene only needs one effect lifecycle. Accepted variants already exist: `scada-hmi` exports a bare `tick()`, and `pid-scheme` uses a hook-shaped runtime.

## SceneHost Ownership

Prefer `view.tsx` to own `<SceneHost>`. Most scenes follow that shape, and it keeps layout markup with the static JSX. If a scene needs host hooks or host-level canvas layering in `Scene.tsx`, keeping `<SceneHost>` in `Scene.tsx` is acceptable, but do not split host ownership across files.

## File Responsibilities

- `view.tsx`: static JSX, `SceneHost`, ref callback placement, visual structure.
- `draw.ts`: canvas, SVG, DOM string, and geometry render helpers.
- `runtime.ts`: mutable state, state machines, animation engines, timers, event listeners, lifecycle cleanup.
- `constants.ts`: static timing, sizing, labels, and tuning constants.
- `types.ts`: shared TypeScript types.
- `data.ts`: scene content, rows, nodes, labels, and deterministic data fixtures.

## Refs And Ctx Threading

Thread runtime dependencies explicitly through a `refs` or `ctx` object instead of closing over scattered locals. This makes ownership visible and keeps `Scene.tsx` small:

```ts
type RuntimeRefs = {
  rootRef: RefObject<HTMLDivElement | null>
  rowsRef: RefObject<Array<HTMLButtonElement | null>>
}
```

Watch for the pass-by-value-ref trap. Passing `countRef.current` gives a snapshot number; changes will not flow back to the caller. Wrap mutable numeric or boolean state in an object/ref and pass the wrapper:

```ts
// Good: runtime can mutate shared state.
const state = { count: 0 }
createRuntime(refs, state)

// Also good for React-owned mutable state.
const countRef = useRef(0)
createRuntime(refs, { countRef })
```

Every timer, interval, rAF, DOM listener, and delayed cleanup created by `runtime.ts` must be owned and cleared by the runtime cleanup path.
