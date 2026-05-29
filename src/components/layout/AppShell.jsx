import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import MobileFrame from './MobileFrame'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import DesktopHeader from './DesktopHeader'
import DesktopSidebar from './DesktopSidebar'

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.16, ease: [0.55, 0, 1, 0.45] },
  },
}

export default function AppShell() {
  const location = useLocation()

  return (
    <MobileFrame>
      <div className="md:hidden flex-shrink-0">
        <TopBar />
      </div>

      <div className="hidden md:block flex-shrink-0">
        <DesktopHeader />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <DesktopSidebar />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden momentum-scroll">
          <div className="md:max-w-2xl md:mx-auto md:my-6 md:bg-white md:rounded-2xl md:shadow-sm md:overflow-hidden md:border md:border-gray-100">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="will-animate"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <div className="md:hidden flex-shrink-0">
        <BottomNav />
      </div>
    </MobileFrame>
  )
}
