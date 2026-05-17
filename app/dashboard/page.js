'use client'
import { useEffect, useState } from 'react'
import { Users, UserCheck, Clock, UserX, RefreshCw, TrendingUp, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getEmployees, getTodayAttendance } from '@/lib/supabase'

const weekData = [
  { day: 'أحد',    rate: 88 },
  { day: 'اثنين',  rate: 92 },
  { day: 'ثلاثاء', rate: 75 },
  { day: 'أربعاء', rate: 90 },
  { day: 'خميس',  rate: 95 },
  { day: 'جمعة',  rate: 70 },
  { day: 'سبت',   rate: 85 },
]

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

export default function DashboardPage() {
  const [employees,  setEmployees]  = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  async function fetchData() {
    try {
      const [emps, att] = await Promise.all([
        getEmployees(),
        getTodayAttendance()
      ])
      setEmployees(emps  || [])
      setAttendance(att  || [])
      setLastUpdate(new Date())
    } catch(err) {
      console.error('خطأ:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const totalEmps   = employees.length
  const presentCnt  = attendance.filter(a => a.status === 'present').length
  const lateCnt     = attendance.filter(a => a.status === 'late').length
  const absentCnt   = Math.max(0, totalEmps - presentCnt - lateCnt)
  const totalSalary = employees.reduce((s, e) => s + (e.salary || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )

  return (
    <div className="space-y-5" dir="rtl">

      {/* شريط مباشر */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          <span className="text-sm text-green-700 font-medium">مباشر — يتحدث عند كل بصمة</span>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600">
          <RefreshCw size={12} /> {lastUpdate.toLocaleTimeString('ar-EG')}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users}     value={totalEmps}  label="إجمالي الموظفين" color="blue" />
        <KpiCard icon={UserCheck} value={presentCnt} label="حاضر اليوم"      color="green" />
        <KpiCard icon={Clock}     value={lateCnt}    label="متأخر اليوم"     color="orange" />
        <KpiCard icon={UserX}     value={absentCnt}  label="غائب اليوم"      color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" /> معدل الحضور الأسبوعي
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekData} barSize={24}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="rate" fill="#1a73e8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-green-500" /> ملخص الرواتب
          </h3>
          <div className="space-y-3 mt-2">
            <div className="flex justify-between text-sm py-2 border-b border-gray-50">
              <span className="text-gray-400">إجمالي الرواتب الأساسية</span>
              <span className="font-medium text-green-600">{totalSalary.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-gray-50">
              <span className="text-gray-400">عدد الموظفين النشطين</span>
              <span className="font-medium text-blue-600">{employees.filter(e => e.active).length}</span>
            </div>
            <div className="flex justify-between text-sm py-2 font-bold">
              <span>متوسط الراتب</span>
              <span className="text-blue-600">
                {totalEmps ? Math.round(totalSalary / totalEmps).toLocaleString() : 0} ج.م
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* جدول الحضور */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            سجل الحضور اليوم — {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-gray-400 border-b border-gray-50 bg-gray-50/50">
                <th className="px-4 py-3 font-medium">الموظف</th>
                <th className="px-4 py-3 font-medium">الشيفت</th>
                <th className="px-4 py-3 font-medium">حضور</th>
                <th className="px-4 py-3 font-medium">انصراف</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-300 py-10">
                    لا توجد سجلات حضور اليوم
                  </td>
                </tr>
              ) : attendance.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {a.employees?.name_ar?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">{a.employees?.name_ar}</div>
                        <div className="text-xs text-gray-400">{a.employees?.emp_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.employees?.shifts?.name_ar || '--'}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">
                    {a.check_in ? new Date(a.check_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </td>
                  <td className="px-4 py-3 text-red-500">
                    {a.check_out ? new Date(a.check_out).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                      ${a.status === 'present' ? 'bg-green-100 text-green-700' :
                        a.status === 'late'    ? 'bg-orange-100 text-orange-700' :
                                                  'bg-red-100 text-red-700'}`}>
                      {a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : 'غائب'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}