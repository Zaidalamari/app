import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Payment({ user }) {
  const navigate = useNavigate()
  const [gateways, setGateways] = useState([])
  const [selectedGateway, setSelectedGateway] = useState(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [transactions, setTransactions] = useState([])
  const [currentTransaction, setCurrentTransaction] = useState(null)

  const presetAmounts = [50, 100, 200, 500, 1000, 2000]

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchGateways()
    fetchTransactions()
  }, [user, navigate])

  const fetchGateways = async () => {
    try {
      const response = await fetch('/api/payment/gateways')
      const data = await response.json()
      if (data.success) {
        setGateways(data.gateways)
      }
    } catch (error) {
      console.error('Error fetching gateways:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/payment/transactions?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const initiatePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('الرجاء إدخال مبلغ صالح')
      return
    }
    if (!selectedGateway) {
      setError('الرجاء اختيار بوابة الدفع')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          gateway: selectedGateway.id,
          description: 'شحن المحفظة'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setCurrentTransaction(data)
        setProcessing(true)
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError('حدث خطأ في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  const confirmPayment = async () => {
    if (!currentTransaction) return

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/payment/simulate-success/${currentTransaction.transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`تم شحن محفظتك بمبلغ ${data.amount} ريال. الرصيد الجديد: ${data.newBalance} ريال`)
        setProcessing(false)
        setCurrentTransaction(null)
        setAmount('')
        setSelectedGateway(null)
        fetchTransactions()
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError('حدث خطأ في معالجة الدفع')
    } finally {
      setLoading(false)
    }
  }

  const cancelPayment = () => {
    setProcessing(false)
    setCurrentTransaction(null)
    setError('')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'مكتمل'
      case 'pending': return 'قيد الانتظار'
      case 'failed': return 'فاشل'
      default: return status
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DigiCards
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-blue-600">لوحة التحكم</Link>
              <Link to="/products" className="text-gray-600 hover:text-blue-600">المنتجات</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">شحن المحفظة</h1>
          <p className="text-gray-600 mt-2">اختر بوابة الدفع والمبلغ المراد شحنه</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {processing ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">{selectedGateway?.logo}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">إتمام الدفع عبر {selectedGateway?.nameAr}</h2>
              <p className="text-gray-600 mt-2">رقم المعاملة: {currentTransaction?.transactionId}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">المبلغ:</span>
                <span className="text-2xl font-bold text-blue-600">{amount} ريال</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">بوابة الدفع:</span>
                <span className="font-semibold">{selectedGateway?.nameAr}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
              <p className="text-yellow-800 text-sm">
                <strong>ملاحظة:</strong> هذه نسخة تجريبية. في الإصدار الفعلي، سيتم توجيهك إلى صفحة الدفع الآمنة.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={confirmPayment}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
              >
                {loading ? 'جاري المعالجة...' : 'تأكيد الدفع (محاكاة)'}
              </button>
              <button
                onClick={cancelPayment}
                disabled={loading}
                className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">اختر بوابة الدفع</h2>
                <div className="space-y-3">
                  {gateways.map((gateway) => (
                    <button
                      key={gateway.id}
                      onClick={() => setSelectedGateway(gateway)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                        selectedGateway?.id === gateway.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{gateway.logo}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800">{gateway.nameAr}</h3>
                          <p className="text-sm text-gray-500">{gateway.description}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {gateway.supported.slice(0, 3).map((method) => (
                              <span key={method} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {method === 'mada' ? 'مدى' : method === 'apple_pay' ? 'Apple Pay' : method === 'stc_pay' ? 'STC Pay' : method}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">أدخل المبلغ</h2>
                <div className="mb-4">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="أدخل المبلغ بالريال"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    min="1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className={`py-2 rounded-lg border transition-all ${
                        amount === preset.toString()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {preset} ريال
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">ملخص الطلب</h2>
                
                {selectedGateway && amount ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-gray-600">بوابة الدفع:</span>
                      <div className="flex items-center gap-2">
                        <span>{selectedGateway.logo}</span>
                        <span className="font-semibold">{selectedGateway.nameAr}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-gray-600">المبلغ:</span>
                      <span className="text-2xl font-bold text-blue-600">{amount} ريال</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600">الرسوم:</span>
                      <span className="font-semibold text-green-600">مجاناً</span>
                    </div>

                    <button
                      onClick={initiatePayment}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 mt-4"
                    >
                      {loading ? 'جاري المعالجة...' : 'متابعة الدفع'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>اختر بوابة الدفع والمبلغ للمتابعة</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">آخر العمليات</h2>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.transaction_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{tx.amount} ريال</p>
                          <p className="text-sm text-gray-500">{tx.gatewayName}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(tx.status)}`}>
                          {getStatusText(tx.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">لا توجد عمليات سابقة</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
