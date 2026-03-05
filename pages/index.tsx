import { GetServerSideProps } from "next";
import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../components/layout/Layout";
import PostCard from "../components/feed/PostCard";
import { fetcher, uploadFile } from "../lib/api-client";
import { Question } from "../types";

type FeedProps = {
  items: Question[];
};

import { useAuth } from "../components/auth/AuthContext";

export default function Home({ items }: FeedProps) {
  const router = useRouter();
  const [sort, setSort] = useState<"latest" | "hot">("latest");
  const { isGuest } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGuest) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const question_text = formData.get("question_text");
    const token = localStorage.getItem("access_token");

    try {
      let media_url = null;
      if (selectedFile) {
        const uploadRes = await uploadFile(selectedFile);
        media_url = uploadRes.url;
      }

      const res = await fetch("/api/create-thread", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ question_text, media_url }),
      });

      if (!res.ok) throw new Error(await res.text());

      setSelectedFile(null);
      setMediaPreview(null);
      router.replace(router.asPath);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      console.error("Submit error:", err);
      alert(err.message || "Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* ── Sort tabs ─────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-card-dark rounded-2xl p-1 border border-border-dark">
          <button
            onClick={() => setSort("hot")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${sort === "hot"
              ? "bg-hover-dark text-white shadow-sm"
              : "text-muted-dark hover:text-gray-300"
              }`}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.99 7.99 0 01-2.343 5.657z" />
              <path d="M9.879 16.121A3 3 0 1012.015 11L11 14l-.622.622c-1.121 1.12-1.121 2.937 0 4.058l.622.622" />
            </svg>
            Hot
          </button>
          <button
            onClick={() => setSort("latest")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${sort === "latest"
              ? "bg-hover-dark text-white shadow-sm"
              : "text-muted-dark hover:text-gray-300"
              }`}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            New
          </button>
        </div>

        <div className="text-xs text-muted-dark font-medium">
          Feed: <span className="text-white capitalize">{sort}</span>
        </div>
      </div>

      {/* ── Create post (TravelThreads style) ────────────────────────── */}
      {isGuest ? (
        <div className="rounded-3xl border border-dashed border-border-dark bg-card-dark/50 p-8 mb-8 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Join the community!</h3>
          <p className="text-sm text-muted-dark mb-6">Log in or sign up to share your travel questions and help others.</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-2 rounded-full bg-hover-dark text-sm font-bold text-white hover:bg-border-dark transition-all"
            >
              Log In
            </Link>
            <Link
              href="/login?mode=signup"
              className="px-8 py-2 rounded-full bg-accent-blue text-sm font-bold text-white hover:brightness-110 transition-all shadow-lg shadow-accent-blue/20"
            >
              Sign Up
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 mb-8 shadow-sm">
          <h2 className="text-sm font-bold text-ink dark:text-gray-100 mb-4">Start a post</h2>
          <form
            onSubmit={handleSubmit}
            className="relative"
          >
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-hover-dark flex-shrink-0 flex items-center justify-center overflow-hidden border border-border-dark">
                <svg width="24" height="24" fill="currentColor" className="text-muted-dark" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="flex-1 space-y-4">
                <textarea
                  name="question_text"
                  rows={2}
                  placeholder="What's your travel question today?"
                  required
                  className="w-full rounded-xl border border-border-light dark:border-border-dark bg-transparent px-4 py-3 text-sm text-ink dark:text-gray-200 placeholder:text-muted-dark focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 outline-none transition-all resize-none"
                />

                {mediaPreview && (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border-dark group">
                    {selectedFile?.type.startsWith("video/") ? (
                      <video src={mediaPreview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaPreview} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setMediaPreview(null); }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer p-2 rounded-full hover:bg-hover-dark text-muted-dark transition-colors" title="Add media">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            setMediaPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </label>
                    <div className="text-[10px] text-muted-dark space-y-1">
                      <p>0/280</p>
                      <p className="opacity-60">Enter sends, Shift+Enter newline</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`rounded-full bg-accent-blue px-8 py-2 text-sm font-bold text-white transition-all shadow-md shadow-accent-blue/20 ${isSubmitting ? 'opacity-50' : 'hover:brightness-110 active:scale-95'}`}
                  >
                    {isSubmitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Posts list ──────────────────────────── */}
      <div className="space-y-4">
        {items.map((item) => (
          <PostCard
            key={item.id}
            id={item.id}
            title={item.title}
            authorName={item.author.display_name}
            authorId={item.author.id}
            createdAt={item.created_at}
            lastMessageAt={item.last_message_at}
            answerCount={item.answer_count ?? 0}
            voteScore={item.vote_score ?? 0}
            likeCount={item.like_count ?? 0}
            mediaUrl={item.media_url}
          />
        ))}

        {items.length === 0 && (
          <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-12 text-center">
            <p className="text-muted-dark text-sm">
              No posts yet. Be the first to create a thread!
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const data = await fetcher<{ items: FeedItem[] }>("/feed");
    return { props: { items: data.items ?? [] } };
  } catch (e: any) {
    console.error("Feed fetch failed:", e);
    return { props: { items: [] } };
  }
};
