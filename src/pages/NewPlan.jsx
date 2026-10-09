import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { generatePlan, parseOutline } from '../lib/generatePlan.js'
import { readOutline } from '../lib/pdfOutline.js'

const input = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

export default function NewPlan() {
  const [subject, setSubject] = useState('')
  const [topics, setTopics] = useState('')
  const [deadline, setDeadline] = useState('')
  const [hours, setHours] = useState(2)
  const [preview, setPreview] = useState(null)
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [parsing, setParsing] = useState('')
  const [outlineNote, setOutlineNote] = useState('')
  const fileRef = useRef(null)
  const cancelRef = useRef({ current: false })
  const navigate = useNavigate()

  const MESSAGES = {
    'not-pdf': 'That is not a PDF. The outline must be a PDF file.',
    locked: 'This PDF is locked. Unlock it first, or type the topics by hand.',
    empty: 'No readable pages found. Type the topics by hand.',
    cdn: 'Reader could not load. Check connection and try again.',
    cancelled: 'Cancelled. Type the topics by hand or try a smaller file.',
    failed: 'Could not read the outline. Type the topics by hand.'
  }

  async function onFile(file) {
    if (!file || parsing || busy) return
    setOutlineNote('')
    cancelRef.current = false
    setParsing('Reading outline...')
    try {
      const out = await readOutline(file, {
        cancelled: cancelRef,
        onProgress: (p, total) => setParsing(`Reading page ${p} of ${total}...`)
      })
      setParsing(out.mode === 'images' ? 'Reading scanned pages...' : 'Extracting topics...')
      const parsed = await parseOutline(
        out.mode === 'text' ? { text: out.text } : { images: out.images }
      )
      if (!parsed || parsed.topics.length === 0) {
        setParsing('')
        const local = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        setOutlineNote(
          local
            ? 'Outline was read, but AI extraction only runs on the live site. Push to GitHub and try there, or type topics by hand.'
            : MESSAGES.failed
        )
        return
      }
      if (parsed.subject) setSubject(parsed.subject)
      setTopics(parsed.topics.join('\n'))
      if (parsed.deadline) setDeadline(parsed.deadline)
      if (parsed.hours) setHours(parsed.hours)
      setParsing('')
      const pages = out.mode === 'text'
        ? (out.pagesUsed >= out.totalPages
          ? `Whole file read (${out.totalPages} pages, headings only).`
          : `First ${out.pagesUsed} of ${out.totalPages} pages read (enough text gathered).`)
        : `Scanned file, ${out.images.length} pages read as images.`
      setOutlineNote(`Filled from ${file.name}. ${pages} Check and edit before generating.`)
    } catch (e) {
      setParsing('')
      if (e?.code === 'too-big' && e.cap) {
        const mb = Math.round(e.cap.bytes / 1048576)
        setOutlineNote(`Over the ${mb}MB limit on this ${e.cap.label}. Re-save with fewer pages and try again.`)
      } else {
        setOutlineNote(MESSAGES[e?.code] || MESSAGES.failed)
      }
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onGenerate(e) {
    e.preventDefault()
    setBusy(true)
    const res = await generatePlan({ subject, topics, deadline, hoursPerDay: Number(hours) })
    setPreview(res.tasks)
    setSource(res.source)
    setBusy(false)
  }

  async function onSave() {
    const { data: session } = await supabase.auth.getSession()
    const user = session.session?.user
    if (!user) return
    const { data, error } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        subject,
        topics,
        deadline,
        hours_per_day: Number(hours),
        plan_json: preview
      })
      .select()
      .single()
    if (!error) navigate(`/plan/${data.id}`)
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6 sm:py-8">
      <p className="text-sm font-medium text-indigo-600">Step 1 of 2</p>
      <h1 className="mt-1 text-2xl font-bold">What are you studying?</h1>

      <div
        onClick={() => !parsing && !busy && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFile(e.dataTransfer.files?.[0])
        }}
        className="mt-5 cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-center"
      >
        <p className="font-semibold text-indigo-700">
          {parsing || 'Drop a course outline PDF here'}
        </p>
        {parsing ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              cancelRef.current = true
            }}
            className="mt-2 rounded-lg border px-3 py-1 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            or tap to browse — the form fills itself in
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      {outlineNote && <p className="mt-2 text-sm text-slate-600">{outlineNote}</p>}

      <form onSubmit={onGenerate} className="mt-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <label className="block text-sm font-medium">Subject</label>
        <input
          required
          placeholder="Biology"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={`${input} mt-1`}
        />

        <label className="mt-4 block text-sm font-medium">Topics</label>
        <textarea
          required
          placeholder={'One per line works best\nCell structure\nPhotosynthesis\nGenetics'}
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          rows={4}
          className={`${input} mt-1`}
        />

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Exam date</label>
            <input
              required
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={`${input} mt-1`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Hours per day</label>
            <input
              required
              type="number"
              min={1}
              max={12}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={`${input} mt-1`}
            />
          </div>
        </div>

        <button
          disabled={busy || parsing}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white active:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Building your plan...' : 'Generate plan'}
        </button>
      </form>

      {preview && (
        <div className="mt-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{preview.length} study sessions</p>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
              {source === 'ai' ? 'Made by AI' : 'Made offline'}
            </span>
          </div>
          <ul className="mt-3 divide-y">
            {preview.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                  {t.duration_min}m
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block text-xs text-slate-500">{t.date}</span>
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={onSave}
            className="sticky bottom-4 mt-4 w-full rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-lg active:bg-green-700"
          >
            Save plan
          </button>
        </div>
      )}
    </main>
  )
}
