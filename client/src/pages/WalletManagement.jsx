import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowRight, Search, Plus, Minus, History, Wallet, RefreshCw, X } from 'lucide-react'

export default function WalletManagement({ user }) {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 })
  const [selectedUser, setSelectedUser] = useState(null)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [balanceOperation, setBalanceOperation] = useState('add')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceDescription, setBalanceDescription] = useState('')
  const [transactions, setTransactions] = useState([])
  const [transactionUser, setTransactionUser] = useState(null)
  const [transLoading, setTransLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/')
      return
    }
    fetchWallets()
  }, [user, pagination.page])

  const fetchWallets = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await axios.get('/api/admin/wallets', {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, page: pagination.page, limit: pagination.limit }
      })
      setWallets(res.data.data || [])
      setPagination(res.data.pagination || pagination)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPagination({ ...pagination, page: 1 })
    fetchWallets()
  }

  const openBalanceModal = (userItem, operation) => {
    if (operation === 'deduct' && parseFloat(userItem.balance || 0) <= 0) {
      alert('لا يمكن خصم رصيد من محفظة فارغة')
      return
    }
    setSelectedUser(userItem)
    setBalanceOperation(operation)
    setBalanceAmount('')
    setBalanceDescription('')
    setShowBalanceModal(true)
  }

  const handleBalanceSubmit = async () => {
    if (!selectedUser || !balanceAmount || parseFloat(balanceAmount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح')
      return
    }

    const amount = parseFloat(balanceAmount)
    
    if (balanceOperation === 'deduct' && amount > parseFloat(selectedUser.balance || 0)) {
      alert(`المبلغ المطلوب خصمه (${amount} ر.س) أكبر من الرصيد المتاح (${parseFloat(selectedUser.balance || 0).toFixed(2)} ر.س)`)
      return
    }

    const token = localStorage.getItem('token')
    const endpoint = balanceOperation === 'add' ? '/api/wallet/add-balance' : '/api/wallet/deduct-balance'

    try {
      if (balanceOperation === 'add' && !selectedUser.wallet_id) {
        const createRes = await axios.post(`/api/admin/wallets/${selectedUser.id}/create`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!createRes.data.success) {
          alert('فشل في إنشاء المحفظة')
          return
        }
      }

      await axios.post(endpoint, {
        user_id: selectedUser.id,
        amount: amount,
        description: balanceDescription || (balanceOperation === 'add' ? 'إيداع رصيد من المشرف' : 'خصم رصيد من المشرف')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      alert(balanceOperation === 'add' ? 'تم إضافة الرصيد بنجاح' : 'تم خصم الرصيد بنجاح')
      setShowBalanceModal(false)
      fetchWallets()
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'حدث خطأ غير متوقع'
      alert(`خطأ: ${errorMessage}`)
    }
  }

  const openTransactionsModal = async (userItem) => {
    setTransactionUser(userItem)
    setShowTransactionsModal(true)
    setTransLoading(true)

    const token = localStorage.getItem('token')
    try {
      const res = await axios.get(`/api/admin/wallets/${userItem.id}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTransactions(res.data.data?.transactions || [])
      if (res.data.data?.user) {
        setTransactionUser({ ...userItem, balance: res.data.data.user.balance })
      }
    } catch (err) {
      console.error(err)
      setTransactions([])
    } finally {
      setTransLoading(false)
    }
  }

  const createWallet = async (userItem) => {
    const token = localStorage.getItem('token')
    try {
      await axios.post(`/api/admin/wallets/${userItem.id}/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم إنشاء المحفظة بنجاح')
      fetchWallets()
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ')
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionTypeLabel = (type) => {
    const types = {
      deposit: 'إيداع',
      withdrawal: 'سحب',
      purchase: 'شراء',
      refund: 'استرداد'
    }
    return types[type] || type
  }

  const getTransactionTypeColor = (type) => {
    const colors = {
      deposit: 'bg-green-100 text-green-700',
      withdrawal: 'bg-red-100 text-red-700',
      purchase: 'bg-blue-100 text-blue-700',
      refund: 'bg-yellow-100 text-yellow-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-purple-700 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2 hover:opacity-80">
              <ArrowRight className="w-5 h-5" />
              <span>لوحة التحكم</span>
            </Link>
            <h1 className="text-xl font-bold">إدارة المحافظ</h1>
          </div>
          <Link to="/" className="hover:underline">الرئيسية</Link>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-purple-600" />
              <div>
                <h2 className="text-2xl font-bold">إدارة محافظ العملاء</h2>
                <p className="text-gray-500">إضافة وخصم الأرصدة وعرض سجل المعاملات</p>
              </div>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو البريد..."
                  className="pr-10 pl-4 py-2 border rounded-lg w-64"
                />
              </div>
              <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                بحث
              </button>
              <button 
                type="button" 
                onClick={() => { setSearch(''); fetchWallets(); }}
                className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </form>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">جاري التحميل...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-right font-bold">المستخدم</th>
                      <th className="p-4 text-right font-bold">البريد الإلكتروني</th>
                      <th className="p-4 text-right font-bold">النوع</th>
                      <th className="p-4 text-right font-bold">الرصيد</th>
                      <th className="p-4 text-right font-bold">المعاملات</th>
                      <th className="p-4 text-right font-bold">الحالة</th>
                      <th className="p-4 text-center font-bold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">
                          لا يوجد مستخدمين
                        </td>
                      </tr>
                    ) : (
                      wallets.map((w) => (
                        <tr key={w.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{w.name}</td>
                          <td className="p-4 text-gray-600">{w.email}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-sm ${
                              w.role === 'distributor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {w.role === 'distributor' ? 'موزع' : 'بائع'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`font-bold ${parseFloat(w.balance) > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                              {parseFloat(w.balance).toFixed(2)} ر.س
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">
                            {w.total_transactions || 0} معاملة
                          </td>
                          <td className="p-4">
                            {w.wallet_id ? (
                              <span className="px-2 py-1 rounded text-sm bg-green-100 text-green-700">
                                محفظة نشطة
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-sm bg-yellow-100 text-yellow-700">
                                بدون محفظة
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              {w.wallet_id ? (
                                <>
                                  <button
                                    onClick={() => openBalanceModal(w, 'add')}
                                    className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600"
                                    title="إضافة رصيد"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openBalanceModal(w, 'deduct')}
                                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
                                    title="خصم رصيد"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openTransactionsModal(w)}
                                    className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                                    title="سجل المعاملات"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => createWallet(w)}
                                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 text-sm"
                                >
                                  إنشاء محفظة
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pagination.total > pagination.limit && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page <= 1}
                    className="px-4 py-2 rounded-lg bg-gray-200 disabled:opacity-50"
                  >
                    السابق
                  </button>
                  <span className="px-4 py-2">
                    صفحة {pagination.page} من {Math.ceil(pagination.total / pagination.limit)}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                    className="px-4 py-2 rounded-lg bg-gray-200 disabled:opacity-50"
                  >
                    التالي
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {balanceOperation === 'add' ? 'إضافة رصيد' : 'خصم رصيد'}
              </h3>
              <button onClick={() => setShowBalanceModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">المستخدم</p>
              <p className="font-bold">{selectedUser?.name}</p>
              <p className="text-sm text-gray-600">{selectedUser?.email}</p>
              <p className="mt-2 text-sm text-gray-500">الرصيد الحالي</p>
              <p className="font-bold text-lg">{parseFloat(selectedUser?.balance || 0).toFixed(2)} ر.س</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">المبلغ (ر.س)</label>
                <input
                  type="number"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="w-full p-3 border rounded-lg"
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الوصف (اختياري)</label>
                <input
                  type="text"
                  value={balanceDescription}
                  onChange={(e) => setBalanceDescription(e.target.value)}
                  placeholder={balanceOperation === 'add' ? 'سبب الإيداع' : 'سبب الخصم'}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleBalanceSubmit}
                className={`flex-1 py-3 rounded-lg text-white font-bold ${
                  balanceOperation === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {balanceOperation === 'add' ? 'إضافة' : 'خصم'}
              </button>
              <button
                onClick={() => setShowBalanceModal(false)}
                className="flex-1 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransactionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold">سجل المعاملات</h3>
                <p className="text-gray-500">{transactionUser?.name} - {transactionUser?.email}</p>
              </div>
              <button onClick={() => setShowTransactionsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-500">الرصيد الحالي</p>
              <p className="text-2xl font-bold text-purple-600">
                {parseFloat(transactionUser?.balance || 0).toFixed(2)} ر.س
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {transLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد معاملات
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t) => (
                    <div key={t.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-1 rounded text-sm ${getTransactionTypeColor(t.type)}`}>
                            {getTransactionTypeLabel(t.type)}
                          </span>
                          <p className="mt-2 text-gray-600">{t.description}</p>
                          <p className="text-sm text-gray-400 mt-1">{formatDate(t.created_at)}</p>
                        </div>
                        <div className="text-left">
                          <p className={`text-lg font-bold ${
                            t.type === 'deposit' || t.type === 'refund' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {t.type === 'deposit' || t.type === 'refund' ? '+' : '-'}
                            {parseFloat(t.amount).toFixed(2)} ر.س
                          </p>
                          <p className="text-sm text-gray-500">
                            الرصيد: {parseFloat(t.balance_after).toFixed(2)} ر.س
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowTransactionsModal(false)}
                className="w-full py-3 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
