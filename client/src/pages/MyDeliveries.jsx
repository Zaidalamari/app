import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  QrCode, Shield, AlertTriangle, CheckCircle, 
  Package, Clock, Truck, Eye, EyeOff, Copy, X
} from 'lucide-react'

export default function MyDeliveries({ user }) {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchDeliveries()
  }, [user])

  const fetchDeliveries = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/delivery/my-deliveries', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDeliveries(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const viewQRCode = async (orderId) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`/api/delivery/qr/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setQrData(res.data.data)
      setShowQR(true)
    } catch (err) {
      alert(err.response?.data?.message || 'خطأ في تحميل كود QR')
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm flex items-center gap-1"><Clock className="w-4 h-4" /> قيد الانتظار</span>
      case 'shipped':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"><Truck className="w-4 h-4" /> في الطريق</span>
      case 'delivered':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> تم التسليم</span>
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{status}</span>
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <nav className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">DigiCards</Link>
          <div className="flex gap-4">
            <Link to="/dashboard" className="hover:text-blue-200">لوحة التحكم</Link>
            <span>مرحباً، {user.name}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <Package className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold">طلبات التسليم</h1>
                <p className="opacity-90">المنتجات الملموسة في انتظار التسليم</p>
              </div>
            </div>
          </div>

          {/* تحذير أمني */}
          <div className="bg-red-50 border-b-2 border-red-200 p-4">
            <div className="flex items-center gap-3 text-red-700">
              <Shield className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">تحذير أمني</p>
                <p className="text-sm">لا تشارك كود QR أو الرمز السري مع أي شخص. اعرضه للمندوب فقط أثناء الاستلام الفعلي.</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">جاري التحميل...</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">لا توجد طلبات تسليم حالياً</p>
                <Link to="/products" className="mt-4 inline-block text-purple-600 hover:underline">
                  تصفح المنتجات
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map(d => (
                  <div key={d.id} className="border rounded-xl p-4 hover:shadow-md transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {d.image_url ? (
                          <img src={d.image_url} alt={d.product_name} className="w-16 h-16 rounded-lg object-cover" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg">{d.product_name_ar || d.product_name}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(d.created_at).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {getStatusBadge(d.delivery_status)}
                        
                        {d.delivery_status !== 'delivered' && (
                          <button
                            onClick={() => viewQRCode(d.order_id)}
                            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition flex items-center gap-2"
                          >
                            <QrCode className="w-5 h-5" />
                            عرض كود التسليم
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal عرض كود QR */}
      {showQR && qrData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">كود التسليم</h2>
              <button onClick={() => setShowQR(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* تحذير */}
            <div className="bg-red-500 text-white p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-bold">تحذير أمني هام!</p>
                  <p className="text-sm">لا تشارك هذا الكود عبر أي وسيلة تواصل. اعرضه للمندوب فقط عند الاستلام الفعلي وجهاً لوجه.</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">المنتج</p>
                <p className="font-bold text-xl">{qrData.product_name}</p>
              </div>

              {/* كود QR */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center mb-6">
                <div className="bg-white p-4 rounded-lg inline-block mb-4 shadow">
                  <QrCode className="w-32 h-32 text-purple-600 mx-auto" />
                </div>
                <div className="bg-gray-900 text-green-400 font-mono p-3 rounded-lg text-lg break-all">
                  {qrData.qr_code}
                </div>
                <button
                  onClick={() => copyCode(qrData.qr_code)}
                  className="mt-3 text-purple-600 hover:underline flex items-center gap-2 mx-auto"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'تم النسخ!' : 'نسخ الكود'}
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                <p className="font-bold mb-1">تعليمات الاستلام:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>عند وصول المندوب، اعرض هذه الشاشة له</li>
                  <li>سيقوم المندوب بمسح الكود من جهازك</li>
                  <li>قد يطلب منك الرمز السري للتأكيد</li>
                  <li>بعد التأكيد، ستستلم منتجك</li>
                </ol>
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                صالح حتى: {new Date(qrData.expires_at).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
