/**
 * NO EDITAR - Solo referencia para el agente de IA
 * TIPO C - FORBIDDEN CONTEXT
 * 
 * AuthContext: Maneja toda la lógica de autenticación OTP
 */

import { createContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { STORE_ID } from '@/lib/config'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUpWithOtp: (email: string, firstName?: string, lastName?: string, phone?: string) => Promise<{ error: any }>
  verifyOtp: (email: string, token: string) => Promise<{ error: any }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resendOtp: (email: string) => Promise<{ error: any }>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])


  const signUpWithOtp = async (
    email: string,
    firstName?: string,
    lastName?: string,
    phone?: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            store_id: STORE_ID,
            first_name: firstName,
            last_name: lastName,
            phone: phone
          }
        }
      })

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      })

      if (error) return { error }
      
      // Link customer to store via edge function
      if (data.user) {
        try {
          await supabase.functions.invoke('customer-auth-link', {
            body: {
              email: data.user.email,
              store_id: STORE_ID,
              user_id: data.user.id,
              first_name: data.user.user_metadata?.first_name,
              last_name: data.user.user_metadata?.last_name,
              phone: data.user.user_metadata?.phone
            }
          })
        } catch (linkError) {
          console.error('Error linking customer profile:', linkError)
          // Don't fail the authentication if linking fails
        }
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const resendOtp = async (email: string) => {
    return signUpWithOtp(email)
  }

  const value = {
    user,
    session,
    loading,
    signUpWithOtp,
    verifyOtp,
    signInWithPassword,
    signOut,
    resendOtp
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
