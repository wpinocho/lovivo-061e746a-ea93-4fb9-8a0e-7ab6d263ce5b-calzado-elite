import React, { createContext, useContext, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { STORE_ID } from '@/lib/config'
import { formatMoney } from '@/lib/money'
import type { StoreSettings } from '@/lib/supabase'

interface SettingsContextType {
  currencyCode: string
  socialLinks: any
  storeLanguage: string
  dateFormat: string
  shippingCoverage: any
  pickupLocations: any
  deliveryExpectations: any
  isLoading: boolean
  error: Error | null
  formatMoney: (value: number) => string
  refetch: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const fetchStoreSettings = async (): Promise<StoreSettings> => {
  const { data, error } = await supabase
    .from('store_settings')
    .select('currency_code, store_id, id, updated_at, social_links, store_language, date_format, shipping_coverage, pickup_locations, delivery_expectations')
    .eq('store_id', STORE_ID)
    .maybeSingle()

  if (error) {
    console.warn('Error fetching store settings:', error)
    // Return default if not found
    return {
      id: '',
      store_id: STORE_ID,
      currency_code: 'USD',
      social_links: null,
      store_language: 'es',
      date_format: 'DD/MM/YYYY',
      shipping_coverage: null,
      pickup_locations: null,
      delivery_expectations: null
    }
  }

  return data
}

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const {
    data: settings,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['store-settings', STORE_ID],
    queryFn: fetchStoreSettings,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 1
  })

  const currencyCode = settings?.currency_code || 'USD'
  const socialLinks = settings?.social_links || null
  const storeLanguage = settings?.store_language || 'es'
  const dateFormat = settings?.date_format || 'DD/MM/YYYY'
  const shippingCoverage = settings?.shipping_coverage || null
  const pickupLocations = settings?.pickup_locations || null
  const deliveryExpectations = settings?.delivery_expectations || null

  const formatMoneyWithCurrency = (value: number): string => {
    return formatMoney(value, currencyCode)
  }

  return (
    <SettingsContext.Provider
      value={{
        currencyCode,
        socialLinks,
        storeLanguage,
        dateFormat,
        shippingCoverage,
        pickupLocations,
        deliveryExpectations,
        isLoading,
        error: error as Error | null,
        formatMoney: formatMoneyWithCurrency,
        refetch
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}