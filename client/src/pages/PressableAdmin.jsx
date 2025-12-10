import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  Server, Plus, Trash2, RefreshCw, Globe, Users, 
  Database, Shield, ArrowLeft, CheckCircle, XCircle,
  HardDrive, MapPin, Download
} from 'lucide-react'

export default function PressableAdmin() {
  const [sites, setSites] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [datacenters, setDatacenters] = useState([])
  const [account, setAccount] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sites')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false)
  const [newSite, setNewSite] = useState({ name: '', php_version: '8.2', datacenter_code: 'DFW' })
  const [newCollaborator, setNewCollaborator] = useState({ email: '', site_ids: [] })
  const [selectedSites, setSelectedSites] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const res = await axios.get('/api/pressable/status', { headers })
      setConnectionStatus(res.data)
      if (res.data.connected) {
        loadData()
      } else {
        setLoading(false)
      }
    } catch (err) {
      setConnectionStatus({ connected: false, message: 'خطأ في الاتصال' })
      setLoading(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [sitesRes, collaboratorsRes, datacentersRes, accountRes] = await Promise.all([
        axios.get('/api/pressable/sites', { headers }).catch(() => ({ data: { sites: [] } })),
        axios.get('/api/pressable/collaborators', { headers }).catch(() => ({ data: { collaborators: [] } })),
        axios.get('/api/pressable/datacenters', { headers }).catch(() => ({ data: { datacenters: [] } })),
        axios.get('/api/pressable/account', { headers }).catch(() => ({ data: { account: null } }))
      ])
      
      setSites(sitesRes.data.sites || [])
      setCollaborators(collaboratorsRes.data.collaborators || [])
      setDatacenters(datacentersRes.data.datacenters || [])
      setAccount(accountRes.data.account)
    } catch (err) {
      setError('خطأ في تحميل البيانات')
    }
    setLoading(false)
  }

  const createSite = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post('/api/pressable/sites', newSite, { headers })
      setSuccess('تم إنشاء الموقع بنجاح')
      setShowCreateModal(false)
      setNewSite({ name: '', php_version: '8.2', datacenter_code: 'DFW' })
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في إنشاء الموقع')
    }
  }

  const deleteSite = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموقع؟')) return
    try {
      await axios.delete(`/api/pressable/sites/${id}`, { headers })
      setSuccess('تم حذف الموقع بنجاح')
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في حذف الموقع')
    }
  }

  const createBackup = async (id) => {
    try {
      await axios.post(`/api/pressable/sites/${id}/backup`, {}, { headers })
      setSuccess('تم إنشاء نسخة احتياطية بنجاح')
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في إنشاء النسخة الاحتياطية')
    }
  }

  const addCollaborator = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post('/api/pressable/collaborators', { 
        email: newCollaborator.email, 
        site_ids: selectedSites 
      }, { headers })
      setSuccess('تمت إضافة المتعاون بنجاح')
      setShowCollaboratorModal(false)
      setNewCollaborator({ email: '', site_ids: [] })
      setSelectedSites([])
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في إضافة المتعاون')
    }
  }

  const toggleSiteSelection = (siteId) => {
    setSelectedSites(prev => 
      prev.includes(siteId) 
        ? prev.filter(id => id !== siteId) 
        : [...prev, siteId]
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!connectionStatus?.connected) {
    return (
      <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <Link to="/admin" className="flex items-center gap-2 text-blue-600 mb-6 hover:underline">
            <ArrowLeft className="w-5 h-5" />
            العودة للوحة التحكم
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">غير متصل بـ Pressable</h2>
            <p className="text-gray-600 mb-6">{connectionStatus?.message || 'لم يتم تكوين بيانات API'}</p>
            <p className="text-sm text-gray-500">تأكد من إضافة PRESSABLE_CLIENT_ID و PRESSABLE_CLIENT_SECRET</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Server className="w-6 h-6 text-purple-600" />
              إدارة Pressable
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-600 text-sm">متصل</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')}>&times;</button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6 flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess('')}>&times;</button>
          </div>
        )}

        {account && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white mb-6">
            <h2 className="text-xl font-bold mb-4">معلومات الحساب</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm opacity-80">الاسم</p>
                <p className="text-lg font-bold">{account.name || 'غير محدد'}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm opacity-80">البريد</p>
                <p className="text-lg font-bold">{account.email || 'غير محدد'}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm opacity-80">عدد المواقع</p>
                <p className="text-lg font-bold">{sites.length}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('sites')}
            className={`pb-3 px-4 font-medium ${activeTab === 'sites' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <Globe className="w-5 h-5 inline ml-2" />
            المواقع ({sites.length})
          </button>
          <button
            onClick={() => setActiveTab('collaborators')}
            className={`pb-3 px-4 font-medium ${activeTab === 'collaborators' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <Users className="w-5 h-5 inline ml-2" />
            المتعاونون ({collaborators.length})
          </button>
          <button
            onClick={() => setActiveTab('datacenters')}
            className={`pb-3 px-4 font-medium ${activeTab === 'datacenters' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <MapPin className="w-5 h-5 inline ml-2" />
            مراكز البيانات
          </button>
        </div>

        {activeTab === 'sites' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">المواقع</h2>
              <div className="flex gap-2">
                <button onClick={loadData} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  تحديث
                </button>
                <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  موقع جديد
                </button>
              </div>
            </div>

            {sites.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Server className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد مواقع</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map(site => (
                  <div key={site.id} className="bg-white rounded-xl shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{site.name}</h3>
                        <p className="text-sm text-gray-500">{site.url || site.displayName}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${site.state === 'live' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {site.state || 'نشط'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        PHP {site.phpVersion || '8.2'}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {site.datacenterCode || 'DFW'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => createBackup(site.id)}
                        className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg hover:bg-green-200 flex items-center justify-center gap-1 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        نسخة احتياطية
                      </button>
                      <button 
                        onClick={() => deleteSite(site.id)}
                        className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'collaborators' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">المتعاونون</h2>
              <button onClick={() => setShowCollaboratorModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة متعاون
              </button>
            </div>

            {collaborators.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا يوجد متعاونون</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-4">البريد الإلكتروني</th>
                      <th className="text-right p-4">الحالة</th>
                      <th className="text-right p-4">المواقع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collaborators.map(collab => (
                      <tr key={collab.id} className="border-t">
                        <td className="p-4">{collab.email}</td>
                        <td className="p-4">
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">نشط</span>
                        </td>
                        <td className="p-4">{collab.siteCount || 0} مواقع</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'datacenters' && (
          <div>
            <h2 className="text-xl font-bold mb-6">مراكز البيانات المتاحة</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(datacenters.length > 0 ? datacenters : [
                { code: 'DFW', name: 'Dallas, USA' },
                { code: 'BUR', name: 'Burbank, USA' },
                { code: 'AMS', name: 'Amsterdam, EU' },
                { code: 'SYD', name: 'Sydney, AU' }
              ]).map(dc => (
                <div key={dc.code} className="bg-white rounded-xl shadow p-6 text-center">
                  <MapPin className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-bold">{dc.code}</h3>
                  <p className="text-sm text-gray-500">{dc.name || dc.location}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">إنشاء موقع جديد</h3>
            <form onSubmit={createSite} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">اسم الموقع</label>
                <input
                  type="text"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="my-site"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">إصدار PHP</label>
                <select
                  value={newSite.php_version}
                  onChange={(e) => setNewSite({ ...newSite, php_version: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="8.2">PHP 8.2</option>
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.0">PHP 8.0</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">مركز البيانات</label>
                <select
                  value={newSite.datacenter_code}
                  onChange={(e) => setNewSite({ ...newSite, datacenter_code: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="DFW">Dallas, USA</option>
                  <option value="BUR">Burbank, USA</option>
                  <option value="AMS">Amsterdam, EU</option>
                  <option value="SYD">Sydney, AU</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
                  إنشاء
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCollaboratorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">إضافة متعاون</h3>
            <form onSubmit={addCollaborator} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newCollaborator.email}
                  onChange={(e) => setNewCollaborator({ ...newCollaborator, email: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="email@example.com"
                  required
                />
              </div>
              {sites.length > 0 && (
                <div>
                  <label className="block text-gray-700 mb-2">اختر المواقع (اختياري)</label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {sites.map(site => (
                      <label key={site.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSites.includes(site.id)}
                          onChange={() => toggleSiteSelection(site.id)}
                          className="w-4 h-4"
                        />
                        <span>{site.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">تم اختيار {selectedSites.length} موقع</p>
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
                  إضافة
                </button>
                <button type="button" onClick={() => { setShowCollaboratorModal(false); setSelectedSites([]); }} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
