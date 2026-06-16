import { Film } from '@/components/film/Film'

// Home = the autoplay portfolio "film". It plays acts in order, then hands off
// to the interactive gantt finale. Scene gallery routes (/s/[scene], /c/[comp])
// remain intact and reachable directly.
export default function Home() {
  return <Film />
}
