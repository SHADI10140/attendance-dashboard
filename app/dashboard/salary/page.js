'use client'
import { useEffect, useState } from 'react'
import { UserPlus, Trash2, Power, Key, X, Eye, EyeOff } from 'lucide-react'
import { getEmployees, supabase } from '@/lib/supabase'

// ─── جلب المستخدمين ───
async function getUsers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`*, employees(name_ar, name_en, emp_code)`)
  if (error) throw error
  return data || []
}

// ─── إنشاء مستخدم ───
async function createUser({ empId, username, pass, role, email }) {
  // إضافة في user_profiles مباشرة (بدون Auth في النسخة التجريبية)
  const { data, error } = await supabase
    .from('user_profiles')
    .insert([{
      employee_id: empId,
      username,
      role,
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Modal إضافة مستخدم ───
function UserModal({ employees, onSave, onClose }) {
  const [empId,    setEmpId]    = useState('')
  const [username, setUsername] = useState('')
  const [pass,     setPass]     = useState('1234')
  const [role,     setRole]     = useState('employee')
  const [email,    setEmail]    = useState('')
  const [showPass, setShowPass] = useState(false)

  async function handleSave() {
    if (!empId || !username) return alert('اختر موظف وأدخل اسم المستخدم')
    await onSave({ empId, username, pass, role, email })
  }

  // تعبئة اسم المستخدم تلقائياً
  function onEmpChange(id) {
    setEmpId(id)
    const emp = employees.find(e => e.id === id)
    if (emp) {
      const u = emp.name_en?.toLowerCase().replace(' ', '.') || emp.emp_code
      setUsername(u)
      setEmail(`${u}@company.com`)
    }
  }

  const roles = [
    { value: 'employee',   label: 'موظف',            color: 'bg-blue-100 text-blue-700' },
    { value: 'supervisor', label: 'مشرف',            color: 'bg-orange-100 text-orange-700' },
    { value: 'hr',         label: 'موارد بشرية',     color: 'bg-purple-100 text-purple-700' },
    { value: 'admin',      label: 'مدير',            color: 'bg-red-100 text-red-700' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-500"/> إنشاء مستخدم جديد
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">ربط بموظف *</label>
            <select value={empId} onChange={e => onEmpChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="">-- اختر موظف --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name_ar} ({e.emp_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">اسم المستخدم *</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="ahmed.m"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">كلمة المرور</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={pass}
                onChange={e => setPass(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 pr-10"/>
              <button onClick={() => setShowPass(!showPass)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">البريد الإلكتروني</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@company.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">الدور والصلاحيات</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <button key={r.value} onClick={() => setRole(r.value)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition-all
                    ${role === r.value ? 'border-blue-500 ' + r.color : 'border-gray-200 text-gray-500'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-600">إلغاء</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
            إنشاء المستخدم
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal تغيير كلمة المرور ───
function ResetPassModal({ user, onClose }) {
  const [newPass, setNewPass] = useState('')
  const [done,    setDone]    = useState(false)

  async function handleReset() {
    if (!newPass) return
    // تحديث في employees
    await supabase.from('employees')
      .update({ pass: newPass })
      .eq('id', user.employee_id)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Key size={18} className="text-orange-500"/> تغيير كلمة المرور
          </h3>
          <button onClick={onClose} className="text-gray-400"><X size={20}/></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          المستخدم: <strong>{user.employees?.name_ar}</strong>
        </p>
        <input type="text" placeholder="كلمة المرور الجديدة" value={newPass}
          onChange={e => setNewPass(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 mb-3"/>
        <button onClick={handleReset}
          className={`w-full py-2.5 rounded-xl text-sm font-bold ${done ? 'bg-green-600 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
          {done ? '✅ تم التغيير!' : 'تغيير كلمة المرور'}
        </button>
      </div>
    </div>
  )
}

// ─── الصفحة الرئيسية ───
export default function UsersPage() {
  const [users,      setUsers]      = useState([])
  const [employees,  setEmployees]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [resetUser,  setResetUser]  = useState(null)

  const roleMap = {
    admin:      { label: 'مدير',          color: 'bg-red-100 text-red-700' },
    hr:         { label: 'موارد بشرية',   color: 'bg-purple-100 text-purple-700' },
    supervisor: { label: 'مشرف',          color: 'bg-orange-100 text-orange-700' },
    employee:   { label: 'موظف',          color: 'bg-blue-100 text-blue-700' },
  }

  async function fetchAll() {
    try {
      const [u, e] = await Promise.all([getUsers(), getEmployees()])
      setUsers(u); setEmployees(e)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  async function handleSave(form) {
    try {
      await createUser(form)
      setShowModal(false)
      fetchAll()
    } catch(e) { alert('خطأ: ' + e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('هل تريد حذف هذا المستخدم؟')) return
    await supabase.from('user_profiles').delete().eq('id', id)
    fetchAll()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/>
    </div>
  )

  return (
    <div dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {Object.entries(roleMap).map(([role, { label, color }]) => (
          <div key={role} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-xl font-bold text-gray-700">
              {users.filter(u => u.role === role).length}
            </div>
            <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${color}`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-semibold text-gray-700">{users.length} مستخدم في النظام</span>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
          <UserPlus size={15}/> إنشاء مستخدم
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-gray-400 border-b border-gray-50 bg-gray-50/50">
                {['المستخدم','اسم المستخدم','الموظف','الدور','إجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-300 py-12">
                  لا توجد مستخدمين — اضغط "إنشاء مستخدم"
                </td></tr>
              ) : users.map(u => {
                const role = roleMap[u.role] || { label: u.role, color: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                          ${u.role === 'admin' ? 'bg-red-100 text-red-700' :
                            u.role === 'hr' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'}`}>
                          {u.employees?.name_ar?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-700 text-xs">{u.employees?.name_ar || 'مدير النظام'}</div>
                          <div className="text-xs text-gray-400">{u.employees?.emp_code || 'ADMIN'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{u.username || '--'}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.employees?.name_ar || '--'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${role.color}`}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setResetUser(u)}
                          className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100" title="تغيير كلمة المرور">
                          <Key size={14}/>
                        </button>
                        <button onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="حذف">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <UserModal employees={employees} onSave={handleSave} onClose={() => setShowModal(false)}/>
      )}
      {resetUser && (
        <ResetPassModal user={resetUser} onClose={() => { setResetUser(null); fetchAll() }}/>
      )}
    </div>
  )
}