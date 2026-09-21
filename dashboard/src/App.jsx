import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ShieldAlert, User, Activity, CheckCircle, Network, Clock, MessageSquare, ExternalLink, Globe, GitBranch, Briefcase, AtSign, Camera, Play, Layers, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, GraduationCap, Newspaper, FileText, Maximize2, X, AlertTriangle } from 'lucide-react';
import { Network as VisNetwork } from 'vis-network';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';

// Works in dev (vite proxies /api → backend) and Docker (nginx proxies /api → backend)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

// ── Platform config ──────────────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  instagram:   { color: '#e1306c', bg: '#3d0e1e', icon: Camera,        label: 'Instagram'      },
  'twitter/x': { color: '#1d9bf0', bg: '#0d2137', icon: AtSign,        label: 'Twitter / X'    },
  twitter:     { color: '#1d9bf0', bg: '#0d2137', icon: AtSign,        label: 'Twitter / X'    },
  github:      { color: '#e2e8f0', bg: '#161b22', icon: GitBranch,     label: 'GitHub'         },
  linkedin:    { color: '#0a66c2', bg: '#071d33', icon: Briefcase,     label: 'LinkedIn'       },
  youtube:     { color: '#ff0000', bg: '#2a0000', icon: Play,          label: 'YouTube'        },
  tiktok:      { color: '#69c9d0', bg: '#0a2325', icon: Globe,         label: 'TikTok'         },
  reddit:      { color: '#ff4500', bg: '#2d1a0e', icon: Globe,         label: 'Reddit'         },
  medium:      { color: '#12100e', bg: '#1a1a1a', icon: Globe,         label: 'Medium'         },
  wikipedia:   { color: '#ffffff', bg: '#333333', icon: Globe,         label: 'Wikipedia'      },
  facebook:    { color: '#1877f2', bg: '#0b1c36', icon: Globe,         label: 'Facebook'       },
  scholar:     { color: '#4285f4', bg: '#0a1d37', icon: GraduationCap, label: 'Google Scholar' },
  academia:    { color: '#38bdf8', bg: '#082138', icon: GraduationCap, label: 'Academia.edu'   },
  news:        { color: '#f59e0b', bg: '#261706', icon: Newspaper,     label: 'News / Press'   },
  web:         { color: '#c084fc', bg: '#1e0e33', icon: FileText,      label: 'Web Source'     },
};

function getPlatformConfig(platform = '') {
  return PLATFORM_CONFIG[platform.toLowerCase()] || { color: '#64748b', bg: '#1e293b', icon: Globe, label: platform };
}

// ── Site Grouping Helpers ───────────────────────────────────────────────────
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

function getSocialMetadata(p) {
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

function getSiteGroupPriority(group) {
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
      tierLabel: 'LinkedIn',
      tierTag: 'P1 · LINKEDIN',
      color: '#0a66c2',
      badgeBg: 'rgba(10, 102, 194, 0.2)',
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
      tierLabel: 'Socials',
      tierTag: 'P2 · SOCIAL',
      color: '#a855f7',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
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
      tierLabel: 'Scholar',
      tierTag: 'P3 · SCHOLAR',
      color: '#0d9488',
      badgeBg: 'rgba(13, 148, 136, 0.2)',
      badgeBorder: 'rgba(13, 148, 136, 0.4)',
      badgeText: '#2dd4bf',
      rank: subRank,
    };
  }

  // 4. Articles next (Priority 4)
  const isNews = plat === 'news' || domain.includes('news') || anyUrl.includes('news');
  return {
    tier: 4,
    tierLabel: 'Articles',
    tierTag: 'P4 · ARTICLE',
    color: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    badgeBorder: 'rgba(245, 158, 11, 0.4)',
    badgeText: '#fbbf24',
    rank: isNews ? 10 : 20,
  };
}

function getProfilePriority(p) {
  return getSiteGroupPriority({
    platform: p.platform,
    domain: '',
    siteKey: p.platform,
    items: [p],
  });
}

function getFallbackAvatar(profiles = [], failedUrl = '') {
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

function groupProfilesBySite(profiles = []) {
  const groups = {};

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

    if (prioA.tier !== prioB.tier) {
      return prioA.tier - prioB.tier;
    }
    if (prioA.rank !== prioB.rank) {
      return prioA.rank - prioB.rank;
    }
    const bestConfA = Math.max(...a.items.map((it) => it.confidence || 0), 0);
    const bestConfB = Math.max(...b.items.map((it) => it.confidence || 0), 0);
    return bestConfB - bestConfA;
  });
}


// ── Profile Tile (Single) ───────────────────────────────────────────────────
function ProfileTile({ profile }) {
  const cfg = getPlatformConfig(profile.platform);
  const Icon = cfg.icon;
  const faceVerified = profile.face_verified === true;
  const faceUnknown = profile.face_verified === null || profile.face_verified === undefined;
  const textAttr = profile.text_attribution;
  return (
    <a
      href={profile.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-2xl border p-4 transition-all hover:scale-[1.03] hover:shadow-xl cursor-pointer no-underline"
      style={{ borderColor: cfg.color + '44', background: cfg.bg }}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-6 h-6" style={{ color: cfg.color }} />
        <div className="flex items-center gap-1">
          {faceVerified && (
            <span title="Face-verified match" className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
              ✓ FACE
            </span>
          )}
          {!faceVerified && !faceUnknown && (
            <span title="Face mismatch — shown for reference only" className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5">
              ✗
            </span>
          )}
          {faceUnknown && textAttr === 'CONFIRMED' && (
            <span title="Context-verified via bio matching" className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
              ✓ TEXT
            </span>
          )}
          {faceUnknown && textAttr === 'POSSIBLE' && (
            <span title="Possibly this person — bio is thin" className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5">
              ~ POSSIBLE
            </span>
          )}
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</div>
        <div className="text-xs text-slate-400 truncate mt-0.5">@{profile.username || profile.url?.split('/').filter(Boolean).pop()}</div>
      </div>
      <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between mt-auto pt-1">
        <span>
          {faceVerified && profile.face_confidence
            ? `Face match: ${(profile.face_confidence * 100).toFixed(0)}%`
            : profile.confidence
              ? `${(profile.confidence * 100).toFixed(0)}% confidence`
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
}

// ── Site Stacked Tile ───────────────────────────────────────────────────────
function SiteStackedTile({ group }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasMultiple = group.items.length > 1;

  if (!hasMultiple && group.items[0]) {
    return <ProfileTile profile={group.items[0]} />;
  }

  const currentItem = group.items[activeIdx] || group.items[0];

  const cfg = getPlatformConfig(group.platform);
  const Icon = cfg.icon;

  const anyFaceVerified = group.items.some((it) => it.face_verified === true);
  const anyFaceMismatched = group.items.some((it) => it.face_verified === false);
  const anyTextConfirmed = group.items.some((it) => it.text_attribution === 'CONFIRMED');
  const anyTextPossible = group.items.some((it) => it.text_attribution === 'POSSIBLE');

  const isArticleOrWeb = ['scholar', 'academia', 'news', 'web'].includes(group.platform.toLowerCase());

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
    <div className={`relative ${hasMultiple ? 'pb-1' : ''}`}>
      {/* Faux stack backings when multiple items */}
      {hasMultiple && (
        <>
          <div
            className="absolute inset-x-2 -bottom-1.5 h-3 rounded-xl border border-slate-700/40 bg-slate-900/60 pointer-events-none -z-10 transition-all"
            style={{ borderColor: cfg.color + '22' }}
          />
          <div
            className="absolute inset-x-4 -bottom-3 h-3 rounded-xl border border-slate-800/40 bg-slate-950/40 pointer-events-none -z-20 transition-all"
          />
        </>
      )}

      <div
        className="flex flex-col rounded-2xl border p-3.5 transition-all hover:shadow-xl bg-slate-900/90 relative"
        style={{ borderColor: cfg.color + '55' }}
      >
        {/* Site Header */}
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
            <div className="flex items-baseline gap-1 truncate">
              <span className="text-xs font-bold truncate" style={{ color: cfg.color }}>
                {displaySiteLabel}
              </span>
              {group.domain && group.domain !== displaySiteLabel.toLowerCase() && (
                <span className="text-[10px] font-mono text-slate-500 truncate hidden sm:inline">
                  {group.domain}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasMultiple && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 rounded-full px-2 py-0.5 cursor-pointer"
              >
                <Layers className="w-2.5 h-2.5" />
                <span>{group.items.length} STACKED</span>
                {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
            )}

            {anyFaceVerified && (
              <span title="Face-verified match" className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                ✓ FACE
              </span>
            )}
            {!anyFaceVerified && anyFaceMismatched && (
              <span title="Face mismatch" className="text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5">
                ✗
              </span>
            )}
            {!anyFaceVerified && anyTextConfirmed && (
              <span title="Context-verified via bio matching" className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                ✓ TEXT
              </span>
            )}
            {!anyFaceVerified && !anyTextConfirmed && anyTextPossible && (
              <span title="Tentative attribution" className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                ~ POSSIBLE
              </span>
            )}

            {!hasMultiple && currentItem.url && (
              <a
                href={currentItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-300 p-0.5"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Content Area */}
        {!isExpanded ? (
          <div className="pt-2 flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  {isArticleOrWeb && (currentItem.title || currentItem.snippet) ? (
                    <div className="text-xs font-semibold text-slate-200 line-clamp-1" title={currentItem.title || currentItem.snippet}>
                      {currentItem.title || currentItem.snippet}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-300 font-mono truncate">
                      @{currentItem.username || currentItem.url?.split('/').filter(Boolean).pop()}
                    </div>
                  )}
                  {currentItem.snippet && (
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight" title={currentItem.snippet}>
                      {currentItem.snippet}
                    </div>
                  )}
                </div>
                {hasMultiple && currentItem.url && (
                  <a
                    href={currentItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
                    title="Open result"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between mt-2 pt-1 border-t border-slate-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>
                  {currentItem.face_verified && currentItem.face_confidence
                    ? `Face: ${(currentItem.face_confidence * 100).toFixed(0)}%`
                    : currentItem.confidence
                    ? `${(currentItem.confidence * 100).toFixed(0)}% confidence`
                    : ''}
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

              {hasMultiple && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-mono">
                    {activeIdx + 1}/{group.items.length}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={activeIdx === 0}
                      onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                      className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={activeIdx === group.items.length - 1}
                      onClick={() => setActiveIdx(Math.min(group.items.length - 1, activeIdx + 1))}
                      className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {hasMultiple && (
              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-800 overflow-x-auto">
                {group.items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer truncate max-w-[80px] ${
                      activeIdx === idx
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    #{idx + 1} {item.username || (item.title ? item.title.slice(0, 6) + '…' : '')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="ml-auto text-[9px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <span>All ({group.items.length})</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 space-y-2">
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span>All {group.items.length} Stacked Results</span>
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
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {group.items.map((item, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                        #{idx + 1} {item.title || item.username || item.url}
                      </div>
                      {item.snippet && (
                        <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                          {item.snippet}
                        </div>
                      )}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-300 p-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KnowledgeGraph ─────────────────────────────────────────────────────────────
function KnowledgeGraph({ personId, visible }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!personId) return;
    setStatus('loading');
    fetch(`${API_BASE}/graph/${personId}`)
      .then(r => { if (!r.ok) throw new Error('404'); return r.json(); })
      .then(data => {
        if (!data.nodes?.length) { setStatus('empty'); return; }
        const nodes = data.nodes.map(n => {
          const colors = {
            person: '#6366f1',
            organization: '#0d9488',
            platform: '#e11d48',
            project: '#0284c7',
            event: '#7c3aed',
            location: '#d97706',
          };
          const c = colors[n.type] || '#64748b';
          const isPerson = n.type === 'person';
          return {
            id: n.id,
            label: n.label,
            title: `${n.label} (${n.type})`,
            shape: 'dot',
            color: {
              background: c,
              border: isPerson ? '#818cf8' : '#334155',
              highlight: { background: c, border: '#ffffff' },
            },
            font: { color: '#e2e8f0', size: isPerson ? 10.5 : 8.5, face: 'Inter, system-ui, sans-serif' },
            size: isPerson ? 11 : 6.5,
            borderWidth: isPerson ? 2 : 1,
          };
        });
        const edges = data.edges.map((e, i) => ({
          id: `e${i}`,
          from: e.source,
          to: e.target,
          label: (e.relation || '').replace(/_/g, ' '),
          font: { align: 'middle', color: '#64748b', size: 8, strokeWidth: 2, strokeColor: '#0b1120' },
          color: { color: 'rgba(100, 116, 139, 0.35)', highlight: '#818cf8' },
          arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        }));
        setStatus('ready');
        // defer to next frame so containerRef has dimensions
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          if (networkRef.current) networkRef.current.destroy();
          networkRef.current = new VisNetwork(containerRef.current, { nodes, edges }, {
            layout: { hierarchical: false },
            physics: { barnesHut: { gravitationalConstant: -2800, centralGravity: 0.2, springLength: 95, springConstant: 0.04, damping: 0.1 } },
            interaction: { hover: true, zoomView: true },
          });
        });
      })
      .catch(() => setStatus('error'));
    return () => { networkRef.current?.destroy(); networkRef.current = null; };
  }, [personId]);

  // When tab becomes visible, redraw
  useEffect(() => {
    if (visible && networkRef.current) {
      setTimeout(() => networkRef.current?.fit(), 100);
    }
  }, [visible]);

  return (
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50 text-xs font-semibold tracking-wider text-slate-400 uppercase flex justify-between">
        <span>Identity Topology</span>
        <span className="font-normal normal-case text-slate-500">Scroll to zoom · Drag to pan</span>
      </div>
      <div className="relative" style={{ height: 480, background: '#0b1120' }}>
        {/* Dedicated container for vis-network - React MUST NOT render children here */}
        <div ref={containerRef} className="absolute inset-0" />
        
        {/* Overlays managed by React */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2 bg-[#0b1120] z-10">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Loading graph…
          </div>
        )}
        {status === 'empty' && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 bg-[#0b1120] z-10">No topology data yet.</div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 bg-[#0b1120] z-10">Failed to load graph.</div>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-800/40 flex flex-wrap gap-4 text-xs text-slate-400">
        {[['#6366f1','Person'],['#0d9488','Organization'],['#e11d48','Platform'],['#0284c7','Project'],['#7c3aed','Event'],['#d97706','Location']].map(([c,l])=>(
          <span key={l} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{background:c}}/>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ── EventTimeline ─────────────────────────────────────────────────────────────
function EventTimeline({ personId }) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!personId) return;
    setStatus('loading');
    fetch(`${API_BASE}/timeline/${personId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setEvents(d); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [personId]);

  if (status === 'loading') return <div className="p-10 text-center text-slate-400 animate-pulse">Loading timeline…</div>;
  if (status === 'error') return <div className="p-8 text-center text-red-400">Failed to load timeline.</div>;
  if (!events.length) return <div className="p-10 text-center text-slate-500">No chronological events found.</div>;

  const iconBg = (txt) => {
    const t = txt.toLowerCase();
    if (t.includes('work') || t.includes('sign') || t.includes('join')) return '#10b981';
    if (t.includes('study') || t.includes('univers') || t.includes('graduat')) return '#8b5cf6';
    if (t.includes('live') || t.includes('locat') || t.includes('based')) return '#f59e0b';
    return '#6366f1';
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 max-h-[580px] overflow-y-auto">
      <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase text-center mb-4">Chronological OSINT Footprint</div>
      <VerticalTimeline layout="1-column-left" lineColor="#1e293b">
        {events.map((ev, i) => (
          <VerticalTimelineElement
            key={i}
            contentStyle={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', boxShadow: 'none', borderRadius: '12px' }}
            contentArrowStyle={{ borderRight: '7px solid #334155' }}
            date={ev.date || 'Unknown'}
            dateClassName="text-slate-500 font-mono text-xs ml-4"
            iconStyle={{ background: iconBg(ev.event), color: '#fff', boxShadow: '0 0 0 3px #0f172a' }}
            icon={<Clock className="w-4 h-4" />}
          >
            <p className="text-sm !mt-0 text-slate-200 font-medium">{ev.event}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              {ev.confidence && (
                <div className="text-[10px] font-mono text-slate-500">Confidence: {(ev.confidence * 100).toFixed(1)}%</div>
              )}
              {ev.source_url && (
                <a href={ev.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">
                  {ev.source || 'Source'} ↗
                </a>
              )}
            </div>
          </VerticalTimelineElement>
        ))}
      </VerticalTimeline>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [context, setContext] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [logEvents, setLogEvents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [identityData, setIdentityData] = useState(null);
  const [activeTab, setActiveTab] = useState('agent');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setExpandedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startAnalysis = async (e) => {
    e.preventDefault();
    setStatus('processing');
    setLogEvents([]); setCandidates([]); setSelectedPerson(null); setIdentityData(null); setChatHistory([]);
    const fd = new FormData();
    fd.append('context', context);
    fd.append('consent_confirmed', 'true');
    if (imageFile) fd.append('image', imageFile);
    try {
      const r = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: fd });
      const d = await r.json();
      setJobId(d.job_id);
    } catch { setStatus('failed'); }
  };

  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(`${API_BASE}/stream/${jobId}`);
    es.onmessage = (ev) => {
      const d = JSON.parse(ev.data);
      setLogEvents(p => [...p, d]);
      if (d.type === 'COMPLETE' || d.type === 'ERROR') {
        es.close();
        setStatus(d.type === 'COMPLETE' ? 'complete' : 'failed');
        if (d.type === 'COMPLETE') fetchCandidates(jobId);
      }
    };
    return () => es.close();
  }, [jobId]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logEvents]);

  const fetchCandidates = async (id) => {
    try {
      const r = await fetch(`${API_BASE}/candidates/${id}`);
      const d = await r.json();
      setCandidates(d.candidates || []);
    } catch {}
  };

  const selectPerson = async (pid) => {
    setSelectedPerson(pid);
    setActiveTab('agent');
    setChatHistory([]);
    try {
      const [idR, clR] = await Promise.all([
        fetch(`${API_BASE}/identity/${pid}`),
        fetch(`${API_BASE}/claims/${pid}`),
      ]);
      setIdentityData({ identity: await idR.json(), claims: await clR.json() });
    } catch {}
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput; setChatInput('');
    setChatHistory(p => [...p, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const r = await fetch(`${API_BASE}/chat/${selectedPerson}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const d = await r.json();
      setChatHistory(p => [...p, { role: 'assistant', content: d.reply }]);
    } catch {
      setChatHistory(p => [...p, { role: 'assistant', content: 'Connection error.' }]);
    } finally { setChatLoading(false); }
  };

  const tabs = [
    { id: 'agent',    label: 'Agent',          Icon: MessageSquare },
    { id: 'profiles', label: 'Social Profiles', Icon: User         },
    { id: 'graph',    label: 'Graph Topology',  Icon: Network       },
    { id: 'timeline', label: 'OSINT Timeline',  Icon: Clock         },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">NeuraX</h1>
              <p className="text-xs text-gray-500 font-medium tracking-widest uppercase">Digital Identity Intelligence</p>
            </div>
          </div>
          {status === 'complete' && <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Scan Complete</span>}
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: Scan form + live log */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-gray-200">
                <Search className="w-4 h-4 text-indigo-400" /> Discovery Parameters
              </h2>
              <form onSubmit={startAnalysis} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Context</label>
                  <textarea
                    value={context} onChange={e => setContext(e.target.value)} required
                    placeholder="e.g. 'Tom Holland, actor, Spider-Man'"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-24"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Image (Optional)</label>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500" />
                </div>
                <button type="submit" disabled={status === 'processing' || !context}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {status === 'processing' ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</> : 'Initiate Scan'}
                </button>
              </form>
            </div>

            {logEvents.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 flex flex-col" style={{ maxHeight: 360 }}>
                <h3 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Live Intelligence Feed
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {logEvents.map((ev, i) => (
                    <div key={i} className="flex gap-2.5 text-xs">
                      <span className="text-gray-600 shrink-0 font-mono">[{ev.step}]</span>
                      <span className={ev.type === 'ERROR' ? 'text-red-400' : 'text-gray-300'}>{ev.message}</span>
                    </div>
                  ))}
                  {status === 'processing' && (
                    <div className="flex gap-2 text-xs"><Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" /><span className="text-gray-600 italic">Processing…</span></div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-8 space-y-6">

            {/* Candidate list */}
            {candidates.length > 0 && !selectedPerson && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" /> Identified Candidates
                </h2>
                <div className="grid gap-4">
                  {candidates.map((c, i) => (
                    <div key={i} onClick={() => selectPerson(c.person_id)}
                      className="bg-gray-900/40 border border-gray-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:bg-gray-900/80 group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3.5">
                          {/* Uploaded Probe Image */}
                          {c.probe_image_url && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedImage({
                                  url: c.probe_image_url,
                                  title: c.canonical_name_guess,
                                  subtitle: `Uploaded Probe Image · ID: ${c.person_id}`,
                                  badge: 'QUERY PROBE IMAGE'
                                });
                              }}
                              className={`w-12 h-12 rounded-xl overflow-hidden border ${c.is_face_match === false ? 'border-red-500/60 shadow-red-950/40 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.35)]' : 'border-amber-500/40 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.35)]'} bg-gray-900 p-0.5 shrink-0 ring-1 ring-white/10 shadow-md cursor-pointer hover:scale-105 transition-all duration-200 group/avatar relative`}
                              title="Click to expand uploaded query image"
                            >
                              <img
                                src={c.probe_image_url}
                                alt="Query Probe"
                                className="w-full h-full object-cover rounded-[10px]"
                              />
                              <div className="absolute inset-0 bg-gray-950/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity rounded-[10px]">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className={`absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[8px] font-mono font-bold shadow ${c.is_face_match === false ? 'bg-red-600 text-white' : 'bg-amber-500 text-gray-950'}`}>
                                {c.is_face_match === false ? 'MISMATCH' : 'QUERY'}
                              </div>
                            </div>
                          )}

                          {/* Scraped Avatar if distinct */}
                          {c.avatar_url && c.avatar_url !== c.probe_image_url && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentImg = (e.currentTarget.querySelector('img')?.src) || c.avatar_url;
                                setExpandedImage({
                                  url: currentImg,
                                  title: c.canonical_name_guess,
                                  subtitle: `Candidate ID: ${c.person_id}`,
                                  badge: 'TARGET CANDIDATE AVATAR'
                                });
                              }}
                              className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-500/30 bg-gray-900 p-0.5 shrink-0 ring-1 ring-white/10 shadow-md cursor-pointer hover:border-indigo-400 hover:scale-105 hover:shadow-[0_0_15px_rgba(99,102,241,0.35)] transition-all duration-200 group/avatar relative"
                              title="Click to expand avatar"
                            >
                              <img
                                src={c.avatar_url}
                                alt={c.canonical_name_guess}
                                className="w-full h-full object-cover rounded-[10px]"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const currentSrc = target.src;
                                  const fallback = getFallbackAvatar(c.profiles_found, currentSrc);
                                  if (fallback && target.dataset.fallback !== fallback) {
                                    target.dataset.fallback = fallback;
                                    target.src = fallback;
                                  } else {
                                    const container = target.closest('.group\\/avatar');
                                    if (container) container.style.display = 'none';
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-gray-950/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity rounded-[10px]">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                              {c.probe_image_url && (
                                <div className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-indigo-600 rounded text-[8px] font-mono font-bold text-white shadow">
                                  WEB
                                </div>
                              )}
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl font-bold text-gray-100 capitalize">{c.canonical_name_guess}</h3>
                            <p className="text-xs text-gray-600 mt-0.5 font-mono">{c.person_id}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          c.verdict === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          c.verdict === 'possible'  ? 'bg-amber-500/10  text-amber-400  border-amber-500/20'  :
                                                      'bg-red-500/10    text-red-400    border-red-500/20'}`}>
                          {c.verdict.toUpperCase()}
                        </span>
                      </div>

                      {/* Face Match Warning Alert on Candidate Card */}
                      {c.face_match_warning && (
                        <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-red-300 font-mono text-[11px] uppercase block mb-0.5">Visual Identity Warning</span>
                            <span>{c.face_match_warning}</span>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-4 gap-3 mb-5">
                        {[['Identity Score', (c.scores.identity_score*100).toFixed(1)+'%','text-indigo-400'],
                          ['Corroboration',  (c.scores.source_corroboration*100).toFixed(0)+'%','text-gray-200'],
                          ['Org Overlap',    (c.scores.organization_overlap*100).toFixed(0)+'%','text-gray-200'],
                          ['Penalty',        (c.scores.contradiction_penalty*100).toFixed(0)+'%','text-red-400']
                        ].map(([label, val, cls]) => (
                          <div key={label} className="bg-gray-950 rounded-xl p-3 border border-gray-800">
                            <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
                            <div className={`text-xl font-bold ${cls}`}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Wikipedia Biographical Intelligence Card */}
                      {c.wikipedia && (c.wikipedia.summary || (c.wikipedia.facts && c.wikipedia.facts.length > 0)) && (
                        <div className="mb-4 p-4 rounded-xl bg-gray-950 border border-gray-800 shadow-lg relative overflow-hidden">
                          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-800/80">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <Globe className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="text-xs font-mono font-bold tracking-wider text-gray-200 uppercase">
                                Wikipedia Biographical Intelligence
                              </span>
                            </div>
                            {c.wikipedia.url && (
                              <a
                                href={c.wikipedia.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                <span>en.wikipedia.org</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {/* Summary */}
                          {c.wikipedia.summary && (
                            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-3">
                              {c.wikipedia.summary}
                            </p>
                          )}

                          {/* Bullet Points Facts */}
                          {c.wikipedia.facts && c.wikipedia.facts.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300/90 font-semibold mb-1 flex items-center gap-1.5">
                                <span>Key Verified Facts</span>
                                <span className="text-[9px] text-gray-500 font-normal">({c.wikipedia.facts.length} points)</span>
                              </div>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {c.wikipedia.facts.map((fact, fIdx) => (
                                  <li key={fIdx} className="flex items-start gap-2 text-xs text-gray-300 bg-gray-900/60 border border-gray-800 rounded-lg p-2">
                                    <span className="text-indigo-400 mt-0.5 font-bold leading-none shrink-0">•</span>
                                    <span className="leading-snug">{fact}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Profile tiles on candidate card (grouped by site) */}
                      {c.profiles_found?.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 items-start">
                          {groupProfilesBySite(c.profiles_found).map((group) => (
                            <SiteStackedTile key={group.siteKey} group={group} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Identity */}
            {identityData && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => setSelectedPerson(null)}
                  className="text-sm text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                  ← Back to Candidates
                </button>

                {/* Identity Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><ShieldAlert className="w-64 h-64" /></div>
                  <div className="relative z-10 flex-1">
                    <h2 className="text-3xl font-bold mb-1 capitalize">{identityData.identity.canonical_name}</h2>
                    <p className="text-indigo-400 font-mono text-sm mb-6">Confidence: {(identityData.identity.confidence * 100).toFixed(1)}%</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {identityData.identity.aliases?.map((a, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-800/60 border border-gray-700 rounded-lg text-xs text-gray-300">@{a}</span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-400 max-w-2xl">
                      The intelligence pipeline has successfully fused this identity into a knowledge graph. Use the tabs below to explore the verified claims, timeline, and topology.
                    </p>
                  </div>

                  {/* Visual Identity: Uploaded Probe Image & Scraped Target Image */}
                  {(identityData.identity.probe_image_url || identityData.identity.avatar_url) && (
                    <div className="relative z-10 shrink-0 flex items-center gap-3 self-center sm:self-start">
                      {/* Uploaded Probe Image */}
                      {identityData.identity.probe_image_url && (
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            onClick={() => {
                              setExpandedImage({
                                url: identityData.identity.probe_image_url,
                                title: identityData.identity.canonical_name || 'Uploaded Probe Image',
                                subtitle: 'Target Identity Query Image (Uploaded with Search)',
                                badge: 'QUERY PROBE IMAGE',
                              });
                            }}
                            className="relative group cursor-pointer"
                            title="Click to expand uploaded query image"
                          >
                            <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 ${identityData.identity.is_face_match === false ? 'border-red-500/70 shadow-red-950/60 group-hover:border-red-400 group-hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]' : 'border-amber-500/50 shadow-amber-950/40 group-hover:border-amber-400 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]'} bg-gray-900 p-1 ring-1 ring-white/10 group-hover:scale-105 transition-all duration-200`}>
                              <img
                                src={identityData.identity.probe_image_url}
                                alt="Uploaded Query Probe"
                                className="w-full h-full object-cover rounded-[12px]"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-transparent pointer-events-none rounded-[12px]" />
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[12px]">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 text-gray-950 text-[10px] font-mono font-bold shadow-lg">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>EXPAND</span>
                                </div>
                              </div>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-black shadow-lg tracking-wider uppercase ${identityData.identity.is_face_match === false ? 'bg-red-600 text-white border border-red-400/60' : 'bg-amber-500 text-gray-950 border border-amber-300/60'}`}>
                              {identityData.identity.is_face_match === false ? 'MISMATCH ✕' : 'QUERY'}
                            </div>
                          </div>
                          <span className="text-[10px] text-amber-400/90 font-mono tracking-wider uppercase flex items-center gap-1">
                            Probe Image <Maximize2 className="w-2.5 h-2.5 text-amber-400" />
                          </span>
                        </div>
                      )}

                      {/* Scraped Target Image if distinct */}
                      {identityData.identity.avatar_url && identityData.identity.avatar_url !== identityData.identity.probe_image_url && (
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            onClick={(e) => {
                              const currentImg = (e.currentTarget.querySelector('img')?.src) || identityData.identity.avatar_url;
                              setExpandedImage({
                                url: currentImg,
                                title: identityData.identity.canonical_name,
                                subtitle: 'Extracted Profile Headshot & Visual Corroboration',
                                badge: 'SCRAPED TARGET IMAGE',
                              });
                            }}
                            className="relative group cursor-pointer"
                            title="Click to expand full resolution image"
                          >
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-xl shadow-indigo-950/60 bg-gray-900 p-1 ring-1 ring-white/10 group-hover:border-indigo-400 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-200">
                              <img
                                src={identityData.identity.avatar_url}
                                alt={identityData.identity.canonical_name}
                                className="w-full h-full object-cover rounded-[12px]"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const currentSrc = target.src;
                                  const fallback = getFallbackAvatar(identityData.identity.profiles, currentSrc);
                                  if (fallback && target.dataset.fallback !== fallback) {
                                    target.dataset.fallback = fallback;
                                    target.src = fallback;
                                  } else {
                                    const parent = target.closest('.group');
                                    if (parent) parent.style.display = 'none';
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-transparent pointer-events-none rounded-[12px]" />

                              {/* Hover Expand Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[12px]">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/90 text-white text-[10px] font-mono font-semibold shadow-lg">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>EXPAND</span>
                                </div>
                              </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-indigo-600 border border-indigo-400/50 rounded-md text-[9px] font-mono font-bold text-white shadow-lg tracking-wider uppercase group-hover:bg-indigo-500 transition-colors">
                              {identityData.identity.probe_image_url ? 'SCRAPED' : 'TARGET'}
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase flex items-center gap-1">
                            Web Avatar <Maximize2 className="w-2.5 h-2.5 text-indigo-400" />
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Face Match Warning Banner in Dossier Header */}
                {identityData.identity.face_match_warning && (
                  <div className="mt-4 p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 flex items-start gap-3 text-sm text-red-200 shadow-lg shadow-red-950/50">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-300 tracking-wide text-xs uppercase font-mono">
                        Visual Identity Mismatch Warning
                      </div>
                      <div className="text-red-200/90 text-xs sm:text-sm mt-0.5">
                        {identityData.identity.face_match_warning}
                      </div>
                    </div>
                  </div>
                )}

                {/* Wikipedia Intelligence Card in Selected Identity */}
                {(identityData.identity.wikipedia || identityData.wikipedia) && (
                  (() => {
                    const wiki = identityData.identity.wikipedia || identityData.wikipedia;
                    if (!wiki || (!wiki.summary && (!wiki.facts || wiki.facts.length === 0))) return null;
                    return (
                      <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-800 shadow-lg relative overflow-hidden">
                        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                              <Globe className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-xs font-mono font-bold tracking-wider text-gray-200 uppercase">
                              Wikipedia Biographical Intelligence
                            </span>
                          </div>
                          {wiki.url && (
                            <a
                              href={wiki.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              <span>en.wikipedia.org</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Summary */}
                        {wiki.summary && (
                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-3.5">
                            {wiki.summary}
                          </p>
                        )}

                        {/* Bullet Points Facts */}
                        {wiki.facts && wiki.facts.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300/90 font-semibold mb-1.5 flex items-center gap-1.5">
                              <span>Key Verified Facts</span>
                              <span className="text-[9px] text-gray-500 font-normal">({wiki.facts.length} points)</span>
                            </div>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {wiki.facts.map((fact, fIdx) => (
                                <li key={fIdx} className="flex items-start gap-2 text-xs text-gray-300 bg-gray-950/80 border border-gray-800/80 rounded-xl p-2.5">
                                  <span className="text-indigo-400 mt-0.5 font-bold leading-none shrink-0">•</span>
                                  <span className="leading-snug">{fact}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1">
                  {tabs.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === id ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>

                {/* Agent Tab */}
                {activeTab === 'agent' && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 flex flex-col" style={{ height: 500 }}>
                    <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Intelligence Agent (GraphRAG)
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 flex flex-col">
                      {chatHistory.length === 0 && (
                        <div className="text-gray-600 text-sm italic m-auto text-center">
                          Ask me anything about {identityData.identity.canonical_name}'s digital footprint…
                        </div>
                      )}
                      {chatHistory.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${
                            m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-sm'}`}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                    <form onSubmit={sendChat} className="flex gap-2">
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                        placeholder="e.g. Where does this person work?" 
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
                      <button type="submit" disabled={chatLoading || !chatInput.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl disabled:opacity-50 transition-colors text-sm font-medium">
                        Send
                      </button>
                    </form>
                  </div>
                )}

                {/* Social Profiles Tab */}
                {activeTab === 'profiles' && (
                  <div className="animate-in fade-in duration-300">
                    {identityData.identity.profiles?.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-start">
                        {groupProfilesBySite(identityData.identity.profiles).map((group) => (
                          <SiteStackedTile key={group.siteKey} group={group} />
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                        No social profiles discovered for this identity.
                      </div>
                    )}
                  </div>
                )}

                {/* Graph Tab — always mounted so vis-network gets real dimensions */}
                <div className={activeTab === 'graph' ? 'animate-in fade-in duration-300' : 'hidden'}>
                  <KnowledgeGraph personId={selectedPerson} visible={activeTab === 'graph'} />
                </div>

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                  <div className="animate-in fade-in duration-300">
                    <EventTimeline personId={selectedPerson} />
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Expanded Image Modal / Lightbox */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col bg-gray-900 border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-950/80 overflow-hidden ring-1 ring-white/10"
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-950/60">
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
                    <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5" title={expandedImage.subtitle}>
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
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  title="Open full resolution in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedImage(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="relative w-full flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-radial from-gray-900 to-gray-950">
              <div className="relative group max-w-full max-h-[72vh] rounded-xl overflow-hidden border border-indigo-500/30 shadow-2xl bg-black/60 p-1 ring-1 ring-white/10">
                <img
                  src={expandedImage.url}
                  alt={expandedImage.title || 'Expanded target visual'}
                  className="w-auto h-auto max-w-full max-h-[70vh] object-contain rounded-lg block mx-auto"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="w-full flex items-center justify-between px-5 py-2.5 border-t border-gray-800 bg-gray-950/70 text-[11px] font-mono text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">●</span> High-Resolution Visual Corroboration
              </span>
              <span className="text-gray-500">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 font-mono text-[10px]">Esc</kbd> or click outside to dismiss
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
