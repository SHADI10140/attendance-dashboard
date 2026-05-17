'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Key, Fingerprint,
  PoundSterling, MapPin, BarChart2, Settings,
  Menu, X, LogOut, Clock
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',            icon: LayoutDashboard, labelAr: 'نظرة عامة',        labelEn: 'Overview' },
  { href: '/dashboard/employees',  icon: Users,           labelAr: 'الموظفون',           labelEn: 'Employees' },
  { href: '/dashboard/users',      icon: Key,             labelAr: 'المستخدمون',         labelEn: 'Users' },
  { href: '/dashboard/attendance', icon: Fingerprint,     labelAr: 'سجل الحضور',         labelEn: 'Attendance' },
  { href: '/dashboard/salary',     icon: PoundSterling,   labelAr: 'الرواتب',            labelEn: 'Payroll' },
  { href: '/dashboard/settings',   icon: Settings,        labelAr: 'الإعدادات',          labelEn: 'Settings' },
]

export default function DashboardLayout({ children }) {
  const [open, setOpen]   = useState(false)
  const [lang, setLang]   = useState('ar')
  const [time, setTime]   = useState('')
  const pathname          = usePathname()
  const router            = useRouter()

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const dir        = lang === 'ar' ? 'rtl' : 'ltr'
  const curPage    = NAV.find(n => n.href === pathname)
  const pageTitle  = curPage ? (lang === 'ar' ? curPage.labelAr : curPage.labelEn) : ''

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir={dir}>

      {/* Overlay موبايل */}
      {open && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`
        fixed top-0 ${lang==='ar'?'right-0':'left-0'} h-full w-56 bg-[#1a3c6e] text-white z-30
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : lang==='ar' ? 'translate-x-full' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-400/30 flex items-center justify-center">
              <Fingerprint size={18} className="text-blue-200" />
            </div>
            <div>
              <div className="text-sm font-bold">{lang==='ar'?'لوحة الإدارة':'Admin Panel'}</div>
              <div className="text-xs opacity-50">{lang==='ar'?'نظام الحضور':'Attendance System'}</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden opacity-60 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, labelAr, labelEn }) => {
            const active = pathname === href
            return (
              <button key={href} onClick={() => { router.push(href); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all
                  ${active ? 'bg-white/12 opacity-100 font-medium border-r-4 border-blue-300' : 'opacity-60 hover:opacity-90 hover:bg-white/6 border-r-4 border-transparent'}
                `}>
                <Icon size={17} className="flex-shrink-0" />
                <span>{lang === 'ar' ? labelAr : labelEn}</span>
              </button>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">م</div>
            <div>
              <div className="text-xs font-medium">{lang==='ar'?'المدير العام':'Admin'}</div>
              <div className="text-xs opacity-40">admin@company.com</div>
            </div>
          </div>
          <button onClick={() => router.push('/')}
            className="w-full flex items-center gap-2 text-xs text-red-300 hover:text-red-200 opacity-70 hover:opacity-100">
            <LogOut size={14} /> {lang==='ar'?'تسجيل الخروج':'Sign Out'}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* TopBar */}
        <header className="h-14 bg-white border-b border-gray-100 px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu size={20} className="text-gray-600" />
            </button>
            <h1 className="text-sm font-semibold text-gray-700">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={13} />
              <span className="font-mono">{time}</span>
            </div>
            {/* Language Toggle */}
            <div className="flex bg-gray-100 rounded-full p-0.5">
              <button onClick={() => setLang('ar')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang==='ar'?'bg-white text-blue-600 shadow-sm':'text-gray-400'}`}>
                ع
              </button>
              <button onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang==='en'?'bg-white text-blue-600 shadow-sm':'text-gray-400'}`}>
                EN
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}