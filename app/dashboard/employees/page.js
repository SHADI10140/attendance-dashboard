'use client'
import { useEffect, useState } from 'react'
import { UserPlus, Search, Edit, Power, Download, X } from 'lucide-react'
import { getEmployees, getDepartments, getShifts, addEmployee, updateEmployee } from '@/lib/supabase'

function EmpModal({ emp, depts, shifts, onSave, onClose }) {
  const [form, setForm] = useState(emp || {
    emp_code:'', name_ar:'', name_en:'', role_ar:'', role_en:'',
    dept_id:'', shift_id:'', salary:'', ot_rate:50, bonus:0,
    phone:'', hire_date:'', username:'', pass:'1234', active:true
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function handleSave() {
    if (!form.name_ar || !form.emp_code || !form.salary)
      return alert('⚠️ أدخل الاسم والرقم الوظيفي والراتب')
    await onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-500" />
            {emp ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['emp_code','الرقم الوظيفي *','text','EMP-001'],
            ['name_ar','الاسم (عربي) *','text','أحمد محمد'],
            ['name_en','Name (English) *','text','Ahmed Mohamed'],
            ['role_ar','الوظيفة (عربي)','text','مهندس'],
            ['role_en','Role (English)','text','Engineer'],
            ['phone','رقم الهاتف','text','0100-000000'],
            ['salary','الراتب الأساسي *','number','5000'],
            ['ot_rate','سعر الأوفرتايم/ساعة','number','50'],
            ['bonus','مكافأة ثابتة','number','0'],
            ['hire_date','تاريخ التعيين','date',''],
            ['username','اسم المستخدم','text','ahmed.m'],
            ['pass','كلمة المرور','text','1234'],
          ].map(([key,label,type,ph])=>(
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input type={type} placeholder={ph} value={form[key]||''}
                onChange={e=>set(key,e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-right"/>
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-500 mb-1">القسم</label>
            <select value={form.dept_id||''} onChange={e=>set('dept_id',e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="">-- اختر القسم --</option>
              {depts.map(d=><option key={d.id} value={d.id}>{d.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">الشيفت</label>
            <select value={form.shift_id||''} onChange={e=>set('shift_id',e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="">-- اختر الشيفت --</option>
              {shifts.map(s=><option key={s.id} value={s.id}>{s.name_ar} ({s.start_time}-{s.end_time})</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">إلغاء</button>
          <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
            💾 حفظ الموظف
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [depts,     setDepts]     = useState([])
  const [shifts,    setShifts]    = useState([])
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editEmp,   setEditEmp]   = useState(null)
  const [loading,   setLoading]   = useState(true)

  async function fetchAll() {
    try {
      const [emps, deps, shs] = await Promise.all([
        getEmployees(), getDepartments(), getShifts()
      ])
      setEmployees(emps||[])
      setDepts(deps||[])
      setShifts(shs||[])
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ fetchAll() },[])

  async function handleSave(form) {
    try {
      if (editEmp) await updateEmployee(editEmp.id, { name_ar: form.name_ar, name_en: form.name_en, role_ar: form.role_ar, role_en: form.role_en, salary: form.salary, ot_rate: form.ot_rate, bonus: form.bonus, phone: form.phone, hire_date: form.hire_date, username: form.username, pass: form.pass, shift_id: form.shift_id || null, dept_id: form.dept_id || null })
      else await addEmployee(form)
      setShowModal(false)
      setEditEmp(null)
      fetchAll()
    } catch(e) {
      alert('خطأ: ' + e.message)
    }
  }

  async function handleToggle(emp) {
    await updateEmployee(emp.id, { active: !emp.active })
    fetchAll()
  }

  function exportCSV() {
    let csv = '\uFEFF'
    csv += 'الرقم الوظيفي,الاسم,الوظيفة,الراتب,الهاتف,الحالة\n'
    employees.forEach(e => {
      csv += `${e.emp_code},${e.name_ar},${e.role_ar||''},${e.salary},${e.phone||''},${e.active?'نشط':'موقوف'}\n`
    })
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download='employees.csv'; a.click()
  }

  const filtered = employees.filter(e =>
    e.name_ar?.includes(search) ||
    e.name_en?.toLowerCase().includes(search.toLowerCase()) ||
    e.emp_code?.includes(search)
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/>
    </div>
  )

  return (
    <div dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={15} className="text-gray-400"/>
          <input type="text" placeholder="بحث بالاسم أو الرقم..."
            value={search} onChange={e=>setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-48 text-right"/>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-blue-600 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50">
            <Download size={15}/> تصدير Excel
          </button>
          <button onClick={()=>{ setEditEmp(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
            <UserPlus size={15}/> إضافة موظف
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <div className="text-xl font-bold text-blue-600">{employees.length}</div>
          <div className="text-xs text-gray-400 mt-1">إجمالي الموظفين</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <div className="text-xl font-bold text-green-600">{employees.filter(e=>e.active).length}</div>
          <div className="text-xs text-gray-400 mt-1">نشط</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <div className="text-xl font-bold text-purple-600">
            {employees.reduce((s,e)=>s+(e.salary||0),0).toLocaleString()} ج.م
          </div>
          <div className="text-xs text-gray-400 mt-1">إجمالي الرواتب</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <span className="text-sm font-semibold text-gray-700">{filtered.length} موظف</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-gray-400 border-b border-gray-50 bg-gray-50/50">
                {['#','الموظف','الوظيفة','الشيفت','الراتب','الهاتف','الحالة','إجراءات'].map(h=>(
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-300 py-12 text-sm">
                    لا توجد بيانات — اضغط "إضافة موظف" للبدء
                  </td>
                </tr>
              ) : filtered.map((e,i) => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {e.name_ar?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">{e.name_ar}</div>
                        <div className="text-xs text-gray-400">{e.emp_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.role_ar||'--'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                      {e.shifts?.name_ar||'--'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {(e.salary||0).toLocaleString()} ج.م
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.phone||'--'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${e.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {e.active ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={()=>{ setEditEmp(e); setShowModal(true) }}
                        className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100" title="تعديل">
                        <Edit size={14}/>
                      </button>
                      <button onClick={()=>handleToggle(e)}
                        className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100" title="تفعيل/تعطيل">
                        <Power size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <EmpModal emp={editEmp} depts={depts} shifts={shifts}
          onSave={handleSave}
          onClose={()=>{ setShowModal(false); setEditEmp(null) }}/>
      )}
    </div>
  )
}