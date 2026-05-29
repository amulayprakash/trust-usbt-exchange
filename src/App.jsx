import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import AppShell from '@/components/layout/AppShell'
import MobileFrame from '@/components/layout/MobileFrame'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

import Landing from '@/pages/Landing'
import Home from '@/pages/Home'
import TokenDetail from '@/pages/TokenDetail'
import Swap from '@/pages/Swap'
import Send from '@/pages/Send'
import Receive from '@/pages/Receive'
import Trending from '@/pages/Trending'
import Rewards from '@/pages/Rewards'
import Discover from '@/pages/Discover'
import ExchangeSwap from '@/pages/ExchangeSwap'
import Admin from '@/pages/Admin'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route
            path="/landing"
            element={
              <MobileFrame>
                <Landing />
              </MobileFrame>
            }
          />

          {/* Protected (wallet required) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/token/:symbol" element={<TokenDetail />} />
              <Route path="/swap" element={<Swap />} />
              <Route path="/send" element={<Send />} />
              <Route path="/receive" element={<Receive />} />
              <Route path="/trending" element={<Trending />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/exchange-swap" element={<ExchangeSwap />} />
            </Route>
          </Route>

          {/* Admin — self-guarded, no AppShell */}
          <Route
            path="/admin"
            element={
              <MobileFrame>
                <Admin />
              </MobileFrame>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        expand={false}
        richColors
        toastOptions={{ style: { maxWidth: '380px' } }}
      />
    </QueryClientProvider>
  )
}
