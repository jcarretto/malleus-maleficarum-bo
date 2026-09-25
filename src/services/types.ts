// Mirrors api/openapi.yaml (malleus-maleficarum-api). Keep in sync until types are generated.

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: 'user' | 'admin'
  tier: 'free' | 'premium'
  locale: 'es' | 'en' | 'pt'
  hasPassword: boolean
  createdAt: string
}

export interface Session {
  accessToken: string
  tokenType: 'Bearer'
  /** Access token lifetime in seconds. */
  expiresIn: number
  user: User
}

export interface LoginInput {
  email: string
  password: string
}
