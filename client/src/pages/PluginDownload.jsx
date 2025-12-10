import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Download, Key, Copy, Check, FileCode, Settings, ShoppingCart, Zap } from 'lucide-react'
import axios from 'axios'

export default function PluginDownload() {
  const [user, setUser] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data.success) {
          setUser(res.data.data)
        }
      }).catch(() => {})
    }
  }, [])

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const apiUrl = window.location.origin

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">Alameri Digital</Link>
          <div className="flex gap-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-blue-600">لوحة التحكم</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4">
              <FileCode className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">إضافة WordPress للتكامل</h1>
            <p className="text-gray-600">قم بتحميل وتثبيت الإضافة على متجرك WordPress للربط مع منصة Alameri Digital</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Download className="w-6 h-6 text-blue-600" />
              تحميل الإضافة
            </h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Alameri Digital Integration</h3>
                  <p className="text-gray-600 text-sm">الإصدار 1.0.0 | متوافق مع WordPress 5.0+</p>
                </div>
                <a 
                  href="/downloads/alameri-digital-integration.zip" 
                  download
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  تحميل الإضافة
                </a>
              </div>
            </div>

            <h3 className="font-bold mb-3">مميزات الإضافة:</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">عرض المنتجات</h4>
                  <p className="text-sm text-gray-600">عرض جميع المنتجات المتاحة في متجرك</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Zap className="w-5 h-5 text-yellow-600 mt-1" />
                <div>
                  <h4 className="font-medium">شراء تلقائي</h4>
                  <p className="text-sm text-gray-600">شراء وتسليم الأكواد تلقائياً</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Settings className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium">تكامل WooCommerce</h4>
                  <p className="text-sm text-gray-600">ربط مباشر مع WooCommerce</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Key className="w-5 h-5 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-medium">أكواد مختصرة</h4>
                  <p className="text-sm text-gray-600">Shortcodes جاهزة للاستخدام</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-green-600" />
              بيانات الربط
            </h2>
            
            <p className="text-gray-600 mb-4">استخدم هذه البيانات لربط الإضافة مع حسابك:</p>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm text-gray-500 mb-1">رابط API</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded-lg p-3 font-mono text-sm">{apiUrl}</code>
                  <button 
                    onClick={() => copyToClipboard(apiUrl, 'url')}
                    className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                  >
                    {copied === 'url' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {user && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-sm text-gray-500 mb-1">مفتاح API</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border rounded-lg p-3 font-mono text-sm">{user.api_key || 'غير متوفر'}</code>
                      {user.api_key && (
                        <button 
                          onClick={() => copyToClipboard(user.api_key, 'key')}
                          className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                        >
                          {copied === 'key' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-sm text-gray-500 mb-1">السر</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border rounded-lg p-3 font-mono text-sm">{user.api_secret || 'غير متوفر'}</code>
                      {user.api_secret && (
                        <button 
                          onClick={() => copyToClipboard(user.api_secret, 'secret')}
                          className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                        >
                          {copied === 'secret' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {!user && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <p className="text-yellow-700">
                    <Link to="/login" className="text-blue-600 font-bold hover:underline">سجل دخولك</Link>
                    {' '}لعرض بيانات API الخاصة بك
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">خطوات التثبيت</h2>
            
            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                <div>
                  <h4 className="font-bold">تحميل الإضافة</h4>
                  <p className="text-gray-600">قم بتحميل ملف الإضافة من الرابط أعلاه</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                <div>
                  <h4 className="font-bold">رفع الإضافة</h4>
                  <p className="text-gray-600">اذهب إلى لوحة تحكم WordPress ← إضافات ← أضف جديد ← رفع إضافة</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                <div>
                  <h4 className="font-bold">تفعيل الإضافة</h4>
                  <p className="text-gray-600">فعّل الإضافة بعد رفعها</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                <div>
                  <h4 className="font-bold">إعداد البيانات</h4>
                  <p className="text-gray-600">اذهب إلى Alameri Digital في القائمة الجانبية وأدخل بيانات الربط</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">✓</span>
                <div>
                  <h4 className="font-bold">جاهز للاستخدام!</h4>
                  <p className="text-gray-600">استخدم الأكواد المختصرة لعرض المنتجات في صفحاتك</p>
                </div>
              </li>
            </ol>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-bold mb-2">الأكواد المختصرة المتاحة:</h4>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <code>[alameri_products]</code>
                  <span className="text-gray-500 text-xs">عرض المنتجات</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <code>[alameri_categories]</code>
                  <span className="text-gray-500 text-xs">عرض التصنيفات</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <code>[alameri_balance]</code>
                  <span className="text-gray-500 text-xs">عرض الرصيد</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <code>[alameri_purchase_form]</code>
                  <span className="text-gray-500 text-xs">نموذج الشراء</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
