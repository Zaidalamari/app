import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Crown, Check, ArrowLeft, Zap, Store, Package, Globe, Shield, Headphones } from 'lucide-react'

export default function Subscriptions({ user }) {
  const [plans, setPlans] = useState([])
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [balance, setBalance] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    const config = { headers: { Authorization: `Bearer ${token}` } }

    try {
      const [plansRes, subRes, walletRes] = await Promise.all([
        axios.get('/api/subscriptions/plans'),
        axios.get('/api/subscriptions/my-subscription', config).catch(() => ({ data: {} })),
        axios.get('/api/wallet/balance', config).catch(() => ({ data: { data: { balance: 0 } } }))
      ])

      setPlans(plansRes.data.plans || [])
      setCurrentSubscription(subRes.data.subscription)
      setBalance(walletRes.data.data?.balance || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getPrice = (plan) => {
    switch (billingCycle) {
      case 'quarterly': return plan.price_quarterly
      case 'semi_annual': return plan.price_semi_annual
      case 'annual': return plan.price_annual
      case 'biennial': return plan.price_biennial
      default: return plan.price_monthly
    }
  }

  const getMonthlyPrice = (plan) => {
    const price = getPrice(plan)
    const months = {
      'monthly': 1,
      'quarterly': 3,
      'semi_annual': 6,
      'annual': 12,
      'biennial': 24
    }
    return (price / months[billingCycle]).toFixed(2)
  }

  const getDiscount = () => {
    switch (billingCycle) {
      case 'quarterly': return 10
      case 'semi_annual': return 15
      case 'annual': return 25
      case 'biennial': return 35
      default: return 0
    }
  }

  const handleSubscribe = async (plan) => {
    const price = getPrice(plan)
    
    if (parseFloat(balance) < price) {
      alert(`رصيد غير كافي. المطلوب: ${price} ر.س، المتوفر: ${parseFloat(balance).toFixed(2)} ر.س`)
      navigate('/payment')
      return
    }

    if (!confirm(`سيتم خصم ${price} ر.س من رصيدك للاشتراك في خطة ${plan.name_ar}. متابعة؟`)) {
      return
    }

    setSubscribing(true)
    const token = localStorage.getItem('token')

    try {
      const res = await axios.post('/api/subscriptions/subscribe', {
        plan_id: plan.id,
        billing_cycle: billingCycle
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        alert('تم الاشتراك بنجاح!')
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ')
    } finally {
      setSubscribing(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const features = [
    { icon: Store, text: 'متاجر متعددة' },
    { icon: Package, text: 'منتجات غير محدودة' },
    { icon: Globe, text: 'نطاقات مخصصة' },
    { icon: Shield, text: 'حماية SSL' },
    { icon: Headphones, text: 'دعم فني' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Alameri Digital
            </Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              العودة للوحة التحكم
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">اختر خطتك المناسبة</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            ابدأ مجاناً أو اختر خطة مدفوعة للحصول على مزايا أكثر
          </p>
          
          <div className="mt-4 inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full">
            <Crown className="w-5 h-5 text-blue-600" />
            <span className="text-blue-700">رصيدك الحالي: <strong>{parseFloat(balance).toFixed(2)} ر.س</strong></span>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-1 shadow-sm border inline-flex gap-1">
            {[
              { key: 'monthly', label: 'شهري' },
              { key: 'quarterly', label: 'ربع سنوي', discount: '10%' },
              { key: 'semi_annual', label: 'نصف سنوي', discount: '15%' },
              { key: 'annual', label: 'سنوي', discount: '25%' },
              { key: 'biennial', label: 'سنتين', discount: '35%' }
            ].map(cycle => (
              <button
                key={cycle.key}
                onClick={() => setBillingCycle(cycle.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition relative ${
                  billingCycle === cycle.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cycle.label}
                {cycle.discount && billingCycle === cycle.key && (
                  <span className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    -{cycle.discount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {getDiscount() > 0 && (
          <div className="text-center mb-8">
            <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              وفر {getDiscount()}% مع الدفع {billingCycle === 'quarterly' ? 'ربع السنوي' : billingCycle === 'semi_annual' ? 'نصف السنوي' : billingCycle === 'annual' ? 'السنوي' : 'لسنتين'}
            </span>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, idx) => {
            const price = getPrice(plan)
            const monthlyPrice = getMonthlyPrice(plan)
            const isCurrentPlan = currentSubscription?.plan_id === plan.id
            const isPremium = plan.name === 'Pro' || plan.name === 'Enterprise'

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-sm border-2 p-6 relative transition-all hover:shadow-lg ${
                  isPremium ? 'border-purple-300' : 'border-gray-100'
                } ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}
              >
                {isPremium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      الأكثر شعبية
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      خطتك الحالية
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                    isPremium ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gray-100'
                  }`}>
                    <Crown className={`w-7 h-7 ${isPremium ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name_ar || plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                </div>

                <div className="text-center mb-6">
                  {price > 0 ? (
                    <>
                      <div className="text-4xl font-bold text-gray-900">
                        {monthlyPrice}
                        <span className="text-lg font-normal text-gray-500"> ر.س/شهر</span>
                      </div>
                      {billingCycle !== 'monthly' && (
                        <div className="text-sm text-gray-500 mt-1">
                          يُدفع {price} ر.س {billingCycle === 'quarterly' ? 'كل 3 أشهر' : billingCycle === 'semi_annual' ? 'كل 6 أشهر' : billingCycle === 'annual' ? 'سنوياً' : 'كل سنتين'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900">مجاني</div>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{plan.max_stores === -1 ? 'متاجر غير محدودة' : `${plan.max_stores} متاجر`}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{plan.max_products === -1 ? 'منتجات غير محدودة' : `${plan.max_products} منتج`}</span>
                  </li>
                  {plan.features && JSON.parse(plan.features || '[]').map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan || subscribing}
                  className={`w-full py-3 rounded-xl font-medium transition ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : isPremium
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isCurrentPlan ? 'خطتك الحالية' : subscribing ? 'جاري الاشتراك...' : price > 0 ? 'اشترك الآن' : 'ابدأ مجاناً'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-16 bg-white rounded-2xl p-8 shadow-sm border">
          <h2 className="text-2xl font-bold text-center mb-8">لماذا تختار Alameri Digital؟</h2>
          <div className="grid md:grid-cols-5 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="w-7 h-7 text-blue-600" />
                </div>
                <p className="font-medium text-gray-800">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500">
            هل لديك أسئلة؟{' '}
            <a href="#" className="text-blue-600 hover:underline">تواصل معنا</a>
          </p>
        </div>
      </div>
    </div>
  )
}
