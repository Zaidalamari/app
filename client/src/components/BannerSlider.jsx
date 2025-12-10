import { useState, useEffect } from 'react'

export default function BannerSlider() {
  const [banners, setBanners] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    fetchBanners()
  }, [])

  useEffect(() => {
    if (banners.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length)
      }, 5000)
      return () => clearInterval(timer)
    }
  }, [banners.length])

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/marketing/banners?position=home')
      const data = await response.json()
      if (data.success) {
        setBanners(data.banners)
      }
    } catch (error) {
      console.error('Error fetching banners:', error)
    }
  }

  const handleBannerClick = async (banner) => {
    try {
      await fetch(`/api/marketing/banners/${banner.id}/click`, { method: 'POST' })
      if (banner.link_url) {
        window.location.href = banner.link_url
      }
    } catch (error) {
      console.error('Error tracking click:', error)
    }
  }

  if (banners.length === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">مرحباً بك في DigiCards</h2>
        <p className="text-xl opacity-90">منصتك الموثوقة لإعادة بيع البطاقات الرقمية</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(${currentIndex * 100}%)` }}
      >
        {banners.map((banner, idx) => (
          <div
            key={banner.id}
            onClick={() => handleBannerClick(banner)}
            className="min-w-full cursor-pointer"
          >
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
              </div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-3">{banner.title_ar || banner.title}</h2>
                  <p className="text-lg opacity-90 mb-4">{banner.description}</p>
                  {banner.link_url && (
                    <span className="inline-block bg-white text-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-opacity-90 transition">
                      اعرف المزيد
                    </span>
                  )}
                </div>
                <div className="text-8xl opacity-30">
                  {idx % 3 === 0 ? '🎮' : idx % 3 === 1 ? '🎁' : '💳'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-8' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
