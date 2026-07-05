'use client'
import { useEffect, useState } from 'react'
import { getEmployees, updateEmployee } from '@/lib/supabase'
import { Search, Eye, EyeOff, Save, Power } from 'lucide-react'

export default function UsersPage() {
  const [employees, setEmployees] = useState([])
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [passEdits, setPassEdits] = useState({})   // تعديلات كلمات المرور
  const [showPass,  setShowPass]  = useState({})   // إظهار/إخفاء كلمة المرور
  const [savingId,  setSavingId]  = useState(null)

  // ─── تحميل الموظفين ───
  async function load() {
    setLoading(true)
    try {
      const data = await getEmployees()
      setEmployees(data || [])
    } catch (e) {
      alert('خطأ في التحميل: ' + e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  // ─── حفظ كلمة مرور جديدة ───
  async function savePassword(emp) {
    const newPass = passEdits[emp.id]
    if (!newPass || newPass.length < 4) return alert('كلمة المرور لازم تكون 4 أحرف/أرقام على الأقل')
    setSavingId(emp.id)
    try {
      await updateEmployee(emp.id, { pass: newPass })
      setPassEdits(p => { const c = {...p}; delete c[emp.id]; return c })
      await load()
      alert('✅ تم تغيير كلمة المرور')
    } catch (e) {
      alert('خطأ: ' + e.message)
    } finally {
      setSavingId(null)
    }
  }

  // ─── تفعيل / إيقاف حساب ───
  async function toggleActive(emp) {
    if (!confirm(emp.active ? `إيقاف حساب ${emp.name_ar}؟ مش هيقدر يسجل دخول.` : `تفعيل حساب ${emp.name_ar}؟`)) return
    try {
      await updateEmployee(emp.id, { active: !emp.active })
      await load()
    } catch (e) {
      alert('خطأ: ' + e.message)
    }
  }

  const filtered = employees.filter(e =>
    (e.name_ar || '').includes(search) ||
    (e.emp_code || '').toString().includes(search)
  )

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">المستخدمون وحسابات الدخول</h1>
      </div>

      {/* حساب المدير */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-sm text-blue-900">
        <b>حساب المدير:</b> اسم المستخدم <b>admin</b> — لتغيير كلمة مرور المدير راجع إعدادات النظام.
        <br/>الجدول التالي لإدارة حسابات دخول الموظفين في تطبيق الموبايل.
      </div>

      {/* بحث */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-2.5 text-gray-300" size={18}/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الرقم الوظيفي..."
          className="w-full border border-gray-200 rounded-xl pr-10 pl-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-400 py-10">جارٍ التحميل...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-300 py-10">لا يوجد موظفون</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="py-3 px-4 text-right">الرقم الوظيفي</th>
                <th className="py-3 px-4 text-right">الاسم</th>
                <th className="py-3 px-4 text-right">الوظيفة</th>
                <th className="py-3 px-4 text-right">كلمة المرور</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-mono">{emp.emp_code}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">{emp.name_ar}</td>
                  <td className="py-3 px-4 text-gray-400">{emp.role_ar || '--'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type={showPass[emp.id] ? 'text' : 'password'}
                        value={passEdits[emp.id] ?? (emp.pass || '')}
                        onChange={e => setPassEdits(p => ({...p, [emp.id]: e.target.value}))}
                        className="border border-gray-200 rounded-lg px-2 py-1 w-28 text-sm focus:outline-none focus:border-blue-400"/>
                      <button onClick={() => setShowPass(p => ({...p, [emp.id]: !p[emp.id]}))}
                        className="text-gray-300 hover:text-gray-500">
                        {showPass[emp.id] ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                      {passEdits[emp.id] !== undefined && passEdits[emp.id] !== (emp.pass || '') && (
                        <button onClick={() => savePassword(emp)} disabled={savingId === emp.id}
                          className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-2 py-1 text-xs hover:bg-blue-700">
                          <Save size={13}/> {savingId === emp.id ? '...' : 'حفظ'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${emp.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {emp.active ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => toggleActive(emp)}
                      title={emp.active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                      className={`p-1.5 rounded-lg ${emp.active ? 'text-red-400 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}>
                      <Power size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        💡 كلمة المرور دي هي اللي الموظف بيدخل بيها على تطبيق الموبايل. الحساب الموقوف بيختفي من قائمة تسجيل الدخول في التطبيق.
      </p>
    </div>
  )
}