'use client'
import { useEffect, useState } from 'react'
import { Users, UserCheck, Clock, UserX, ChevronRight, ChevronLeft, Calendar, FileText } from 'lucide-react'
import { getEmployees, supabase } from '@/lib/supabase'

// ─── أدوات التاريخ ───
const todayStr = () => new Date().toISOString().split('T')[0]
const firstOfMonth = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`
}
const fmtTime = t => t ? new Date(t).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--'
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function KpiCard({ icon: Icon, value, label, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}

export default function AttendancePage() {
  const [tab,        setTab]        = useState('day')       // day | report
  const [employees,  setEmployees]  = useState([])

  // ─── عرض يوم ───
  const [selDate,    setSelDate]    = useState(todayStr())
  const [dayAtt,     setDayAtt]     = useState([])
  const [dayLoading, setDayLoading] = useState(true)

  // ─── تقرير فترة ───
  const [fromDate,   setFromDate]   = useState(firstOfMonth())
  const [toDate,     setToDate]     = useState(todayStr())
  const [rangeAtt,   setRangeAtt]   = useState([])
  const [repLoading, setRepLoading] = useState(false)

  useEffect(() => { getEmployees().then(d => setEmployees(d || [])) }, [])

  // ─── جلب حضور اليوم المحدد ───
  useEffect(() => {
    setDayLoading(true)
    supabase.from('attendance').select('*').eq('date', selDate)
      .then(({ data }) => { setDayAtt(data || []); setDayLoading(false) })
  }, [selDate])

  // ─── جلب تقرير الفترة ───
  async function loadReport() {
    setRepLoading(true)
    const { data } = await supabase.from('attendance').select('*')
      .gte('date', fromDate).lte('date', toDate)
    setRangeAtt(data || [])
    setRepLoading(false)
  }
  useEffect(() => { if (tab === 'report') loadReport() }, [tab])

  // ─── تحريك اليوم ───
  function shiftDay(days) {
    const d = new Date(selDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelDate(d.toISOString().split('T')[0])
  }

  // ─── حسابات اليوم ───
  const presentCnt = dayAtt.filter(a => a.status === 'present').length
  const lateCnt    = dayAtt.filter(a => a.status === 'late').length
  const absentCnt  = employees.length - presentCnt - lateCnt

  // ─── صفوف التقرير ───
  const reportRows = employees.map(emp => {
    const recs = rangeAtt.filter(a => a.employee_id === emp.id)
    return {
      emp,
      present: recs.filter(r => r.status === 'present').length,
      late:    recs.filter(r => r.status === 'late').length,
      absent:  recs.filter(r => r.status === 'absent').length,
      hours:   recs.reduce((s, r) => s + (parseFloat(r.work_hours) || 0), 0),
    }
  })

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">سجل الحضور</h1>
        {/* التبويبات */}
        <div className="flex bg-gray-100 rounded-xl p-1 text-sm">
          <button onClick={() => setTab('day')}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 ${tab === 'day' ? 'bg-white shadow-sm font-bold text-blue-600' : 'text-gray-500'}`}>
            <Calendar size={15}/> عرض يوم
          </button>
          <button onClick={() => setTab('report')}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 ${tab === 'report' ? 'bg-white shadow-sm font-bold text-blue-600' : 'text-gray-500'}`}>
            <FileText size={15}/> تقرير فترة
          </button>
        </div>
      </div>

      {tab === 'day' && <>
        {/* اختيار التاريخ */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex items-center gap-3 flex-wrap">
          <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg hover:bg-gray-50 text-gray-400" title="اليوم السابق">
            <ChevronRight size={18}/>
          </button>
          <input type="date" value={selDate} max={todayStr()} onChange={e => setSelDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
          <button onClick={() => shiftDay(1)} disabled={selDate >= todayStr()}
            className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 disabled:opacity-30" title="اليوم التالي">
            <ChevronLeft size={18}/>
          </button>
          <button onClick={() => setSelDate(todayStr())}
            className="text-xs text-blue-600 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50">اليوم</button>
          <span className="text-sm font-medium text-gray-600 mr-auto">{fmtDate(selDate)}</span>
        </div>

        {/* كروت الإحصائيات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KpiCard icon={Users}     value={employees.length} label="إجمالي الموظفين" color="blue"/>
          <KpiCard icon={UserCheck} value={presentCnt}       label="حاضر"            color="green"/>
          <KpiCard icon={Clock}     value={lateCnt}          label="متأخر"           color="orange"/>
          <KpiCard icon={UserX}     value={absentCnt < 0 ? 0 : absentCnt} label="غائب / لم يسجل" color="red"/>
        </div>

        {/* جدول اليوم */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {dayLoading ? (
            <p className="text-center text-gray-400 py-10">جارٍ التحميل...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="py-3 px-4 text-right">الموظف</th>
                  <th className="py-3 px-4 text-center">حضور</th>
                  <th className="py-3 px-4 text-center">انصراف</th>
                  <th className="py-3 px-4 text-center">ساعات</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const rec = dayAtt.find(a => a.employee_id === emp.id)
                  return (
                    <tr key={emp.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{emp.name_ar}</div>
                        <div className="text-xs text-gray-400">{emp.emp_code}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-green-600">{fmtTime(rec?.check_in)}</td>
                      <td className="py-3 px-4 text-center font-bold text-red-500">{fmtTime(rec?.check_out)}</td>
                      <td className="py-3 px-4 text-center text-blue-600 font-bold">
                        {rec?.work_hours ? `${parseFloat(rec.work_hours).toFixed(1)}` : '--'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                          ${!rec ? 'bg-gray-100 text-gray-500' :
                            rec.status === 'present' ? 'bg-green-100 text-green-700' :
                            rec.status === 'late'    ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-600'}`}>
                          {!rec ? 'لم يسجل' : rec.status === 'present' ? 'حاضر' : rec.status === 'late' ? 'متأخر' : 'غائب'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </>}

      {tab === 'report' && <>
        {/* اختيار الفترة */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500">من</span>
          <input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
          <span className="text-sm text-gray-500">إلى</span>
          <input type="date" value={toDate} min={fromDate} max={todayStr()} onChange={e => setToDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
          <button onClick={loadReport}
            className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-blue-700">
            عرض التقرير
          </button>
        </div>

        {/* جدول التقرير */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {repLoading ? (
            <p className="text-center text-gray-400 py-10">جارٍ التحميل...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="py-3 px-4 text-right">الموظف</th>
                  <th className="py-3 px-4 text-center">أيام حضور</th>
                  <th className="py-3 px-4 text-center">أيام تأخير</th>
                  <th className="py-3 px-4 text-center">أيام غياب</th>
                  <th className="py-3 px-4 text-center">إجمالي الساعات</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map(({ emp, present, late, absent, hours }) => (
                  <tr key={emp.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{emp.name_ar}</div>
                      <div className="text-xs text-gray-400">{emp.emp_code} — {emp.role_ar || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-green-600">{present}</td>
                    <td className="py-3 px-4 text-center font-bold text-orange-500">{late}</td>
                    <td className="py-3 px-4 text-center font-bold text-red-500">{absent}</td>
                    <td className="py-3 px-4 text-center font-bold text-blue-600">{hours.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">💡 أيام الغياب = الأيام المسجلة بحالة "غائب" فقط. الأيام بدون أي تسجيل لا تُحتسب تلقائياً.</p>
      </>}
    </div>
  )
}