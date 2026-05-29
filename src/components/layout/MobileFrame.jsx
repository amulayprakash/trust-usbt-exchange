export default function MobileFrame({ children }) {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white md:bg-[#F5F6FA]">
      {children}
    </div>
  )
}
