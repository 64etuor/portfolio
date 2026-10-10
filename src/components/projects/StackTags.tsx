/** Tech-stack pills. */
export function StackTags({ stack }: { stack: string[] }) {
  if (!stack?.length) return null
  return (
    <ul className="pj-stack">
      {stack.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  )
}
