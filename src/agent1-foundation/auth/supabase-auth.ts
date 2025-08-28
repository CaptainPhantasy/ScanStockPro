import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabaseClient, Database, MOBILE_CONFIG } from '../config/supabase'
import type { 
  User, 
  Session, 
  AuthError, 
  AuthResponse,
  SignUpWithPasswordCredentials,
  SignInWithPasswordCredentials
} from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  session: Session | null
  businessId: string | null
  userRole: 'admin' | 'user' | 'viewer' | null
}

export interface BusinessInfo {
  id: string
  name: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  role: 'admin' | 'user' | 'viewer'
  permissions: Record<string, boolean>
}

export interface SignUpData extends SignUpWithPasswordCredentials {
  options?: {
    data?: {
      business_name?: string
      full_name?: string
      phone?: string
    }
  }
}

export class AuthService {
  private supabase = supabaseClient
  private cache: Map<string, any> = new Map()
  private refreshTimer: NodeJS.Timeout | null = null

  constructor() {
    this.initializeAuth()
  }

  private async initializeAuth() {
    // Auto-refresh session for mobile apps
    this.setupAutoRefresh()
    
    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.cacheUserData(session.user)
      } else if (event === 'SIGNED_OUT') {
        this.clearCache()
      }
    })
  }

  /**
   * Sign up with email and password, create business
   */
  async signUp(signUpData: SignUpData): Promise<AuthResponse> {
    try {
      const { email, password, options } = signUpData
      
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          ...options,
          data: {
            ...options?.data,
            // Mobile-specific metadata
            device_type: this.getDeviceType(),
            signup_timestamp: new Date().toISOString(),
          }
        }
      })

      if (error) throw error

      // If sign up was successful and user is confirmed, create business
      if (data.user && !error) {
        const businessName = options?.data?.business_name || `${email.split('@')[0]}'s Business`
        
        try {
          await this.createBusiness(data.user.id, businessName)
        } catch (businessError) {
          console.error('Failed to create business:', businessError)
          // Don't fail the auth if business creation fails - can be retried
        }
      }

      return { data, error }
    } catch (error) {
      return { 
        data: { user: null, session: null }, 
        error: error as AuthError 
      }
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: SignInWithPasswordCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Cache user data for mobile performance
      if (data.user) {
        await this.cacheUserData(data.user)
      }

      return { data, error }
    } catch (error) {
      return { 
        data: { user: null, session: null }, 
        error: error as AuthError 
      }
    }
  }

  /**
   * Sign out and clear all cached data
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.signOut()
      
      // Clear all caches and timers
      this.clearCache()
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }

      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  /**
   * Get current session with mobile optimization
   */
  async getSession(): Promise<Session | null> {
    try {
      // Try cache first for mobile performance
      const cached = this.cache.get('session')
      if (cached && this.isSessionValid(cached)) {
        return cached
      }

      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) throw error
      
      // Cache valid session
      if (session) {
        this.cache.set('session', session)
        setTimeout(() => this.cache.delete('session'), MOBILE_CONFIG.cacheTTL)
      }

      return session
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) throw error

      // Update cache
      if (data.session) {
        this.cache.set('session', data.session)
      }

      return { data, error }
    } catch (error) {
      return { 
        data: { user: null, session: null }, 
        error: error as AuthError 
      }
    }
  }

  /**
   * Get current user with business context
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) throw error
      
      return user
    } catch (error) {
      console.error('Failed to get current user:', error)
      return null
    }
  }

  /**
   * Get user's business information with role and permissions
   */
  async getUserBusinessInfo(userId: string): Promise<BusinessInfo[]> {
    try {
      // Check cache first
      const cacheKey = `business_info_${userId}`
      const cached = this.cache.get(cacheKey)
      if (cached) return cached

      const { data, error } = await this.supabase
        .from('team_members')
        .select(`
          business_id,
          role,
          permissions,
          businesses:business_id (
            id,
            name,
            subscription_tier
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) throw error

      const businessInfo = data?.map(item => ({
        id: item.businesses.id,
        name: item.businesses.name,
        subscription_tier: item.businesses.subscription_tier,
        role: item.role,
        permissions: item.permissions
      })) || []

      // Cache for mobile performance
      this.cache.set(cacheKey, businessInfo)
      setTimeout(() => this.cache.delete(cacheKey), MOBILE_CONFIG.cacheTTL)

      return businessInfo
    } catch (error) {
      console.error('Failed to get user business info:', error)
      return []
    }
  }

  /**
   * Invite team member to business
   */
  async inviteTeamMember(
    businessId: string, 
    email: string, 
    role: 'admin' | 'user' | 'viewer' = 'user',
    permissions: Record<string, boolean> = { count: true, edit: false, admin: false }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create invitation record for the email
      // In a full implementation, you'd send an email invitation
      // For MVP, this creates a pending invitation that can be claimed
      const { error: inviteError } = await this.supabase
        .from('team_members')
        .insert({
          business_id: businessId,
          user_id: null, // Will be filled when user signs up with this email
          role,
          permissions,
          status: 'pending',
          // Store email in a JSONB field for invitation lookup
          // Note: This would normally be in a separate invitations table
          invited_email: email
        })

      if (inviteError) throw inviteError

      // TODO: Send invitation email (implement in Agent 3)
      // For now, return success with note about invitation system
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to invite team member' 
      }
    }
  }

  /**
   * Update user role and permissions
   */
  async updateUserRole(
    businessId: string,
    userId: string,
    role: 'admin' | 'user' | 'viewer',
    permissions?: Record<string, boolean>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { role }
      if (permissions) {
        updateData.permissions = permissions
      }

      const { error } = await this.supabase
        .from('team_members')
        .update(updateData)
        .eq('business_id', businessId)
        .eq('user_id', userId)

      if (error) throw error

      // Clear cache
      this.cache.delete(`business_info_${userId}`)

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update user role' 
      }
    }
  }

  /**
   * Change user password
   */
  async changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to change password' 
      }
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send reset email' 
      }
    }
  }

  /**
   * Private helper methods
   */
  private async createBusiness(userId: string, businessName: string): Promise<void> {
    const { data: business, error: businessError } = await this.supabase
      .from('businesses')
      .insert({
        name: businessName,
        owner_id: userId,
        subscription_tier: 'free'
      })
      .select()
      .single()

    if (businessError) throw businessError

    // Add user as admin team member
    const { error: teamError } = await this.supabase
      .from('team_members')
      .insert({
        business_id: business.id,
        user_id: userId,
        role: 'admin',
        permissions: { count: true, edit: true, admin: true },
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (teamError) throw teamError
  }

  private async cacheUserData(user: User): Promise<void> {
    try {
      const businessInfo = await this.getUserBusinessInfo(user.id)
      this.cache.set(`user_${user.id}`, { user, businessInfo })
    } catch (error) {
      console.error('Failed to cache user data:', error)
    }
  }

  private clearCache(): void {
    this.cache.clear()
  }

  private isSessionValid(session: Session): boolean {
    const now = Math.floor(Date.now() / 1000)
    return session.expires_at ? session.expires_at > now : false
  }

  private setupAutoRefresh(): void {
    // Refresh session every 25 minutes (before 30min expiry)
    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshSession()
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, 25 * 60 * 1000)
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'server'
    
    const userAgent = window.navigator.userAgent.toLowerCase()
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile'
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet'
    }
    return 'desktop'
  }
}

// Export singleton instance
export const authService = new AuthService()

// React hooks for easier integration with Agent 2
export const useAuthService = () => authService