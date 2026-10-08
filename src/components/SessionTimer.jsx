import { useEffect, useRef, useState } from 'react'

// Turns task minutes into focus blocks with breaks attached.
// Under 30: one block. 30-100: 25s. Over 100: 50s.
// Break: 5 after short blocks, 10 after long ones, 20 after every 4th.
export function planBlocks(totalMin) {
  const m = Math.max(1, Math.round(Number(totalMin) || 25))
  let sizes
  if (m <= 30) {
    sizes = [m]
  } else if (m <= 100) {
    const n = Math.max(1, Math.round(m / 25))
    const base = Math.floor(m / n)
    sizes = Array.from({ length: n }, (_, i) => base + (i < m - base * n ? 1 : 0))
  } else {
    const n = Math.max(2, Math.round(m / 50))
    const base = Math.floor(m / n)
    sizes = Array.from({ length: n }, (_, i) => base + (i < m - base * n ? 1 : 0))
  }
  return sizes.map((len, i) => ({
    len,
    breakAfter: i === sizes.length - 1 ? 0 : (i + 1) % 4 === 0 ? 20 : len >= 50 ? 10 : 5
  }))
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    o.start()
    o.stop(ctx.currentTime + 0.4)
  } catch {
    /* silent */
  }
}

function fmt(sec) {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function SessionTimer({ task, startBlock, onBlockDone, onTaskDone, onClose }) {
  const blocks = planBlocks(task.duration_min)
  const [bi, setBi] = useState(Math.min(Number(startBlock) || 0, blocks.length - 1))
  const [phase, setPhase] = useState('focus')
  const [remaining, setRemaining] = useState(blocks[Math.min(Number(startBlock) || 0, blocks.length - 1)].len * 60)
  const [running, setRunning] = useState(false)
  const endAt = useRef(0)
  const stateRef = useRef({ bi, phase })
  stateRef.current = { bi, phase }

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        const { bi: b, phase: p } = stateRef.current
        beep()
        if (p === 'focus') {
          onBlockDone(b)
          if (b >= blocks.length - 1) {
            setRunning(false)
            setPhase('done')
            onTaskDone()
          } else {
            const br = blocks[b].breakAfter
            if (br > 0) {
              setPhase('break')
              setRemaining(br * 60)
              endAt.current = Date.now() + br * 60 * 1000
            } else {
              setBi(b + 1)
              setRemaining(blocks[b + 1].len * 60)
              endAt.current = Date.now() + blocks[b + 1].len * 60 * 1000
            }
          }
        } else {
          setBi(b + 1)
          setPhase('focus')
          setRemaining(blocks[b + 1].len * 60)
          endAt.current = Date.now() + blocks[b + 1].len * 60 * 1000
        }
      }
    }, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function start() {
    endAt.current = Date.now() + remaining * 1000
    setRunning(true)
  }

  function pause() {
    setRunning(false)
  }

  function full() {
    if (phase === 'focus') return blocks[bi].len * 60
    const prevBlock = blocks[bi]
    return (prevBlock ? prevBlock.breakAfter : 5) * 60
  }

  const pct = full() === 0 ? 0 : Math.round(((full() - remaining) / full()) * 100)
  const R = 84
  const CIRC = 2 * Math.PI * R

  return (
    <div className="rounded-2xl border bg-white p-5 text-center shadow-sm">
      <p className="text-sm text-slate-500">
        {phase === 'done'
          ? 'Session complete'
          : phase === 'break'
            ? `Break · block ${bi + 1} of ${blocks.length} done`
            : `Block ${bi + 1} of ${blocks.length} · ${blocks[bi].len} min focus`}
      </p>
      <div className="relative mx-auto mt-3 h-48 w-48">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#E2E8F0" strokeWidth="14" />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={phase === 'break' ? '#16A34A' : '#4F46E5'}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC - (CIRC * pct) / 100}
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <p className="absolute inset-0 flex items-center justify-center text-4xl font-bold tabular-nums">
          {phase === 'done' ? 'Done' : fmt(remaining)}
        </p>
      </div>
      {phase !== 'done' && (
        <div className="mt-4 flex gap-2">
          {!running ? (
            <button onClick={start} className="btn-lively flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white">
              {remaining < full() ? 'Resume' : 'Start'}
            </button>
          ) : (
            <button onClick={pause} className="btn-lively flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white">
              Pause
            </button>
          )}
          {phase === 'break' && (
            <button
              onClick={() => {
                setRunning(false)
                setBi(bi + 1)
                setPhase('focus')
                setRemaining(blocks[bi + 1].len * 60)
              }}
              className="btn-lively rounded-xl border px-4 py-3 font-semibold text-slate-600"
            >
              Skip
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-lively rounded-xl border px-4 py-3 font-semibold text-slate-600"
          >
            End
          </button>
        </div>
      )}
      {phase === 'done' && (
        <button onClick={onClose} className="btn-lively mt-4 w-full rounded-xl bg-green-600 py-3 font-semibold text-white">
          Back to tasks
        </button>
      )}
      <p className="mt-3 text-xs text-slate-400">
        25 min blocks get 5 min breaks · 50 min blocks get 10 · every 4th break is 20
      </p>
    </div>
  )
}
