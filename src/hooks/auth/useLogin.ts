import { useMutation } from '@tanstack/react-query'
import { authApi, type LoginPayload } from '../../api/auth.api'

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
  })
}
