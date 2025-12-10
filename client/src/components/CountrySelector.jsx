import { useState, useEffect } from 'react'
import { Globe, ChevronDown } from 'lucide-react'

export default function CountrySelector({ onCountryChange }) {
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCountries()
    const savedCountry = localStorage.getItem('selectedCountry')
    if (savedCountry) {
      try {
        setSelectedCountry(JSON.parse(savedCountry))
      } catch (e) {
        localStorage.removeItem('selectedCountry')
      }
    }
  }, [])

  useEffect(() => {
    if (selectedCountry && onCountryChange) {
      onCountryChange(selectedCountry)
    }
  }, [selectedCountry])

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/currencies/countries')
      const data = await response.json()
      if (data.success) {
        setCountries(data.countries)
        const savedCountry = localStorage.getItem('selectedCountry')
        if (!savedCountry && data.countries.length > 0) {
          const defaultCountry = data.countries.find(c => c.currency_code === 'SAR') || data.countries[0]
          setSelectedCountry(defaultCountry)
          localStorage.setItem('selectedCountry', JSON.stringify(defaultCountry))
        }
      }
    } catch (error) {
      console.error('Error fetching countries:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectCountry = (country) => {
    setSelectedCountry(country)
    localStorage.setItem('selectedCountry', JSON.stringify(country))
    setIsOpen(false)
  }

  if (loading || countries.length === 0) {
    return null
  }

  return (
    <div className="relative" dir="rtl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition text-white"
      >
        {selectedCountry ? (
          <>
            <span className="text-xl">{selectedCountry.flag}</span>
            <span className="text-sm">{selectedCountry.currency_symbol}</span>
          </>
        ) : (
          <>
            <Globe className="w-5 h-5" />
            <span className="text-sm">اختر الدولة</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b">
              <h3 className="font-bold text-gray-800 text-sm">اختر الدولة والعملة</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {countries.map(country => (
                <button
                  key={country.id}
                  onClick={() => selectCountry(country)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition text-right ${
                    selectedCountry?.id === country.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{country.name_ar}</div>
                    <div className="text-sm text-gray-500">{country.currency_name_ar}</div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{country.currency_symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function useCountry() {
  const [country, setCountry] = useState(() => {
    const savedCountry = localStorage.getItem('selectedCountry')
    if (savedCountry) {
      try {
        return JSON.parse(savedCountry)
      } catch (e) {
        localStorage.removeItem('selectedCountry')
      }
    }
    return null
  })

  const formatPrice = (priceInSAR, customSymbol = null) => {
    const symbol = customSymbol || country?.currency_symbol || 'ر.س'
    const rate = parseFloat(country?.exchange_rate) || 1
    const convertedPrice = parseFloat(priceInSAR) * rate
    return `${convertedPrice.toFixed(2)} ${symbol}`
  }

  const convertPrice = (priceInSAR) => {
    const rate = parseFloat(country?.exchange_rate) || 1
    return parseFloat(priceInSAR) * rate
  }

  return { country, setCountry, formatPrice, convertPrice }
}
