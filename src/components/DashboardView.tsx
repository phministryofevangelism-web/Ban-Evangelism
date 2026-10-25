import React, { useState, useEffect } from 'react';
import { Profile, PipelineSummary, Prospect } from '../types';
import { appStore } from '../services/store';
import {
  Calendar,
  Clock,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Users,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  Share2,
  FileSpreadsheet,
  QrCode,
  MapPin,
  CheckCircle2,
  Download,
  Trash2,
  AlertTriangle,
  X,
  BookOpen,
  UserCheck,
  GraduationCap,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: Profile;
  onNavigateToProspects: (filterLevel?: string) => void;
  onNavigateToRegister: (refCode?: string) => void;
  onOpenCsvImport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onNavigateToProspects,
  onNavigateToRegister,
  onOpenCsvImport,
}) => {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [asOfTimestamp, setAsOfTimestamp] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharedToast, setSharedToast] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Compute live timestamp including timezone
  const updateTimestamp = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setAsOfTimestamp(`${dateStr}, ${timeStr}`);
  };

  useEffect(() => {
    updateTimestamp();
  }, [dateFilter, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      return { start, end };
    }
    if (dateFilter === 'week') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return { start: sevenDaysAgo, end: now };
    }
    if (dateFilter === 'month') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return { start: thirtyDaysAgo, end: now };
    }
    if (dateFilter === 'custom' && customStart && customEnd) {
      return {
        start: new Date(`${customStart}T00:00:00`),
        end: new Date(`${customEnd}T23:59:59`),
      };
    }
    return { start: undefined, end: undefined };
  };

  const { start, end } = getDateRange();
  const summary: PipelineSummary = appStore.getPipelineSummary(start, end);
  const visibleProspects = appStore.getVisibleProspects(start, end);
  const myReferredProspects = appStore.getProspectsReferredBy(currentUser.id);

  // Structured Area Referral Link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zionchristianmissioncenter.org';
  const effectiveRefCode = currentUser.referral_code || currentUser.serial_number;
  const referralLink = `${origin}/register/${effectiveRefCode}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareLink = () => {
    const shareData = {
      title: 'Zion Christian Mission Center - Free Bible Study',
      text: `Discover the mysteries of the Holy Scriptures through Zion Christian Mission Center's Free Bible Study. Register using my worker referral link:`,
      url: referralLink,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `${shareData.text} ${shareData.url}`
      )}`;
      window.open(whatsappUrl, '_blank');
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 2000);
    }
  };

  const handleExportMemberLinks = () => {
    const csvContent = appStore.exportMemberLinksCsv(origin);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zion_member_referral_links_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetTestData = () => {
    const confirmMsg =
      'Are you sure you want to clear all test student prospects and BB lessons?\n\nThis will safely reset prospect pipeline records while keeping all worker member profiles, serial numbers, and authentication passwords intact.';
    if (window.confirm(confirmMsg)) {
      const result = appStore.clearTestProspects();
      alert(`Safe Data Reset: Removed ${result.removedCount} test student prospects. All member profiles remain intact.`);
      updateTimestamp();
    }
  };

  const getRoleScopeDescription = () => {
    if (currentUser.role.includes('Super Admin') || currentUser.role.includes('Admin')) {
      return 'Global HQ Oversight • Full visibility across all regions, areas, and missionary bans.';
    }
    if (currentUser.role.includes('Regional Leader')) {
      return `Regional Scope • Region: ${currentUser.region}.`;
    }
    if (
      currentUser.role.some((r) =>
        ['Area Leader', 'Area Somu', 'Gwajang', 'Somu', 'Jeondo Gyo-gwan', 'BB Gyo-gwan'].includes(r)
      )
    ) {
      return `Area Scope • Area: ${currentUser.area} (${currentUser.region}).`;
    }
    if (currentUser.role.includes('Banjang')) {
      return `Ban Scope • Ban: ${currentUser.ban} (${currentUser.area}).`;
    }
    if (currentUser.role.includes('Department TJN')) {
      return `Department Scope • ${currentUser.department}.`;
    }
    if (currentUser.role.includes('Section Leader')) {
      return `Section Scope • Section: ${currentUser.section} (${currentUser.area}).`;
    }
    return `Worker Scope • Attributed referrals registered under ${effectiveRefCode}.`;
  };

  // 7 Core Pipeline Stages
  const pipelineStages = [
    {
      level: 'Chatgi',
      count: summary.chatgi,
      label: 'Chatgi',
      stageNum: '1',
      description: 'Intake & Registration',
      borderClass: 'border-slate-200 hover:border-amber-400 bg-white',
      accentColor: 'text-amber-700',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      level: 'BB Hapdang',
      count: summary.bb_hapdang,
      label: 'BB Hapdang',
      stageNum: '2',
      description: 'Program & Schedule Set',
      borderClass: 'border-slate-200 hover:border-blue-400 bg-white',
      accentColor: 'text-blue-700',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      level: 'Ttagi',
      count: summary.ttagi,
      label: 'Ttagi',
      stageNum: '3',
      description: 'BB Teacher Assigned',
      borderClass: 'border-slate-200 hover:border-purple-400 bg-white',
      accentColor: 'text-purple-700',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    {
      level: 'Soebweh',
      count: summary.soebweh,
      label: 'Soebweh',
      stageNum: '4',
      description: '1–2 Lessons Passed',
      borderClass: 'border-slate-200 hover:border-teal-400 bg-white',
      accentColor: 'text-teal-700',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    {
      level: 'BB',
      count: summary.bb,
      label: 'BB',
      stageNum: '5',
      description: '3+ Lessons Progressing',
      borderClass: 'border-slate-200 hover:border-indigo-400 bg-white',
      accentColor: 'text-indigo-700',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    {
      level: 'Center Hapdang',
      count: summary.center_hapdang,
      label: 'Center Hapdang',
      stageNum: '6',
      description: '10+ Lessons & Form',
      borderClass: 'border-slate-200 hover:border-emerald-400 bg-white',
      accentColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      level: 'Center',
      count: summary.center,
      label: 'Center',
      stageNum: '7',
      description: 'Approved & Enrolled',
      borderClass: 'border-slate-200 hover:border-green-500 bg-emerald-50/30',
      accentColor: 'text-green-800',
      badgeBg: 'bg-green-100 text-green-900 border-green-300 font-extrabold',
    },
  ];

  const isAdmin = currentUser.role.includes('Super Admin') || currentUser.role.includes('Admin');
  const canManageAccounts = appStore.canManageAccounts(currentUser);

  // Conversion Funnel Calculations
  const totalActiveInPipeline = visibleProspects.filter((p) => p.prospect_level !== 'BB Dropped').length;
  const activeBBLearners = summary.soebweh + summary.bb;
  const centerCompleted = summary.center;
  const conversionRate = totalActiveInPipeline > 0 ? Math.round((centerCompleted / totalActiveInPipeline) * 100) : 0;
  const teacherAssignedCount = visibleProspects.filter((p) => Boolean(p.assigned_bb_teacher_id)).length;
  const teacherCoverageRate = totalActiveInPipeline > 0 ? Math.round((teacherAssignedCount / totalActiveInPipeline) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Scope, Context & Date Filter Toolbar */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5 font-medium">
              <span className="font-extrabold text-[#034ea2] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {currentUser.role.join(' · ')}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {currentUser.area}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600">
                Ref: {effectiveRefCode}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Evangelism Pipeline Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>{getRoleScopeDescription()}</span>
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateToRegister(effectiveRefCode)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#034ea2] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Register Seeker</span>
            </button>

            {canManageAccounts && onOpenCsvImport && (
              <button
                onClick={onOpenCsvImport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV Member Import</span>
              </button>
            )}

            <button
              onClick={handleExportMemberLinks}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-colors whitespace-nowrap shrink-0"
              title="Download CSV containing all member referral URLs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Links (.CSV)</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleResetTestData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors whitespace-nowrap shrink-0"
                title="Safely reset test prospects while keeping member profiles"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset Test Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Segmented Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Window:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  dateFilter === f.id
                    ? 'bg-[#034ea2] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          )}

          {/* Snapshot Timestamp Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>As of {asOfTimestamp}</span>
            <button
              onClick={updateTimestamp}
              title="Refresh timestamp"
              className="hover:text-blue-600 p-0.5 rounded transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Member Area Referral Link & Field Evengelism Sharing Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white shadow-lg border border-blue-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-white/5 skew-x-12 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2.5 border border-blue-400/30">
              <span>Evangelism Referral Code:</span>
              <strong className="text-white font-mono">{effectiveRefCode}</strong>
              <span aria-hidden="true">·</span>
              <span>{currentUser.area}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Personal Student Referral Link & Field QR
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              When prospective Bible study students register through your link, they are automatically attributed to your evangelism profile (<span className="text-amber-300 font-semibold">{currentUser.name}</span> · {currentUser.area}) in the real-time pipeline.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="bg-slate-950/70 border border-white/20 rounded-xl px-3.5 py-2 text-xs font-mono text-blue-200 truncate max-w-sm sm:max-w-md select-all">
                {referralLink}
              </div>

              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShareLink}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{sharedToast ? 'Opened!' : 'Share via WhatsApp'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 border border-white/20"
                title="Open Scannable QR Code"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show QR Code</span>
              </button>
            </div>
          </div>

          {/* Quick High-Level Scope Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[280px]">
            <div className="text-center p-2">
              <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">{visibleProspects.length}</div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">Total in Scope</p>
            </div>
            <div className="text-center p-2 border-l border-white/15">
              <div className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">{myReferredProspects.length}</div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">My Referrals</p>
            </div>
            <div className="text-center p-2 border-l border-white/15">
              <div className="text-2xl sm:text-3xl font-black text-teal-300 tabular-nums">{activeBBLearners}</div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">Active BB</p>
            </div>
            <div className="text-center p-2 border-l border-white/15">
              <div className="text-2xl sm:text-3xl font-black text-emerald-300 tabular-nums">{summary.center}</div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">In Center</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel Progress Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Pipeline Retention & Conversion Funnel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracking seeker journey from initial registration to Center graduation.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div>
              <span className="text-slate-400">Center Conversion: </span>
              <strong className="text-emerald-700 tabular-nums font-mono">{conversionRate}%</strong>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div>
              <span className="text-slate-400">Teacher Coverage: </span>
              <strong className="text-purple-700 tabular-nums font-mono">{teacherCoverageRate}%</strong>
            </div>
          </div>
        </div>

        {/* Visual Multi-segment Funnel Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
          <div
            style={{ width: `${Math.max(5, (summary.chatgi / (totalActiveInPipeline || 1)) * 100)}%` }}
            className="bg-amber-400 hover:opacity-90 transition-all"
            title={`Chatgi: ${summary.chatgi}`}
          />
          <div
            style={{ width: `${Math.max(5, (summary.bb_hapdang / (totalActiveInPipeline || 1)) * 100)}%` }}
            className="bg-blue-500 hover:opacity-90 transition-all"
            title={`BB Hapdang: ${summary.bb_hapdang}`}
          />
          <div
            style={{ width: `${Math.max(5, (summary.ttagi / (totalActiveInPipeline || 1)) * 100)}%` }}
            className="bg-purple-500 hover:opacity-90 transition-all"
            title={`Ttagi: ${summary.ttagi}`}
          />
          <div
            style={{ width: `${Math.max(5, (summary.soebweh / (totalActiveInPipeline || 1)) * 100)}%` }}
            className="bg-teal-500 hover:opacity-90 transition-all"
            title={`Soebweh: ${summary.soebweh}`}
          />
          <div
            style={{ width: `${Math.max(5, (summary.bb / (totalActiveInPipeline || 1)) * 100)}%` }}
            className="bg-indigo-500 hover:opacity-90 transition-all"
            title={`BB: ${summary.bb}`}
          />
          <div
            style={{ width: `${Math.max(5, (summary.center_hapdang / (totalActiveInPipeline || 1)) * 100)}%` }}
            className="bg-emerald-500 hover:opacity-90 transition-all"
            title={`Center Hapdang: ${summary.center_hapdang}`}
          />
          <div
            style={{ width: `${Math.max(5, (summary.center / (totalActiveInPipeline || 1)) * 100)}%` }}
            className="bg-green-600 hover:opacity-90 transition-all"
            title={`Center: ${summary.center}`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Chatgi ({summary.chatgi})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>BB Hapdang ({summary.bb_hapdang})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Ttagi ({summary.ttagi})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>Soebweh ({summary.soebweh})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>BB ({summary.bb})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Center Hapdang ({summary.center_hapdang})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-600" />
            <span className="font-bold text-green-800">Center ({summary.center})</span>
          </div>
        </div>
      </div>

      {/* 7 Pipeline Stages Interactive Cards */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Pipeline Stage Breakdown (7 Stages)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any stage card to filter and manage students at that level.
            </p>
          </div>

          <button
            onClick={() => onNavigateToProspects('ALL')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Full Pipeline View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {pipelineStages.map((stage) => (
            <button
              key={stage.level}
              type="button"
              onClick={() => onNavigateToProspects(stage.level)}
              className={`p-4 rounded-2xl border text-left transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between group ${stage.borderClass}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    STAGE {stage.stageNum}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${stage.badgeBg}`}>
                    {stage.label}
                  </span>
                </div>
                <div className={`text-3xl font-black tracking-tight tabular-nums ${stage.accentColor}`}>
                  {stage.count}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-slate-800">
                <span className="truncate">{stage.description}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Dropped Student Category Strip */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50/70 border border-rose-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black text-sm tabular-nums flex-shrink-0">
              {summary.bb_dropped}
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900">
                BB Dropped Records ({summary.bb_dropped} Discontinued Students)
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Students who halted Bible study with logged dropping reasons (Work, Schedule, Family, Health). Any dropped student can be restored anytime by authorized leaders.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToProspects('BB Dropped')}
            className="px-4 py-2 bg-white text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-300 transition-colors whitespace-nowrap shrink-0"
          >
            Manage Dropped List
          </button>
        </div>
      </div>

      {/* Grid: My Direct Referrals vs Scoped Inflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Direct Referrals Table */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>My Direct Referrals ({myReferredProspects.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seekers attributed to your referral code ({effectiveRefCode})
              </p>
            </div>

            <button
              onClick={() => onNavigateToProspects()}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {myReferredProspects.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-600">No students registered under your code yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click "Copy Link" or "Show QR Code" above and share it with prospective seekers!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-2.5">Student</th>
                    <th className="pb-2.5">Level</th>
                    <th className="pb-2.5">Program</th>
                    <th className="pb-2.5 text-right">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {myReferredProspects.slice(0, 5).map((p: Prospect) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5">
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{p.contact_number}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          {p.prospect_level}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {p.program || 'Pending'}
                      </td>
                      <td className="py-2.5 text-right text-slate-500 font-mono text-[11px] tabular-nums">
                        {new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Scoped Registrations Table */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Recent Scoped Registrations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest students recognized under your role jurisdiction
              </p>
            </div>

            <button
              onClick={() => onNavigateToProspects()}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {visibleProspects.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
              No students recorded in this date window.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-2.5">Student</th>
                    <th className="pb-2.5">Level</th>
                    <th className="pb-2.5">Referrer</th>
                    <th className="pb-2.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {visibleProspects.slice(0, 5).map((p) => {
                    const ref = appStore.getProfileById(p.referred_by_member_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5">
                          <span className="font-bold text-slate-900 block">{p.name}</span>
                          <span className="text-[11px] text-slate-400">{p.city ? `${p.city}, ` : ''}{p.province}</span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {p.prospect_level}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {ref ? ref.name : 'Intake Form'}
                        </td>
                        <td className="py-2.5 text-right text-slate-500 font-mono text-[11px] tabular-nums">
                          {new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal for Field Evangelism */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 text-center relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900">
              Field Evangelism QR Code
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Have the seeker scan this code with their smartphone camera to open your registration page directly.
            </p>

            <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <img
                src={qrCodeUrl}
                alt="Registration QR Code"
                className="w-48 h-48 mx-auto rounded-lg object-contain"
              />
            </div>

            <div className="bg-slate-100 rounded-xl p-2.5 text-xs font-mono text-slate-700 mb-4 select-all break-all">
              {referralLink}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 bg-[#034ea2] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
              >
                {copiedLink ? 'Copied Link!' : 'Copy Link URL'}
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
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
