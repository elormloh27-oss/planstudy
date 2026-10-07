export default function Loading({ message }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        <img src="/planstudy-mark.svg" alt="" className="h-7 w-auto" />
      </div>
      <p className="anim-fade-up mt-4 text-sm text-slate-500">
        {message || 'Getting things ready...'}
      </p>
    </div>
  )
}
