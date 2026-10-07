export default function ProgressBar({ done, total }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>
          {done} of {total} done
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-200">
        <div className="h-full rounded bg-indigo-600" style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}
