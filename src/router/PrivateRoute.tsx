import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '../lib/cookies'

export function PrivateRoute() {
  return getToken() ? <Outlet /> : <Navigate to="/login" replace />
}
