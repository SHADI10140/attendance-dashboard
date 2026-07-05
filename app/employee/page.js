'use client'
import { useEffect, useState } from 'react'
import { supabase, checkIn, checkOut } from '@/lib/supabase'

// ─── حساب المسافة بالمتر ───
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ─── إعدادات الموقع المسموح ───
const ALLOWED = {
  lat:    31.429806,
  lng:    31.673333,
  radius: 1000
}

export default function EmployeeApp() {
  const [screen,     setScreen]     = useState('login')   // login | home
  const [employees,  setEmployees]  = useState([])
  const [selIdx,     setSelIdx]     = useState('')
  const [pass,       setPass]       = useState('')
  const [currentEmp, setCurrentEmp] = useState(null)
  const [todayAtt,   setTodayAtt]   = useState(null)
  const [location,   setLocation]   = useState(null)
  const [locOk,      setLocOk]      = useState(false)
  const [locDist,    setLocDist]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [clock,      setClock]      = useState('')
  const [activeTab,  setActiveTab]  = useState('home')
  const [history,    setHistory]    = useState([])
  const [monthStats, setMonthStats] = useState({ present: 0, late: 0, absent: 0, hours: 0 })
  const [error,      setError]      = useState('')
const [showPassModal, setShowPassModal] = useState(false)
  const [oldPass,       setOldPass]       = useState('')
  const [newPass,       setNewPass]       = useState('')
  const [confirmPass,   setConfirmPass]   = useState('')
  const [passSaving,    setPassSaving]    = useState(false)

  // ─── تغيير كلمة المرور ───
  async function handleChangePassword() {
    if (oldPass !== (currentEmp?.pass || '1234')) return alert('كلمة المرور الحالية غير صحيحة')
    if (!newPass || newPass.length < 4) return alert('كلمة المرور الجديدة لازم تكون 4 أحرف/أرقام على الأقل')
    if (newPass !== confirmPass) return alert('تأكيد كلمة المرور غير مطابق')
    setPassSaving(true)
    try {
      const { data, error } = await supabase
        .from('employees').update({ pass: newPass })
        .eq('id', currentEmp.id).select().single()
      if (error) throw error
      setCurrentEmp(data)
      setShowPassModal(false)
      setOldPass(''); setNewPass(''); setConfirmPass('')
      alert('✅ تم تغيير كلمة المرور بنجاح')
    } catch (e) {
      alert('خطأ: ' + e.message)
    } finally {
      setPassSaving(false)
    }
  }
  // ─── جلب الموظفين ───
  useEffect(() => {
    supabase.from('employees').select('*').eq('active', true)
      .then(({ data }) => setEmployees(data || []))
  }, [])

  // ─── ساعة مباشرة ───
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // ─── تحديد الموقع ───
  useEffect(() => {
    if (screen !== 'home') return
    if (!navigator.geolocation) { setLocOk(true); return }

    const watcher = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocation({ lat, lng })
        const dist = getDistance(lat, lng, ALLOWED.lat, ALLOWED.lng)
        setLocDist(Math.round(dist))
        setLocOk(dist <= ALLOWED.radius)
      },
      () => { setLocOk(true); setLocDist(0) },
      { enableHighAccuracy: true }
    )
    return () => navigator.geolocation.clearWatch(watcher)
  }, [screen])

  // ─── جلب حضور اليوم ───
  async function fetchTodayAtt(empId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', empId)
      .eq('date', today)
      .single()
    setTodayAtt(data || null)
  }

  // ─── جلب سجل الحضور ───
  async function fetchHistory(empId) {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', empId)
      .order('date', { ascending: false })
      .limit(10)
    setHistory(data || [])
  }

  // ─── جلب إحصائيات الشهر ───
  async function fetchMonthStats(empId) {
    const now   = new Date()
    const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('attendance')
      .select('status, work_hours')
      .eq('employee_id', empId)
      .gte('date', first)
    const rows = data || []
    setMonthStats({
      present: rows.filter(r => r.status === 'present').length,
      late:    rows.filter(r => r.status === 'late').length,
      absent:  rows.filter(r => r.status === 'absent').length,
      hours:   rows.reduce((s, r) => s + (parseFloat(r.work_hours) || 0), 0)
    })
  }

  // ─── تسجيل الدخول ───
  async function handleLogin() {
    setError('')
    if (!selIdx && selIdx !== 0) return setError('اختر موظفاً')
    const emp = employees[parseInt(selIdx)]
    if (!emp) return setError('موظف غير موجود')
    // جلب أحدث بيانات الموظف من قاعدة البيانات للتحقق
    const { data: fresh } = await supabase
      .from('employees').select('*').eq('id', emp.id).single()
    const target = fresh || emp
    if ((target.pass || '1234') !== pass) return setError('كلمة المرور غير صحيحة')
    setCurrentEmp(target)
    await fetchTodayAtt(target.id)
    await fetchHistory(target.id)
    await fetchMonthStats(target.id)
    setScreen('home')
  }

  // ─── تسجيل الحضور / الانصراف ───
  async function handlePunch() {
    if (!locOk) return alert('⚠️ أنت خارج النطاق المسموح به!')
    if (!currentEmp) return
    setLoading(true)
    try {
      const lat = location?.lat || ALLOWED.lat
      const lng = location?.lng || ALLOWED.lng

      if (!todayAtt?.check_in) {
        const data = await checkIn(currentEmp.id, lat, lng)
        setTodayAtt(data)
        alert('✅ تم تسجيل حضورك بنجاح!')
      } else if (!todayAtt?.check_out) {
        const data = await checkOut(currentEmp.id, lat, lng)
        setTodayAtt(data)
        alert('✅ تم تسجيل انصرافك بنجاح!')
      } else {
        alert('تم تسجيل الحضور والانصراف اليوم بالفعل')
      }
      await fetchHistory(currentEmp.id)
      await fetchMonthStats(currentEmp.id)
    } catch(e) {
      alert('خطأ: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── حالة الزر ───
  function getPunchState() {
    if (!todayAtt?.check_in)  return { label: 'تسجيل الحضور',   color: 'bg-green-600',  done: false }
    if (!todayAtt?.check_out) return { label: 'تسجيل الانصراف', color: 'bg-red-600',    done: false }
    return                           { label: 'تم الانصراف ✓',   color: 'bg-gray-400',   done: true  }
  }

  const punch = getPunchState()

  // ─── شاشة تسجيل الدخول ───
  if (screen === 'login') return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a3c6e] to-[#1565c0] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">👆</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">تطبيق الحضور</h2>
        <p className="text-gray-400 text-xs mb-5">سجّل دخولك لتسجيل حضورك</p>

        <div className="space-y-3 text-right">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">اختر اسمك</label>
            <select value={selIdx} onChange={e => setSelIdx(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400">
              <option value="">-- اختر موظف --</option>
              {employees.map((e, i) => (
                <option key={e.id} value={i}>{e.name_ar} ({e.emp_code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">كلمة المرور</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              placeholder="أدخل كلمة المرور"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button onClick={handleLogin}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700">
            تسجيل الدخول
          </button>
          <p className="text-xs text-gray-300 text-center">كلمة المرور الافتراضية: 1234</p>
        </div>
      </div>
    </div>
  )

  // ─── شاشة الرئيسية ───
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-sm mx-auto" dir="rtl">

      {/* Header */}
      <div className="bg-[#1a3c6e] text-white px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs opacity-70">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="text-sm font-bold">{currentEmp?.name_ar}</div>
        </div>
        <div className="text-left">
          <div className="text-lg font-mono font-bold">{clock}</div>
          <div className="text-xs opacity-70">{currentEmp?.emp_code}</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {activeTab === 'home' && <>
          {/* Greeting */}
          <div className="bg-[#1a3c6e] text-white rounded-2xl p-4">
            <div className="text-base font-bold mb-1">
              {new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير'} {currentEmp?.name_ar?.split(' ')[0]} 👋
            </div>
            <div className="text-xs opacity-75">لا تنسَ تسجيل حضورك يومياً</div>
          </div>

          {/* Punch Button */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="flex justify-between text-xs text-gray-400 mb-4">
              <span>حالة اليوم</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-xs
                ${!todayAtt?.check_in ? 'bg-purple-100 text-purple-700' :
                  !todayAtt?.check_out ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-600'}`}>
                {!todayAtt?.check_in ? 'لم يبدأ' : !todayAtt?.check_out ? 'حاضر' : 'انصرف'}
              </span>
            </div>

            <button onClick={handlePunch} disabled={punch.done || loading}
              className={`w-36 h-36 rounded-full text-white font-bold text-sm mx-auto flex flex-col items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${punch.color} ${punch.done ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <span className="text-4xl">👆</span>
              <span>{loading ? 'جارٍ...' : punch.label}</span>
            </button>

            {/* Location */}
            <div className={`flex items-center justify-center gap-2 mt-4 text-xs ${locOk ? 'text-green-600' : 'text-red-500'}`}>
              <span className={`w-2 h-2 rounded-full ${locOk ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}/>
              {locOk
                ? `داخل النطاق ${locDist !== null ? `(${locDist}م)` : ''}`
                : `خارج النطاق! (${locDist}م — مسموح ${ALLOWED.radius}م)`}
            </div>

            {/* Times */}
            <div className="flex justify-around mt-4 text-xs text-gray-400">
              <div className="text-center">
                <div className="text-sm font-bold text-green-600">
                  {todayAtt?.check_in ? new Date(todayAtt.check_in).toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'}) : '--:--'}
                </div>
                <div>حضور</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-red-500">
                  {todayAtt?.check_out ? new Date(todayAtt.check_out).toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'}) : '--:--'}
                </div>
                <div>انصراف</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-blue-600">
                  {todayAtt?.work_hours ? `${parseFloat(todayAtt.work_hours).toFixed(1)}h` : '--'}
                </div>
                <div>ساعات</div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">سجل الحضور الأخير</h3>
            {history.length === 0 ? (
              <p className="text-center text-gray-300 text-xs py-4">لا توجد سجلات</p>
            ) : history.map(h => (
              <div key={h.id} className="flex justify-between items-center py-2 border-b border-gray-50 text-xs last:border-0">
                <div>
                  <div className="font-medium text-gray-700">{new Date(h.date).toLocaleDateString('ar-EG', {day:'numeric',month:'short'})}</div>
                  <div className="text-gray-400">
                    {h.check_in ? new Date(h.check_in).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}) : '--'} ←
                    {h.check_out ? new Date(h.check_out).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}) : '--'}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                  ${h.status==='present'?'bg-green-100 text-green-700':
                    h.status==='late'?'bg-orange-100 text-orange-700':
                    'bg-red-100 text-red-700'}`}>
                  {h.status==='present'?'حاضر':h.status==='late'?'متأخر':'غائب'}
                </span>
              </div>
            ))}
          </div>
        </>}

        {activeTab === 'profile' && <>
          {/* إحصائيات الشهر */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              إحصائيات شهر {new Date().toLocaleDateString('ar-EG', { month: 'long' })}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-green-600">{monthStats.present}</div>
                <div className="text-xs text-gray-500 mt-1">أيام حضور</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-orange-500">{monthStats.late}</div>
                <div className="text-xs text-gray-500 mt-1">أيام تأخير</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-red-500">{monthStats.absent}</div>
                <div className="text-xs text-gray-500 mt-1">أيام غياب</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{monthStats.hours.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mt-1">إجمالي الساعات</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
              {currentEmp?.name_ar?.charAt(0)}
            </div>
            <h3 className="text-base font-bold text-center text-gray-800">{currentEmp?.name_ar}</h3>
            <p className="text-xs text-center text-gray-400 mb-4">{currentEmp?.role_ar}</p>
            {[
              ['الرقم الوظيفي', currentEmp?.emp_code],
              ['الراتب الأساسي', `${(currentEmp?.salary||0).toLocaleString()} ج.م`],
              ['رقم الهاتف', currentEmp?.phone],
            ].map(([l,v])=>(
              <div key={l} className="flex justify-between py-2 border-b border-gray-50 text-sm last:border-0">
                <span className="text-gray-400">{l}</span>
                <span className="font-medium">{v||'--'}</span>
              </div>
            ))}
            <button onClick={() => setShowPassModal(true)}
              className="w-full mt-4 py-2.5 border border-blue-200 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50">
              🔑 تغيير كلمة المرور
            </button>

            {showPassModal && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-3" dir="rtl">
                  <h3 className="text-base font-bold text-gray-800 text-center">تغيير كلمة المرور</h3>
                  <input type="password" placeholder="كلمة المرور الحالية" value={oldPass}
                    onChange={e => setOldPass(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"/>
                  <input type="password" placeholder="كلمة المرور الجديدة" value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"/>
                  <input type="password" placeholder="تأكيد كلمة المرور الجديدة" value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"/>
                  <button onClick={handleChangePassword} disabled={passSaving}
                    className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-blue-700">
                    {passSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                  <button onClick={() => {setShowPassModal(false); setOldPass(''); setNewPass(''); setConfirmPass('')}}
                    className="w-full py-2 text-gray-400 text-sm">إلغاء</button>
                </div>
              </div>
            )}
            <button onClick={()=>{setScreen('login');setCurrentEmp(null);setTodayAtt(null)}}
              className="w-full mt-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50">
              تسجيل الخروج
            </button>
          </div>
        </>}
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white border-t border-gray-100 flex">
        {[
          { id:'home',    icon:'🏠', label:'الرئيسية' },
          { id:'profile', icon:'👤', label:'ملفي' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-colors
              ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}