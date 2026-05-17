'use client'
import { useEffect, useState } from 'react'
import { Trash2, Power, Search, AlertTriangle, Save, MapPin, Plus, Edit, X, Clock, Building } from 'lucide-react'
import { getEmployees, updateEmployee, supabase } from '@/lib/supabase'

// ─── جلب الإعدادات ───
async function getSettings() {
  const { data } = await supabase.from('settings').select('*')
  const map = {}
  data?.forEach(s => { map[s.key] = s.value })
  return map
}

// ─── حفظ إعداد ───
async function saveSetting(key, value) {
  await supabase.from('settings').upsert({ key, value: String(value) })
}

// ─── حذف موظف ───
async function deleteEmployee(id) {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
}

export default function SettingsPage() {
  const [employees, setEmployees] = useState([])
  const [shifts,    setShifts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [activeTab, setActiveTab] = useState('shifts')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [editShift, setEditShift] = useState(null)

  // إعدادات الشركة
  const [companyName,    setCompanyName]    = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyEmail,   setCompanyEmail]   = useState('')
  const [companyPhone,   setCompanyPhone]   = useState('')

  // إعدادات الموقع
  const [locName,   setLocName]   = useState('المقر الرئيسي')
  const [locLat,    setLocLat]    = useState('31.429806')
  const [locLng,    setLocLng]    = useState('31.673333')
  const [locRadius, setLocRadius] = useState('500')

  // إعدادات الرواتب
  const [workDays,    setWorkDays]    = useState('30')
  const [lateDeduct,  setLateDeduct]  = useState('50')
  const [gracePeriod, setGracePeriod] = useState('10')

  async function fetchAll() {
    try {
      const [emps, sh, cfg] = await Promise.all([
        getEmployees(),
        supabase.from('shifts').select('*').order('start_time'),
        getSettings()
      ])
      setEmployees(emps || [])
      setShifts(sh.data || [])
      // تحميل الإعدادات
      if (cfg.company_name)    setCompanyName(cfg.company_name)
      if (cfg.company_address) setCompanyAddress(cfg.company_address)
      if (cfg.company_email)   setCompanyEmail(cfg.company_email)
      if (cfg.company_phone)   setCompanyPhone(cfg.company_phone)
      if (cfg.loc_name)        setLocName(cfg.loc_name)
      if (cfg.loc_lat)         setLocLat(cfg.loc_lat)
      if (cfg.loc_lng)         setLocLng(cfg.loc_lng)
      if (cfg.loc_radius)      setLocRadius(cfg.loc_radius)
      if (cfg.work_days)       setWorkDays(cfg.work_days)
      if (cfg.late_deduct)     setLateDeduct(cfg.late_deduct)
      if (cfg.grace_period)    setGracePeriod(cfg.grace_period)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  function showSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ─── حفظ إعدادات الشركة ───
  async function saveCompany() {
    setSaving(true)
    try {
      await Promise.all([
        saveSetting('company_name',    companyName),
        saveSetting('company_address', companyAddress),
        saveSetting('company_email',   companyEmail),
        saveSetting('company_phone',   companyPhone),
      ])
      showSaved()
    } catch(e) { alert('خطأ: ' + e.message) }
    finally { setSaving(false) }
  }

  // ─── حفظ إعدادات الموقع ───
  async function saveLocation() {
    setSaving(true)
    try {
      await Promise.all([
        saveSetting('loc_name',   locName),
        saveSetting('loc_lat',    locLat),
        saveSetting('loc_lng',    locLng),
        saveSetting('loc_radius', locRadius),
      ])
      // تحديث جدول locations
      const { data: existing } = await supabase.from('locations').select('id').eq('is_default', true).single()
      if (existing) {
        await supabase.from('locations').update({
          name: locName,
          latitude: parseFloat(locLat),
          longitude: parseFloat(locLng),
          radius_m: parseInt(locRadius)
        }).eq('id', existing.id)
      } else {
        await supabase.from('locations').insert([{
          name: locName,
          latitude: parseFloat(locLat),
          longitude: parseFloat(locLng),
          radius_m: parseInt(locRadius),
          is_default: true
        }])
      }
      showSaved()
    } catch(e) { alert('خطأ: ' + e.message) }
    finally { setSaving(false) }
  }

  // ─── حفظ إعدادات الرواتب ───
  async function saveSalarySettings() {
    setSaving(true)
    try {
      await Promise.all([
        saveSetting('work_days',    workDays),
        saveSetting('late_deduct',  lateDeduct),
        saveSetting('grace_period', gracePeriod),
      ])
      showSaved()
    } catch(e) { alert('خطأ: ' + e.message) }
    finally { setSaving(false) }
  }

  // ─── حذف موظف ───
  async function handleDelete(id) {
    try {
      await deleteEmployee(id)
      setConfirmId(null)
      fetchAll()
    } catch(e) { alert('خطأ في الحذف: ' + e.message) }
  }

  async function handleToggle(emp) {
    await updateEmployee(emp.id, { active: !emp.active })
    fetchAll()
  }

  const filtered = employees.filter(e =>
    e.name_ar?.includes(search) || e.emp_code?.includes(search)
  )

  const tabs = [
    { id: 'shifts',    label: 'الشيفتات',       icon: '🕐' },
    { id: 'location',  label: 'الموقع',          icon: '📍' },
    { id: 'salary',    label: 'إعدادات الرواتب', icon: '💰' },
    { id: 'employees', label: 'إدارة الموظفين',  icon: '👥' },
    { id: 'company',   label: 'بيانات الشركة',   icon: '🏢' },
  ]

  const SaveBtn = ({ onClick }) => (
    <button onClick={onClick} disabled={saving}
      className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
        ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}
        ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <Save size={15}/> {saving ? 'جارٍ الحفظ...' : saved ? '✅ تم الحفظ!' : 'حفظ'}
    </button>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/>
    </div>
  )

  return (
    <div dir="rtl">
      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'}`}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ─── SHIFTS ─── */}
      {activeTab === 'shifts' && (
        <div className="max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700">إدارة الشيفتات ({shifts.length})</h3>
            <button onClick={() => { setEditShift(null); setShowShiftModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
              <Plus size={15}/> إضافة شيفت
            </button>
          </div>
          <div className="space-y-3">
            {shifts.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-300 shadow-sm border border-gray-100">
                لا توجد شيفتات — اضغط "إضافة شيفت"
              </div>
            ) : shifts.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock size={18}/>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">{s.name_ar}</div>
                    <div className="text-xs text-gray-400">{s.name_en}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">وقت العمل</div>
                    <div className="text-sm font-medium text-gray-700">{s.start_time} - {s.end_time}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">أوفرتايم/ساعة</div>
                    <div className="text-sm font-medium text-green-600">{s.ot_rate} ج.م</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditShift(s); setShowShiftModal(true) }}
                      className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100">
                      <Edit size={14}/>
                    </button>
                    <button onClick={() => deleteShift(s.id, fetchAll)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── LOCATION ─── */}
      {activeTab === 'location' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-blue-500"/> إعداد نطاق البصمة الجغرافي
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">اسم الموقع</label>
                <input value={locName} onChange={e => setLocName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-right"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Latitude (خط العرض)</label>
                  <input type="number" value={locLat} onChange={e => setLocLat(e.target.value)} step="0.000001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Longitude (خط الطول)</label>
                  <input type="number" value={locLng} onChange={e => setLocLng(e.target.value)} step="0.000001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نطاق السماح (متر)</label>
                <input type="number" value={locRadius} onChange={e => setLocRadius(e.target.value)} min="50" max="5000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
                <input type="range" min="50" max="2000" step="50" value={Math.min(parseInt(locRadius)||500, 2000)}
                  onChange={e => setLocRadius(e.target.value)} className="w-full mt-2 accent-blue-600"/>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>50م</span>
                  <span className="font-medium text-blue-600">{locRadius}م</span>
                  <span>2000م</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                💡 لمعرفة إحداثيات موقعك افتح Google Maps → اضغط على الموقع → انسخ الأرقام
              </div>
              <SaveBtn onClick={saveLocation}/>
            </div>
          </div>
        </div>
      )}

      {/* ─── SALARY ─── */}
      {activeTab === 'salary' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-blue-500"/> إعدادات حساب الرواتب
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">أيام العمل في الشهر</label>
                <input type="number" value={workDays} onChange={e => setWorkDays(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">خصم الدقيقة المتأخرة (ج.م)</label>
                <input type="number" value={lateDeduct} onChange={e => setLateDeduct(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">فترة السماح (دقيقة)</label>
                <input type="number" value={gracePeriod} onChange={e => setGracePeriod(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
              </div>
              <SaveBtn onClick={saveSalarySettings}/>
            </div>
          </div>
        </div>
      )}

      {/* ─── EMPLOYEES ─── */}
      {activeTab === 'employees' && (
        <div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 mb-4 w-64">
            <Search size={15} className="text-gray-400"/>
            <input type="text" placeholder="بحث..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none flex-1 text-right"/>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filtered.map(e => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                      ${e.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      {e.name_ar?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-700 text-sm">{e.name_ar}</div>
                      <div className="text-xs text-gray-400">{e.emp_code} · {e.role_ar || '--'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                      ${e.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.active ? 'نشط' : 'موقوف'}
                    </span>
                    <button onClick={() => handleToggle(e)}
                      className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100">
                      <Power size={15}/>
                    </button>
                    <button onClick={() => setConfirmId(e.id)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── COMPANY ─── */}
      {activeTab === 'company' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Building size={16} className="text-blue-500"/> بيانات الشركة
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">اسم الشركة</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="شركة ..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-right"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">العنوان</label>
                <input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)}
                  placeholder="المدينة، البلد"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-right"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">البريد الإلكتروني</label>
                <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)}
                  placeholder="hr@company.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">رقم الهاتف</label>
                <input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)}
                  placeholder="+20 1000000000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-right"/>
              </div>
              <SaveBtn onClick={saveCompany}/>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal تأكيد حذف موظف ─── */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-600"/>
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-5">
              هل أنت متأكد؟<br/>
              <span className="text-red-500 font-medium">لا يمكن التراجع!</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-medium">إلغاء</button>
              <button onClick={() => handleDelete(confirmId)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold">حذف نهائي</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal الشيفت ─── */}
      {showShiftModal && (
        <ShiftModal
          shift={editShift}
          onSave={async (data) => {
            if (editShift) {
              await supabase.from('shifts').update(data).eq('id', editShift.id)
            } else {
              await supabase.from('shifts').insert([data])
            }
            setShowShiftModal(false)
            setEditShift(null)
            fetchAll()
          }}
          onClose={() => { setShowShiftModal(false); setEditShift(null) }}
        />
      )}
    </div>
  )
}

// ─── Modal إضافة/تعديل شيفت ───
function ShiftModal({ shift, onSave, onClose }) {
  const [nameAr, setNameAr] = useState(shift?.name_ar   || '')
  const [nameEn, setNameEn] = useState(shift?.name_en   || '')
  const [start,  setStart]  = useState(shift?.start_time || '08:00')
  const [end,    setEnd]    = useState(shift?.end_time   || '16:00')
  const [otRate, setOtRate] = useState(shift?.ot_rate    || 50)

  async function handleSave() {
    if (!nameAr || !start || !end) return alert('أدخل اسم الشيفت وأوقاته')
    await onSave({
      name_ar: nameAr, name_en: nameEn,
      start_time: start, end_time: end,
      ot_rate: parseInt(otRate)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-blue-500"/>
            {shift ? 'تعديل شيفت' : 'إضافة شيفت جديد'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">الاسم (عربي) *</label>
              <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="صباحي"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-right"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name (English)</label>
              <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Morning"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">وقت البداية *</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">وقت النهاية *</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">سعر ساعة الأوفرتايم (ج.م)</label>
            <input type="number" value={otRate} onChange={e => setOtRate(e.target.value)} placeholder="50"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-600">إلغاء</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
            {shift ? 'حفظ التعديلات' : 'إضافة الشيفت'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── حذف شيفت ───
async function deleteShift(id, refresh) {
  if (!confirm('هل تريد حذف هذا الشيفت؟')) return
  const { error } = await supabase.from('shifts').delete().eq('id', id)
  if (error) return alert('لا يمكن حذف شيفت مرتبط بموظفين!')
  if (refresh) refresh()
}