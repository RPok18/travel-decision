import { GetServerSideProps } from "next";
import { useState } from "react";
import { useRouter } from "next/router";

import Layout from "../../components/Layout";
import VoteButton from "../../components/VoteButton";
import CommentCard from "../../components/CommentCard";
import TimeAgo from "../../components/TimeAgo";
import { fetcher } from "../../lib/api-client";

interface Answer {
  id: number;
  answer_text: string;
  context: Record<string, string>;
  created_at?: string;
}

interface QuestionDetail {
  question: {
    id: number;
    author_id: number;
    question_text: string;
    duration: string;
    budget_tier: string;
    requirements: string[];
    status: string;
    created_at?: string;
  };
  answers: Answer[];
}

interface QuestionPageProps {
  data: QuestionDetail;
}

import { useAuth } from "../../components/AuthContext";
import Link from "next/link";

export default function QuestionPage({ data }: QuestionPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isGuest, user } = useAuth();

  const isAuthor = user && user.id === data.question.author_id;
  const isAdmin = user && user.isAdmin;
  const canDelete = isAuthor || isAdmin;

  const handleDeleteThread = async () => {
    if (!window.confirm("Are you sure you want to delete this thread? This action cannot be undone.")) return;

    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch("/api/delete-thread", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ question_id: data.question.id }),
      });

      if (!res.ok) throw new Error(await res.text());

      router.push("/");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err.message || "Failed to delete thread");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (isGuest) return;
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const body = {
      question_id: formData.get("question_id"),
      answer_text: formData.get("answer_text"),
    };
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch("/api/create-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());

      router.replace(router.asPath);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* ── Question Header (Post style) ─────────────────────── */}
      <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 mb-4 shadow-sm">
        {/* Header: Avatar + Meta */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-hover-dark flex items-center justify-center overflow-hidden border border-border-dark">
              <svg width="24" height="24" fill="currentColor" className="text-muted-dark" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink dark:text-white text-sm">
                  traveler
                </span>
                <span className="text-muted-dark text-xs">•</span>
                <span className="text-muted-dark text-xs">
                  <TimeAgo date={data.question.created_at} />
                </span>
                {isAuthor && (
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-accent-blue/10 text-[10px] font-bold text-accent-blue uppercase tracking-wider border border-accent-blue/20">
                    Author
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={handleDeleteThread}
                className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all group"
                title="Delete Thread"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button className="text-muted-dark hover:text-white transition-colors p-2">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-ink dark:text-gray-100 leading-tight mb-4">
          {data.question.question_text}
        </h1>

        {/* Tags / Flair */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-bold uppercase tracking-wide border border-accent/20">
            {data.question.status}
          </span>
          <span className="rounded-full bg-hover-light dark:bg-hover-dark border border-border-light dark:border-border-dark px-3 py-1 text-xs text-muted-dark">
            {data.question.duration}
          </span>
          <span className="rounded-full bg-hover-light dark:bg-hover-dark border border-border-light dark:border-border-dark px-3 py-1 text-xs text-muted-dark">
            {data.question.budget_tier}
          </span>
          {data.question.requirements.map((req) => (
            <span
              key={req}
              className="rounded-full bg-hover-light dark:bg-hover-dark border border-border-light dark:border-border-dark px-3 py-1 text-xs text-muted-dark"
            >
              {req}
            </span>
          ))}
        </div>

        {/* Interaction Row */}
        <div className="flex items-center gap-8 border-t border-border-light dark:border-border-dark pt-4">
          <div className={`flex items-center gap-2 group ${isGuest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <div className={`p-2 rounded-full ${isGuest ? '' : 'group-hover:bg-red-500/10'} transition-colors`}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-dark group-hover:text-red-500 transition-colors" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-muted-dark group-hover:text-red-500 transition-colors">12</span>
          </div>

          <div className="flex items-center gap-2 group">
            <div className="p-2 rounded-full group-hover:bg-accent-blue/10 transition-colors">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-dark group-hover:text-accent-blue transition-colors" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-muted-dark group-hover:text-accent-blue transition-colors">{data.answers.length}</span>
          </div>

          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-dark group-hover:text-green-500 transition-colors" viewBox="0 0 24 24">
                <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-muted-dark group-hover:text-green-500 transition-colors">Share</span>
          </div>
        </div>
      </div>

      {/* ── Reply box (TravelThreads style) ─────────────────────────── */}
      {isGuest ? (
        <div className="rounded-3xl border border-dashed border-border-dark bg-card-dark/50 p-8 mb-8 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Want to share a lifehack?</h3>
          <p className="text-sm text-muted-dark mb-6">Only registered members can share their travel secrets.</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-2 rounded-full bg-hover-dark text-sm font-bold text-white hover:bg-border-dark transition-all"
            >
              Log In
            </Link>
            <Link
              href="/login"
              className="px-8 py-2 rounded-full bg-accent-blue text-sm font-bold text-white hover:brightness-110 transition-all shadow-lg shadow-accent-blue/20"
            >
              Sign Up Now
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 mb-8 shadow-sm">
          <h2 className="text-sm font-bold text-ink dark:text-gray-100 mb-4">Start a post</h2>
          <form onSubmit={handleSubmit} className="relative">
            <input type="hidden" name="question_id" value={data.question.id} />

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-hover-dark flex-shrink-0 flex items-center justify-center overflow-hidden border border-border-dark">
                <svg width="24" height="24" fill="currentColor" className="text-muted-dark" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="flex-1 space-y-4">
                <textarea
                  name="answer_text"
                  rows={3}
                  placeholder="Share a travel lifehack..."
                  required
                  className="w-full rounded-xl border border-border-light dark:border-border-dark bg-transparent px-4 py-3 text-sm text-ink dark:text-gray-200 placeholder:text-muted-dark focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 outline-none transition-all resize-none"
                />

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[10px] text-muted-dark space-y-1">
                    <p>0/280</p>
                    <p className="opacity-60">Enter sends, Shift+Enter newline</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`rounded-full bg-accent-blue px-8 py-2 text-sm font-bold text-white transition-all shadow-md shadow-accent-blue/20 ${isSubmitting
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:brightness-110 active:scale-95"
                      }`}
                  >
                    {isSubmitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-2 text-xs font-medium text-red-500">{error}</p>
            )}
          </form>
        </div>
      )}

      {/* ── Comments List ────────────────── */}
      <div className="space-y-4">
        {data.answers.length === 0 ? (
          <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-12 text-center">
            <p className="text-sm text-muted-dark">
              No comments yet. Share your experience!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.answers.map((answer) => (
              <CommentCard
                key={answer.id}
                id={answer.id}
                text={answer.answer_text}
                context={answer.context}
                createdAt={answer.created_at}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const questionId = params?.id;
  try {
    const data = await fetcher<QuestionDetail>(`/questions/${questionId}`);
    return { props: { data } };
  } catch (e) {
    console.error("Failed to fetch question:", e);
    return { notFound: true };
  }
};
