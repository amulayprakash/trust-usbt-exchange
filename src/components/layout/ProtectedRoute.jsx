import { Navigate, Outlet } from 'react-router-dom'
import useWalletStore from '@/store/useWalletStore'

export default function ProtectedRoute() {
  const { isConnected } = useWalletStore()
  return isConnected ? <Outlet /> : <Navigate to="/landing" replace />
}
