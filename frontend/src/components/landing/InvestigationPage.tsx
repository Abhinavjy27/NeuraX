import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Loader2,
  User,
  Activity,
  CheckCircle2,
  ExternalLink,
  Globe,
  GitBranch,
  Briefcase,
  AtSign,
  Camera,
  Play,
  ArrowLeft,
  AlertCircle,
  X,
  Maximize2,
  ZoomIn,
  Clock,
  MessageSquare,
  Network,
  Crosshair,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  RefreshCw,
  GraduationCap,
  Newspaper,
  FileText,
  BookOpen,
  Award,
  ArrowUpDown,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import KnowledgeGraphView from './knowledge-graph/KnowledgeGraphView';
import EarthBackground from '@/components/ui/earth-background';
import styles from './trinetra-console.module.css';

// API base URL supports VITE_API_BASE or defaults to Vite proxy (/api)
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Platform configurations matching backend scraped sources
interface PlatformConfig {
  color: string;
  bg: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
}

const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  wikipedia: { color: '#e2e8f0', bg: '#1c1e22', icon: Globe, label: 'Wikipedia' },
  'twitter/x': { color: '#38bdf8', bg: '#0b1d2e', icon: AtSign, label: 'Twitter / X' },
  twitter: { color: '#38bdf8', bg: '#0b1d2e', icon: AtSign, label: 'Twitter / X' },
  github: { color: '#e2e8f0', bg: '#161b22', icon: GitBranch, label: 'GitHub' },
  linkedin: { color: '#38bdf8', bg: '#08233d', icon: Briefcase, label: 'LinkedIn' },
  instagram: { color: '#f43f5e', bg: '#2b0d18', icon: Camera, label: 'Instagram' },
  facebook: { color: '#3b82f6', bg: '#0a1d37', icon: Globe, label: 'Facebook' },
  youtube: { color: '#ef4444', bg: '#260a0a', icon: Play, label: 'YouTube' },
  tiktok: { color: '#2dd4bf', bg: '#071f1e', icon: Globe, label: 'TikTok' },
  reddit: { color: '#fb923c', bg: '#291407', icon: Globe, label: 'Reddit' },
  medium: { color: '#ffffff', bg: '#18181b', icon: Globe, label: 'Medium' },
  scholar: { color: '#60a5fa', bg: '#082138', icon: GraduationCap, label: 'Google Scholar' },
  academia: { color: '#38bdf8', bg: '#082138', icon: GraduationCap, label: 'Academia.edu' },
  leetcode: { color: '#f59e0b', bg: '#291b05', icon: Code2, label: 'LeetCode' },
  huggingface: { color: '#fbbf24', bg: '#2a1f05', icon: Award, label: 'Hugging Face' },
  news: { color: '#f59e0b', bg: '#261706', icon: Newspaper, label: 'News / Press' },
  web: { color: '#c084fc', bg: '#1e0e33', icon: FileText, label: 'Web Source' },
};

function getPlatformConfig(platform = ''): PlatformConfig {
  const key = platform.toLowerCase().trim();
  return (
    PLATFORM_CONFIG[key] || {
      color: '#94a3b8',
      bg: '#0f172a',
      icon: Globe,
      label: platform.charAt(0).toUpperCase() + platform.slice(1) || 'Source',
    }
  );
}

// ── Types ──────────────────────────────────────────────────────────────────
interface ProfileData {
  platform: string;
  username?: string;
  title?: string;
  snippet?: string;
  url?: string;
  confidence?: number;
  face_verified?: boolean | null;
  face_confidence?: number | null;
  text_attribution?: 'CONFIRMED' | 'POSSIBLE' | string;
  attribution_reason?: string;
  photo_url?: string | null;
}

interface CandidateScores {
  identity_score?: number;
  source_corroboration?: number;
  organization_overlap?: number;
  contradiction_penalty?: number;
  name_score?: number;
  image_score?: number;
  username_score?: number;
  project_overlap?: number;
  context_score?: number;
}

export interface WikipediaData {
  title?: string;
  url?: string;
  description?: string;
  summary?: string;
  facts?: string[];
  image_url?: string | null;
}

interface Candidate {
  person_id: string;
  canonical_name_guess: string;
  verdict: 'confirmed' | 'possible' | 'insufficient_evidence' | string;
  scores: CandidateScores;
  profiles_found?: ProfileData[];
  avatar_url?: string | null;
  probe_image_url?: string | null;
  face_match_warning?: string | null;
  is_face_match?: boolean | null;
  wikipedia?: WikipediaData | null;
}

interface PipelineEvent {
  type: string;
  step: string;
  message: string;
  confidence?: number;
}

interface TimelineEvent {
  date?: string;
  event: string;
  confidence?: number;
  type?: string;
  source?: string;
  source_url?: string;
}

interface ExpandedImageInfo {
  url: string;
  title?: string;
  subtitle?: string;
  badge?: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relation?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Page-Scoped Trinetra Geometric Brand Mark ──────────────────────────────
const TrinetraLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="TRINETRA Logo Mark"
  >
    {/* Geometric aperture diamond */}
    <path
      d="M16 2.5L29.5 16L16 29.5L2.5 16L16 2.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="text-indigo-400"
    />
    {/* Horizontal third-eye contour */}
    <path
      d="M4.5 16C8.5 9.5 23.5 9.5 27.5 16C23.5 22.5 8.5 22.5 4.5 16Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-cyan-400"
    />
    {/* Iris coordinate ring */}
    <circle
      cx="16"
      cy="16"
      r="4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-slate-200"
    />
    {/* Concentric core focal point */}
    <circle
      cx="16"
      cy="16"
      r="1.8"
      fill="currentColor"
      className="text-indigo-400"
    />
    {/* Zenith hairline mark */}
    <line
      x1="16"
      y1="6"
      x2="16"
      y2="9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-indigo-300"
    />
    {/* Nadir hairline mark */}
    <line
      x1="16"
      y1="23"
      x2="16"
      y2="26"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-indigo-300"
    />
  </svg>
);

// ── Site Grouping Types & Helpers ───────────────────────────────────────────
interface SiteGroup {
  siteKey: string;
  siteLabel: string;
  domain: string;
  platform: string;
  items: ProfileData[];
}

const SOCIAL_PLATFORMS = new Set([
  'linkedin',
  'instagram',
  'twitter',
  'twitter/x',
  'x',
  'facebook',
  'youtube',
  'github',
  'tiktok',
  'reddit',
  'medium',
]);

function getSocialMetadata(p: ProfileData): { isSocial: boolean; socialKey: string; label: string } {
  const rawPlatform = (p.platform || '').toLowerCase().trim();
  let domain = '';
  if (p.url) {
    try {
      domain = new URL(p.url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {}
  }

  for (const sp of SOCIAL_PLATFORMS) {
    const isDomainMatch = domain && (
      domain === `${sp}.com` ||
      domain.endsWith(`.${sp}.com`) ||
      (sp === 'twitter' && (domain.includes('twitter.com') || domain.includes('x.com'))) ||
      (sp === 'youtube' && (domain.includes('youtube.com') || domain.includes('youtu.be')))
    );

    if (rawPlatform === sp || isDomainMatch) {
      const canonicalKey = (sp === 'twitter/x' || sp === 'x') ? 'twitter' : sp;
      const cfg = getPlatformConfig(canonicalKey);
      return { isSocial: true, socialKey: canonicalKey, label: cfg.label };
    }
  }

  return { isSocial: false, socialKey: '', label: '' };
}

export type TilePriorityTier = 1 | 2 | 3 | 4;

export interface PriorityInfo {
  tier: TilePriorityTier;
  tierNumber: number;
  tierLabel: string;
  tierTag: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  rank: number;
}

export function getSiteGroupPriority(group: { platform?: string; domain?: string; siteKey?: string; items?: ProfileData[] }): PriorityInfo {
  const plat = (group.platform || '').toLowerCase().trim();
  const domain = (group.domain || '').toLowerCase().trim();
  const siteKey = (group.siteKey || '').toLowerCase().trim();
  const anyUrl = (group.items || []).map((it) => (it.url || '').toLowerCase()).join(' ');

  // 1. LinkedIn first (Priority 1)
  if (
    plat === 'linkedin' ||
    siteKey === 'social_linkedin' ||
    domain.includes('linkedin.com') ||
    anyUrl.includes('linkedin.com')
  ) {
    return {
      tier: 1,
      tierNumber: 1,
      tierLabel: 'LinkedIn',
      tierTag: 'P1 · LINKEDIN',
      color: '#0a66c2',
      badgeBg: 'rgba(10, 102, 194, 0.18)',
      badgeBorder: 'rgba(10, 102, 194, 0.4)',
      badgeText: '#60a5fa',
      rank: 10,
    };
  }

  // 2. Socials next (Priority 2)
  const isSocial =
    [
      'github',
      'twitter',
      'x',
      'twitter/x',
      'instagram',
      'facebook',
      'youtube',
      'tiktok',
      'reddit',
      'medium',
      'threads',
      'pinterest',
      'kaggle',
    ].includes(plat) ||
    siteKey.startsWith('social_') ||
    [
      'github.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'facebook.com',
      'youtube.com',
      'youtu.be',
      'tiktok.com',
      'reddit.com',
      'medium.com',
    ].some((d) => domain.includes(d) || anyUrl.includes(d));

  if (isSocial) {
    let subRank = 100;
    if (plat === 'github' || domain.includes('github.com')) subRank = 20;
    else if (plat.includes('twitter') || plat === 'x' || domain.includes('twitter.com') || domain.includes('x.com'))
      subRank = 30;
    else if (plat === 'instagram' || domain.includes('instagram.com')) subRank = 40;
    else if (plat === 'facebook' || domain.includes('facebook.com')) subRank = 50;
    else if (plat === 'youtube' || domain.includes('youtube.com') || domain.includes('youtu.be')) subRank = 60;
    else if (plat === 'tiktok' || domain.includes('tiktok.com')) subRank = 70;
    else if (plat === 'reddit' || domain.includes('reddit.com')) subRank = 80;
    else if (plat === 'medium' || domain.includes('medium.com')) subRank = 90;

    return {
      tier: 2,
      tierNumber: 2,
      tierLabel: 'Socials',
      tierTag: 'P2 · SOCIAL',
      color: '#a855f7',
      badgeBg: 'rgba(168, 85, 247, 0.18)',
      badgeBorder: 'rgba(168, 85, 247, 0.4)',
      badgeText: '#c084fc',
      rank: subRank,
    };
  }

  // 3. Scholar next (Priority 3)
  const isScholar =
    plat === 'scholar' ||
    plat === 'academia' ||
    plat === 'researchgate' ||
    [
      'scholar.google',
      'semanticscholar.org',
      'academia.edu',
      'researchgate.net',
      'arxiv.org',
      'orcid.org',
      'ieee.org',
      'sciencedirect.com',
      'springer.com',
      'ncbi.nlm.nih.gov',
    ].some((d) => domain.includes(d) || anyUrl.includes(d));

  if (isScholar) {
    const subRank = plat === 'scholar' || domain.includes('scholar') ? 10 : 20;
    return {
      tier: 3,
      tierNumber: 3,
      tierLabel: 'Scholar',
      tierTag: 'P3 · SCHOLAR',
      color: '#0d9488',
      badgeBg: 'rgba(13, 148, 136, 0.18)',
      badgeBorder: 'rgba(13, 148, 136, 0.4)',
      badgeText: '#2dd4bf',
      rank: subRank,
    };
  }

  // 4. Articles next (Priority 4: News, Web publications, blogs)
  const isNews = plat === 'news' || domain.includes('news') || anyUrl.includes('news');
  return {
    tier: 4,
    tierNumber: 4,
    tierLabel: 'Articles',
    tierTag: 'P4 · ARTICLE',
    color: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.18)',
    badgeBorder: 'rgba(245, 158, 11, 0.4)',
    badgeText: '#fbbf24',
    rank: isNews ? 10 : 20,
  };
}

export function getProfilePriority(p: ProfileData): PriorityInfo {
  return getSiteGroupPriority({
    platform: p.platform,
    domain: '',
    siteKey: p.platform,
    items: [p],
  });
}

export function getFallbackAvatar(
  profiles?: Array<{ platform?: string; photo_url?: string | null }>,
  failedUrl?: string
): string | null {
  if (!profiles || !profiles.length) return null;
  const socialPlatforms = ['instagram', 'facebook', 'youtube', 'twitter', 'github', 'wikipedia'];
  for (const plat of socialPlatforms) {
    const match = profiles.find(
      (p) => p.platform?.toLowerCase() === plat && p.photo_url && p.photo_url !== failedUrl
    );
    if (match?.photo_url) return match.photo_url;
  }
  const anyMatch = profiles.find((p) => p.photo_url && p.photo_url !== failedUrl);
  return anyMatch?.photo_url || null;
}

function groupProfilesBySite(profiles: ProfileData[] = []): SiteGroup[] {
  const groups: Record<string, SiteGroup> = {};

  profiles.forEach((p, idx) => {
    const social = getSocialMetadata(p);

    if (social.isSocial) {
      // ONLY stack LinkedIn or other socials because there is a clash
      const key = `social_${social.socialKey}`;
      if (!groups[key]) {
        groups[key] = {
          siteKey: key,
          siteLabel: social.label,
          domain: `${social.socialKey}.com`,
          platform: social.socialKey,
          items: [],
        };
      }
      groups[key].items.push(p);
    } else {
      // For other sites (scholar, academia, news, web, articles), each remains a DIFFERENT tile!
      const key = `other_${idx}_${p.url || p.title || p.platform}`;
      const cfg = getPlatformConfig(p.platform);
      let domain = '';
      if (p.url) {
        try {
          domain = new URL(p.url).hostname.toLowerCase().replace(/^www\./, '');
        } catch {}
      }
      groups[key] = {
        siteKey: key,
        siteLabel: cfg.label,
        domain,
        platform: p.platform || 'web',
        items: [p],
      };
    }
  });

  const groupList = Object.values(groups);

  // Sort items inside each group: verified / confirmed first, then confidence
  groupList.forEach((g) => {
    g.items.sort((a, b) => {
      const scoreA =
        (a.face_verified ? 3 : a.text_attribution === 'CONFIRMED' ? 2 : a.text_attribution === 'POSSIBLE' ? 1 : 0) +
        (a.confidence || 0);
      const scoreB =
        (b.face_verified ? 3 : b.text_attribution === 'CONFIRMED' ? 2 : b.text_attribution === 'POSSIBLE' ? 1 : 0) +
        (b.confidence || 0);
      return scoreB - scoreA;
    });
  });

  // Sort groups strictly according to user priority:
  // 1. LinkedIn first
  // 2. Socials next
  // 3. Scholar next
  // 4. Articles next
  return groupList.sort((a, b) => {
    const prioA = getSiteGroupPriority(a);
    const prioB = getSiteGroupPriority(b);

    // 1. Primary priority tier (1 < 2 < 3 < 4)
    if (prioA.tier !== prioB.tier) {
      return prioA.tier - prioB.tier;
    }

    // 2. Sub-rank within tier
    if (prioA.rank !== prioB.rank) {
      return prioA.rank - prioB.rank;
    }

    // 3. Best item confidence in group
    const bestConfA = Math.max(...a.items.map((it) => it.confidence || 0), 0);
    const bestConfB = Math.max(...b.items.map((it) => it.confidence || 0), 0);
    return bestConfB - bestConfA;
  });
}


// ── Profile Tile Component (Single Item) ────────────────────────────────────
const ProfileTile: React.FC<{
  profile: ProfileData;
  onImageClick?: (info: ExpandedImageInfo) => void;
}> = ({ profile, onImageClick }) => {
  const cfg = getPlatformConfig(profile.platform);
  const Icon = cfg.icon;
  const faceVerified = profile.face_verified === true;
  const faceMismatched = profile.face_verified === false;
  const textAttr = profile.text_attribution;

  const isArticleOrWeb = ['scholar', 'academia', 'news', 'web'].includes(profile.platform.toLowerCase());
  const displayTitle = profile.title || (isArticleOrWeb && profile.snippet ? profile.snippet : null);
  const displayHandle =
    profile.username ||
    (profile.url ? profile.url.split('/').filter(Boolean).pop() : 'unspecified');

  return (
    <a
      href={profile.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.profileItem}
      style={{
        borderLeftColor: cfg.color,
        borderLeftWidth: '3px',
      }}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
          <span className="text-xs font-medium text-slate-200 truncate">
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {faceVerified && (
            <span
              title="Face-verified match against uploaded probe image"
              className="text-[9px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5"
            >
              ✓ FACE
            </span>
          )}
          {faceMismatched && (
            <span
              title="Face mismatch against probe image"
              className="text-[9px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded px-1.5 py-0.5"
            >
              ✗ FACE
            </span>
          )}
          {textAttr === 'CONFIRMED' && !faceVerified && (
            <span
              title={profile.attribution_reason || "Context-verified via biographical correlation"}
              className="text-[9px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5"
            >
              ✓ TEXT
            </span>
          )}
          {textAttr === 'POSSIBLE' && !faceVerified && (
            <span
              title={profile.attribution_reason || "Tentative attribution based on candidate footprint"}
              className="text-[9px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5"
            >
              ~ POSSIBLE
            </span>
          )}
          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </div>
      </div>

      <div className="my-1 flex items-start gap-2">
        {profile.photo_url && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onImageClick?.({
                url: profile.photo_url!,
                title: displayTitle || displayHandle || cfg.label,
                subtitle: profile.url || undefined,
                badge: `${cfg.label.toUpperCase()} FOOTPRINT`,
              });
            }}
            className="w-7 h-7 rounded-md overflow-hidden border border-slate-700/60 bg-slate-900/80 p-0.5 shrink-0 shadow cursor-pointer hover:border-indigo-400 hover:scale-110 transition-all duration-150 group/photo relative mt-0.5"
            title="Click to expand image"
          >
            <img
              src={profile.photo_url}
              alt=""
              onError={(e) => {
                const parent = (e.currentTarget as HTMLElement).closest('.group\\/photo');
                if (parent) (parent as HTMLElement).style.display = 'none';
              }}
              className="w-full h-full object-cover rounded-[4px]"
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity rounded-[4px]">
              <Maximize2 className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {isArticleOrWeb && displayTitle ? (
            <div className="text-xs text-slate-200 font-medium line-clamp-1" title={displayTitle}>
              {displayTitle}
            </div>
          ) : (
            <div className="text-xs text-slate-300 font-mono truncate">
              {displayHandle?.startsWith('@') ? displayHandle : `@${displayHandle}`}
            </div>
          )}
          {profile.snippet && (
            <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight" title={profile.snippet}>
              {profile.snippet}
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between mt-auto pt-1">
        <span>
          {faceVerified && profile.face_confidence !== undefined && profile.face_confidence !== null
            ? `Face match: ${(profile.face_confidence * 100).toFixed(0)}%`
            : profile.confidence !== undefined && profile.confidence !== null
            ? `Confidence: ${(profile.confidence * 100).toFixed(0)}%`
            : 'Unrated source'}
        </span>
        {(() => {
          const prio = getProfilePriority(profile);
          return (
            <span
              className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0"
              style={{
                backgroundColor: prio.badgeBg,
                borderColor: prio.badgeBorder,
                color: prio.badgeText,
              }}
              title={`Priority Tier ${prio.tier}: ${prio.tierLabel}`}
            >
              {prio.tierTag}
            </span>
          );
        })()}
      </div>
    </a>
  );
};

// ── Site Stacked Tile Component ─────────────────────────────────────────────
const SiteStackedTile: React.FC<{
  group: SiteGroup;
  onImageClick?: (info: ExpandedImageInfo) => void;
}> = ({ group, onImageClick }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasMultiple = group.items.length > 1;

  // Single item (e.g. non-social sites or single social profile) renders directly via ProfileTile
  if (!hasMultiple && group.items[0]) {
    return <ProfileTile profile={group.items[0]} onImageClick={onImageClick} />;
  }

  const currentItem = group.items[activeIdx] || group.items[0];

  const cfg = getPlatformConfig(group.platform);
  const Icon = cfg.icon;

  // Best verification status in the group
  const anyFaceVerified = group.items.some((it) => it.face_verified === true);
  const anyFaceMismatched = group.items.some((it) => it.face_verified === false);
  const anyTextConfirmed = group.items.some((it) => it.text_attribution === 'CONFIRMED');
  const anyTextPossible = group.items.some((it) => it.text_attribution === 'POSSIBLE');

  const isArticleOrWeb = ['scholar', 'academia', 'news', 'web'].includes(group.platform.toLowerCase());

  // Determine site display label dynamically
  let displaySiteLabel = group.siteLabel;
  if (group.siteKey === 'scholar') {
    const hasGS = group.items.some((it) => it.url?.includes('scholar.google'));
    const hasSS = group.items.some((it) => it.url?.includes('semanticscholar'));
    if (hasGS && hasSS) {
      displaySiteLabel = 'Academic & Research';
    } else if (hasSS) {
      displaySiteLabel = 'Semantic Scholar';
    } else {
      displaySiteLabel = 'Google Scholar';
    }
  }

  return (
    <div className={`${styles.stackedDeckWrapper} ${hasMultiple ? styles.hasMultiple : ''}`}>
      <div
        className={styles.stackedTile}
        style={{
          borderLeftColor: cfg.color,
          borderLeftWidth: '3px',
        }}
      >
        {/* Site Header Bar */}
        <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-800/60">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
            <div className="flex items-baseline gap-1.5 truncate">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {displaySiteLabel}
              </span>
              {group.domain && group.domain !== displaySiteLabel.toLowerCase() && (
                <span className="text-[10px] font-mono text-slate-400 truncate hidden sm:inline">
                  {group.domain}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Multiple results stacked badge */}
            {hasMultiple && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                title="Click to expand/collapse stacked sources from this site"
                className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 hover:border-indigo-500/50 rounded px-1.5 py-0.5 cursor-pointer transition-colors"
              >
                <Layers className="w-2.5 h-2.5 text-indigo-400" />
                <span>{group.items.length} STACKED</span>
                {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
            )}

            {/* Verification status pill */}
            {anyFaceVerified && (
              <span
                title="Face-verified match against uploaded probe image"
                className="text-[9px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5"
              >
                ✓ FACE
              </span>
            )}
            {!anyFaceVerified && anyFaceMismatched && (
              <span
                title="Face mismatch against probe image"
                className="text-[9px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded px-1.5 py-0.5"
              >
                ✗ FACE
              </span>
            )}
            {!anyFaceVerified && anyTextConfirmed && (
              <span
                title="Context-verified via biographical correlation"
                className="text-[9px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5"
              >
                ✓ TEXT
              </span>
            )}
            {!anyFaceVerified && !anyTextConfirmed && anyTextPossible && (
              <span
                title="Tentative attribution based on candidate footprint"
                className="text-[9px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5"
              >
                ~ POSSIBLE
              </span>
            )}

            {/* Single item direct link */}
            {!hasMultiple && currentItem.url && (
              <a
                href={currentItem.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open source URL in new tab"
                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Content Area */}
        {!isExpanded ? (
          /* COLLAPSED VIEW (or Single Item) */
          <div className="pt-2 flex flex-col justify-between flex-1">
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {currentItem.photo_url && (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onImageClick?.({
                          url: currentItem.photo_url!,
                          title: currentItem.title || currentItem.username || cfg.label,
                          subtitle: currentItem.url || undefined,
                          badge: `${cfg.label.toUpperCase()} FOOTPRINT`,
                        });
                      }}
                      className="cursor-pointer shrink-0 mt-0.5 group/thumb relative"
                      title="Click to expand image"
                    >
                      <img
                        src={currentItem.photo_url}
                        alt=""
                        onError={(e) => {
                          const parent = (e.currentTarget as HTMLElement).closest('.group\\/thumb');
                          if (parent) (parent as HTMLElement).style.display = 'none';
                        }}
                        className="w-6 h-6 rounded-md object-cover border border-slate-700/60 group-hover/thumb:border-indigo-400 group-hover/thumb:scale-110 transition-all duration-150"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    {isArticleOrWeb && (currentItem.title || currentItem.snippet) ? (
                      <div
                        className="text-xs text-slate-200 font-medium line-clamp-1 hover:text-indigo-300 transition-colors"
                        title={currentItem.title || currentItem.snippet}
                      >
                        {currentItem.title || currentItem.snippet}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300 font-mono truncate">
                        {currentItem.username
                          ? (currentItem.username.startsWith('@') ? currentItem.username : `@${currentItem.username}`)
                          : (currentItem.url ? `@${currentItem.url.split('/').filter(Boolean).pop()}` : 'unspecified')}
                      </div>
                    )}
                    {currentItem.snippet && (
                      <div
                        className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight"
                        title={currentItem.snippet}
                      >
                        {currentItem.snippet}
                      </div>
                    )}
                  </div>
                </div>

                {hasMultiple && currentItem.url && (
                  <a
                    href={currentItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open this specific result"
                    className="text-slate-400 hover:text-slate-200 p-1 shrink-0 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Bottom Meta Bar */}
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between mt-2 pt-1 border-t border-slate-800/40">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>
                  {currentItem.face_verified && currentItem.face_confidence !== undefined && currentItem.face_confidence !== null
                    ? `Face: ${(currentItem.face_confidence * 100).toFixed(0)}%`
                    : currentItem.confidence !== undefined && currentItem.confidence !== null
                    ? `Confidence: ${(currentItem.confidence * 100).toFixed(0)}%`
                    : 'Unrated source'}
                </span>
                {(() => {
                  const prio = getSiteGroupPriority(group);
                  return (
                    <span
                      className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0"
                      style={{
                        backgroundColor: prio.badgeBg,
                        borderColor: prio.badgeBorder,
                        color: prio.badgeText,
                      }}
                      title={`Priority Tier ${prio.tier}: ${prio.tierLabel}`}
                    >
                      {prio.tierTag}
                    </span>
                  );
                })()}
              </div>

              {/* Stack switcher navigation */}
              {hasMultiple && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-400 font-mono">
                    {activeIdx + 1} of {group.items.length}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={activeIdx === 0}
                      onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
                      className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={activeIdx === group.items.length - 1}
                      onClick={() => setActiveIdx((prev) => Math.min(group.items.length - 1, prev + 1))}
                      className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stack Pill Selector */}
            {hasMultiple && (
              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-800/60 overflow-x-auto py-0.5">
                {group.items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer truncate max-w-[90px] ${
                      activeIdx === idx
                        ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 font-bold'
                        : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/70 border border-transparent'
                    }`}
                    title={item.title || item.username || `Result #${idx + 1}`}
                  >
                    #{idx + 1} {item.username || (item.title ? item.title.slice(0, 8) + '…' : '')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="text-[9px] font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded px-1.5 py-0.5 flex items-center gap-0.5 cursor-pointer ml-auto shrink-0 transition-colors"
                >
                  <span>All ({group.items.length})</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* EXPANDED VIEW: ALL RESULTS NEATLY STACKED UNDER THIS SITE */
          <div className="pt-2 space-y-2">
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <span>All {group.items.length} Results from this Site</span>
                {(() => {
                  const prio = getSiteGroupPriority(group);
                  return (
                    <span
                      className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0"
                      style={{
                        backgroundColor: prio.badgeBg,
                        borderColor: prio.badgeBorder,
                        color: prio.badgeText,
                      }}
                      title={`Priority Tier ${prio.tier}: ${prio.tierLabel}`}
                    >
                      {prio.tierTag}
                    </span>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
              >
                <span>Collapse</span>
                <ChevronUp className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {group.items.map((item, idx) => {
                const itemTitle = item.title || (isArticleOrWeb && item.snippet ? item.snippet : null);
                const itemHandle = item.username || (item.url ? item.url.split('/').filter(Boolean).pop() : 'unspecified');
                return (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800/80 rounded px-1 py-0.5 shrink-0 mt-0.5">
                          #{idx + 1}
                        </span>
                        {item.photo_url && (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onImageClick?.({
                                url: item.photo_url!,
                                title: itemTitle || cfg.label,
                                subtitle: item.url || undefined,
                                badge: `${cfg.label.toUpperCase()} FOOTPRINT`,
                              });
                            }}
                            className="cursor-pointer shrink-0 mt-0.5 group/thumb relative"
                            title="Click to expand image"
                          >
                            <img
                              src={item.photo_url}
                              alt=""
                              onError={(e) => {
                                const parent = (e.currentTarget as HTMLElement).closest('.group\\/thumb');
                                if (parent) (parent as HTMLElement).style.display = 'none';
                              }}
                              className="w-5 h-5 rounded object-cover border border-slate-700/60 group-hover/thumb:border-indigo-400 group-hover/thumb:scale-110 transition-all duration-150"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          {isArticleOrWeb && itemTitle ? (
                            <div className="text-xs text-slate-200 font-medium line-clamp-1" title={itemTitle}>
                              {itemTitle}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-300 font-mono truncate">
                              {itemHandle?.startsWith('@') ? itemHandle : `@${itemHandle}`}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.text_attribution === 'CONFIRMED' && (
                          <span className="text-[8px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1">
                            ✓ TEXT
                          </span>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-200 p-0.5"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {item.snippet && (
                      <div className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight" title={item.snippet}>
                        {item.snippet}
                      </div>
                    )}

                    <div className="text-[9px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                      <span>
                        {item.face_verified && item.face_confidence !== undefined && item.face_confidence !== null
                          ? `Face: ${(item.face_confidence * 100).toFixed(0)}%`
                          : item.confidence !== undefined && item.confidence !== null
                          ? `Confidence: ${(item.confidence * 100).toFixed(0)}%`
                          : ''}
                      </span>
                      {item.url && (
                        <span className="truncate max-w-[140px] text-slate-400" title={item.url}>
                          {item.url.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Investigation Page (TRINETRA Console) ──────────────────────────────
export const InvestigationPage: React.FC = () => {
  // Scan Parameters State
  const [context, setContext] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Application Pipeline State
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'processing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logEvents, setLogEvents] = useState<PipelineEvent[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Detailed Candidate Investigation State
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPersonDetail, setSelectedPersonDetail] = useState<{
    canonical_name?: string;
    confidence?: number;
    aliases?: string[];
    profiles?: ProfileData[];
    avatar_url?: string | null;
    probe_image_url?: string | null;
    face_match_warning?: string | null;
    is_face_match?: boolean | null;
    wikipedia?: WikipediaData | null;
  } | null>(null);
  const [detailTab, setDetailTab] = useState<'agent' | 'profiles' | 'timeline' | 'graph'>('agent');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineStatus, setTimelineStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [timelineOrder, setTimelineOrder] = useState<'asc' | 'desc'>('asc');
  const [footprintFilter, setFootprintFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [graphStatus, setGraphStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // Interactive Chat State (GraphRAG Agent)
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Lightbox / Expanded Image Modal State
  const [expandedImage, setExpandedImage] = useState<ExpandedImageInfo | null>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bottom Activity Rail Expand/Collapse
  const [isRailOpen, setIsRailOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Dynamic Document Title on /investigation only
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'TRINETRA · Digital Identity Intelligence Console';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Image Upload Handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (JPEG, PNG, WebP).');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Initiate Scan Action
  const startScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!context.trim() || status === 'scanning' || status === 'processing') return;

    setStatus('scanning');
    setErrorMessage(null);
    setLogEvents([]);
    setCandidates([]);
    setSelectedPersonId(null);
    setSelectedPersonDetail(null);
    setChatHistory([]);
    setIsRailOpen(true); // Open stream rail automatically so user sees live telemetry

    const fd = new FormData();
    fd.append('context', context.trim());
    fd.append('consent_confirmed', 'true');
    if (imageFile) {
      fd.append('image', imageFile);
    }

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: fd,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(errorData.detail || `Server returned error ${response.status}`);
      }

      const data = await response.json();
      if (!data.job_id) {
        throw new Error('Backend did not return a valid job identifier.');
      }
      setJobId(data.job_id);
      setStatus('processing');
    } catch (err: any) {
      console.error('Scan dispatch failed:', err);
      setStatus('error');
      setErrorMessage(
        err.message?.includes('Failed to fetch')
          ? 'Cannot reach Backend AI Engine. Ensure FastAPI is running on port 8000.'
          : err.message || 'Failed to dispatch investigation request.'
      );
    }
  };

  // SSE Stream Listener for Live Intelligence Feed
  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`${API_BASE}/stream/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const parsed: PipelineEvent = JSON.parse(event.data);
        setLogEvents((prev) => [...prev, parsed]);

        if (parsed.type === 'COMPLETE') {
          eventSource.close();
          setStatus('complete');
          fetchCandidates(jobId);
        } else if (parsed.type === 'ERROR') {
          eventSource.close();
          setStatus('error');
          setErrorMessage(parsed.message || 'Pipeline encountered a critical error.');
          fetchCandidates(jobId);
        }
      } catch (parseErr) {
        console.error('Failed to parse SSE event data:', parseErr);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      fetchCandidates(jobId);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  // Auto-scroll the live feed log when open
  useEffect(() => {
    if (isRailOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logEvents, isRailOpen]);

  // Fetch Candidates from authoritative backend endpoint
  const fetchCandidates = async (id: string) => {
    try {
      const resp = await fetch(`${API_BASE}/candidates/${id}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
      }
      if (data.status === 'complete') {
        setStatus('complete');
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
  };

  // Inspect specific candidate
  const handleSelectPerson = async (personId: string) => {
    setSelectedPersonId(personId);
    setDetailTab('agent');
    setChatHistory([]);

    const candidateMatch = candidates.find((c) => c.person_id === personId);
    if (candidateMatch) {
      setSelectedPersonDetail({
        canonical_name: candidateMatch.canonical_name_guess,
        confidence: candidateMatch.scores?.identity_score,
        aliases: [],
        profiles: candidateMatch.profiles_found,
        avatar_url: candidateMatch.avatar_url,
        probe_image_url: candidateMatch.probe_image_url,
        face_match_warning: candidateMatch.face_match_warning,
        is_face_match: candidateMatch.is_face_match,
        wikipedia: candidateMatch.wikipedia,
      });
    }

    try {
      const resp = await fetch(`${API_BASE}/identity/${personId}`);
      if (resp.ok) {
        const detail = await resp.json();
        setSelectedPersonDetail((prev) => ({
          ...prev,
          ...detail,
          avatar_url: detail.avatar_url || prev?.avatar_url || candidateMatch?.avatar_url,
          probe_image_url: detail.probe_image_url || prev?.probe_image_url || candidateMatch?.probe_image_url,
          face_match_warning: detail.face_match_warning || prev?.face_match_warning || candidateMatch?.face_match_warning,
          is_face_match: detail.is_face_match ?? prev?.is_face_match ?? candidateMatch?.is_face_match,
          wikipedia: detail.wikipedia || prev?.wikipedia || candidateMatch?.wikipedia,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch identity details:', err);
    }
  };

  // Load Timeline when timeline tab is active
  useEffect(() => {
    if (selectedPersonId && detailTab === 'timeline') {
      setTimelineStatus('loading');
      fetch(`${API_BASE}/timeline/${selectedPersonId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Timeline not found');
          return r.json();
        })
        .then((data) => {
          setTimelineEvents(Array.isArray(data) ? data : []);
          setTimelineStatus('ready');
        })
        .catch(() => setTimelineStatus('error'));
    }
  }, [selectedPersonId, detailTab]);

  // Load Graph when graph tab is active
  useEffect(() => {
    if (selectedPersonId && detailTab === 'graph') {
      setGraphStatus('loading');
      fetch(`${API_BASE}/graph/${selectedPersonId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Graph not found');
          return r.json();
        })
        .then((data) => {
          setGraphData(data && data.nodes ? data : { nodes: [], edges: [] });
          setGraphStatus('ready');
        })
        .catch(() => setGraphStatus('error'));
    }
  }, [selectedPersonId, detailTab]);

  // Send message to GraphRAG Agent
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !selectedPersonId) return;

    const query = chatInput.trim();
    setChatInput('');
    setChatHistory((prev) => [...prev, { role: 'user', content: query }]);
    setChatLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/chat/${selectedPersonId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });

      if (!resp.ok) throw new Error('Chat API returned error');
      const data = await resp.json();
      setChatHistory((prev) => [...prev, { role: 'assistant', content: data.reply || 'No response.' }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Unable to communicate with the GraphRAG analyst engine.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const latestEvent = logEvents.length > 0 ? logEvents[logEvents.length - 1] : null;

  return (
    <div className={styles.consoleRoot}>
      {/* ── 1. ENVIRONMENTAL 3D EARTH (FIXED FULL VIEWPORT LAYER - REUSED UNCHANGED) ── */}
      <div className={styles.earthLayer} aria-hidden="true">
        <EarthBackground />
        <div className={styles.earthBackdropOverlay} />
      </div>

      {/* ── 2. SLIM TOP BAR ── */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          {/* Left: Page-Scoped Trinetra Identity */}
          <div className={styles.brandGroup}>
            <TrinetraLogo className="w-6 h-6 shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wider text-white">TRINETRA</span>
              <span className={styles.consoleBadge}>
                CONSOLE
              </span>
              <div className={styles.brandSeparator} />
              <span className={`hidden sm:inline ${styles.subBrandLabel}`}>
                DIGITAL IDENTITY INTELLIGENCE
              </span>
            </div>
          </div>

          {/* Right: Real System Status & Exit Link */}
          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            {status === 'complete' && (
              <span className={`${styles.statusPill} ${styles.statusComplete}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Scan Complete</span>
              </span>
            )}

            {(status === 'scanning' || status === 'processing') && (
              <span className={`${styles.statusPill} ${styles.statusActive}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>{status === 'scanning' ? 'Dispatching…' : 'Processing…'}</span>
              </span>
            )}

            {status === 'error' && (
              <span className={`${styles.statusPill} ${styles.statusError}`}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Attention Required</span>
              </span>
            )}

            {status === 'idle' && (
              <span className={`${styles.statusPill} ${styles.statusReady}`}>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>System Ready</span>
              </span>
            )}

            <div className={styles.brandSeparator} />

            {/* Exit Console Link */}
            <Link
              to="/"
              className={styles.exitBtn}
              title="Return to Main Website"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 3. MAIN WORKSPACE ── */}
      <main className={styles.workspace}>
        {/* ── COMMAND BAR / PRIMARY INVESTIGATION INTERFACE ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <h2 className="text-[11px] font-mono tracking-widest text-slate-300 uppercase font-semibold">
                INVESTIGATION
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400 tracking-wider">
              MULTI-SIGNAL IDENTITY ENGINE
            </span>
          </div>

          {/* Unified Horizontal Command Surface with Signature Technical Reticle Motif */}
          <div className={styles.commandSurface}>
            {/* Signature Technical Reticle Brackets */}
            <div className={styles.cornerBracketTL} />
            <div className={styles.cornerBracketTR} />
            <div className={styles.cornerBracketBL} />
            <div className={styles.cornerBracketBR} />

            <form onSubmit={startScan} className="flex flex-col gap-3">
              {/* Target Context Dominant Input */}
              <div className="relative">
                <textarea
                  id="target-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      startScan();
                    }
                  }}
                  placeholder="Enter target identity context or biographical seed (e.g., 'Sundar Pichai' or 'Linus Torvalds, Linux creator')…"
                  required
                  rows={2}
                  className={styles.targetTextarea}
                />
                <Search className="absolute top-1 right-1 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              {/* Controls Bar: Inline Image Attachment & Primary Scan Trigger */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                {/* Left: Inline Image Attachment */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-file-input"
                  />

                  {imageFile ? (
                    <div className={styles.attachChip}>
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Probe Preview"
                          className="w-5 h-5 rounded object-cover border border-indigo-400/40"
                        />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      <span className="font-mono text-slate-200 max-w-[160px] truncate" title={imageFile.name}>
                        {imageFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                      <span>Attach Probe Image</span>
                      <span className="text-[10px] text-slate-400 font-mono">(Optional)</span>
                    </button>
                  )}
                </div>

                {/* Right: Primary Initiate Scan Trigger */}
                <button
                  type="submit"
                  disabled={status === 'scanning' || status === 'processing' || !context.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                >
                  {status === 'scanning' || status === 'processing' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Scanning…</span>
                    </>
                  ) : status === 'complete' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-white" />
                      <span>Re-Scan Target</span>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-white" />
                      <span>Retry Scan</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Initiate Scan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── ERROR MESSAGE BANNER ── */}
        {errorMessage && (
          <div className="mb-6 bg-rose-950/40 border border-rose-500/30 rounded-xl p-3.5 flex items-start gap-3 text-rose-300 text-xs backdrop-blur-md">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Pipeline Notice</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── 4. OPEN STAGE & RESULTS DOSSIER ── */}
        <div className="flex-1 flex flex-col">
          {/* CASE A: IDLE STATE (Spacious Open Stage revealing 3D Earth) */}
          {status === 'idle' && candidates.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 sm:py-32 text-center select-none">
              <div className="p-3 rounded-2xl border border-slate-800/50 bg-[#070c18]/40 backdrop-blur-sm text-slate-400 mb-3 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-mono tracking-widest uppercase text-slate-300">
                  Awaiting Target Parameters
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Enter target context above to activate Trinetra’s multi-signal OSINT discovery, facial verification, and entity correlation pipeline.
              </p>
            </div>
          )}

          {/* CASE B: SCANNING / PROCESSING STATE */}
          {(status === 'scanning' || status === 'processing') && candidates.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 tracking-wider mb-1 font-mono uppercase">
                Correlating Public Identity Signals
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Extracting facial embeddings, dorking open-source intelligence, evaluating candidate permutations, and synthesizing identity graphs…
              </p>
            </div>
          )}

          {/* CASE C: FINISHED BUT 0 CANDIDATES */}
          {status === 'complete' && candidates.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md flex items-center justify-center mb-3">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 font-mono uppercase">
                No Matching Candidates Correlated
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                The investigation completed without high-confidence identity convergence. Try refining the target context or uploading an alternative probe photo.
              </p>
            </div>
          )}

          {/* CASE D: CANDIDATES DOSSIER OVERVIEW (when not inspecting deep detail) */}
          {candidates.length > 0 && !selectedPersonId && (
            <div className="space-y-4">
              {/* Compact Case Summary Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-4 rounded-xl border border-slate-800/60 bg-[#070c18]/45 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                    Identified Candidates:
                  </span>
                  <span className="text-xs font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                    {candidates.length} {candidates.length === 1 ? 'Persona' : 'Personas'} Correlated
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span>
                    Status: <strong className="text-emerald-400">Convergence Synthesized</strong>
                  </span>
                </div>
              </div>

              {/* Candidate Dossier Cards */}
              <div className="space-y-4">
                {candidates.map((cand, idx) => {
                  const verdictUpper = (cand.verdict || 'possible').toUpperCase();
                  const verdictColor =
                    cand.verdict === 'confirmed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      : cand.verdict === 'possible'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/25';

                  const identityScore =
                    cand.scores?.identity_score !== undefined
                      ? `${(cand.scores.identity_score * 100).toFixed(1)}%`
                      : '—';
                  const corroboration =
                    cand.scores?.source_corroboration !== undefined
                      ? `${(cand.scores.source_corroboration * 100).toFixed(0)}%`
                      : '—';
                  const orgOverlap =
                    cand.scores?.organization_overlap !== undefined
                      ? `${(cand.scores.organization_overlap * 100).toFixed(0)}%`
                      : '—';
                  const penalty =
                    cand.scores?.contradiction_penalty !== undefined
                      ? `${(cand.scores.contradiction_penalty * 100).toFixed(0)}%`
                      : '0%';

                  return (
                    <div
                      key={idx}
                      className={styles.dossierSurface}
                    >
                      {/* Top Header: Candidate Name, ID, Verdict + Avatar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3.5">
                          {/* Uploaded Probe Image if present */}
                          {cand.probe_image_url && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedImage({
                                  url: cand.probe_image_url!,
                                  title: cand.canonical_name_guess,
                                  subtitle: `Uploaded Probe Image · ID: ${cand.person_id}`,
                                  badge: 'QUERY PROBE IMAGE',
                                });
                              }}
                              className={`w-12 h-12 rounded-xl overflow-hidden border ${cand.is_face_match === false ? 'border-red-500/60 shadow-red-950/40 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.35)]' : 'border-amber-500/40 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.35)]'} bg-slate-900/80 p-0.5 shrink-0 ring-1 ring-white/10 shadow-md cursor-pointer hover:scale-105 transition-all duration-200 group/avatar relative`}
                              title="Click to expand uploaded query image"
                              role="button"
                              tabIndex={0}
                            >
                              <img
                                src={cand.probe_image_url}
                                alt="Query Probe"
                                className="w-full h-full object-cover rounded-[10px]"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity rounded-[10px]">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className={`absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[8px] font-mono font-bold shadow ${cand.is_face_match === false ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950'}`}>
                                {cand.is_face_match === false ? 'MISMATCH' : 'QUERY'}
                              </div>
                            </div>
                          )}

                          {/* Scraped Avatar if present and different from probe */}
                          {cand.avatar_url && cand.avatar_url !== cand.probe_image_url && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentImg = (e.currentTarget.querySelector('img')?.src) || cand.avatar_url!;
                                setExpandedImage({
                                  url: currentImg,
                                  title: cand.canonical_name_guess,
                                  subtitle: `Candidate Identity · ID: ${cand.person_id}`,
                                  badge: 'TARGET CANDIDATE AVATAR',
                                });
                              }}
                              className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-500/30 bg-slate-900/80 p-0.5 shrink-0 ring-1 ring-white/10 shadow-md cursor-pointer hover:border-indigo-400 hover:scale-105 hover:shadow-[0_0_15px_rgba(99,102,241,0.35)] transition-all duration-200 group/avatar relative"
                              title="Click to expand avatar"
                              role="button"
                              tabIndex={0}
                            >
                              <img
                                src={cand.avatar_url}
                                alt={cand.canonical_name_guess}
                                className="w-full h-full object-cover rounded-[10px]"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const currentSrc = target.src;
                                  const fallback = getFallbackAvatar(cand.profiles_found, currentSrc);
                                  if (fallback && target.dataset.fallback !== fallback) {
                                    target.dataset.fallback = fallback;
                                    target.src = fallback;
                                  } else {
                                    const container = target.closest('.group\\/avatar');
                                    if (container) (container as HTMLElement).style.display = 'none';
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity rounded-[10px]">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                              {cand.probe_image_url && (
                                <div className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-indigo-600 rounded text-[8px] font-mono font-bold text-white shadow">
                                  WEB
                                </div>
                              )}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight capitalize">
                                {cand.canonical_name_guess}
                              </h3>
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${verdictColor}`}>
                                {verdictUpper}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 select-all">
                              ID: {cand.person_id}
                            </p>
                          </div>
                        </div>

                        {/* Direct Inspect Button */}
                        <button
                          type="button"
                          onClick={() => handleSelectPerson(cand.person_id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 transition-all cursor-pointer self-start sm:self-auto"
                        >
                          <span>Inspect Intelligence Dossier</span>
                          <span className="text-indigo-400">→</span>
                        </button>
                      </div>

                      {/* Face Match Warning Banner on Candidate Card */}
                      {cand.face_match_warning && (
                        <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-red-300 font-mono text-[11px] uppercase block mb-0.5">Visual Identity Warning</span>
                            <span>{cand.face_match_warning}</span>
                          </div>
                        </div>
                      )}

                      {/* Hairline Metrics Strip */}
                      <div className={styles.metricsStrip}>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-0.5">
                            Identity Score
                          </div>
                          <div className="text-xl font-bold text-indigo-400 font-sans">
                            {identityScore}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-0.5">
                            Corroboration
                          </div>
                          <div className="text-xl font-bold text-slate-100 font-sans">
                            {corroboration}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-0.5">
                            Org Overlap
                          </div>
                          <div className="text-xl font-bold text-slate-100 font-sans">
                            {orgOverlap}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-0.5">
                            Contradiction Penalty
                          </div>
                          <div className={`text-xl font-bold font-sans ${cand.scores?.contradiction_penalty ? 'text-rose-400' : 'text-slate-100'}`}>
                            {penalty}
                          </div>
                        </div>
                      </div>

                      {/* Wikipedia Biographical Intelligence Card */}
                      {cand.wikipedia && (cand.wikipedia.summary || (cand.wikipedia.facts && cand.wikipedia.facts.length > 0)) && (
                        <div className="mb-4 p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-lg relative overflow-hidden">
                          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-800/80">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <Globe className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
                                Wikipedia Biographical Intelligence
                              </span>
                            </div>
                            {cand.wikipedia.url && (
                              <a
                                href={cand.wikipedia.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                <span>en.wikipedia.org</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {/* Summary (a few lines) */}
                          {cand.wikipedia.summary && (
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                              {cand.wikipedia.summary}
                            </p>
                          )}

                          {/* Bullet Points Facts */}
                          {cand.wikipedia.facts && cand.wikipedia.facts.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300/90 font-semibold mb-1 flex items-center gap-1.5">
                                <span>Key Verified Facts</span>
                                <span className="text-[9px] text-slate-400 font-normal">({cand.wikipedia.facts.length} points)</span>
                              </div>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {cand.wikipedia.facts.map((fact, fIdx) => (
                                  <li key={fIdx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/40 border border-slate-700/40 rounded-lg p-2">
                                    <span className="text-indigo-400 mt-0.5 font-bold leading-none shrink-0">•</span>
                                    <span className="leading-snug">{fact}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Discovered Corroborated Footprints */}
                      {cand.profiles_found && cand.profiles_found.length > 0 ? (
                        <div>
                          <div className="text-xs text-slate-400 font-mono mb-2.5 flex items-center justify-between">
                            <span>Corroborated Open-Source Footprints</span>
                            <span className="text-[10px] text-slate-400">
                              {cand.profiles_found.length} sources across {groupProfilesBySite(cand.profiles_found).length} sites
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 items-start">
                            {groupProfilesBySite(cand.profiles_found).map((group) => (
                              <SiteStackedTile key={group.siteKey} group={group} onImageClick={setExpandedImage} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic py-1">
                          No public social or code profiles explicitly confirmed for this candidate.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CASE E: DEEP INTELLIGENCE VIEW (Candidate Selected) */}
          {selectedPersonId && (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setSelectedPersonId(null)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Candidates Overview</span>
              </button>

              {/* Dossier Header Banner with Scraped Image at Top Right */}
              <div className={styles.dossierSurface}>
                <div className="flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-6 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-2xl sm:text-3xl font-bold text-white capitalize tracking-tight">
                        {selectedPersonDetail?.canonical_name || 'Target Identity'}
                      </h3>
                      {selectedPersonDetail?.confidence && (
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full w-fit">
                          Confidence: {(selectedPersonDetail.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                      <a
                        href={`${API_BASE}/report/${selectedPersonId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 transition-all shadow-sm cursor-pointer ml-auto"
                        title="Export and Print Full Dossier Report as HTML / PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Export Dossier (HTML)</span>
                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                      </a>
                    </div>

                    <p className="text-xs font-mono text-indigo-400 mb-3 select-all">
                      Persona Identifier: {selectedPersonId}
                    </p>

                    {selectedPersonDetail?.aliases && selectedPersonDetail.aliases.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <span className="text-xs text-slate-400 font-mono mr-1">Correlated Handles:</span>
                        {selectedPersonDetail.aliases.map((alias, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-slate-300 font-mono"
                          >
                            @{alias}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      Trinetra has mapped this identity across unstructured web mentions, chronological milestones, and relational knowledge topology.
                    </p>
                  </div>

                  {/* Top Right Visual Identity: Uploaded Probe Image & Scraped Web Image */}
                  {(selectedPersonDetail?.probe_image_url || selectedPersonDetail?.avatar_url) && (
                    <div className="shrink-0 flex items-center gap-3 self-center sm:self-start">
                      {/* Uploaded Probe Image if present */}
                      {selectedPersonDetail?.probe_image_url && (
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            onClick={() => {
                              setExpandedImage({
                                url: selectedPersonDetail.probe_image_url!,
                                title: selectedPersonDetail.canonical_name || 'Uploaded Probe Image',
                                subtitle: 'Target Identity Query Image (Uploaded with Search)',
                                badge: 'QUERY PROBE IMAGE',
                              });
                            }}
                            className="relative group cursor-pointer"
                            title="Click to expand uploaded query image"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setExpandedImage({
                                  url: selectedPersonDetail.probe_image_url!,
                                  title: selectedPersonDetail.canonical_name || 'Uploaded Probe Image',
                                  subtitle: 'Target Identity Query Image (Uploaded with Search)',
                                  badge: 'QUERY PROBE IMAGE',
                                });
                              }
                            }}
                          >
                            <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 ${selectedPersonDetail.is_face_match === false ? 'border-red-500/70 shadow-red-950/60 group-hover:border-red-400 group-hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]' : 'border-amber-500/50 shadow-amber-950/40 group-hover:border-amber-400 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]'} bg-slate-900/90 p-1 ring-1 ring-white/10 group-hover:scale-105 transition-all duration-200`}>
                              <img
                                src={selectedPersonDetail.probe_image_url}
                                alt="Uploaded Query Probe"
                                className="w-full h-full object-cover rounded-[12px]"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none rounded-[12px]" />
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[12px]">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-mono font-bold shadow-lg backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-200">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>EXPAND</span>
                                </div>
                              </div>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-black shadow-lg tracking-wider uppercase ${selectedPersonDetail.is_face_match === false ? 'bg-red-600 text-white border border-red-400/60' : 'bg-amber-500 text-slate-950 border border-amber-300/60'}`}>
                              {selectedPersonDetail.is_face_match === false ? 'MISMATCH ✕' : 'QUERY'}
                            </div>
                          </div>
                          <span className="text-[10px] text-amber-400/90 font-mono tracking-wider uppercase flex items-center gap-1">
                            Probe Image <Maximize2 className="w-2.5 h-2.5 text-amber-400" />
                          </span>
                        </div>
                      )}

                      {/* Scraped Target Image if present and distinct */}
                      {selectedPersonDetail?.avatar_url && selectedPersonDetail.avatar_url !== selectedPersonDetail.probe_image_url && (
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            onClick={(e) => {
                              const currentImg = (e.currentTarget.querySelector('img')?.src) || selectedPersonDetail.avatar_url!;
                              setExpandedImage({
                                url: currentImg,
                                title: selectedPersonDetail.canonical_name || 'Scraped Target Person',
                                subtitle: 'Extracted Profile Headshot & Visual Corroboration',
                                badge: 'SCRAPED TARGET IMAGE',
                              });
                            }}
                            className="relative group cursor-pointer"
                            title="Click to expand full resolution image"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const currentImg = (e.currentTarget.querySelector('img')?.src) || selectedPersonDetail.avatar_url!;
                                setExpandedImage({
                                  url: currentImg,
                                  title: selectedPersonDetail.canonical_name || 'Scraped Target Person',
                                  subtitle: 'Extracted Profile Headshot & Visual Corroboration',
                                  badge: 'SCRAPED TARGET IMAGE',
                                });
                              }
                            }}
                          >
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-xl shadow-indigo-950/60 bg-slate-900/90 p-1 ring-1 ring-white/10 group-hover:border-indigo-400 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-200">
                              <img
                                src={selectedPersonDetail.avatar_url}
                                alt={selectedPersonDetail.canonical_name || 'Scraped Target Person'}
                                className="w-full h-full object-cover rounded-[12px]"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const currentSrc = target.src;
                                  const fallback = getFallbackAvatar(selectedPersonDetail?.profiles, currentSrc);
                                  if (fallback && target.dataset.fallback !== fallback) {
                                    target.dataset.fallback = fallback;
                                    target.src = fallback;
                                  } else {
                                    const parent = target.closest('.group');
                                    if (parent) (parent as HTMLElement).style.display = 'none';
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none rounded-[12px]" />

                              {/* Hover Expand Action Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[12px]">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/90 text-white text-[10px] font-mono font-semibold shadow-lg backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-200">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>EXPAND</span>
                                </div>
                              </div>
                            </div>

                            {/* SCRAPED BADGE */}
                            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-indigo-600/95 border border-indigo-400/50 rounded-md text-[9px] font-mono font-bold text-white shadow-lg tracking-wider uppercase group-hover:bg-indigo-500 transition-colors">
                              {selectedPersonDetail.probe_image_url ? 'SCRAPED' : 'TARGET'}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase flex items-center gap-1">
                            Web Avatar <Maximize2 className="w-2.5 h-2.5 text-indigo-400" />
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Face Match Warning Banner in Dossier Header */}
                {selectedPersonDetail?.face_match_warning && (
                  <div className="mt-4 p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 flex items-start gap-3 text-sm text-red-200 shadow-lg shadow-red-950/50">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-300 tracking-wide text-xs uppercase font-mono">
                        Visual Identity Mismatch Warning
                      </div>
                      <div className="text-red-200/90 text-xs sm:text-sm mt-0.5">
                        {selectedPersonDetail.face_match_warning}
                      </div>
                    </div>
                  </div>
                )}

                {/* Wikipedia Intelligence Card in Dossier Header */}
                {selectedPersonDetail?.wikipedia && (selectedPersonDetail.wikipedia.summary || (selectedPersonDetail.wikipedia.facts && selectedPersonDetail.wikipedia.facts.length > 0)) && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                          <Globe className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
                          Wikipedia Biographical Intelligence
                        </span>
                      </div>
                      {selectedPersonDetail.wikipedia.url && (
                        <a
                          href={selectedPersonDetail.wikipedia.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <span>en.wikipedia.org</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Summary (a few lines) */}
                    {selectedPersonDetail.wikipedia.summary && (
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                        {selectedPersonDetail.wikipedia.summary}
                      </p>
                    )}

                    {/* Bullet Points Facts */}
                    {selectedPersonDetail.wikipedia.facts && selectedPersonDetail.wikipedia.facts.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300/90 font-semibold mb-1 flex items-center gap-1.5">
                          <span>Key Verified Facts</span>
                          <span className="text-[9px] text-slate-400 font-normal">({selectedPersonDetail.wikipedia.facts.length} points)</span>
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedPersonDetail.wikipedia.facts.map((fact, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/40 border border-slate-700/40 rounded-lg p-2">
                              <span className="text-indigo-400 mt-0.5 font-bold leading-none shrink-0">•</span>
                              <span className="leading-snug">{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tab Navigation Strip */}
              <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2 overflow-x-auto">
                {[
                  { id: 'agent', label: 'Analyst Agent (GraphRAG)', icon: MessageSquare },
                  { id: 'profiles', label: 'Profiles & Footprints', icon: User },
                  { id: 'graph', label: 'Topology Graph', icon: Network },
                  { id: 'timeline', label: 'Chronological Timeline', icon: Clock },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDetailTab(id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all shrink-0 ${
                      detailTab === id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: ANALYST AGENT (GraphRAG Interrogation) */}
              {detailTab === 'agent' && (
                <div className={`${styles.dossierSurface} flex flex-col h-[460px]`}>
                  <div className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    <span>GraphRAG Analyst Engine</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                    {chatHistory.length === 0 && (
                      <div className="text-slate-400 text-xs italic m-auto text-center py-20">
                        Query the synthesized intelligence graph regarding{' '}
                        <span className="text-slate-300 font-semibold">
                          {selectedPersonDetail?.canonical_name || 'this identity'}
                        </span>
                        …
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 not-italic">
                          {[
                            'Where does this person work?',
                            'What organizations are linked?',
                            'Summarize chronological timeline',
                          ].map((promptText, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setChatInput(promptText)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-[11px] text-slate-300 transition-colors cursor-pointer"
                            >
                              "{promptText}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white rounded-tr-sm'
                              : 'bg-[#040813] text-slate-200 border border-slate-800 rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#040813] border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask the Trinetra analyst agent about this identity…"
                      className="flex-1 bg-[#040813] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: CORROBORATED PROFILES & FOOTPRINTS */}
              {detailTab === 'profiles' && (
                <div className={styles.dossierSurface}>
                  {selectedPersonDetail?.profiles && selectedPersonDetail.profiles.length > 0 ? (
                    <div className="space-y-4">
                      {/* Priority Filter Bar */}
                      {(() => {
                        const allGroups = groupProfilesBySite(selectedPersonDetail.profiles);
                        const p1Count = allGroups.filter((g) => getSiteGroupPriority(g).tier === 1).length;
                        const p2Count = allGroups.filter((g) => getSiteGroupPriority(g).tier === 2).length;
                        const p3Count = allGroups.filter((g) => getSiteGroupPriority(g).tier === 3).length;
                        const p4Count = allGroups.filter((g) => getSiteGroupPriority(g).tier === 4).length;

                        const filteredGroups =
                          footprintFilter === 'all'
                            ? allGroups
                            : allGroups.filter((g) => getSiteGroupPriority(g).tier === footprintFilter);

                        return (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setFootprintFilter('all')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                    footprintFilter === 'all'
                                      ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 font-semibold'
                                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                                  }`}
                                >
                                  All Footprints ({allGroups.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFootprintFilter(1)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                    footprintFilter === 1
                                      ? 'bg-blue-500/25 text-blue-200 border border-blue-500/40 font-semibold'
                                      : 'bg-slate-900/60 text-slate-400 hover:text-blue-300 border border-slate-800/80'
                                  }`}
                                >
                                  P1: LinkedIn ({p1Count})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFootprintFilter(2)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                    footprintFilter === 2
                                      ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40 font-semibold'
                                      : 'bg-slate-900/60 text-slate-400 hover:text-purple-300 border border-slate-800/80'
                                  }`}
                                >
                                  P2: Socials ({p2Count})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFootprintFilter(3)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                    footprintFilter === 3
                                      ? 'bg-teal-500/25 text-teal-200 border border-teal-500/40 font-semibold'
                                      : 'bg-slate-900/60 text-slate-400 hover:text-teal-300 border border-slate-800/80'
                                  }`}
                                >
                                  P3: Scholar ({p3Count})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFootprintFilter(4)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                    footprintFilter === 4
                                      ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40 font-semibold'
                                      : 'bg-slate-900/60 text-slate-400 hover:text-amber-300 border border-slate-800/80'
                                  }`}
                                >
                                  P4: Articles ({p4Count})
                                </button>
                              </div>

                              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>Priority: LinkedIn → Socials → Scholar → Articles</span>
                              </div>
                            </div>

                            {filteredGroups.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-start">
                                {filteredGroups.map((group) => (
                                  <SiteStackedTile key={group.siteKey} group={group} onImageClick={setExpandedImage} />
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 text-slate-400 text-xs">
                                No footprint sources found in this priority tier.
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No public digital profiles or footprint articles recorded in this identity record.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RELATIONAL TOPOLOGY GRAPH */}
              {detailTab === 'graph' && (
                <div className={styles.dossierSurface}>
                  <KnowledgeGraphView
                    personId={selectedPersonId}
                    graphData={graphData}
                    graphStatus={graphStatus}
                    onRetry={() => {
                      if (selectedPersonId) {
                        setGraphStatus('loading');
                        fetch(`${API_BASE}/graph/${selectedPersonId}`)
                          .then((r) => {
                            if (!r.ok) throw new Error('Graph not found');
                            return r.json();
                          })
                          .then((data) => {
                            setGraphData(data && data.nodes ? data : { nodes: [], edges: [] });
                            setGraphStatus('ready');
                          })
                          .catch(() => setGraphStatus('error'));
                      }
                    }}
                  />
                </div>
              )}

              {/* TAB 4: CHRONOLOGICAL TIMELINE */}
              {detailTab === 'timeline' && (() => {
                const parseTimelineYear = (d?: string): number => {
                  if (!d) return 9999;
                  const match = String(d).match(/\b(19\d\d|20\d\d)\b/);
                  return match ? parseInt(match[1], 10) : 9999;
                };

                const processedTimelineEvents = [...timelineEvents]
                  .filter((ev) => {
                    if (timelineFilter === 'all') return true;
                    if (timelineFilter === 'employment') return ev.type === 'employment';
                    if (timelineFilter === 'education') return ev.type === 'education';
                    if (timelineFilter === 'publication') return ev.type === 'publication';
                    if (timelineFilter === 'social') return ev.type === 'social_joining';
                    if (timelineFilter === 'other') return !['employment', 'education', 'publication', 'social_joining'].includes(ev.type || '');
                    return true;
                  })
                  .sort((a, b) => {
                    const yearA = parseTimelineYear(a.date);
                    const yearB = parseTimelineYear(b.date);
                    return timelineOrder === 'asc' ? yearA - yearB : yearB - yearA;
                  });

                const timelineCounts = {
                  all: timelineEvents.length,
                  employment: timelineEvents.filter(e => e.type === 'employment').length,
                  education: timelineEvents.filter(e => e.type === 'education').length,
                  publication: timelineEvents.filter(e => e.type === 'publication').length,
                  social: timelineEvents.filter(e => e.type === 'social_joining').length,
                  other: timelineEvents.filter(e => !['employment', 'education', 'publication', 'social_joining'].includes(e.type || '')).length,
                };

                return (
                  <div className={styles.dossierSurface}>
                    {timelineStatus === 'loading' && (
                      <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Loading chronological OSINT footprint…</span>
                      </div>
                    )}

                    {timelineStatus === 'ready' && timelineEvents.length > 0 && (
                      <div className="space-y-4">
                        {/* Timeline Header Controls Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              { id: 'all', label: 'All', count: timelineCounts.all },
                              { id: 'employment', label: 'Employment', count: timelineCounts.employment },
                              { id: 'education', label: 'Education', count: timelineCounts.education },
                              { id: 'publication', label: 'Publications', count: timelineCounts.publication },
                              { id: 'social', label: 'Footprints', count: timelineCounts.social },
                              { id: 'other', label: 'Other', count: timelineCounts.other },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setTimelineFilter(tab.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1.5 border ${
                                  timelineFilter === tab.id
                                    ? 'bg-indigo-600/25 text-indigo-300 border-indigo-500/50 font-semibold shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                                    : 'bg-[#070c18]/60 text-slate-400 border-slate-800/60 hover:text-slate-200 hover:border-slate-700'
                                }`}
                              >
                                <span>{tab.label}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                                    timelineFilter === tab.id
                                      ? 'bg-indigo-500/40 text-indigo-100'
                                      : 'bg-slate-800/80 text-slate-400'
                                  }`}
                                >
                                  {tab.count}
                                </span>
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setTimelineOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-300 bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:text-white transition-colors"
                            title="Toggle Chronological Direction"
                          >
                            <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                            <span>{timelineOrder === 'asc' ? 'Chronological (Oldest First)' : 'Reverse (Newest First)'}</span>
                          </button>
                        </div>

                        {/* Chronological Spine & Event Cards */}
                        <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-2 relative pl-8 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-indigo-500/60 before:via-purple-500/40 before:to-emerald-500/30">
                          {processedTimelineEvents.map((ev: any, i) => {
                            let badgeColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                            let nodeColor = 'border-slate-500/40 bg-slate-900/90 text-slate-400';
                            let IconComponent = Clock;

                            switch (ev.type) {
                              case 'employment':
                                badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                                nodeColor = 'border-emerald-500/50 bg-emerald-950/90 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]';
                                IconComponent = Briefcase;
                                break;
                              case 'education':
                                badgeColor = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
                                nodeColor = 'border-sky-500/50 bg-sky-950/90 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.25)]';
                                IconComponent = GraduationCap;
                                break;
                              case 'publication':
                                badgeColor = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
                                nodeColor = 'border-purple-500/50 bg-purple-950/90 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.25)]';
                                IconComponent = BookOpen;
                                break;
                              case 'social_joining':
                                badgeColor = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
                                nodeColor = 'border-rose-500/50 bg-rose-950/90 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.25)]';
                                IconComponent = Globe;
                                break;
                              default:
                                badgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                                nodeColor = 'border-amber-500/50 bg-amber-950/90 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]';
                                IconComponent = Award;
                                break;
                            }

                            return (
                              <div key={i} className="relative group">
                                {/* Glowing Spine Node Badge */}
                                <div
                                  className={`absolute -left-8 top-3 w-7 h-7 rounded-full border flex items-center justify-center backdrop-blur-md transition-transform group-hover:scale-110 ${nodeColor}`}
                                >
                                  <IconComponent className="w-3.5 h-3.5" />
                                </div>

                                {/* Milestone Card */}
                                <div className="bg-[#030610]/80 border border-slate-800/80 hover:border-indigo-500/40 transition-all rounded-xl p-3.5 text-xs backdrop-blur-sm shadow-sm">
                                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[11px] font-semibold tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded shadow-[0_0_6px_rgba(99,102,241,0.15)]">
                                        {ev.date || 'Undated'}
                                      </span>
                                      {ev.type && (
                                        <span className={`text-[9px] font-mono uppercase border px-1.5 py-0.5 rounded font-medium ${badgeColor}`}>
                                          {ev.type.replace('_', ' ')}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {ev.confidence && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                          Conf: {(ev.confidence * 100).toFixed(0)}%
                                        </span>
                                      )}
                                      {ev.source_url ? (
                                        <a
                                          href={ev.source_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                          <span>{ev.source || 'Source'}</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      ) : ev.source ? (
                                        <span className="text-[10px] font-mono text-slate-400">
                                          {ev.source}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <p className="font-medium text-slate-100 leading-relaxed text-xs">
                                    {ev.event}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {timelineStatus === 'ready' && timelineEvents.length === 0 && (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        No chronological milestones recorded for this identity.
                      </div>
                    )}
                    {timelineStatus === 'error' && (
                      <div className="text-center py-12 text-rose-400 text-xs">
                        Failed to load timeline events.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      {/* ── 5. DOCKED ACTIVITY RAIL (LIVE INTELLIGENCE STREAM) ── */}
      <footer className={styles.activityRail}>
        {/* Rail Top Ticker / Header */}
        <div
          onClick={() => setIsRailOpen(!isRailOpen)}
          className={styles.activityRailBar}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 shrink-0">
              <Activity
                className={`w-3.5 h-3.5 ${
                  status === 'scanning' || status === 'processing'
                    ? 'text-indigo-400 animate-pulse'
                    : 'text-emerald-400'
                }`}
              />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-semibold">
                LIVE FEED
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                {logEvents.length}
              </span>
            </div>

            {/* Real-Time Telemetry Ticker */}
            <div className="truncate text-xs font-mono text-slate-400 flex items-center gap-2">
              {latestEvent ? (
                <>
                  <span className="text-indigo-400 shrink-0">[{latestEvent.step || 'pipeline'}]</span>
                  <span
                    className={
                      latestEvent.type === 'ERROR'
                        ? 'text-rose-400'
                        : latestEvent.type === 'FINDING'
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                    }
                  >
                    {latestEvent.message}
                  </span>
                </>
              ) : (
                <span className="italic text-slate-400">Awaiting investigation…</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0 ml-3">
            <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:inline">
              {isRailOpen ? 'Collapse' : 'Expand'}
            </span>
            {isRailOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        {/* Expanded Event Log Drawer */}
        {isRailOpen && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4 pt-1">
            <div className="h-44 overflow-y-auto font-mono text-xs space-y-1.5 p-3 rounded-xl bg-[#020409]/90 border border-slate-800/70 pr-2">
              {logEvents.length === 0 ? (
                <div className="text-slate-400 italic py-6 text-center">
                  Awaiting scan initiation…
                </div>
              ) : (
                logEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-slate-400 shrink-0 text-[11px]">
                      [{ev.step || 'pipeline'}]
                    </span>
                    <span
                      className={
                        ev.type === 'ERROR'
                          ? 'text-rose-400'
                          : ev.type === 'FINDING'
                          ? 'text-emerald-300'
                          : 'text-slate-300'
                      }
                    >
                      {ev.message}
                    </span>
                  </div>
                ))
              )}
              {(status === 'scanning' || status === 'processing') && (
                <div className="flex items-center gap-2 text-slate-400 italic pt-1">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span>Processing intelligence pipeline…</span>
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </footer>

      {/* ── Expanded Image Lightbox Modal ── */}
      {expandedImage && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setExpandedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Target Visual Intelligence Expansion"
        >
          <div
            className={styles.modalDialog}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399] shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 rounded px-1.5 py-0.5 uppercase shrink-0">
                      {expandedImage.badge || 'TARGET VISUAL INTELLIGENCE'}
                    </span>
                    {expandedImage.title && (
                      <span className="text-sm font-semibold text-white truncate">
                        {expandedImage.title}
                      </span>
                    )}
                  </div>
                  {expandedImage.subtitle && (
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={expandedImage.subtitle}>
                      {expandedImage.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <a
                  href={expandedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                  title="Open full resolution in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedImage(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Visual Presentation */}
            <div className={styles.modalBody}>
              <div className="relative group max-w-full max-h-[72vh] rounded-xl overflow-hidden border border-indigo-500/30 shadow-2xl bg-black/60 p-1 ring-1 ring-white/10">
                <img
                  src={expandedImage.url}
                  alt={expandedImage.title || 'Expanded target visual'}
                  className="w-auto h-auto max-w-full max-h-[70vh] object-contain rounded-lg block mx-auto"
                />
                {/* Tech reticle corners */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-indigo-400/80 pointer-events-none" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-indigo-400/80 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-indigo-400/80 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-indigo-400/80 pointer-events-none" />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                <span className="text-emerald-400">●</span> High-Resolution Visual Corroboration
              </span>
              <span className="text-slate-500 text-[11px]">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Esc</kbd> or click outside to dismiss
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
