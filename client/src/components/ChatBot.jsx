import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, User, Bot, Phone } from 'lucide-react'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [chatMode, setChatMode] = useState('ai')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'مرحباً! أنا مساعد Alameri Digital الذكي. كيف يمكنني مساعدتك اليوم؟' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const [ticketForm, setTicketForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [ticketSubmitted, setTicketSubmitted] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) setShowPulse(false)
  }, [isOpen])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.filter(m => m.role !== 'system').slice(-10)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، لا يمكن الاتصال بالخادم حالياً.' }])
    } finally {
      setLoading(false)
    }
  }

  const submitTicket = async (e) => {
    e.preventDefault()
    if (!ticketForm.name || !ticketForm.email || !ticketForm.message) {
      alert('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketForm)
      })

      const data = await response.json()
      if (data.success) {
        setTicketSubmitted(true)
        setTicketForm({ name: '', email: '', subject: '', message: '' })
      } else {
        alert('حدث خطأ في إرسال التذكرة')
      }
    } catch (error) {
      alert('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg text-white hover:scale-105 transition-all z-50 px-4 py-3"
      >
        {showPulse && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></span>
        )}
        {showPulse && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"></span>
        )}
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            <span className="font-medium hidden sm:inline">تحتاج مساعدة؟</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 left-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden" style={{ height: '550px', maxHeight: 'calc(100vh - 150px)' }}>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">{chatMode === 'ai' ? '🤖' : '👨‍💼'}</span>
                </div>
                <div>
                  <h3 className="font-bold">
                    {chatMode === 'ai' ? 'مساعد Alameri' : 'الدعم الفني'}
                  </h3>
                  <p className="text-xs text-white/80">
                    {chatMode === 'ai' ? 'ذكاء اصطناعي • متصل الآن' : 'فريق الدعم البشري'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => { setChatMode('ai'); setTicketSubmitted(false) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  chatMode === 'ai' ? 'bg-white text-blue-600' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <Bot className="w-4 h-4 inline ml-1" />
                شات ذكي
              </button>
              <button
                onClick={() => { setChatMode('human'); setTicketSubmitted(false) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  chatMode === 'human' ? 'bg-white text-purple-600' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <User className="w-4 h-4 inline ml-1" />
                دعم بشري
              </button>
            </div>
          </div>

          {chatMode === 'ai' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-bl-md' 
                        : 'bg-white text-gray-800 shadow-md rounded-br-md'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-end">
                    <div className="bg-white p-3 rounded-2xl shadow-md rounded-br-md">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 bg-white border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    dir="rtl"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:scale-105 transition-transform"
                  >
                    <Send className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {ticketSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">تم إرسال طلبك</h3>
                  <p className="text-gray-600 mb-4">سيتواصل معك فريق الدعم في أقرب وقت</p>
                  <button
                    onClick={() => setTicketSubmitted(false)}
                    className="text-blue-600 hover:underline"
                  >
                    إرسال طلب آخر
                  </button>
                </div>
              ) : (
                <form onSubmit={submitTicket} className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-xl text-sm text-blue-700 mb-4">
                    <Phone className="w-4 h-4 inline ml-1" />
                    فريق الدعم متاح من 9 صباحاً حتى 11 مساءً
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm">الاسم *</label>
                    <input
                      type="text"
                      required
                      value={ticketForm.name}
                      onChange={(e) => setTicketForm({...ticketForm, name: e.target.value})}
                      className="w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                      dir="rtl"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      required
                      value={ticketForm.email}
                      onChange={(e) => setTicketForm({...ticketForm, email: e.target.value})}
                      className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      dir="ltr"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm">الموضوع</label>
                    <select
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                      className="w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">اختر الموضوع</option>
                      <option value="payment">مشكلة في الدفع</option>
                      <option value="order">استفسار عن طلب</option>
                      <option value="account">مشكلة في الحساب</option>
                      <option value="gateway">بوابات الدفع</option>
                      <option value="technical">مشكلة تقنية</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm">الرسالة *</label>
                    <textarea
                      required
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                      className="w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={4}
                      dir="rtl"
                      placeholder="اكتب تفاصيل مشكلتك أو استفسارك..."
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loading ? 'جاري الإرسال...' : 'إرسال للدعم الفني'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
