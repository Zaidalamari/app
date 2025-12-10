import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import AdminDashboard from './pages/AdminDashboard'
import JoinSeller from './pages/JoinSeller'
import ApiDocs from './pages/ApiDocs'
import Payment from './pages/Payment'
import PressableAdmin from './pages/PressableAdmin'
import MintrouteAdmin from './pages/MintrouteAdmin'
import WalletManagement from './pages/WalletManagement'
import SellerStore from './pages/SellerStore'
import MyStorefront from './pages/MyStorefront'
import SmmProviders from './pages/SmmProviders'
import CurrencySettings from './pages/CurrencySettings'
import ApiTutorial from './pages/ApiTutorial'
import DeliveryScan from './pages/DeliveryScan'
import MyDeliveries from './pages/MyDeliveries'
import AdminPrices from './pages/AdminPrices'
import Referrals from './pages/Referrals'
import AdminReferrals from './pages/AdminReferrals'
import AdminUsers from './pages/AdminUsers'
import Subscriptions from './pages/Subscriptions'
import AdminSubscriptions from './pages/AdminSubscriptions'
import PaymentGateways from './pages/PaymentGateways'
import AdminGateways from './pages/AdminGateways'
import Integrations from './pages/Integrations'
import MarketingCenter from './pages/MarketingCenter'
import PluginDownload from './pages/PluginDownload'
import ChatBot from './components/ChatBot'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="text-white text-2xl">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Home user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route path="/join-seller" element={<JoinSeller />} />
        <Route path="/products" element={<Products user={user} />} />
        <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} />} />
        <Route path="/admin" element={<AdminDashboard user={user} />} />
        <Route path="/api-docs" element={<ApiDocs user={user} />} />
        <Route path="/api-tutorial" element={<ApiTutorial user={user} />} />
        <Route path="/payment" element={<Payment user={user} />} />
        <Route path="/referrals" element={<Referrals user={user} />} />
        <Route path="/admin/pressable" element={user?.role === 'admin' ? <PressableAdmin /> : <Login setUser={setUser} />} />
        <Route path="/admin/mintroute" element={user?.role === 'admin' ? <MintrouteAdmin /> : <Login setUser={setUser} />} />
        <Route path="/admin/wallets" element={<WalletManagement user={user} />} />
        <Route path="/admin/smm" element={user?.role === 'admin' ? <SmmProviders user={user} /> : <Login setUser={setUser} />} />
        <Route path="/admin/currencies" element={user?.role === 'admin' ? <CurrencySettings user={user} /> : <Login setUser={setUser} />} />
        <Route path="/admin/prices" element={user?.role === 'admin' ? <AdminPrices user={user} /> : <Login setUser={setUser} />} />
        <Route path="/admin/referrals" element={user?.role === 'admin' ? <AdminReferrals user={user} /> : <Login setUser={setUser} />} />
        <Route path="/admin/users" element={user?.role === 'admin' ? <AdminUsers user={user} /> : <Login setUser={setUser} />} />
        <Route path="/admin/subscriptions" element={user?.role === 'admin' ? <AdminSubscriptions user={user} /> : <Login setUser={setUser} />} />
        <Route path="/subscriptions" element={<Subscriptions user={user} />} />
        <Route path="/gateways" element={<PaymentGateways user={user} />} />
        <Route path="/integrations" element={<Integrations user={user} />} />
        <Route path="/marketing" element={<MarketingCenter user={user} />} />
        <Route path="/plugin" element={<PluginDownload />} />
        <Route path="/admin/gateways" element={user?.role === 'admin' ? <AdminGateways user={user} /> : <Login setUser={setUser} />} />
        <Route path="/delivery/scan" element={<DeliveryScan user={user} />} />
        <Route path="/my-deliveries" element={<MyDeliveries user={user} />} />
        <Route path="/my-store" element={<MyStorefront user={user} />} />
        <Route path="/store/:slug" element={<SellerStore />} />
        <Route path="/:slug" element={<SellerStore />} />
      </Routes>
      <ChatBot />
    </div>
  )
}

export default App
