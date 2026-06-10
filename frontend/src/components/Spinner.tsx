export default function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-white/8" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gold animate-spin" />
      </div>
    </div>
  )
}
