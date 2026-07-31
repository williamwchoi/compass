import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Sidebar, MobileNav } from '@/components/layout/sidebar'
import { Gate } from '@/components/gate'
import { TodayPage } from '@/pages/today'
import { DecidePage } from '@/pages/decide'
import { ReflectPage } from '@/pages/reflect'
import { FoundationsPage } from '@/pages/foundations'
import { InspirationPage } from '@/pages/inspiration'
import { trackUsage } from '@/lib/api'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

// Board-style pages get more width; reading/forms stay narrow for focus.
const WIDE_ROUTES = ['/inspiration']

function Layout() {
  const { pathname } = useLocation()
  const wide = WIDE_ROUTES.includes(pathname)
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={`flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 pb-24 md:pb-7 mx-auto w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/decide" element={<DecidePage />} />
          <Route path="/reflect" element={<ReflectPage />} />
          <Route path="/foundations" element={<FoundationsPage />} />
          <Route path="/inspiration" element={<InspirationPage />} />
          <Route path="/compass" element={<Navigate to="/foundations" replace />} />
          <Route path="/goals" element={<Navigate to="/foundations" replace />} />
          <Route path="/discover" element={<Navigate to="/foundations" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <MobileNav />
    </div>
  )
}

function RouteTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    const feature = pathname === '/' ? 'check-in' : pathname.split('/').filter(Boolean)[0] ?? 'check-in'
    trackUsage('page_viewed', feature, pathname)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Gate>
        <BrowserRouter>
          <RouteTracker />
          <Layout />
        </BrowserRouter>
      </Gate>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  )
}
