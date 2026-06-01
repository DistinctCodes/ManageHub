'use client';
import React, { useState, useMemo } from 'react';

export interface Member {
  id: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  joinedDate: string;
}

interface Props {
  members: Member[];
  isLoading?: boolean;
}

/** Deterministically pick one of several accent colours from a name string. */
function nameToColour(name: string): string {
  const palette = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f97316', // orange
    '#14b8a6', // teal
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

/** Returns up to two uppercase initials from a full name. */
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Formats an ISO date string to a readable joined date, e.g. "Jan 2024". */
function formatJoinedDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(
    new Date(isoDate),
  );
}

/** Skeleton card shown while data is loading. */
function MemberCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex flex-col items-center gap-3 shadow-sm"
    >
      <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

/** A single member card. */
function MemberCard({ member }: { member: Member }) {
  const [imgError, setImgError] = useState(false);
  const showAvatar = !!member.avatarUrl && !imgError;
  const colour = nameToColour(member.fullName);
  const initials = getInitials(member.fullName);

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex flex-col items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Avatar */}
      {showAvatar ? (
        <img
          src={member.avatarUrl}
          alt={member.fullName}
          onError={() => setImgError(true)}
          className="h-16 w-16 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-200 dark:ring-indigo-700"
        />
      ) : (
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-white font-semibold text-lg select-none ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800"
          style={{ backgroundColor: colour, boxShadow: `0 0 0 2px ${colour}33` }}
          aria-label={`${member.fullName} avatar`}
        >
          {initials}
        </div>
      )}

      {/* Name */}
      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 text-center leading-tight">
        {member.fullName}
      </p>

      {/* Role badge */}
      <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700 capitalize">
        {member.role}
      </span>

      {/* Join date */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Joined {formatJoinedDate(member.joinedDate)}
      </p>
    </div>
  );
}

const SKELETON_COUNT = 8;

export function MemberDirectory({ members, isLoading = false }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return members;
    const lower = query.toLowerCase();
    return members.filter((m) => m.fullName.toLowerCase().includes(lower));
  }, [members, query]);

  return (
    <div className="w-full space-y-5">
      {/* Search input */}
      <div className="relative max-w-sm">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search members…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search members by name"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div
          aria-busy="true"
          aria-label="Loading members"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <MemberCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400 dark:text-gray-500 italic">
          {query ? `No members match "${query}".` : 'No members to display.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
