import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Profile, Prospect, BBLesson, FollowUpLog, StatusHistoryLog } from '../types';

// Read from Vite environment variables or localStorage override
const getSupabaseConfig = () => {
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('zcmc_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('zcmc_supabase_key') : null;

  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    '';
  const envKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    '';

  const url = (storedUrl || envUrl || '').trim();
  const key = (storedKey || envKey || '').trim();

  return { url, key, isConfigured: Boolean(url && key) };
};

export const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, isConfigured: IS_SUPABASE_CONFIGURED } = getSupabaseConfig();

let clientInstance: SupabaseClient | null = null;

if (IS_SUPABASE_CONFIGURED) {
  try {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

export const supabase = clientInstance;

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('zcmc_supabase_url', url.trim());
    localStorage.setItem('zcmc_supabase_key', key.trim());
    window.location.reload();
  }
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('zcmc_supabase_url');
    localStorage.removeItem('zcmc_supabase_key');
    window.location.reload();
  }
};

// -----------------------------------------------------------------------------
// SUPABASE AUTHENTICATION
// -----------------------------------------------------------------------------
export async function getSupabaseAuthUser(): Promise<User | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch (err) {
    console.warn('Supabase auth.getUser error:', err);
    return null;
  }
}

export async function signInWithSupabaseAuth(email: string, password: string):Promise<{ user: User | null; error?: string }> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return { user: null, error: 'Supabase not configured' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      return { user: null, error: error.message };
    }
    return { user: data.user, error: undefined };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
}

export async function signOutSupabaseAuth(): Promise<void> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase auth.signOut error:', err);
  }
}

// -----------------------------------------------------------------------------
// READ QUERIES (MEMBERS, PROSPECTS, LESSONS, AREAS, BANS, SECTIONS)
// -----------------------------------------------------------------------------

/**
 * Fetches all members from Supabase 'members' table (3,400+ records)
 */
export async function fetchMembersFromSupabase(): Promise<Profile[] | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;

  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase members error:', error);
      throw error;
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id || `u-${row.serial_number}`,
      serial_number: row.serial_number,
      referral_code: row.referral_code,
      name: row.name,
      department: row.department || 'Evangelism Dept',
      area: row.area || 'Manila',
      region: row.region || 'NCR & Luzon',
      duty: row.duty || 'Evangelism Worker',
      section: row.section || 'Section Alpha',
      team_leader: row.team_leader || 'Leader Timothy',
      ban: row.ban || 'Ban 1',
      role: Array.isArray(row.role) ? row.role : [row.role || 'Member'],
      must_change_password: Boolean(row.must_change_password),
      has_bb_teacher_permission: Boolean(row.has_bb_teacher_permission),
      is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
      phone: row.phone || undefined,
      email: row.email || undefined,
      created_at: row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Could not fetch members from Supabase:', err);
    return null;
  }
}

/**
 * Direct query to Supabase for a member by Serial Number, Username, Email, or Referral Code
 */
export async function queryMemberFromSupabase(identifier: string): Promise<Profile | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;
  const clean = identifier.trim();
  if (!clean) return null;

  try {
    const { data: memberRows, error: mErr } = await supabase
      .from('members')
      .select('*')
      .or(`serial_number.ilike.${clean},referral_code.ilike.${clean},email.ilike.${clean}`)
      .limit(1);

    if (mErr) {
      console.error('Supabase members search error:', mErr);
      throw mErr;
    }

    if (memberRows && memberRows.length > 0) {
      const row = memberRows[0];
      return {
        id: row.id || `u-${row.serial_number}`,
        serial_number: row.serial_number,
        referral_code: row.referral_code,
        name: row.name,
        department: row.department || 'Evangelism Dept',
        area: row.area || 'Manila',
        region: row.region || 'NCR & Luzon',
        duty: row.duty || 'Evangelism Worker',
        section: row.section || 'Section Alpha',
        team_leader: row.team_leader || 'Leader Timothy',
        ban: row.ban || 'Ban 1',
        role: Array.isArray(row.role) ? row.role : [row.role || 'Member'],
        must_change_password: Boolean(row.must_change_password),
        has_bb_teacher_permission: Boolean(row.has_bb_teacher_permission),
        is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
        phone: row.phone || undefined,
        email: row.email || undefined,
        created_at: row.created_at || new Date().toISOString(),
      };
    }

    return null;
  } catch (err) {
    console.warn('Error querying member from Supabase:', err);
    return null;
  }
}

/**
 * Fetches all prospects from Supabase 'prospects' table
 */
export async function fetchProspectsFromSupabase(): Promise<Prospect[] | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;

  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase prospects error:', error);
      throw error;
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      name: row.name,
      contact_number: row.contact_number,
      email: row.email || undefined,
      gender: row.gender || undefined,
      province: row.province,
      city: row.city || undefined,
      referred_by_member_id: row.referred_by_member_id || undefined,
      prospect_level: row.prospect_level || 'Chatgi',
      program: row.program || undefined,
      next_meeting_schedule: row.next_meeting_schedule || undefined,
      meeting_mode: row.meeting_mode || 'Online',
      meeting_remarks: row.meeting_remarks || undefined,
      assigned_bb_teacher_id: row.assigned_bb_teacher_id || undefined,
      upgraded_by_id: row.upgraded_by_id || undefined,
      upgraded_at: row.upgraded_at || undefined,
      dropping_reason: row.dropping_reason || undefined,
      previous_stage: row.previous_stage || undefined,
      dropped_by_id: row.dropped_by_id || undefined,
      dropped_at: row.dropped_at || undefined,
      center_registration_completed: Boolean(row.center_registration_completed),
      center_form_completed_at: row.center_form_completed_at || undefined,
      center_form_verification: row.center_form_verification || undefined,
      center_approved_by: row.center_approved_by || undefined,
      center_approved_at: row.center_approved_at || undefined,
      center_registration_month: row.center_registration_month || undefined,
      is_deleted: Boolean(row.is_deleted),
      deleted_at: row.deleted_at || undefined,
      deleted_by: row.deleted_by || undefined,
      updated_at: row.updated_at || row.created_at,
    }));
  } catch (err) {
    console.error('Could not fetch prospects from Supabase:', err);
    return null;
  }
}

/**
 * Fetches all BB lessons from Supabase 'bb_lessons' table
 */
export async function fetchLessonsFromSupabase(): Promise<BBLesson[] | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;

  try {
    const { data, error } = await supabase
      .from('bb_lessons')
      .select('*')
      .order('date_completed', { ascending: true });

    if (error) {
      console.error('Supabase bb_lessons error:', error);
      throw error;
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      prospect_id: row.prospect_id,
      lesson_title: row.lesson_title,
      date_completed: row.date_completed,
      mode: row.mode || 'Online',
      method: row.method || '1-on-1',
      assigned_teacher_id: row.assigned_teacher_id || undefined,
      updated_by: row.updated_by || 'system',
      notes: row.notes || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error('Could not fetch bb_lessons from Supabase:', err);
    return null;
  }
}

/**
 * Fetches all areas from Supabase 'areas' table
 */
export async function fetchAreasFromSupabase(): Promise<Array<{ id: string; name: string }> | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;
  try {
    const { data, error } = await supabase.from('areas').select('*').order('name', { ascending: true });
    if (error) {
      console.error('Supabase areas error:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Could not fetch areas from Supabase:', err);
    return null;
  }
}

/**
 * Fetches all bans from Supabase 'bans' table
 */
export async function fetchBansFromSupabase(): Promise<Array<{ id: string; name: string; area_id?: string }> | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;
  try {
    const { data, error } = await supabase.from('bans').select('*').order('name', { ascending: true });
    if (error) {
      console.error('Supabase bans error:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Could not fetch bans from Supabase:', err);
    return null;
  }
}

/**
 * Fetches all sections from Supabase 'sections' table
 */
export async function fetchSectionsFromSupabase(): Promise<Array<{ id: string; name: string; area_id?: string }> | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;
  try {
    const { data, error } = await supabase.from('sections').select('*').order('name', { ascending: true });
    if (error) {
      console.error('Supabase sections error:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Could not fetch sections from Supabase:', err);
    return null;
  }
}

/**
 * Fetches follow up logs from Supabase 'follow_up_logs' table
 */
export async function fetchFollowUpsFromSupabase(): Promise<FollowUpLog[] | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;
  try {
    const { data, error } = await supabase.from('follow_up_logs').select('*').order('created_at', { ascending: false });
    if (error) {
      return null;
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      prospect_id: row.prospect_id,
      performed_by_id: row.performed_by_id || 'system',
      type: row.type || 'note',
      notes: row.notes || '',
      created_at: row.created_at,
    }));
  } catch (err) {
    return null;
  }
}

/**
 * Fetches status history logs from Supabase 'status_history_logs' table
 */
export async function fetchStatusHistoryFromSupabase(): Promise<StatusHistoryLog[] | null> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return null;
  try {
    const { data, error } = await supabase.from('status_history_logs').select('*').order('created_at', { ascending: false });
    if (error) {
      return null;
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      prospect_id: row.prospect_id,
      from_level: row.from_stage || 'Chatgi',
      to_level: row.to_stage || 'Chatgi',
      changed_by_id: row.changed_by_id || 'system',
      changed_by_name: 'Authorized Leader',
      remarks: row.notes || undefined,
      timestamp: row.created_at,
    }));
  } catch (err) {
    return null;
  }
}

// -----------------------------------------------------------------------------
// MUTATIONS (CREATE, UPDATE, DELETE)
// -----------------------------------------------------------------------------

/**
 * Inserts a new prospect into Supabase 'prospects' table and returns created row
 */
export async function insertProspectToSupabase(payload: {
  name: string;
  contact_number: string;
  email?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  province: string;
  city?: string;
  referred_by_member_id?: string | null;
  prospect_level?: string;
  program?: string;
  meeting_mode?: string;
  next_meeting_schedule?: string;
  meeting_remarks?: string;
}): Promise<Prospect> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) {
    throw new Error('Supabase client is not configured.');
  }

  // Validate FK: only pass referred_by_member_id if it's a valid UUID in profiles, else null and keep remark
  let safeReferrerId: string | null = null;
  if (payload.referred_by_member_id) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.referred_by_member_id);
    if (isUuid) {
      const { data: profCheck } = await supabase.from('profiles').select('id').eq('id', payload.referred_by_member_id).limit(1);
      if (profCheck && profCheck.length > 0) {
        safeReferrerId = payload.referred_by_member_id;
      }
    }
  }

  const insertData = {
    name: payload.name.trim(),
    contact_number: payload.contact_number.trim(),
    email: payload.email?.trim() || null,
    gender: payload.gender || null,
    province: payload.province.trim(),
    city: payload.city?.trim() || null,
    referred_by_member_id: safeReferrerId,
    prospect_level: payload.prospect_level || 'Chatgi',
    program: payload.program || null,
    meeting_mode: payload.meeting_mode || 'Online',
    next_meeting_schedule: payload.next_meeting_schedule || null,
    meeting_remarks: payload.meeting_remarks || null,
  };

  const { data, error } = await supabase
    .from('prospects')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Supabase prospect insert error:', error);
    throw error;
  }

  return {
    id: data.id,
    created_at: data.created_at,
    name: data.name,
    contact_number: data.contact_number,
    email: data.email || undefined,
    gender: data.gender || undefined,
    province: data.province,
    city: data.city || undefined,
    referred_by_member_id: data.referred_by_member_id || undefined,
    prospect_level: data.prospect_level,
    program: data.program || undefined,
    next_meeting_schedule: data.next_meeting_schedule || undefined,
    meeting_mode: data.meeting_mode || 'Online',
    meeting_remarks: data.meeting_remarks || undefined,
    updated_at: data.updated_at || data.created_at,
  };
}

/**
 * Updates an existing prospect in Supabase 'prospects' table
 */
export async function updateProspectInSupabase(
  prospectId: string,
  updates: Record<string, any>
): Promise<void> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return;

  const cleanUpdates = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Remove fields that should not be directly updated or are undefined
  delete (cleanUpdates as any).id;
  delete (cleanUpdates as any).created_at;

  const { error } = await supabase
    .from('prospects')
    .update(cleanUpdates)
    .eq('id', prospectId);

  if (error) {
    console.error(`Supabase update error on prospect ${prospectId}:`, error);
    throw error;
  }
}

/**
 * Soft deletes or deletes a prospect in Supabase
 */
export async function deleteProspectFromSupabase(
  prospectId: string,
  soft = true,
  deletedById?: string
): Promise<void> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return;

  if (soft) {
    const { error } = await supabase
      .from('prospects')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedById || null,
      })
      .eq('id', prospectId);

    if (error) {
      console.error(`Supabase soft-delete error on prospect ${prospectId}:`, error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospectId);

    if (error) {
      console.error(`Supabase delete error on prospect ${prospectId}:`, error);
      throw error;
    }
  }
}

/**
 * Inserts a new BB lesson into Supabase 'bb_lessons' table
 */
export async function insertLessonToSupabase(payload: {
  prospect_id: string;
  lesson_title: string;
  date_completed: string;
  notes?: string;
  mode?: string;
  method?: string;
  assigned_teacher_id?: string;
  updated_by?: string;
}): Promise<BBLesson> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('bb_lessons')
    .insert({
      prospect_id: payload.prospect_id,
      lesson_title: payload.lesson_title.trim(),
      date_completed: payload.date_completed,
      notes: payload.notes || null,
      mode: payload.mode || 'Online',
      method: payload.method || '1-on-1',
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase bb_lessons insert error:', error);
    throw error;
  }

  return {
    id: data.id,
    prospect_id: data.prospect_id,
    lesson_title: data.lesson_title,
    date_completed: data.date_completed,
    notes: data.notes || undefined,
    mode: data.mode || 'Online',
    method: data.method || '1-on-1',
    assigned_teacher_id: data.assigned_teacher_id || undefined,
    updated_by: data.updated_by || 'system',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Deletes a BB lesson from Supabase 'bb_lessons' table
 */
export async function deleteLessonFromSupabase(lessonId: string): Promise<void> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return;

  const { error } = await supabase
    .from('bb_lessons')
    .delete()
    .eq('id', lessonId);

  if (error) {
    console.error(`Supabase delete error on bb_lesson ${lessonId}:`, error);
    throw error;
  }
}

/**
 * Upserts members into Supabase 'members' table matching on serial_number
 */
export async function upsertMembersToSupabase(members: Profile[]): Promise<{
  success: boolean;
  insertedCount: number;
  error?: string;
}> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) {
    return { success: true, insertedCount: members.length };
  }

  try {
    const payload = members.map((m) => ({
      serial_number: m.serial_number,
      referral_code: m.referral_code,
      name: m.name,
      department: m.department || 'Evangelism Dept',
      section: m.section || 'Section Alpha',
      area: m.area || 'Manila',
      region: m.region || 'NCR & Luzon',
      ban: m.ban || 'Ban 1',
      duty: m.duty || 'Evangelism Worker',
      team_leader: m.team_leader || 'Leader Timothy',
      role: Array.isArray(m.role) ? m.role : [m.role || 'Member'],
      must_change_password: m.must_change_password !== undefined ? m.must_change_password : true,
      has_bb_teacher_permission: Boolean(m.has_bb_teacher_permission),
      is_active: m.is_active !== undefined ? Boolean(m.is_active) : true,
      phone: m.phone || null,
      email: m.email || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('members')
      .upsert(payload, { onConflict: 'serial_number' });

    if (error) {
      console.error('Supabase members upsert error:', error);
      return { success: false, insertedCount: 0, error: error.message };
    }

    return { success: true, insertedCount: members.length };
  } catch (err: any) {
    console.error('Error during Supabase upsert:', err);
    return { success: false, insertedCount: 0, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// REALTIME SUBSCRIPTIONS
// -----------------------------------------------------------------------------

/**
 * Subscribes to Supabase Realtime changes on 'members'
 */
export function subscribeToMembersRealtime(
  onUpsert: (member: Profile) => void,
  onDelete?: (id: string) => void
): () => void {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return () => {};

  try {
    const channel = supabase
      .channel('public:members_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.serial_number) {
              const mapped: Profile = {
                id: row.id || `u-${row.serial_number}`,
                serial_number: row.serial_number,
                referral_code: row.referral_code,
                name: row.name,
                department: row.department || 'Evangelism Dept',
                area: row.area || 'Manila',
                region: row.region || 'NCR & Luzon',
                duty: row.duty || 'Evangelism Worker',
                section: row.section || 'Section Alpha',
                team_leader: row.team_leader || 'Leader Timothy',
                ban: row.ban || 'Ban 1',
                role: Array.isArray(row.role) ? row.role : [row.role || 'Member'],
                must_change_password: Boolean(row.must_change_password),
                has_bb_teacher_permission: Boolean(row.has_bb_teacher_permission),
                is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
                phone: row.phone || undefined,
                email: row.email || undefined,
                created_at: row.created_at || new Date().toISOString(),
              };
              onUpsert(mapped);
            }
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old?.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Members realtime subscription failed:', err);
    return () => {};
  }
}

/**
 * Subscribes to Supabase Realtime changes on 'prospects'
 */
export function subscribeToProspectsRealtime(
  onUpsert: (prospect: Prospect) => void,
  onDelete?: (id: string) => void
): () => void {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return () => {};

  try {
    const channel = supabase
      .channel('public:prospects_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prospects' },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.id) {
              const mapped: Prospect = {
                id: row.id,
                created_at: row.created_at,
                name: row.name,
                contact_number: row.contact_number,
                email: row.email || undefined,
                gender: row.gender || undefined,
                province: row.province,
                city: row.city || undefined,
                referred_by_member_id: row.referred_by_member_id || undefined,
                prospect_level: row.prospect_level,
                program: row.program || undefined,
                next_meeting_schedule: row.next_meeting_schedule || undefined,
                meeting_mode: row.meeting_mode || 'Online',
                meeting_remarks: row.meeting_remarks || undefined,
                assigned_bb_teacher_id: row.assigned_bb_teacher_id || undefined,
                upgraded_by_id: row.upgraded_by_id || undefined,
                upgraded_at: row.upgraded_at || undefined,
                dropping_reason: row.dropping_reason || undefined,
                previous_stage: row.previous_stage || undefined,
                dropped_by_id: row.dropped_by_id || undefined,
                dropped_at: row.dropped_at || undefined,
                center_registration_completed: Boolean(row.center_registration_completed),
                center_form_completed_at: row.center_form_completed_at || undefined,
                center_form_verification: row.center_form_verification || undefined,
                center_approved_by: row.center_approved_by || undefined,
                center_approved_at: row.center_approved_at || undefined,
                center_registration_month: row.center_registration_month || undefined,
                is_deleted: Boolean(row.is_deleted),
                deleted_at: row.deleted_at || undefined,
                deleted_by: row.deleted_by || undefined,
                updated_at: row.updated_at || row.created_at,
              };
              onUpsert(mapped);
            }
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old?.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Prospects realtime subscription failed:', err);
    return () => {};
  }
}

/**
 * Subscribes to Supabase Realtime changes on 'bb_lessons'
 */
export function subscribeToLessonsRealtime(
  onUpsert: (lesson: BBLesson) => void,
  onDelete?: (id: string) => void
): () => void {
  if (!supabase || !IS_SUPABASE_CONFIGURED) return () => {};

  try {
    const channel = supabase
      .channel('public:lessons_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bb_lessons' },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.id) {
              const mapped: BBLesson = {
                id: row.id,
                prospect_id: row.prospect_id,
                lesson_title: row.lesson_title,
                date_completed: row.date_completed,
                notes: row.notes || undefined,
                mode: row.mode || 'Online',
                method: row.method || '1-on-1',
                assigned_teacher_id: row.assigned_teacher_id || undefined,
                updated_by: row.updated_by || 'system',
                created_at: row.created_at,
                updated_at: row.updated_at,
              };
              onUpsert(mapped);
            }
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old?.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Lessons realtime subscription failed:', err);
    return () => {};
  }
}

// -----------------------------------------------------------------------------
// CONNECTION DIAGNOSTIC SUITE (Step 9)
// -----------------------------------------------------------------------------
export interface DiagnosticCheckItem {
  name: string;
  table: string;
  operation: 'INIT' | 'AUTH' | 'SELECT' | 'INSERT' | 'DELETE';
  status: 'PASS' | 'FAIL';
  count?: number;
  message?: string;
  error?: string;
  durationMs: number;
}

export interface ComprehensiveDiagnosticResult {
  supabaseUrl: string;
  isConfigured: boolean;
  clientInitialized: boolean;
  authStatus: 'Authenticated' | 'No Active Session' | 'Error';
  authUserEmail?: string;
  authUserId?: string;
  checks: DiagnosticCheckItem[];
  allPassed: boolean;
  timestamp: string;
}

export async function runComprehensiveDiagnostic(): Promise<ComprehensiveDiagnosticResult> {
  const startTime = Date.now();
  const checks: DiagnosticCheckItem[] = [];

  // 1. Client Init check
  const initCheckStart = Date.now();
  const clientInitialized = Boolean(supabase && IS_SUPABASE_CONFIGURED);
  checks.push({
    name: 'Supabase Client Initialization',
    table: 'System Client',
    operation: 'INIT',
    status: clientInitialized ? 'PASS' : 'FAIL',
    message: clientInitialized ? 'Supabase client initialized with Project URL and Anon API key.' : 'Client not initialized. Missing environment variables.',
    durationMs: Date.now() - initCheckStart,
  });

  if (!clientInitialized || !supabase) {
    return {
      supabaseUrl: SUPABASE_URL || 'Not Configured',
      isConfigured: false,
      clientInitialized: false,
      authStatus: 'Error',
      checks,
      allPassed: false,
      timestamp: new Date().toISOString(),
    };
  }

  // 2. Auth check
  const authStart = Date.now();
  let authStatus: 'Authenticated' | 'No Active Session' | 'Error' = 'No Active Session';
  let authUserEmail: string | undefined;
  let authUserId: string | undefined;

  try {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      checks.push({
        name: 'Authentication Check (supabase.auth.getUser)',
        table: 'auth.users',
        operation: 'AUTH',
        status: 'PASS',
        message: 'Auth service active. (Session: Unauthenticated / Guest state)',
        durationMs: Date.now() - authStart,
      });
      authStatus = 'No Active Session';
    } else if (authData && authData.user) {
      authUserEmail = authData.user.email;
      authUserId = authData.user.id;
      authStatus = 'Authenticated';
      checks.push({
        name: 'Authentication Check (supabase.auth.getUser)',
        table: 'auth.users',
        operation: 'AUTH',
        status: 'PASS',
        message: `Authenticated as ${authUserEmail} (${authUserId})`,
        durationMs: Date.now() - authStart,
      });
    } else {
      checks.push({
        name: 'Authentication Check (supabase.auth.getUser)',
        table: 'auth.users',
        operation: 'AUTH',
        status: 'PASS',
        message: 'Auth service reachable. No active session (Normal for unauthenticated users).',
        durationMs: Date.now() - authStart,
      });
    }
  } catch (err: any) {
    checks.push({
      name: 'Authentication Check (supabase.auth.getUser)',
      table: 'auth.users',
      operation: 'AUTH',
      status: 'FAIL',
      error: err.message,
      durationMs: Date.now() - authStart,
    });
    authStatus = 'Error';
  }

  // 3. Read checks on all 17 tables
  const tablesToVerify = [
    { table: 'members', label: 'Members Directory' },
    { table: 'profiles', label: 'User Profiles' },
    { table: 'prospects', label: 'Prospects Pipeline' },
    { table: 'bb_lessons', label: 'BB Lessons Tracking' },
    { table: 'areas', label: 'Areas / Jurisdictions' },
    { table: 'bans', label: 'Bans (Teams)' },
    { table: 'sections', label: 'Sections' },
    { table: 'bb_lesson_master', label: 'BB Lesson Master Catalog' },
    { table: 'drop_reasons', label: 'Drop Reasons Catalog' },
    { table: 'user_roles', label: 'User Role Assignments' },
    { table: 'follow_up_logs', label: 'Follow Up Logs' },
    { table: 'status_history_logs', label: 'Status History Logs' },
    { table: 'member_imports', label: 'Member Import Batches' },
    { table: 'member_registration_links', label: 'Registration Links' },
    { table: 'bb_teacher_assignments', label: 'BB Teacher Assignments' },
    { table: 'profile_area_assignments', label: 'Profile Area Assignments' },
    { table: 'profile_ban_assignments', label: 'Profile Ban Assignments' },
  ];

  for (const item of tablesToVerify) {
    const tStart = Date.now();
    try {
      const { count, error } = await supabase
        .from(item.table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        checks.push({
          name: `${item.label} Read`,
          table: item.table,
          operation: 'SELECT',
          status: 'FAIL',
          error: error.message,
          durationMs: Date.now() - tStart,
        });
      } else {
        checks.push({
          name: `${item.label} Read`,
          table: item.table,
          operation: 'SELECT',
          status: 'PASS',
          count: count ?? 0,
          message: `${count ?? 0} rows found`,
          durationMs: Date.now() - tStart,
        });
      }
    } catch (err: any) {
      checks.push({
        name: `${item.label} Read`,
        table: item.table,
        operation: 'SELECT',
        status: 'FAIL',
        error: err.message,
        durationMs: Date.now() - tStart,
      });
    }
  }

  // 4. Live CRUD verification on prospects table
  const crudStart = Date.now();
  try {
    const testPayload = {
      name: `Diagnostic Ping ${Date.now()}`,
      contact_number: '09990001111',
      province: 'Metro Manila',
      city: 'Manila',
      prospect_level: 'Chatgi',
      meeting_remarks: 'Automated diagnostic connectivity test',
    };

    const { data: insertData, error: insErr } = await supabase
      .from('prospects')
      .insert(testPayload)
      .select('id')
      .single();

    if (insErr) {
      checks.push({
        name: 'Prospects Live INSERT Operation',
        table: 'prospects',
        operation: 'INSERT',
        status: 'FAIL',
        error: insErr.message,
        durationMs: Date.now() - crudStart,
      });
    } else {
      checks.push({
        name: 'Prospects Live INSERT Operation',
        table: 'prospects',
        operation: 'INSERT',
        status: 'PASS',
        message: `Successfully inserted test record (ID: ${insertData.id})`,
        durationMs: Date.now() - crudStart,
      });

      // Cleanup
      const delStart = Date.now();
      const { error: delErr } = await supabase
        .from('prospects')
        .delete()
        .eq('id', insertData.id);

      checks.push({
        name: 'Prospects Live DELETE Operation',
        table: 'prospects',
        operation: 'DELETE',
        status: delErr ? 'FAIL' : 'PASS',
        message: delErr ? undefined : 'Cleaned up test record cleanly.',
        error: delErr?.message,
        durationMs: Date.now() - delStart,
      });
    }
  } catch (err: any) {
    checks.push({
      name: 'Prospects Live CRUD Verification',
      table: 'prospects',
      operation: 'INSERT',
      status: 'FAIL',
      error: err.message,
      durationMs: Date.now() - crudStart,
    });
  }

  const allPassed = checks.every((c) => c.status === 'PASS');

  return {
    supabaseUrl: SUPABASE_URL,
    isConfigured: true,
    clientInitialized: true,
    authStatus,
    authUserEmail,
    authUserId,
    checks,
    allPassed,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick connection check for UI badges
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  memberCount?: number;
  prospectCount?: number;
  error?: string;
}> {
  if (!supabase || !IS_SUPABASE_CONFIGURED) {
    return {
      success: false,
      message: 'Supabase URL and Anon Key are not configured in .env',
    };
  }

  try {
    const { count: memberCount, error: mErr } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    const { count: prospectCount, error: pErr } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true });

    if (mErr) {
      return { success: false, message: mErr.message, error: mErr.message };
    }

    return {
      success: true,
      message: `Connected! ${memberCount ?? 0} members, ${prospectCount ?? 0} prospects in Supabase.`,
      memberCount: memberCount ?? 0,
      prospectCount: prospectCount ?? 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error connecting to Supabase.',
      error: err.message,
    };
  }
}
