export default function MobileFrame({ children }) {
  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-white md:bg-[#F5F6FA]">
      {children}
    </div>
  )
}
