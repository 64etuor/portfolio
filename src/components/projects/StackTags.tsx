/** Tech-stack pills. */
export function StackTags({ stack }: { stack: string[] }) {
  if (!stack?.length) return null
  return (
    <ul className="pj-stack">
      {stack.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  )
}
