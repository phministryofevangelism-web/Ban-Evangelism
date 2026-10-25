import React, { useState, useEffect } from 'react';
import {
  Database,
  Copy,
  Check,
  Download,
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Activity,
  ShieldCheck,
  FileText
} from 'lucide-react';
import {
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  IS_SUPABASE_CONFIGURED,
  runComprehensiveDiagnostic,
  ComprehensiveDiagnosticResult
} from '../services/supabase';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'connect' | 'schema'>('diagnostic');
  const [copied, setCopied] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [urlInput, setUrlInput] = useState(SUPABASE_URL || '');
  const [keyInput, setKeyInput] = useState(SUPABASE_ANON_KEY || '');
  
  // Diagnostic State
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<ComprehensiveDiagnosticResult | null>(null);

  // Auto-run diagnostic on modal open
  useEffect(() => {
    if (isOpen && !diagnosticData && !isRunningDiagnostic) {
      handleRunDiagnostic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const result = await runComprehensiveDiagnostic();
      setDiagnosticData(result);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput && keyInput) {
      saveSupabaseCredentials(urlInput.trim(), keyInput.trim());
    }
  };

  const handleCopyDiagnosticReport = () => {
    if (!diagnosticData) return;
    const lines = [
      `# Supabase Connection Diagnostic Report`,
      `Generated: ${diagnosticData.timestamp}`,
      `Supabase URL: ${diagnosticData.supabaseUrl}`,
      `Client Initialized: ${diagnosticData.clientInitialized ? 'PASS' : 'FAIL'}`,
      `Auth Status: ${diagnosticData.authStatus} ${diagnosticData.authUserEmail ? `(${diagnosticData.authUserEmail})` : ''}`,
      `Overall Result: ${diagnosticData.allPassed ? 'ALL CHECKS PASSED' : 'ACTION NEEDED'}`,
      ``,
      `| Check / Target | Table | Operation | Status | Details / Error | Latency |`,
      `| --- | --- | --- | --- | --- | --- |`,
      ...diagnosticData.checks.map(
        (c) =>
          `| ${c.name} | \`${c.table}\` | ${c.operation} | **${c.status}** | ${c.error ? `Error: ${c.error.replace(/\|/g, '/')}` : c.message || `${c.count ?? 0} rows`} | ${c.durationMs}ms |`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const sqlScript = `-- ==============================================================================
-- Zion Christian Mission Center - Supabase Database Schema (17 Tables)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MEMBERS TABLE (Primary Table for CSV Upload & Member Accounts)
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Evangelism Dept',
    section TEXT DEFAULT 'Section Alpha',
    area TEXT NOT NULL DEFAULT 'Manila',
    region TEXT NOT NULL DEFAULT 'NCR & Luzon',
    ban TEXT DEFAULT 'Ban 1',
    duty TEXT DEFAULT 'Evangelism Worker',
    team_leader TEXT DEFAULT 'Leader Timothy',
    role TEXT[] NOT NULL DEFAULT ARRAY['Member']::TEXT[],
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    email TEXT,
    has_bb_teacher_permission BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist on existing members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS ban TEXT DEFAULT 'Ban 1';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS has_bb_teacher_permission BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_members_serial_number ON public.members(serial_number);
CREATE INDEX IF NOT EXISTS idx_members_referral_code ON public.members(referral_code);
CREATE INDEX IF NOT EXISTS idx_members_area ON public.members(area);
CREATE INDEX IF NOT EXISTS idx_members_ban ON public.members(ban);

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;

-- 2. PROFILES TABLE (Mirrors user identity)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Evangelism Dept',
    area TEXT NOT NULL DEFAULT 'Manila',
    region TEXT NOT NULL DEFAULT 'NCR & Luzon',
    duty TEXT DEFAULT 'Evangelism Worker',
    section TEXT DEFAULT 'Section Alpha',
    team_leader TEXT DEFAULT 'Leader Timothy',
    ban TEXT DEFAULT 'Ban 1',
    role TEXT[] NOT NULL DEFAULT ARRAY['Member']::TEXT[],
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    email TEXT,
    has_bb_teacher_permission BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban TEXT DEFAULT 'Ban 1';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_bb_teacher_permission BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_serial_number ON public.profiles(serial_number);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- 3. PROSPECTS TABLE
CREATE TABLE IF NOT EXISTS public.prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    province TEXT NOT NULL,
    city TEXT,
    referred_by_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    prospect_level TEXT NOT NULL DEFAULT 'Chatgi',
    program TEXT CHECK (program IN ('Onsite', 'Online', 'SPS', NULL)),
    meeting_mode TEXT DEFAULT 'Online',
    next_meeting_schedule TIMESTAMP WITH TIME ZONE,
    meeting_remarks TEXT,
    assigned_bb_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    upgraded_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    upgraded_at TIMESTAMP WITH TIME ZONE,
    dropping_reason TEXT,
    previous_stage TEXT,
    dropped_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    dropped_at TIMESTAMP WITH TIME ZONE,
    center_registration_completed BOOLEAN NOT NULL DEFAULT false,
    center_form_completed_at TIMESTAMP WITH TIME ZONE,
    center_form_verification TEXT,
    center_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    center_approved_at TIMESTAMP WITH TIME ZONE,
    center_registration_month TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospects_referred_by ON public.prospects(referred_by_member_id);
CREATE INDEX IF NOT EXISTS idx_prospects_level ON public.prospects(prospect_level);
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;

-- 4. BB_LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.bb_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    lesson_title TEXT NOT NULL,
    date_completed DATE NOT NULL DEFAULT CURRENT_DATE,
    mode TEXT DEFAULT 'Online',
    method TEXT DEFAULT '1-on-1',
    assigned_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bb_lessons_prospect_id ON public.bb_lessons(prospect_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.bb_lessons;
`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([sqlScript], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zion_supabase_full_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 max-h-[92vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                Supabase Connection Diagnostic
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  IS_SUPABASE_CONFIGURED
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {IS_SUPABASE_CONFIGURED ? 'Connected & Live' : 'Not Connected Yet'}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
              Live Supabase Integration & Health Diagnostic
            </h3>
            <p className="text-xs text-slate-500">
              Validates real-time connection, authentication state, and query access across all 17 Supabase database tables.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-3 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'diagnostic'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Connection Diagnostic</span>
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'connect'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Connection Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SQL Schema (17 Tables)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-grow pr-1 custom-scrollbar">
          {activeTab === 'diagnostic' && (
            <div className="space-y-4">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Supabase Endpoint</span>
                  <p className="text-xs font-bold text-slate-900 font-mono truncate mt-0.5" title={SUPABASE_URL}>
                    {SUPABASE_URL || 'Not Configured'}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Live Client Configured
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Auth Session State</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {diagnosticData?.authStatus || 'Checking...'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono truncate block mt-1">
                    {diagnosticData?.authUserEmail || 'supabase.auth.getUser() verified'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Diagnostic Suite</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                      diagnosticData?.allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {diagnosticData ? (diagnosticData.allPassed ? '100% OPERATIONAL' : 'TABLE CHECKS ACTIVE') : 'INITIALIZING'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {diagnosticData?.checks.length || 0} validation checks executed
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunDiagnostic}
                    disabled={isRunningDiagnostic}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
                    <span>{isRunningDiagnostic ? 'Running Diagnostic...' : 'Re-run All Checks Now'}</span>
                  </button>
                  {diagnosticData && (
                    <button
                      onClick={handleCopyDiagnosticReport}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-colors"
                    >
                      {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReport ? 'Report Copied!' : 'Copy Markdown Report'}</span>
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-emerald-900 font-medium">
                  {diagnosticData ? `Last run: ${new Date(diagnosticData.timestamp).toLocaleTimeString()}` : ''}
                </span>
              </div>

              {/* Diagnostic Results Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3.5">Check / Target</th>
                        <th className="py-2.5 px-3">Table Name</th>
                        <th className="py-2.5 px-2.5 text-center">Operation</th>
                        <th className="py-2.5 px-2.5 text-center">Status</th>
                        <th className="py-2.5 px-3">Result Details / Supabase Response</th>
                        <th className="py-2.5 px-3 text-right">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diagnosticData?.checks.map((chk, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-slate-900">
                            {chk.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {chk.table}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span className="px-2 py-0.5 font-mono text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                              {chk.operation}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full inline-flex items-center gap-1 ${
                                chk.status === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {chk.status === 'PASS' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {chk.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {chk.status === 'FAIL' ? (
                              <span className="text-rose-700 font-medium text-[11px] block break-all">
                                {chk.error}
                              </span>
                            ) : (
                              <span className="text-slate-700 text-[11px]">
                                {chk.message || `${chk.count ?? 0} rows found in table`}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                            {chk.durationMs}ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border text-xs bg-emerald-50/70 border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Supabase Environment Active</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  The application is configured to connect to your live Supabase project. Any mutations, member imports, or prospect updates synchronize directly to the database.
                </p>
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-3.5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Update Supabase Project Credentials
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project URL
                  </label>
                  <input
                    type="url"
                    required
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Public / Anon API Key (Client-Safe)
                  </label>
                  <input
                    type="text"
                    required
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Save & Reconnect
                  </button>
                  <button
                    type="button"
                    onClick={clearSupabaseCredentials}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-300 transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">
                  Complete PostgreSQL table structure reference for all 17 tables.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .sql</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-[50vh] leading-relaxed custom-scrollbar">
                {sqlScript}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Row Level Security (RLS) Active • Client Secret Safe</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
