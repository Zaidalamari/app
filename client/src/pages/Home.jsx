import { Link } from 'react-router-dom'
import { ShoppingCart, Users, Wallet, Code, Megaphone, CreditCard, MessageCircle, Globe } from 'lucide-react'
import BannerSlider from '../components/BannerSlider'
import PromoBanner from '../components/PromoBanner'
import CountrySelector from '../components/CountrySelector'

export default function Home({ user, setUser }) {
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <div className="min-h-screen">
      <PromoBanner />
      <nav className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">DigiCards</h1>
            <CountrySelector />
          </div>
          <div className="flex gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-blue-200">لوحة التحكم</Link>
                <Link to="/products" className="hover:text-blue-200">المنتجات</Link>
                {user.role === 'admin' && <Link to="/admin" className="hover:text-blue-200">الإدارة</Link>}
                <button onClick={handleLogout} className="hover:text-blue-200">تسجيل خروج</button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-blue-200">تسجيل دخول</Link>
                <Link to="/register" className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100">انضم إلينا</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white py-20">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-5xl font-bold mb-6">منصة البطاقات الرقمية المتكاملة</h2>
          <p className="text-xl mb-8 opacity-90">أعد بيع البطاقات الرقمية واربح الملايين مع نظام API متكامل</p>
          <div className="flex gap-4 justify-center">
            <Link to="/join-seller" className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition">
              انضم إلينا كبائع
            </Link>
            <Link to="/api-docs" className="border-2 border-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-white hover:text-purple-600 transition">
              وثائق API
            </Link>
          </div>
        </div>
      </header>

      <section className="py-8 bg-gray-100">
        <div className="container mx-auto px-4">
          <BannerSlider />
        </div>
      </section>

      {/* بانر الانضمام المجاني */}
      <section className="py-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-full backdrop-blur">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold">انضم مجاناً لإعادة البيع!</h3>
                <p className="text-white/90 text-lg">اكسب عمولات مباشرة لمحفظتك وحوّلها لحسابك البنكي في بلدك</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                <span>محفظة إلكترونية</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 10h3v7H4zm6-4h4v11h-4zm6 7h4v4h-4z"/>
                </svg>
                <span>تحويل بنكي</span>
              </div>
              <Link 
                to="/join-seller" 
                className="bg-white text-teal-600 px-8 py-3 rounded-xl font-bold hover:bg-teal-50 transition shadow-lg flex items-center gap-2"
              >
                <span>سجل الآن مجاناً</span>
                <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">مميزات المنصة</h3>
          <div className="grid md:grid-cols-4 gap-8">
            <FeatureCard icon={<Wallet className="w-12 h-12" />} title="نظام المحفظة" desc="إدارة رصيدك بسهولة مع تتبع جميع المعاملات" />
            <FeatureCard icon={<Code className="w-12 h-12" />} title="API للموزعين" desc="اربط متجرك مع منصتنا عبر API متكامل" />
            <FeatureCard icon={<CreditCard className="w-12 h-12" />} title="بوابات دفع متعددة" desc="ماي فاتورة، تيلر، ميسر، هايبر باي" />
            <FeatureCard icon={<MessageCircle className="w-12 h-12" />} title="دعم فني ذكي" desc="روبوت دعم فني للمساعدة على مدار الساعة" />
            <FeatureCard icon={<Megaphone className="w-12 h-12" />} title="نظام التسويق" desc="روّج منتجاتك على جميع منصات التواصل" />
            <FeatureCard icon={<Globe className="w-12 h-12" />} title="مواقع مخصصة" desc="أنشئ موقعك الخاص مع دومين مخصص" />
            <FeatureCard icon={<Users className="w-12 h-12" />} title="إدارة الموزعين" desc="نظام متكامل لإدارة شبكة الموزعين" />
            <FeatureCard icon={<ShoppingCart className="w-12 h-12" />} title="متجر متكامل" desc="واجهة سهلة لبيع وشراء البطاقات" />
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-green-500 to-teal-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-8">ابدأ الربح الآن</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 p-8 rounded-2xl backdrop-blur">
              <div className="text-4xl font-bold mb-2">+10,000</div>
              <div>بطاقة متوفرة</div>
            </div>
            <div className="bg-white/10 p-8 rounded-2xl backdrop-blur">
              <div className="text-4xl font-bold mb-2">+500</div>
              <div>موزع نشط</div>
            </div>
            <div className="bg-white/10 p-8 rounded-2xl backdrop-blur">
              <div className="text-4xl font-bold mb-2">+1M</div>
              <div>عملية ناجحة</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-xl font-bold mb-4">Alameri Digital</h4>
              <p className="text-gray-400">منصة متكاملة لإعادة بيع البطاقات الرقمية والمنتجات الملموسة وإطلاق مشروعك</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/products" className="hover:text-white">المنتجات</Link></li>
                <li><Link to="/join-seller" className="hover:text-white">انضم كبائع</Link></li>
                <li><Link to="/api-docs" className="hover:text-white">وثائق API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">بوابات الدفع</h4>
              <ul className="space-y-2 text-gray-400">
                <li>ماي فاتورة</li>
                <li>تيلر</li>
                <li>ميسر</li>
                <li>هايبر باي</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">تواصل معنا</h4>
              <p className="text-gray-400">support@digicards.com</p>
              <p className="text-gray-400">+966 50 000 0000</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>جميع الحقوق محفوظة Alameri Digital 2024</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-gray-50 p-6 rounded-2xl text-center hover:shadow-lg transition">
      <div className="text-blue-600 flex justify-center mb-4">{icon}</div>
      <h4 className="text-xl font-bold mb-2 text-gray-800">{title}</h4>
      <p className="text-gray-600">{desc}</p>
    </div>
  )
}
