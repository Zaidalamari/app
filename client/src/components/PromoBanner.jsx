import { useState, useEffect } from 'react'

export default function PromoBanner() {
  const [promotions, setPromotions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    fetchPromotions()
  }, [])

  useEffect(() => {
    if (promotions.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % promotions.length)
      }, 4000)
      return () => clearInterval(timer)
    }
  }, [promotions.length])

  const fetchPromotions = async () => {
    try {
      const response = await fetch('/api/marketing/promotions/active')
      const data = await response.json()
      if (data.success && data.promotions.length > 0) {
        setPromotions(data.promotions)
      }
    } catch (error) {
      console.error('Error fetching promotions:', error)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    alert(`تم نسخ الكود: ${code}`)
  }

  if (promotions.length === 0) return null

  const promo = promotions[currentIndex]

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 text-sm">
        <span className="animate-pulse">🎉</span>
        <span>
          استخدم كود <strong className="mx-1">{promo.code}</strong> واحصل على 
          {promo.type === 'percentage' 
            ? ` خصم ${promo.value}%` 
            : ` خصم ${promo.value} ريال`
          }
          {promo.min_amount > 0 && ` على الطلبات أكثر من ${promo.min_amount} ريال`}
        </span>
        <button
          onClick={() => copyCode(promo.code)}
          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-semibold transition"
        >
          نسخ الكود
        </button>
        {promotions.length > 1 && (
          <div className="flex gap-1 mr-4">
            {promotions.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
