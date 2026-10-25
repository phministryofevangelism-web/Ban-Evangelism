import React, { useState, useMemo } from 'react';
import { Prospect, Profile, ProspectLevel, ProgramType } from '../types';
import { appStore } from '../services/store';
import {
  Users,
  Search,
  Phone,
  BookOpen,
  ArrowUpRight,
  UserCheck,
  UserMinus,
  CheckCircle2,
  Clock,
  RotateCcw,
  GraduationCap,
  Download,
  History,
  Trash2,
  X,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronRight,
  MapPin,
  Sparkles,
  Layers,
  ArrowRight,
  Award,
  AlertCircle
} from 'lucide-react';

interface ProspectsPipelineViewProps {
  currentUser: Profile;
  initialLevelFilter?: string;
  onOpenUpgradeBBHapdang: (prospect: Prospect) => void;
  onOpenUpgradeTtagi: (prospect: Prospect) => void;
  onOpenLessonsTracker: (prospect: Prospect) => void;
  onOpenDropModal: (prospect: Prospect) => void;
  onOpenFollowUpModal: (prospect: Prospect) => void;
}

const PIPELINE_STAGES: {
  level: ProspectLevel;
  code: string;
  name: string;
  desc: string;
  accent: string;
  badgeBg: string;
}[] = [
  {
    level: 'Chatgi',
    code: '01',
    name: 'Chatgi',
    desc: 'Initial field intake & contact discovery',
    accent: 'border-t-amber-500',
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  {
    level: 'BB Hapdang',
    code: '02',
    name: 'BB Hapdang',
    desc: 'Orientation & introductory session',
    accent: 'border-t-sky-500',
    badgeBg: 'bg-sky-50 text-sky-900 border-sky-200',
  },
  {
    level: 'Ttagi',
    code: '03',
    name: 'Ttagi',
    desc: 'Pre-BB bridge & teacher matching',
    accent: 'border-t-purple-500',
    badgeBg: 'bg-purple-50 text-purple-900 border-purple-200',
  },
  {
    level: 'Soebweh',
    code: '04',
    name: 'Soebweh',
    desc: 'Foundational study fellowship (Lesson 1-2)',
    accent: 'border-t-teal-500',
    badgeBg: 'bg-teal-50 text-teal-900 border-teal-200',
  },
  {
    level: 'BB',
    code: '05',
    name: 'BB Course',
    desc: 'Core 10-lesson basic theology curriculum',
    accent: 'border-t-blue-600',
    badgeBg: 'bg-blue-50 text-blue-900 border-blue-200',
  },
  {
    level: 'Center Hapdang',
    code: '06',
    name: 'Center Hapdang',
    desc: '10 lessons verified & Center form interview',
    accent: 'border-t-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
  {
    level: 'Center',
    code: '07',
    name: 'Center Enrolled',
    desc: 'Officially admitted to Zion Theology Center',
    accent: 'border-t-green-700',
    badgeBg: 'bg-green-100 text-green-950 border-green-300 font-extrabold',
  },
];

export const ProspectsPipelineView: React.FC<ProspectsPipelineViewProps> = ({
  currentUser,
  initialLevelFilter = 'ALL',
  onOpenUpgradeBBHapdang,
  onOpenUpgradeTtagi,
  onOpenLessonsTracker,
  onOpenDropModal,
  onOpenFollowUpModal,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [levelFilter, setLevelFilter] = useState<string>(initialLevelFilter);
  const [programFilter, setProgramFilter] = useState<string>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'lessons' | 'name'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDroppedColumn, setShowDroppedColumn] = useState<boolean>(false);
  const [selectedAuditProspect, setSelectedAuditProspect] = useState<Prospect | null>(null);

  const isSuperAdmin = appStore.isSuperAdminOrAdmin();
  const visibleProspects = appStore.getVisibleProspects();

  // Compute live pipeline KPI stats
  const kpis = useMemo(() => {
    const total = visibleProspects.length;
    const active = visibleProspects.filter((p) => p.prospect_level !== 'BB Dropped').length;
    const inChatgi = visibleProspects.filter((p) => p.prospect_level === 'Chatgi').length;
    const inStudy = visibleProspects.filter((p) =>
      ['Ttagi', 'Soebweh', 'BB'].includes(p.prospect_level)
    ).length;
    const centerEnrolled = visibleProspects.filter((p) => p.prospect_level === 'Center').length;
    const dropped = visibleProspects.filter((p) => p.prospect_level === 'BB Dropped').length;
    const retentionRate = total > 0 ? Math.round((active / total) * 100) : 100;

    return {
      total,
      active,
      inChatgi,
      inStudy,
      centerEnrolled,
      dropped,
      retentionRate,
    };
  }, [visibleProspects]);

  // Filter and sort prospects
  const filtered = useMemo(() => {
    return visibleProspects
      .filter((p) => {
        // In Kanban view, if levelFilter is ALL, all stages show in columns. If specific, only that stage is visible.
        if (levelFilter !== 'ALL' && p.prospect_level !== levelFilter) {
          return false;
        }
        if (programFilter !== 'ALL' && p.program !== programFilter) {
          return false;
        }
        if (teacherFilter === 'ASSIGNED' && !p.assigned_bb_teacher_id) {
          return false;
        }
        if (teacherFilter === 'UNASSIGNED' && p.assigned_bb_teacher_id) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const ref = appStore.getProfileById(p.referred_by_member_id);
          const teacher = p.assigned_bb_teacher_id ? appStore.getProfileById(p.assigned_bb_teacher_id) : null;
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesPhone = p.contact_number.includes(q);
          const matchesCity = (p.city || '').toLowerCase().includes(q);
          const matchesProvince = p.province.toLowerCase().includes(q);
          const matchesRef = ref
            ? ref.name.toLowerCase().includes(q) ||
              ref.serial_number.toLowerCase().includes(q) ||
              (ref.referral_code || '').toLowerCase().includes(q)
            : false;
          const matchesTeacher = teacher ? teacher.name.toLowerCase().includes(q) : false;
          return matchesName || matchesPhone || matchesCity || matchesProvince || matchesRef || matchesTeacher;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'lessons') {
          const aLessons = appStore.getLessonsForProspect(a.id).length;
          const bLessons = appStore.getLessonsForProspect(b.id).length;
          return bLessons - aLessons;
        }
        return 0;
      });
  }, [visibleProspects, levelFilter, programFilter, teacherFilter, searchQuery, sortBy]);

  const handleExportCsv = () => {
    const csvContent = appStore.exportAuthorizedStudentsCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zion_students_pipeline_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSoftDelete = (prospect: Prospect) => {
    if (window.confirm(`Are you sure you want to soft-delete "${prospect.name}"? Only Super Admins can restore this record.`)) {
      appStore.softDeleteProspect(prospect.id);
    }
  };

  const handleRestore = (prospectId: string) => {
    if (window.confirm('Restore this dropped student back to the active pipeline?')) {
      appStore.restoreProspect(prospectId, 'Chatgi');
    }
  };

  const getLevelBadgeClass = (level: ProspectLevel) => {
    switch (level) {
      case 'Chatgi':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'BB Hapdang':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Ttagi':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Soebweh':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'BB':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Center Hapdang':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Center':
        return 'bg-green-100 text-green-950 border-green-300 font-extrabold';
      case 'BB Dropped':
        return 'bg-rose-50 text-rose-700 border-rose-200 line-through';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Render Student Card for Kanban or Compact display
  const renderStudentCard = (prospect: Prospect) => {
    const ref = appStore.getProfileById(prospect.referred_by_member_id);
    const teacher = prospect.assigned_bb_teacher_id ? appStore.getProfileById(prospect.assigned_bb_teacher_id) : null;
    const lessons = appStore.getLessonsForProspect(prospect.id);
    const lessonCount = lessons.length;
    const progressPercent = Math.min(100, Math.round((lessonCount / 10) * 100));
    const canCall = appStore.canCallOrTextProspect(prospect);
    const canUpgradeBB = appStore.canUpgradeToBBHapdang();
    const canUpgradeTtagi = appStore.canUpgradeToTtagi();
    const canApproveCenter = appStore.canApproveCenter();

    return (
      <div
        key={prospect.id}
        className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-3 group"
      >
        {/* Card Header: Student Name & Level / Program */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-extrabold text-slate-900 truncate tracking-tight">
                  {prospect.name}
                </h4>
                {prospect.gender && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({prospect.gender[0]})
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono tabular-nums text-slate-600 mt-0.5">
                {prospect.contact_number}
              </p>
            </div>

            {/* Program Type Chip */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                prospect.program === 'Online'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : prospect.program === 'Onsite'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {prospect.program || 'Pending'}
            </span>
          </div>

          {/* Location & Referrer Attribution */}
          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">
                {prospect.city ? `${prospect.city}, ` : ''}{prospect.province}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="text-[10px] text-slate-400 font-medium">Referred By:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                {ref ? ref.name : 'General Intake'}
              </span>
            </div>

            {/* BB Teacher info */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">BB Teacher:</span>
              {teacher ? (
                <span className="font-semibold text-teal-700 truncate max-w-[140px]">
                  {teacher.name}
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 italic font-medium">
                  Unassigned
                </span>
              )}
            </div>

            {/* Next Meeting Schedule if scheduled */}
            {prospect.next_meeting_schedule && (
              <div className="flex items-center gap-1.5 text-blue-700 font-medium bg-blue-50/70 p-1.5 rounded-lg text-[10px]">
                <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="truncate">
                  {new Date(prospect.next_meeting_schedule).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* BB Lesson Progress Meter (for Ttagi, Soebweh, BB, Center Hapdang, Center) */}
          {prospect.prospect_level !== 'Chatgi' && prospect.prospect_level !== 'BB Dropped' && (
            <div className="mt-2.5 bg-slate-50 rounded-xl p-2 border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-600">BB Curriculum</span>
                <span className="font-mono tabular-nums font-bold text-teal-700">
                  {lessonCount} / 10 Lessons
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {prospect.center_registration_completed && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold pt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Center Form Verified</span>
                </div>
              )}
            </div>
          )}

          {/* Dropped reason if dropped */}
          {prospect.prospect_level === 'BB Dropped' && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-700 space-y-0.5">
              <span className="font-bold block">Drop Reason:</span>
              <p className="line-clamp-2">{prospect.dropping_reason || 'No reason specified'}</p>
            </div>
          )}
        </div>

        {/* Card Footer: Contextual Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
          {/* Primary Next-Step Action Button */}
          {prospect.prospect_level === 'Chatgi' && canUpgradeBB && (
            <button
              onClick={() => onOpenUpgradeBBHapdang(prospect)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
            >
              <span>To BB Hapdang</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {prospect.prospect_level === 'BB Hapdang' && canUpgradeTtagi && (
            <button
              onClick={() => onOpenUpgradeTtagi(prospect)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
            >
              <UserCheck className="w-3 h-3" />
              <span>To Ttagi</span>
            </button>
          )}

          {prospect.prospect_level !== 'Chatgi' &&
            prospect.prospect_level !== 'Center' &&
            prospect.prospect_level !== 'BB Dropped' && (
              <button
                onClick={() => onOpenLessonsTracker(prospect)}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold transition-colors"
              >
                <BookOpen className="w-3 h-3 text-teal-600" />
                <span>Track Lessons</span>
              </button>
            )}

          {prospect.prospect_level === 'Center Hapdang' && canApproveCenter && (
            <button
              onClick={() => onOpenLessonsTracker(prospect)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Approve Center</span>
            </button>
          )}

          {prospect.prospect_level === 'Center' && (
            <span className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 text-green-900 border border-green-200 rounded-lg text-[11px] font-extrabold">
              <Award className="w-3.5 h-3.5 text-green-700" />
              <span>Enrolled Student</span>
            </span>
          )}

          {prospect.prospect_level === 'BB Dropped' && (
            <button
              onClick={() => handleRestore(prospect.id)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore</span>
            </button>
          )}

          {/* Quick Utility Icon Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Follow-up / Contact */}
            <button
              onClick={() => onOpenFollowUpModal(prospect)}
              title={canCall ? 'Call / Text / Log Follow-up' : 'View Follow-up History'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>

            {/* Audit History */}
            <button
              onClick={() => setSelectedAuditProspect(prospect)}
              title="View Stage Transition Audit History"
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
            </button>

            {/* Drop / Withdraw Button */}
            {prospect.prospect_level !== 'BB Dropped' && prospect.prospect_level !== 'Center' && (
              <button
                onClick={() => onOpenDropModal(prospect)}
                title="Mark Student as Dropped"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
              >
                <UserMinus className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Super Admin Soft Delete */}
            {isSuperAdmin && (
              <button
                onClick={() => handleSoftDelete(prospect)}
                title="Delete Student Record (Super Admin)"
                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Executive KPI Summary Strip */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 font-extrabold text-[11px] tracking-wide uppercase">
                Field Operations
              </span>
              <span className="text-xs text-slate-400 font-medium">Zion Christian Mission Center</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Evangelism Referral & Student Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track prospects through 7 sequential milestones from outreach referral to theology admission.
            </p>
          </div>

          {/* Action Tools & View Mode Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* View Mode Toggle */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                <span>Kanban Board</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5 text-blue-600" />
                <span>Spreadsheet View</span>
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Active Pipeline
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900">
                {kpis.active}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">students</span>
            </div>
          </div>

          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">
              Chatgi Intake
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono tabular-nums text-amber-950">
                {kpis.inChatgi}
              </span>
              <span className="text-[11px] text-amber-700 font-medium">leads</span>
            </div>
          </div>

          <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">
              In BB Study
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono tabular-nums text-blue-950">
                {kpis.inStudy}
              </span>
              <span className="text-[11px] text-blue-700 font-medium">taking lessons</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
              Center Enrolled
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono tabular-nums text-emerald-950">
                {kpis.centerEnrolled}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">admitted</span>
            </div>
          </div>

          <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 block">
              Dropped Out
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono tabular-nums text-rose-950">
                {kpis.dropped}
              </span>
              <span className="text-[11px] text-rose-700 font-medium">students</span>
            </div>
          </div>

          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 block">
              Pipeline Health
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono tabular-nums text-indigo-950">
                {kpis.retentionRate}%
              </span>
              <span className="text-[11px] text-indigo-700 font-medium">retention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Stage Filter Bar & Sorting */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, contact, city, referrer, or teacher..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Program Mode Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Mode:</span>
              {['ALL', 'Online', 'Onsite', 'SPS'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setProgramFilter(mode)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                    programFilter === mode
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'ALL' ? 'All' : mode}
                </button>
              ))}
            </div>

            {/* Teacher Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Teacher:</span>
              {(['ALL', 'ASSIGNED', 'UNASSIGNED'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTeacherFilter(opt)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                    teacherFilter === opt
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt === 'ALL' ? 'All' : opt === 'ASSIGNED' ? 'Assigned' : 'Unassigned'}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="lessons">Sort: Most Lessons Done</option>
              <option value="name">Sort: Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Stage Filter Chips */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: 'ALL', label: 'All Stages', count: visibleProspects.length },
              { id: 'Chatgi', label: 'Chatgi', count: kpis.inChatgi },
              {
                id: 'BB Hapdang',
                label: 'BB Hapdang',
                count: visibleProspects.filter((p) => p.prospect_level === 'BB Hapdang').length,
              },
              {
                id: 'Ttagi',
                label: 'Ttagi',
                count: visibleProspects.filter((p) => p.prospect_level === 'Ttagi').length,
              },
              {
                id: 'Soebweh',
                label: 'Soebweh',
                count: visibleProspects.filter((p) => p.prospect_level === 'Soebweh').length,
              },
              {
                id: 'BB',
                label: 'BB',
                count: visibleProspects.filter((p) => p.prospect_level === 'BB').length,
              },
              {
                id: 'Center Hapdang',
                label: 'Center Hapdang',
                count: visibleProspects.filter((p) => p.prospect_level === 'Center Hapdang').length,
              },
              { id: 'Center', label: 'Center', count: kpis.centerEnrolled },
              { id: 'BB Dropped', label: 'Dropped', count: kpis.dropped },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLevelFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  levelFilter === tab.id
                    ? 'bg-blue-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-md ${
                    levelFilter === tab.id
                      ? 'bg-blue-900/80 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium shrink-0">
            {viewMode === 'kanban' && (
              <button
                onClick={() => setShowDroppedColumn((v) => !v)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                  showDroppedColumn
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {showDroppedColumn ? 'Hide Dropped Column' : 'Show Dropped Column'}
              </button>
            )}

            <span>
              Showing <strong className="text-slate-900">{filtered.length}</strong> of{' '}
              {visibleProspects.length} students
            </span>
          </div>
        </div>
      </div>

      {/* Main View Area: Kanban Board or Spreadsheet Table */}
      {viewMode === 'kanban' ? (
        /* KANBAN PIPELINE VIEW */
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-4 min-w-[1280px]">
            {PIPELINE_STAGES.filter((st) => levelFilter === 'ALL' || levelFilter === st.level).map(
              (stage) => {
                const stageStudents = filtered.filter((p) => p.prospect_level === stage.level);

                return (
                  <div
                    key={stage.level}
                    className={`flex-1 min-w-[280px] max-w-[340px] bg-slate-50/90 rounded-3xl p-3.5 border border-slate-200/90 flex flex-col max-h-[800px] border-t-4 ${stage.accent}`}
                  >
                    {/* Stage Header */}
                    <div className="pb-3 border-b border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {stage.code}
                          </span>
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                            {stage.name}
                          </h3>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{stage.desc}</p>
                      </div>

                      <span className="font-mono tabular-nums text-xs font-black bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800 shadow-2xs">
                        {stageStudents.length}
                      </span>
                    </div>

                    {/* Stage Students List */}
                    <div className="py-3 space-y-3 overflow-y-auto flex-grow pr-1">
                      {stageStudents.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                          No students in this stage
                        </div>
                      ) : (
                        stageStudents.map((prospect) => renderStudentCard(prospect))
                      )}
                    </div>
                  </div>
                );
              }
            )}

            {/* Dropped Column (Optional in Kanban) */}
            {(showDroppedColumn || levelFilter === 'BB Dropped') && (
              <div className="flex-1 min-w-[280px] max-w-[340px] bg-rose-50/40 rounded-3xl p-3.5 border border-rose-200 flex flex-col max-h-[800px] border-t-4 border-t-rose-500">
                <div className="pb-3 border-b border-rose-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-rose-900 uppercase tracking-wide">
                      Dropped Students
                    </h3>
                    <p className="text-[10px] text-rose-600 mt-0.5">Withdrawn or lost contact</p>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-black bg-white px-2 py-0.5 rounded-lg border border-rose-200 text-rose-900 shadow-2xs">
                    {filtered.filter((p) => p.prospect_level === 'BB Dropped').length}
                  </span>
                </div>

                <div className="py-3 space-y-3 overflow-y-auto flex-grow pr-1">
                  {filtered.filter((p) => p.prospect_level === 'BB Dropped').length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-white/60 rounded-2xl border border-dashed border-rose-200">
                      No dropped students
                    </div>
                  ) : (
                    filtered
                      .filter((p) => p.prospect_level === 'BB Dropped')
                      .map((prospect) => renderStudentCard(prospect))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DENSE SPREADSHEET TABLE VIEW */
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700">No students found matching your criteria</p>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search query, stage filters, or program mode.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Student & Location</th>
                    <th className="py-3.5 px-3">Pipeline Stage</th>
                    <th className="py-3.5 px-3">Program & Schedule</th>
                    <th className="py-3.5 px-3">BB Teacher & Curriculum</th>
                    <th className="py-3.5 px-3">Referrer Attribution</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((prospect) => {
                    const ref = appStore.getProfileById(prospect.referred_by_member_id);
                    const teacher = prospect.assigned_bb_teacher_id
                      ? appStore.getProfileById(prospect.assigned_bb_teacher_id)
                      : null;
                    const lessons = appStore.getLessonsForProspect(prospect.id);
                    const canCall = appStore.canCallOrTextProspect(prospect);
                    const canUpgradeBB = appStore.canUpgradeToBBHapdang();
                    const canUpgradeTtagi = appStore.canUpgradeToTtagi();
                    const canApproveCenter = appStore.canApproveCenter();

                    return (
                      <tr key={prospect.id} className="hover:bg-blue-50/40 transition-colors group">
                        {/* Student Name & Contact */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 text-xs border border-slate-200">
                              {prospect.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {prospect.name}
                                </span>
                                {prospect.gender && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({prospect.gender})
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 font-mono text-[11px] mt-0.5 tabular-nums">
                                {prospect.contact_number}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {prospect.city ? `${prospect.city}, ` : ''}{prospect.province}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Stage Badge */}
                        <td className="py-3.5 px-3">
                          <div>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getLevelBadgeClass(
                                prospect.prospect_level
                              )}`}
                            >
                              {prospect.prospect_level}
                            </span>

                            {prospect.prospect_level === 'BB Dropped' && prospect.dropping_reason && (
                              <span className="block text-[10px] text-rose-600 font-semibold mt-1">
                                {prospect.dropping_reason}
                              </span>
                            )}

                            {prospect.center_registration_completed && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded mt-1 font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Form Done
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Program & Schedule */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800">
                              {prospect.program ? `${prospect.program} Study` : 'Not Assigned'}
                            </span>
                            {prospect.next_meeting_schedule && (
                              <div className="flex items-center gap-1 text-[11px] text-blue-700 font-medium">
                                <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>
                                  {new Date(prospect.next_meeting_schedule).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* BB Teacher & Lessons */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">
                                {teacher ? teacher.name : <span className="text-slate-400 italic">None</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono tabular-nums">
                                {lessons.length} / 10 Lessons
                              </span>
                              {prospect.prospect_level !== 'Chatgi' && prospect.prospect_level !== 'BB Dropped' && (
                                <button
                                  onClick={() => onOpenLessonsTracker(prospect)}
                                  title="Open BB Lesson Tracker"
                                  className="text-slate-400 hover:text-teal-700 p-0.5 hover:bg-slate-100 rounded"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Referrer Info */}
                        <td className="py-3.5 px-3">
                          <div>
                            <p className="font-bold text-slate-900">{ref ? ref.name : 'General Intake'}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                {ref ? ref.referral_code || ref.serial_number : 'HQ-DIRECT'}
                              </span>
                              {ref?.area && (
                                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[100px]">
                                  • {ref.area}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Reg: {new Date(prospect.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </td>

                        {/* Table Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => onOpenFollowUpModal(prospect)}
                              title={canCall ? 'Contact student' : 'View history'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>Contact</span>
                            </button>

                            {prospect.prospect_level === 'Chatgi' && canUpgradeBB && (
                              <button
                                onClick={() => onOpenUpgradeBBHapdang(prospect)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <span>To BB Hapdang</span>
                              </button>
                            )}

                            {prospect.prospect_level === 'BB Hapdang' && canUpgradeTtagi && (
                              <button
                                onClick={() => onOpenUpgradeTtagi(prospect)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-2xs transition-colors"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>To Ttagi</span>
                              </button>
                            )}

                            {prospect.prospect_level !== 'Chatgi' && prospect.prospect_level !== 'BB Dropped' && (
                              <button
                                onClick={() => onOpenLessonsTracker(prospect)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100 transition-colors"
                              >
                                <BookOpen className="w-3 h-3 text-teal-600" />
                                <span>Lessons</span>
                              </button>
                            )}

                            {prospect.prospect_level === 'Center Hapdang' && canApproveCenter && (
                              <button
                                onClick={() => onOpenLessonsTracker(prospect)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-green-700 text-white hover:bg-green-800 shadow-2xs transition-colors"
                              >
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Approve Center</span>
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedAuditProspect(prospect)}
                              title="Audit Trail"
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            {prospect.prospect_level !== 'BB Dropped' && prospect.prospect_level !== 'Center' && (
                              <button
                                onClick={() => onOpenDropModal(prospect)}
                                title="Record as Dropped"
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}

                            {prospect.prospect_level === 'BB Dropped' && (
                              <button
                                onClick={() => handleRestore(prospect.id)}
                                title="Restore to Pipeline"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            )}

                            {isSuperAdmin && (
                              <button
                                onClick={() => handleSoftDelete(prospect)}
                                title="Soft Delete"
                                className="text-slate-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Student Audit Trail Modal */}
      {selectedAuditProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-slate-900 max-h-[85vh] flex flex-col relative">
            <button
              onClick={() => setSelectedAuditProspect(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Student Audit History Log
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedAuditProspect.name} • {selectedAuditProspect.contact_number}
                </p>
              </div>
            </div>

            <div className="py-4 overflow-y-auto space-y-3 flex-grow pr-1">
              {appStore.getStatusHistoryForProspect(selectedAuditProspect.id).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No stage transitions logged yet for this student.
                </div>
              ) : (
                appStore.getStatusHistoryForProspect(selectedAuditProspect.id).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {log.from_level ? `${log.from_level} → ` : ''}
                        <span className="text-blue-700">{log.to_level}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {log.remarks && (
                      <p className="text-slate-600 text-[11px] leading-relaxed">{log.remarks}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedAuditProspect(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
