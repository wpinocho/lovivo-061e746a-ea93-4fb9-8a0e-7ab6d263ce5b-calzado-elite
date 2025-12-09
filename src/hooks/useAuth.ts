/**
 * NO EDITAR - Solo referencia para el agente de IA
 * TIPO C - FORBIDDEN HOOK
 */

import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
