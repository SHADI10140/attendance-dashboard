import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── EMPLOYEES ───
export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(`*, departments(name_ar,name_en), shifts(name_ar,name_en,start_time,end_time)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addEmployee(emp) {
  const { data, error } = await supabase
    .from('employees').insert([emp]).select().single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, updates) {
  const { data, error } = await supabase
    .from('employees').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ─── ATTENDANCE ───
export async function getTodayAttendance() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('attendance')
    .select(`*, employees(name_ar, name_en, emp_code, shifts(name_ar, start_time, end_time))`)
    .eq('date', today)
  if (error) throw error
  return data
}

export async function getMonthAttendance(month, year) {
  const { data, error } = await supabase
    .from('attendance')
    .select(`*, employees(name_ar, name_en, emp_code)`)
    .gte('date', `${year}-${String(month).padStart(2,'0')}-01`)
    .lte('date', `${year}-${String(month).padStart(2,'0')}-31`)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function checkIn(employeeId, lat, lng) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('attendance')
    .upsert({
      employee_id: employeeId,
      date: today,
      check_in: new Date().toISOString(),
      check_in_lat: lat,
      check_in_lng: lng,
      status: 'present'
    }).select().single()
  if (error) throw error
  return data
}

export async function checkOut(employeeId, lat, lng) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out: new Date().toISOString(),
      check_out_lat: lat,
      check_out_lng: lng
    })
    .eq('employee_id', employeeId)
    .eq('date', today)
    .select().single()
  if (error) throw error
  return data
}

// ─── DEPARTMENTS & SHIFTS ───
export async function getDepartments() {
  const { data, error } = await supabase.from('departments').select('*')
  if (error) throw error
  return data
}

export async function getShifts() {
  const { data, error } = await supabase.from('shifts').select('*')
  if (error) throw error
  return data
}

// ─── ADJUSTMENTS ───
export async function getAdjustments(employeeId, month, year) {
  const { data, error } = await supabase
    .from('adjustments').select('*')
    .eq('employee_id', employeeId)
    .eq('month', month)
    .eq('year', year)
  if (error) throw error
  return data
}

export async function addAdjustment(adj) {
  const { data, error } = await supabase
    .from('adjustments').insert([adj]).select().single()
  if (error) throw error
  return data
}

export async function deleteAdjustment(id) {
  const { error } = await supabase.from('adjustments').delete().eq('id', id)
  if (error) throw error
}

// ─── PAYROLL ───
export async function getPayroll(month, year) {
  const { data, error } = await supabase
    .from('payroll')
    .select(`*, employees(name_ar, name_en, emp_code)`)
    .eq('month', month).eq('year', year)
  if (error) throw error
  return data
}

// ─── USERS ───
export async function getUsers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`*, employees(name_ar, name_en, emp_code)`)
  if (error) throw error
  return data
}

// ─── AUTH ───
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select(`*, employees(*)`)
    .eq('id', user.id).single()
  return { ...user, profile }
}

// ─── REALTIME ───
export function subscribeToAttendance(callback) {
  return supabase
    .channel('attendance-changes')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'attendance'
    }, callback)
    .subscribe()
}

// ─── LOCATION ───
export async function getDefaultLocation() {
  const { data, error } = await supabase
    .from('locations').select('*').eq('is_default', true).single()
  if (error) throw error
  return data
}

export async function updateLocation(id, updates) {
  const { data, error } = await supabase
    .from('locations').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}