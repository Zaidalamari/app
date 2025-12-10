import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Zap, Globe, Wallet, Code, Headphones, Store, Palette, AtSign } from 'lucide-react'
import axios from 'axios'

export default function JoinSeller({ setUser }) {
  const [step, setStep] = useState(1)
  const [planType, setPlanType] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    subdomain: '',
    themeColor: '#3B82F6'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'subdomain') {
      setFormData({ ...formData, [name]: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handlePlanSelect = (plan) => {
    setPlanType(plan)
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      setLoading(false)
      return
    }

    if (planType === 'distributor') {
      if (!formData.storeName || !formData.subdomain) {
        setError('اسم المتجر والنطاق الفرعي مطلوبان للموزعين')
        setLoading(false)
        return
      }
      if (formData.subdomain.length < 3) {
        setError('النطاق الفرعي يجب أن يكون 3 أحرف على الأقل')
        setLoading(false)
        return
      }
    }

    try {
      const res = await axios.post('/api/auth/register', {
        ...formData,
        role: planType
      })
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.data.user))
        if (setUser) setUser(res.data.data.user)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في التسجيل')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-blue-600">DigiCards</Link>
          <Link to="/login" className="text-blue-600 hover:underline">تسجيل الدخول</Link>
        </div>
      </nav>

      <header className="bg-gradient-to-br from-green-600 to-teal-700 text-white py-16">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">انضم إلينا كبائع</h1>
          <p className="text-xl opacity-90">ابدأ رحلتك في عالم البطاقات الرقمية واربح الملايين</p>
        </div>
      </header>

      {step === 1 && (
        <>
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-10">لماذا تنضم إلينا؟</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <BenefitCard 
                  icon={<Wallet className="w-10 h-10" />}
                  title="أسعار تنافسية"
                  desc="احصل على أفضل الأسعار للموزعين مع هامش ربح ممتاز"
                />
                <BenefitCard 
                  icon={<Code className="w-10 h-10" />}
                  title="API متكامل"
                  desc="اربط متجرك مع منصتنا بسهولة عبر API قوي ومستقر"
                />
                <BenefitCard 
                  icon={<Globe className="w-10 h-10" />}
                  title="موقع مخصص"
                  desc="احصل على موقعك الخاص مع نطاق فرعي مخصص"
                />
                <BenefitCard 
                  icon={<Zap className="w-10 h-10" />}
                  title="تسليم فوري"
                  desc="تسليم الأكواد فوراً بدون أي تأخير"
                />
                <BenefitCard 
                  icon={<Headphones className="w-10 h-10" />}
                  title="دعم فني 24/7"
                  desc="فريق دعم متخصص على مدار الساعة"
                />
                <BenefitCard 
                  icon={<Check className="w-10 h-10" />}
                  title="ضمان الجودة"
                  desc="جميع البطاقات أصلية ومضمونة 100%"
                />
              </div>

              <h2 className="text-3xl font-bold text-center mb-8">اختر باقتك</h2>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-blue-500 transition-all cursor-pointer" onClick={() => handlePlanSelect('seller')}>
                  <h3 className="text-2xl font-bold mb-4 text-blue-600">باقة البائع</h3>
                  <div className="text-4xl font-bold mb-6">مجاناً</div>
                  <ul className="space-y-3 mb-8">
                    <PlanFeature text="الوصول لجميع المنتجات" />
                    <PlanFeature text="لوحة تحكم خاصة" />
                    <PlanFeature text="سجل المعاملات" />
                    <PlanFeature text="دعم فني" />
                    <PlanFeature text="محفظة إلكترونية" />
                  </ul>
                  <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                    ابدأ الآن مجاناً
                  </button>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white border-2 border-transparent hover:border-yellow-400 transition-all cursor-pointer transform hover:scale-105" onClick={() => handlePlanSelect('distributor')}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold">باقة الموزع</h3>
                    <span className="bg-yellow-400 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">مميز</span>
                  </div>
                  <div className="text-4xl font-bold mb-6">أسعار خاصة</div>
                  <ul className="space-y-3 mb-8">
                    <PlanFeature text="جميع مميزات البائع" white />
                    <PlanFeature text="أسعار موزعين حصرية" white />
                    <PlanFeature text="API للربط الآلي" white />
                    <PlanFeature text="متجر بنطاق فرعي مخصص" white />
                    <PlanFeature text="تخصيص ألوان المتجر" white />
                    <PlanFeature text="دعم فني VIP" white />
                  </ul>
                  <button className="w-full bg-white text-purple-600 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                    سجل كموزع
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {step === 2 && (
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">
                  {planType === 'distributor' ? 'تسجيل كموزع' : 'تسجيل كبائع'}
                </h2>
                <button onClick={() => setStep(1)} className="text-blue-600 hover:underline">
                  تغيير الباقة
                </button>
              </div>

              {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">الاسم الكامل *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل اسمك الكامل"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">رقم الجوال</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="05xxxxxxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="example@email.com"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">كلمة المرور *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="6 أحرف على الأقل"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">تأكيد كلمة المرور *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أعد كتابة كلمة المرور"
                      required
                    />
                  </div>
                </div>

                {planType === 'distributor' && (
                  <>
                    <div className="border-t pt-6 mt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Store className="w-6 h-6 text-purple-600" />
                        <h3 className="text-xl font-bold text-purple-600">إعدادات المتجر</h3>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 mb-2 font-medium">اسم المتجر *</label>
                          <input
                            type="text"
                            name="storeName"
                            value={formData.storeName}
                            onChange={handleChange}
                            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="مثال: متجر الألعاب"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 mb-2 font-medium">
                            <span className="flex items-center gap-2">
                              <AtSign className="w-5 h-5" />
                              النطاق الفرعي *
                            </span>
                          </label>
                          <div className="flex items-center">
                            <input
                              type="text"
                              name="subdomain"
                              value={formData.subdomain}
                              onChange={handleChange}
                              className="flex-1 p-4 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="mystore"
                              required
                            />
                            <span className="bg-gray-100 border border-r-0 border-gray-300 p-4 rounded-l-xl text-gray-600">
                              .digicards.com
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            سيكون رابط متجرك: {formData.subdomain || 'mystore'}.digicards.com
                          </p>
                        </div>

                        <div>
                          <label className="block text-gray-700 mb-2 font-medium">
                            <span className="flex items-center gap-2">
                              <Palette className="w-5 h-5" />
                              لون المتجر
                            </span>
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="color"
                              name="themeColor"
                              value={formData.themeColor}
                              onChange={handleChange}
                              className="w-16 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                            />
                            <span className="text-gray-600">{formData.themeColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-white transition-colors ${
                    planType === 'distributor' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'جاري التسجيل...' : planType === 'distributor' ? 'إنشاء حساب وإطلاق المتجر' : 'إنشاء حساب'}
                </button>

                <p className="text-center text-gray-600">
                  لديك حساب بالفعل؟{' '}
                  <Link to="/login" className="text-blue-600 hover:underline font-medium">
                    تسجيل الدخول
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </section>
      )}

      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto text-center">
          <p>جميع الحقوق محفوظة Alameri Digital 2024</p>
        </div>
      </footer>
    </div>
  )
}

function BenefitCard({ icon, title, desc }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg text-center hover:shadow-xl transition-shadow">
      <div className="text-green-600 flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  )
}

function PlanFeature({ text, white }) {
  return (
    <li className="flex items-center gap-2">
      <Check className={`w-5 h-5 ${white ? 'text-white' : 'text-green-500'}`} />
      <span>{text}</span>
    </li>
  )
}
