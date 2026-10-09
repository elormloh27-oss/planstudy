import { useEffect, useRef } from 'react'

// Adds .reveal-in when the element scrolls into view. GPU-safe.
export default function useRevealRoot() {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const targets = root.querySelectorAll('.reveal, .reveal-soft')
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('reveal-in'))
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])

  return ref
}
