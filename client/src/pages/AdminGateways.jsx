import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  CreditCard, ArrowLeft, Settings, Plus, Edit2, Check, X, 
  Eye, EyeOff, FileText, Users, AlertCircle, CheckCircle, Clock
} from 'lucide-react'

export default function AdminGateways({ user }) {
  const [activeTab, setActiveTab] = useState('gateways')
  const [gateways, setGateways] = useState([])
  const [applications, setApplications] = useState([])
  const [userGateways, setUserGateways] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingGateway, setEditingGateway] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newGateway, setNewGateway] = useState({
    name: '', name_ar: '', slug: '', description_ar: '', requirements_ar: '', 
    commission_rate: 2.5, supported_countries: 'SA,AE', instant_activation: false
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    const config = { headers: { Authorization: `Bearer ${token}` } }

    try {
      const res = await axios.get('/api/gateways/admin/all', config)
      setGateways(res.data.gateways || [])
      setApplications(res.data.applications || [])
      setUserGateways(res.data.user_gateways || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateGateway = async (gateway) => {
    const token = localStorage.getItem('token')
    try {
      await axios.put(`/api/gateways/admin/gateway/${gateway.id}`, gateway, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم التحديث بنجاح')
      setEditingGateway(null)
      fetchData()
    } catch (err) {
      alert('حدث خطأ')
    }
  }

  const handleAddGateway = async () => {
    if (!newGateway.name || !newGateway.name_ar || !newGateway.slug) {
      alert('يرجى إدخال جميع الحقول المطلوبة')
      return
    }

    const token = localStorage.getItem('token')
    try {
      await axios.post('/api/gateways/admin/gateway', newGateway, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم إضافة البوابة بنجاح')
      setShowAddModal(false)
      setNewGateway({
        name: '', name_ar: '', slug: '', description_ar: '', requirements_ar: '', 
        commission_rate: 2.5, supported_countries: 'SA,AE', instant_activation: false
      })
      fetchData()
    } catch (err) {
      alert('حدث خطأ')
    }
  }

  const handleApplicationAction = async (appId, status, notes = '') => {
    const token = localStorage.getItem('token')
    try {
      await axios.put(`/api/gateways/admin/application/${appId}`, { status, admin_notes: notes }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم تحديث الطلب')
      fetchData()
    } catch (err) {
      alert('حدث خطأ')
    }
  }

  if (!user || user.role !== 'admin') return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const pendingApps = applications.filter(a => a.status === 'pending')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-gray-600 hover:text-purple-600 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-purple-600" />
                إدارة بوابات الدفع
              </h1>
            </div>
            {pendingApps.length > 0 && (
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                {pendingApps.length} طلب جديد
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard title="البوابات المتاحة" value={gateways.length} icon={<CreditCard />} color="purple" />
          <StatCard title="البوابات النشطة" value={gateways.filter(g => g.is_active).length} icon={<CheckCircle />} color="green" />
          <StatCard title="طلبات قيد المراجعة" value={pendingApps.length} icon={<Clock />} color="yellow" />
          <StatCard title="المستخدمين المفعلين" value={userGateways.length} icon={<Users />} color="blue" />
        </div>

        <div className="flex gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm border">
          <TabButton active={activeTab === 'gateways'} onClick={() => setActiveTab('gateways')} icon={<CreditCard className="w-4 h-4" />}>
            البوابات
          </TabButton>
          <TabButton active={activeTab === 'applications'} onClick={() => setActiveTab('applications')} icon={<FileText className="w-4 h-4" />}>
            الطلبات {pendingApps.length > 0 && <span className="bg-red-500 text-white text-xs px-1.5 rounded-full mr-1">{pendingApps.length}</span>}
          </TabButton>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users className="w-4 h-4" />}>
            المستخدمين المفعلين
          </TabButton>
        </div>

        {activeTab === 'gateways' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">بوابات الدفع</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة بوابة
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium text-gray-600">البوابة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">العمولة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">الدول</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">تفعيل فوري</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {gateways.map(gateway => (
                    <tr key={gateway.id} className="border-b hover:bg-gray-50">
                      {editingGateway?.id === gateway.id ? (
                        <>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editingGateway.name_ar}
                              onChange={e => setEditingGateway({...editingGateway, name_ar: e.target.value})}
                              className="w-full p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              step="0.1"
                              value={editingGateway.commission_rate}
                              onChange={e => setEditingGateway({...editingGateway, commission_rate: e.target.value})}
                              className="w-20 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editingGateway.supported_countries || ''}
                              onChange={e => setEditingGateway({...editingGateway, supported_countries: e.target.value})}
                              className="w-32 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={editingGateway.instant_activation}
                              onChange={e => setEditingGateway({...editingGateway, instant_activation: e.target.checked})}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={editingGateway.is_active}
                              onChange={e => setEditingGateway({...editingGateway, is_active: e.target.value === 'true'})}
                              className="p-2 border rounded"
                            >
                              <option value="true">نشط</option>
                              <option value="false">معطل</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdateGateway(editingGateway)} className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingGateway(null)} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {gateway.is_our_gateway && <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded">خاصة</span>}
                              <span className="font-medium">{gateway.name_ar}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{gateway.commission_rate}%</td>
                          <td className="py-3 px-4 text-sm">{gateway.supported_countries}</td>
                          <td className="py-3 px-4">
                            {gateway.instant_activation ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <X className="w-5 h-5 text-gray-400" />
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${gateway.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {gateway.is_active ? 'نشط' : 'معطل'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button onClick={() => setEditingGateway({...gateway})} className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-6">طلبات التفعيل</h2>
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد طلبات</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map(app => (
                  <div key={app.id} className={`border rounded-xl p-4 ${app.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-800">{app.user_name}</h4>
                        <p className="text-sm text-gray-500">{app.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        app.status === 'approved' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {app.status === 'approved' ? 'مقبول' : app.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">البوابة:</span>
                        <span className="font-medium mr-2">{app.gateway_name_ar}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">النشاط:</span>
                        <span className="font-medium mr-2">{app.business_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">السجل التجاري:</span>
                        <span className="font-medium mr-2">{app.commercial_register || 'غير محدد'}</span>
                      </div>
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApplicationAction(app.id, 'approved')}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                        >
                          قبول
                        </button>
                        <button
                          onClick={() => {
                            const notes = prompt('سبب الرفض:')
                            if (notes) handleApplicationAction(app.id, 'rejected', notes)
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                        >
                          رفض
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-6">المستخدمين المفعلين</h2>
            {userGateways.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا يوجد مستخدمين مفعلين بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 font-medium text-gray-600">المستخدم</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">البوابة</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">الحالة</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">تاريخ التفعيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userGateways.map(ug => (
                      <tr key={ug.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{ug.user_name}</p>
                            <p className="text-sm text-gray-500">{ug.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">{ug.gateway_name_ar}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${ug.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {ug.is_active ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {ug.activated_at ? new Date(ug.activated_at).toLocaleDateString('ar-SA') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">إضافة بوابة جديدة</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm">الاسم (English) *</label>
                  <input
                    type="text"
                    value={newGateway.name}
                    onChange={e => setNewGateway({...newGateway, name: e.target.value})}
                    className="w-full p-3 border rounded-xl"
                    placeholder="PayTabs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 text-sm">الاسم (العربي) *</label>
                  <input
                    type="text"
                    value={newGateway.name_ar}
                    onChange={e => setNewGateway({...newGateway, name_ar: e.target.value})}
                    className="w-full p-3 border rounded-xl"
                    placeholder="باي تابس"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-sm">Slug *</label>
                <input
                  type="text"
                  value={newGateway.slug}
                  onChange={e => setNewGateway({...newGateway, slug: e.target.value})}
                  className="w-full p-3 border rounded-xl"
                  placeholder="paytabs"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-sm">الوصف</label>
                <textarea
                  value={newGateway.description_ar}
                  onChange={e => setNewGateway({...newGateway, description_ar: e.target.value})}
                  className="w-full p-3 border rounded-xl"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-sm">المتطلبات</label>
                <input
                  type="text"
                  value={newGateway.requirements_ar}
                  onChange={e => setNewGateway({...newGateway, requirements_ar: e.target.value})}
                  className="w-full p-3 border rounded-xl"
                  placeholder="سجل تجاري، هوية"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm">العمولة %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newGateway.commission_rate}
                    onChange={e => setNewGateway({...newGateway, commission_rate: e.target.value})}
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 text-sm">الدول المدعومة</label>
                  <input
                    type="text"
                    value={newGateway.supported_countries}
                    onChange={e => setNewGateway({...newGateway, supported_countries: e.target.value})}
                    className="w-full p-3 border rounded-xl"
                    placeholder="SA,AE,KW"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newGateway.instant_activation}
                    onChange={e => setNewGateway({...newGateway, instant_activation: e.target.checked})}
                  />
                  <span>تفعيل فوري (بدون مراجعة)</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddGateway}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition"
                >
                  إضافة البوابة
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 bg-gray-200 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ children, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
        active ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100'
  }

  const iconColors = {
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600'
  }

  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${iconColors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}
