import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  Crown, ArrowLeft, Settings, Save, Plus, Trash2, Edit2, 
  Store, Layout, Eye, EyeOff, Check, X, Package, Globe
} from 'lucide-react'

export default function AdminSubscriptions({ user }) {
  const [activeTab, setActiveTab] = useState('plans')
  const [plans, setPlans] = useState([])
  const [templates, setTemplates] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [domainPricing, setDomainPricing] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState(null)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: '', name_ar: '', description: '', preview_image: '', category: 'general', is_premium: false
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
      const [plansRes, templatesRes, subsRes, pricingRes] = await Promise.all([
        axios.get('/api/subscriptions/plans'),
        axios.get('/api/stores/admin/templates', config).catch(() => ({ data: { templates: [] } })),
        axios.get('/api/subscriptions/admin/all', config).catch(() => ({ data: { subscriptions: [] } })),
        axios.get('/api/domains/pricing').catch(() => ({ data: { pricing: [] } }))
      ])

      setPlans(plansRes.data.plans || [])
      setTemplates(templatesRes.data.templates || [])
      setSubscriptions(subsRes.data.subscriptions || [])
      setDomainPricing(pricingRes.data.pricing || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePlan = async (plan) => {
    const token = localStorage.getItem('token')
    try {
      await axios.put(`/api/subscriptions/admin/plans/${plan.id}`, plan, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم تحديث الخطة بنجاح')
      setEditingPlan(null)
      fetchData()
    } catch (err) {
      alert('حدث خطأ في التحديث')
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.name_ar) {
      alert('يرجى إدخال اسم القالب')
      return
    }

    const token = localStorage.getItem('token')
    try {
      await axios.post('/api/stores/admin/templates', newTemplate, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم إنشاء القالب بنجاح')
      setShowTemplateModal(false)
      setNewTemplate({ name: '', name_ar: '', description: '', preview_image: '', category: 'general', is_premium: false })
      fetchData()
    } catch (err) {
      alert('حدث خطأ')
    }
  }

  const handleUpdateTemplate = async (template) => {
    const token = localStorage.getItem('token')
    try {
      await axios.put(`/api/stores/admin/templates/${template.id}`, template, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم تحديث القالب بنجاح')
      setEditingTemplate(null)
      fetchData()
    } catch (err) {
      alert('حدث خطأ في التحديث')
    }
  }

  const handleUpdateDomainPricing = async (pricing) => {
    const token = localStorage.getItem('token')
    try {
      await axios.put(`/api/domains/admin/pricing/${pricing.id}`, pricing, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم تحديث السعر بنجاح')
      fetchData()
    } catch (err) {
      alert('حدث خطأ في التحديث')
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
                <Crown className="w-6 h-6 text-purple-600" />
                إدارة الاشتراكات والقوالب
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard title="إجمالي الاشتراكات" value={subscriptions.length} icon={<Crown />} color="purple" />
          <StatCard title="الخطط المتاحة" value={plans.length} icon={<Package />} color="blue" />
          <StatCard title="القوالب" value={templates.length} icon={<Layout />} color="green" />
          <StatCard title="أسعار النطاقات" value={domainPricing.length} icon={<Globe />} color="orange" />
        </div>

        <div className="flex gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm border">
          <TabButton active={activeTab === 'plans'} onClick={() => setActiveTab('plans')} icon={<Crown className="w-4 h-4" />}>
            خطط الاشتراك
          </TabButton>
          <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} icon={<Layout className="w-4 h-4" />}>
            قوالب المتاجر
          </TabButton>
          <TabButton active={activeTab === 'domains'} onClick={() => setActiveTab('domains')} icon={<Globe className="w-4 h-4" />}>
            أسعار النطاقات
          </TabButton>
          <TabButton active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')} icon={<Store className="w-4 h-4" />}>
            الاشتراكات النشطة
          </TabButton>
        </div>

        {activeTab === 'plans' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-6">خطط الاشتراك</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium text-gray-600">الخطة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">شهري</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">ربع سنوي</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">نصف سنوي</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">سنوي</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">سنتين</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">متاجر</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">منتجات</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(plan => (
                    <tr key={plan.id} className="border-b hover:bg-gray-50">
                      {editingPlan?.id === plan.id ? (
                        <>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editingPlan.name_ar}
                              onChange={e => setEditingPlan({...editingPlan, name_ar: e.target.value})}
                              className="w-full p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={editingPlan.price_monthly}
                              onChange={e => setEditingPlan({...editingPlan, price_monthly: e.target.value})}
                              className="w-20 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={editingPlan.price_quarterly}
                              onChange={e => setEditingPlan({...editingPlan, price_quarterly: e.target.value})}
                              className="w-20 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={editingPlan.price_semi_annual}
                              onChange={e => setEditingPlan({...editingPlan, price_semi_annual: e.target.value})}
                              className="w-20 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={editingPlan.price_annual}
                              onChange={e => setEditingPlan({...editingPlan, price_annual: e.target.value})}
                              className="w-20 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={editingPlan.price_biennial}
                              onChange={e => setEditingPlan({...editingPlan, price_biennial: e.target.value})}
                              className="w-20 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={editingPlan.max_stores}
                              onChange={e => setEditingPlan({...editingPlan, max_stores: e.target.value})}
                              className="w-16 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={editingPlan.max_products}
                              onChange={e => setEditingPlan({...editingPlan, max_products: e.target.value})}
                              className="w-16 p-2 border rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={editingPlan.is_active}
                              onChange={e => setEditingPlan({...editingPlan, is_active: e.target.value === 'true'})}
                              className="p-2 border rounded"
                            >
                              <option value="true">نشط</option>
                              <option value="false">معطل</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdatePlan(editingPlan)}
                                className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingPlan(null)}
                                className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 font-medium">{plan.name_ar || plan.name}</td>
                          <td className="py-3 px-4">{plan.price_monthly} ر.س</td>
                          <td className="py-3 px-4">{plan.price_quarterly} ر.س</td>
                          <td className="py-3 px-4">{plan.price_semi_annual} ر.س</td>
                          <td className="py-3 px-4">{plan.price_annual} ر.س</td>
                          <td className="py-3 px-4">{plan.price_biennial} ر.س</td>
                          <td className="py-3 px-4">{plan.max_stores === -1 ? '∞' : plan.max_stores}</td>
                          <td className="py-3 px-4">{plan.max_products === -1 ? '∞' : plan.max_products}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {plan.is_active ? 'نشط' : 'معطل'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setEditingPlan({...plan})}
                              className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                            >
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

        {activeTab === 'templates' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">قوالب المتاجر</h2>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                قالب جديد
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div key={template.id} className="border rounded-xl p-4 hover:shadow-md transition">
                  {editingTemplate?.id === template.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingTemplate.name}
                        onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                        placeholder="Name"
                        className="w-full p-2 border rounded"
                      />
                      <input
                        type="text"
                        value={editingTemplate.name_ar}
                        onChange={e => setEditingTemplate({...editingTemplate, name_ar: e.target.value})}
                        placeholder="الاسم بالعربي"
                        className="w-full p-2 border rounded"
                      />
                      <textarea
                        value={editingTemplate.description || ''}
                        onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                        placeholder="الوصف"
                        className="w-full p-2 border rounded"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingTemplate.is_premium}
                            onChange={e => setEditingTemplate({...editingTemplate, is_premium: e.target.checked})}
                          />
                          مميز
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingTemplate.is_active}
                            onChange={e => setEditingTemplate({...editingTemplate, is_active: e.target.checked})}
                          />
                          نشط
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateTemplate(editingTemplate)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => setEditingTemplate(null)}
                          className="flex-1 bg-gray-200 py-2 rounded-lg"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                          <Layout className="w-6 h-6" />
                        </div>
                        <div className="flex gap-1">
                          {template.is_premium && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">مميز</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {template.is_active ? 'نشط' : 'معطل'}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-800">{template.name_ar || template.name}</h4>
                      <p className="text-sm text-gray-500 mb-3">{template.description || 'بدون وصف'}</p>
                      <p className="text-xs text-gray-400 mb-3">التصنيف: {template.category}</p>
                      <button
                        onClick={() => setEditingTemplate({...template})}
                        className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        تعديل
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-6">أسعار النطاقات</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium text-gray-600">الفترة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">المدة (أشهر)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">السعر (ر.س)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">نسبة الخصم</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {domainPricing.map(pricing => (
                    <tr key={pricing.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{pricing.name_ar}</td>
                      <td className="py-3 px-4">{pricing.cycle_months} شهر</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          defaultValue={pricing.price}
                          onBlur={e => handleUpdateDomainPricing({...pricing, price: e.target.value})}
                          className="w-24 p-2 border rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          defaultValue={pricing.discount_percentage}
                          onBlur={e => handleUpdateDomainPricing({...pricing, discount_percentage: e.target.value})}
                          className="w-20 p-2 border rounded"
                        />%
                      </td>
                      <td className="py-3 px-4">
                        <select
                          defaultValue={pricing.is_active}
                          onChange={e => handleUpdateDomainPricing({...pricing, is_active: e.target.value === 'true'})}
                          className="p-2 border rounded"
                        >
                          <option value="true">نشط</option>
                          <option value="false">معطل</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-400 text-sm">تلقائي</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-6">الاشتراكات النشطة</h2>
            {subscriptions.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد اشتراكات بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 font-medium text-gray-600">المستخدم</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">البريد</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">الخطة</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">الفترة</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">الحالة</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">تاريخ الانتهاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{sub.user_name}</td>
                        <td className="py-3 px-4">{sub.email}</td>
                        <td className="py-3 px-4">{sub.plan_name}</td>
                        <td className="py-3 px-4">{sub.billing_cycle}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            sub.status === 'active' ? 'bg-green-100 text-green-700' : 
                            sub.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {sub.status === 'active' ? 'نشط' : sub.status === 'expired' ? 'منتهي' : sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{new Date(sub.expires_at).toLocaleDateString('ar-SA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">إنشاء قالب جديد</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (English) *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Modern Store"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي) *</label>
                  <input
                    type="text"
                    value={newTemplate.name_ar}
                    onChange={e => setNewTemplate({...newTemplate, name_ar: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                    placeholder="المتجر العصري"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                  <textarea
                    value={newTemplate.description}
                    onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                    rows={3}
                    placeholder="وصف القالب"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رابط الصورة</label>
                  <input
                    type="text"
                    value={newTemplate.preview_image}
                    onChange={e => setNewTemplate({...newTemplate, preview_image: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                  <select
                    value={newTemplate.category}
                    onChange={e => setNewTemplate({...newTemplate, category: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="general">عام</option>
                    <option value="gaming">ألعاب</option>
                    <option value="digital">رقمي</option>
                    <option value="services">خدمات</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_premium"
                    checked={newTemplate.is_premium}
                    onChange={e => setNewTemplate({...newTemplate, is_premium: e.target.checked})}
                  />
                  <label htmlFor="is_premium">قالب مميز (للخطط المدفوعة فقط)</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateTemplate}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  إنشاء
                </button>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ children, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
        active 
          ? 'bg-purple-600 text-white shadow-sm' 
          : 'text-gray-600 hover:bg-gray-100'
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
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100'
  }

  const iconColors = {
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600'
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
