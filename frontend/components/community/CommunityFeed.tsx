"use client";

import { useState } from "react";
import { Heart, Pin, Trash2, PenLine, X } from "lucide-react";
import { useAuthState } from "@/lib/store/authStore";
import { useGetCommunityFeed } from "@/lib/react-query/hooks/community/useGetCommunityFeed";
import { useCreateCommunityPost } from "@/lib/react-query/hooks/community/useCreateCommunityPost";
import { useTogglePostLike } from "@/lib/react-query/hooks/community/useTogglePostLike";
import { useDeleteCommunityPost } from "@/lib/react-query/hooks/community/useDeleteCommunityPost";
import { useTogglePostPin } from "@/lib/react-query/hooks/community/useTogglePostPin";
import { CommunityPost } from "@/lib/types/community";

const MAX_BODY = 1000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ author }: { author: CommunityPost["author"] }) {
  const initials = `${author.firstname?.[0] ?? ""}${author.lastname?.[0] ?? ""}`.toUpperCase();
  if (author.profilePicture) {
    return (
      <img
        src={author.profilePicture}
        alt={`${author.firstname} ${author.lastname}`}
        className="w-9 h-9 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
        {initials || "?"}
      </span>
    </div>
  );
}

// ─── Write Post Modal ─────────────────────────────────────────────────────────

function WritePostModal({ onClose }: { onClose: () => void }) {
  const [body, setBody] = useState("");
  const createPost = useCreateCommunityPost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    await createPost.mutateAsync({ body: body.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Share with the community</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="relative">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
              placeholder="Share an update, opportunity, or milestone..."
              rows={5}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 placeholder:text-gray-400"
              autoFocus
            />
            <span
              className={`absolute bottom-3 right-3 text-xs ${
                body.length >= MAX_BODY
                  ? "text-red-500"
                  : "text-gray-400"
              }`}
            >
              {body.length}/{MAX_BODY}
            </span>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!body.trim() || createPost.isPending}
              className="px-4 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createPost.isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  isAdmin,
  currentUserId,
}: {
  post: CommunityPost;
  isAdmin: boolean;
  currentUserId?: string;
}) {
  const toggleLike = useTogglePostLike();
  const deletePost = useDeleteCommunityPost();
  const togglePin = useTogglePostPin();

  const canDelete = isAdmin || post.authorUserId === currentUserId;

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border transition-shadow hover:shadow-sm ${
        post.isPinned
          ? "border-amber-200 dark:border-amber-800"
          : "border-gray-100 dark:border-gray-800"
      }`}
    >
      <div className="p-4">
        {/* Pin indicator */}
        {post.isPinned && (
          <div className="flex items-center gap-1.5 mb-3 text-amber-600 dark:text-amber-400">
            <Pin className="w-3.5 h-3.5 fill-current" />
            <span className="text-xs font-medium">Pinned</span>
          </div>
        )}

        {/* Author row */}
        <div className="flex items-start gap-3">
          <Avatar author={post.author} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                  {post.author.firstname} {post.author.lastname}
                </p>
                {post.author.username && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    @{post.author.username}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 pt-0.5">
                {timeAgo(post.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
          {post.body}
        </p>

        {/* Footer: like + admin actions */}
        <div className="mt-4 flex items-center justify-between">
          {/* Like button */}
          <button
            type="button"
            onClick={() => toggleLike.mutate(post.id)}
            disabled={toggleLike.isPending}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            aria-label="Toggle like"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                post.likeCount > 0
                  ? "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400"
                  : ""
              }`}
            />
            <span>{post.likeCount}</span>
          </button>

          {/* Admin actions */}
          {(isAdmin || canDelete) && (
            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => togglePin.mutate(post.id)}
                  disabled={togglePin.isPending}
                  title={post.isPinned ? "Unpin post" : "Pin post"}
                  className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    post.isPinned
                      ? "text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-amber-500"
                  }`}
                  aria-label={post.isPinned ? "Unpin" : "Pin"}
                >
                  <Pin className={`w-4 h-4 ${post.isPinned ? "fill-current" : ""}`} />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => deletePost.mutate(post.id)}
                  disabled={deletePost.isPending}
                  title="Delete post"
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  aria-label="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Feed Skeleton ────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-20" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CommunityFeed (main export) ──────────────────────────────────────────────

export default function CommunityFeed() {
  const { user } = useAuthState();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useGetCommunityFeed(page, 20);

  const isAdmin = user?.role === "admin";
  const posts = data?.items ?? [];
  const meta = data;

  return (
    <div className="max-w-2xl">
      {/* Write a Post CTA */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full mb-6 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {user?.firstname?.[0]}
            {user?.lastname?.[0]}
          </span>
        </div>
        <span className="flex-1">Share an update, opportunity, or milestone...</span>
        <PenLine className="w-4 h-4 shrink-0" />
      </button>

      {/* Feed */}
      {isLoading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PenLine className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-4" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No posts yet
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Be the first to share something with the community.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isAdmin={isAdmin}
                currentUserId={user?.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Page {page} of {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showModal && <WritePostModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
