import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../lib/types'

interface AuthContextType {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isLeadCoach: boolean
  isApproved: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  isLeadCoach: false,
  isApproved: false,
  signOut: async () => {},
})

// DEV BYPASS: skip login
const DEV_BYPASS_AUTH = true

const DEV_PROFILE: Profile = {
  id: 'dev-user',
  email: 'dev@example.com',
  full_name: null,
  role: 'lead_coach',
  approved: true,
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      setSession({} as Session)
      setProfile(DEV_PROFILE)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    console.log('Fetching profile for userId:', userId)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    console.log('Profile fetch result:', { data, error })
    setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      isLeadCoach: DEV_BYPASS_AUTH ? true : profile?.role === 'lead_coach',
      isApproved: DEV_BYPASS_AUTH ? true : profile?.approved === true,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
