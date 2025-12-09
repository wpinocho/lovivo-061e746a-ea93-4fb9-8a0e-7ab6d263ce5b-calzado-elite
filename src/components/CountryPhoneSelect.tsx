import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountries, type Country } from '@/hooks/useCountries'

const MIN_PHONE_LENGTH = 4
const MAX_PHONE_LENGTH = 15

interface CountryPhoneSelectProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
}

export const CountryPhoneSelect = ({
  value,
  onChange,
  onBlur,
  placeholder = "Phone number",
  className
}: CountryPhoneSelectProps) => {
  const { countries, loading, error } = useCountries()
  const [open, setOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [hasValidationError, setHasValidationError] = useState(false)

  // Set default country to Mexico when countries load
  useEffect(() => {
    if (countries.length > 0 && !selectedCountry) {
      const mexico = countries.find(c => c.phone_code === '+52')
      if (mexico) {
        setSelectedCountry(mexico)
      }
    }
  }, [countries, selectedCountry])

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    setOpen(false)
    // Keep the current phone number, just change the prefix
    const phoneWithoutPrefix = value.replace(/^\+\d+\s?/, '').trim()
    onChange(`${country.phone_code} ${phoneWithoutPrefix}`)
  }

  const validatePhoneLength = (phoneValue: string) => {
    const phoneWithoutPrefix = phoneValue.replace(/^\+\d+\s?/, '').trim()
    const digitsOnly = phoneWithoutPrefix.replace(/[^\d]/g, '')
    return digitsOnly.length >= MIN_PHONE_LENGTH && digitsOnly.length <= MAX_PHONE_LENGTH
  }

  const handleBlur = () => {
    const isValid = validatePhoneLength(value)
    setHasValidationError(!isValid)
    onBlur?.()
  }

  if (loading) {
    return (
      <div className="flex">
        <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
          <div className="w-6 h-4 bg-gray-200 animate-pulse rounded mr-2"></div>
          <span className="text-sm">+52</span>
        </div>
        <Input
          type="tel"
          value={value.replace(/^\+\d+\s?/, '').trim()}
          onChange={(e) => {
            setHasValidationError(false) // Reset validation error when user types
            // Solo permitir números, espacios y guiones
            const inputValue = e.target.value.replace(/[^\d\s\-]/g, '')
            const digitsOnly = inputValue.replace(/[^\d]/g, '')
            
            // Prevenir más de 15 dígitos
            if (digitsOnly.length > MAX_PHONE_LENGTH) {
              return
            }
            
            onChange(`+52 ${inputValue}`)
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "rounded-l-none",
            hasValidationError && "border-red-500 focus:border-red-500",
            className
          )}
        />
      </div>
    )
  }

  const currentCountry = selectedCountry || countries.find(c => c.phone_code === '+52') || countries[0]

  return (
    <div className="flex">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex items-center px-3 border-r-0 rounded-r-none bg-muted hover:bg-muted/80"
          >
            <img 
              src={currentCountry?.flag_url} 
              alt={`${currentCountry?.name} flag`}
              className="w-6 h-4 mr-2 rounded-sm object-cover"
            />
            <span className="text-sm">{currentCountry?.phone_code || '+52'}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 bg-popover text-popover-foreground border shadow-md z-50">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList className="max-h-[300px] overflow-auto">
              <CommandEmpty>Country not found.</CommandEmpty>
              <CommandGroup>
                {countries.map((country, index) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.phone_code}`}
                    onSelect={() => handleCountrySelect(country)}
                  >
                    <div className="flex items-center">
                      <img 
                        src={country.flag_url} 
                        alt={`${country.name} flag`}
                        loading="lazy"
                        className="w-6 h-4 mr-3 rounded-sm object-cover"
                      />
                      <span className="mr-2">{country.phone_code}</span>
                      <span>{country.name}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedCountry?.code === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        value={value.replace(/^\+\d+\s?/, '').trim()}
        onChange={(e) => {
          setHasValidationError(false) // Reset validation error when user types
          // Solo permitir números, espacios y guiones
          const inputValue = e.target.value.replace(/[^\d\s\-]/g, '')
          const digitsOnly = inputValue.replace(/[^\d]/g, '')
          
          // Prevenir más de 15 dígitos
          if (digitsOnly.length > MAX_PHONE_LENGTH) {
            return
          }
          
          const currentCountryCode = currentCountry?.phone_code || '+52'
          onChange(`${currentCountryCode} ${inputValue}`)
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          "rounded-l-none",
          hasValidationError && "border-red-500 focus:border-red-500",
          className
        )}
      />
    </div>
  )
}
