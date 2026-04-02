import { GetServerSideProps } from "next";
import { useState } from "react";
import { useRouter } from "next/router";

import Layout from "../../components/layout/Layout";
import CommentCard from "../../components/feed/CommentCard";
import TimeAgo from "../../components/ui/TimeAgo";
import { fetcher, uploadFile } from "../../lib/api-client";
import { useAuth } from "../../components/auth/AuthContext";
import Link from "next/link";

interface AnswerItem {
  id: number;
  answer_text: string;
  context: Record<string, string>;
  created_at?: string;
  reply_to_id?: number | null;
  like_count?: number;
  media_url?: string | null;
  author_username?: string;
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
    media_url?: string | null;
    author_username?: string;
  };
  question_like_count?: number;
  answers: AnswerItem[];
}

interface QuestionPageProps {
  data: QuestionDetail;
}

export default function QuestionPage({ data }: QuestionPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const { isGuest, user } = useAuth();

  // Question-level like state
  const [questionLiked, setQuestionLiked] = useState(false);
  const [questionLikes, setQuestionLikes] = useState(data.question_like_count ?? 0);
  const [isLikingQuestion, setIsLikingQuestion] = useState(false);

  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const isAuthor = user && user.id === data.question.author_id;
  const isAdmin = user && user.isAdmin;
  const canDelete = isAuthor || isAdmin;

  const handleLikeQuestion = async () => {
    if (isGuest || isLikingQuestion) return;
    setIsLikingQuestion(true);
    const wasLiked = questionLiked;
    setQuestionLiked(!wasLiked);
    setQuestionLikes((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/react", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          entity_type: "question",
          entity_id: data.question.id,
          reaction_type: "thanks",
        }),
      });
      if (!res.ok) {
        setQuestionLiked(wasLiked);
        setQuestionLikes((prev) => (wasLiked ? prev + 1 : prev - 1));
      } else {
        const responseData = await res.json();
        setQuestionLiked(responseData.liked);
      }
    } catch {
      setQuestionLiked(wasLiked);
      setQuestionLikes((prev) => (wasLiked ? prev + 1 : prev - 1));
    } finally {
      setIsLikingQuestion(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!window.confirm("Are you sure you want to delete this thread? This action cannot be undone.")) return;

    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch("/api/delete-thread", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
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
      let media_url = null;
      if (selectedFile) {
        const uploadRes = await uploadFile(selectedFile);
        media_url = uploadRes.url;
      }

      const res = await fetch("/api/create-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ ...body, media_url }),
      });

      if (!res.ok) throw new Error(await res.text());

      setSelectedFile(null);
      setMediaPreview(null);
      router.replace(router.asPath);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (isGuest || isGeneratingCard) return;
    setIsGeneratingCard(true);
    setGenerationError(null);
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/questions/${data.question.id}/generate-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const card = await res.json();
      // On success, redirect to the card (it will be visible for the owner/admin or after publish)
      router.push(`/cards/${card.id}`);
    } catch (err: any) {
      console.error("Generation error:", err);
      setGenerationError(err.message || "Failed to generate summary");
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Separate top-level answers from replies
  const topLevelAnswers = data.answers.filter((a) => !a.reply_to_id);
  const repliesMap: Record<number, AnswerItem[]> = {};
  data.answers
    .filter((a) => a.reply_to_id)
    .forEach((a) => {
      const parentId = a.reply_to_id!;
      if (!repliesMap[parentId]) repliesMap[parentId] = [];
      repliesMap[parentId].push(a);
    });

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
                  u/{data.question.author_username || "traveler"}
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

        <h1 className="text-2xl font-bold text-ink dark:text-gray-100 leading-tight mb-4">
          {data.question.question_text}
        </h1>

        {data.question.media_url && (
          <div className="mb-6 rounded-3xl overflow-hidden border border-border-light dark:border-border-dark bg-black/5">
            {data.question.media_url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
              <video src={data.question.media_url} controls className="w-full max-h-[500px] object-contain" />
            ) : (
              <img src={data.question.media_url} alt="Question media" className="w-full max-h-[600px] object-contain" />
            )}
          </div>
        )}

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
          {/* Like button */}
          <button
            id="like-question-btn"
            onClick={handleLikeQuestion}
            disabled={isGuest || isLikingQuestion}
            className={`flex items-center gap-2 group transition-all ${isGuest ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
          >
            <div
              className={`p-2 rounded-full transition-colors ${questionLiked ? "bg-red-500/10" : isGuest ? "" : "group-hover:bg-red-500/10"
                }`}
            >
              <svg
                width="20"
                height="20"
                fill={questionLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-colors ${questionLiked ? "text-red-500" : "text-muted-dark group-hover:text-red-500"}`}
                viewBox="0 0 24 24"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span
              className={`text-sm font-medium transition-colors ${questionLiked ? "text-red-500" : "text-muted-dark group-hover:text-red-500"
                }`}
            >
              {questionLikes}
            </span>
          </button>

          {/* Comment count */}
          <div className="flex items-center gap-2 group">
            <div className="p-2 rounded-full group-hover:bg-accent-blue/10 transition-colors">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-dark group-hover:text-accent-blue transition-colors" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-muted-dark group-hover:text-accent-blue transition-colors">{data.answers.length}</span>
          </div>

          {/* Reply */}
          <button
            onClick={() => {
              const el = document.getElementById("answer-textarea");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
                el.focus();
              }
            }}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-full group-hover:bg-accent-blue/10 transition-colors">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-dark group-hover:text-accent-blue transition-colors" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-muted-dark group-hover:text-accent-blue transition-colors">Reply</span>
          </button>

          {/* Share */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <span className="text-sm font-medium text-green-500 group-hover:text-green-500 transition-all">Share</span>
          </div>

          {/* Generate Card (Registered users) */}
          {!isGuest && data.answers.length > 0 && (

            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingCard}
              className={`flex items-center gap-2 group cursor-pointer ml-auto border border-accent-blue/30 rounded-full px-4 py-1.5 transition-all hover:bg-accent-blue/5 ${isGeneratingCard ? "opacity-50 cursor-not-allowed" : ""
                }`}
              title="Generate experience card from this thread"
            >
              <div className="p-1 rounded-full group-hover:bg-accent-blue/10 transition-colors">
                {isGeneratingCard ? (
                  <svg className="animate-spin h-5 w-5 text-accent-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue" viewBox="0 0 24 24">
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-bold text-accent-blue uppercase tracking-wide">
                {isGeneratingCard ? "Generating..." : "Summarize to Card"}
              </span>
            </button>
          )}
        </div>
        {generationError && (
          <p className="mt-2 text-xs font-medium text-red-500 text-right">{generationError}</p>
        )}
      </div>

      {/* ── Reply box ──────────────────────────────────────────────── */}
      {isGuest ? (
        <div className="rounded-3xl border border-dashed border-border-dark bg-card-dark/50 p-8 mb-8 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Want to share a lifehack?</h3>
          <p className="text-sm text-muted-dark mb-6">Only registered members can share their travel secrets.</p>
          <div className="flex justify-center gap-4">
            <Link href="/login" className="px-8 py-2 rounded-full bg-hover-dark text-sm font-bold text-white hover:bg-border-dark transition-all">
              Log In
            </Link>
            <Link href="/login" className="px-8 py-2 rounded-full bg-accent-blue text-sm font-bold text-white hover:brightness-110 transition-all shadow-lg shadow-accent-blue/20">
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
                  id="answer-textarea"
                  name="answer_text"
                  rows={3}
                  placeholder="Share a travel lifehack..."
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
                      <p className="opacity-60">Enter sends, Shift+Enter newline</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="submit-answer-btn"
                    disabled={isSubmitting}
                    className={`rounded-full bg-accent-blue px-8 py-2 text-sm font-bold text-white transition-all shadow-md shadow-accent-blue/20 ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:scale-95"
                      }`}
                  >
                    {isSubmitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
          </form>
        </div>
      )}

      {/* ── Comments List ────────────────── */}
      <div className="space-y-4">
        {topLevelAnswers.length === 0 ? (
          <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-12 text-center">
            <p className="text-sm text-muted-dark">No comments yet. Share your experience!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const renderTree = (parentId: number | null) => {
                const answers = data.answers.filter(a => a.reply_to_id === parentId);
                return answers.map(answer => (
                  <CommentCard
                    key={answer.id}
                    id={answer.id}
                    questionId={data.question.id}
                    authorName={answer.author_username || "Anonymous"}
                    text={answer.answer_text}
                    context={answer.context}
                    createdAt={answer.created_at}
                    likeCount={answer.like_count ?? 0}
                    mediaUrl={answer.media_url}
                    isNested={!!parentId}
                  >
                    {renderTree(answer.id)}
                  </CommentCard>
                ));
              };
              return renderTree(null);
            })()}
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
