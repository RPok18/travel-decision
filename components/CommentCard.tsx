import { useState } from "react";
import TimeAgo from "./TimeAgo";
import { useAuth } from "./AuthContext";
import { useRouter } from "next/router";
import { uploadFile } from "../lib/api-client";

interface CommentCardProps {
    id: number;
    questionId: number;
    authorName?: string;
    text: string;
    createdAt?: string;
    context?: Record<string, string>;
    likeCount?: number;
    isNested?: boolean;
    mediaUrl?: string | null;
    children?: React.ReactNode;
}

export default function CommentCard({
    id,
    questionId,
    authorName = "Anonymous",
    text,
    createdAt,
    context,
    likeCount = 0,
    isNested = false,
    mediaUrl = null,
    children,
}: CommentCardProps) {
    const { user, isGuest } = useAuth();
    const router = useRouter();

    const [liked, setLiked] = useState(false);
    const [localLikes, setLocalLikes] = useState(likeCount);
    const [isLiking, setIsLiking] = useState(false);

    const [showReply, setShowReply] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isReplying, setIsReplying] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);

    const handleLike = async () => {
        if (isGuest || isLiking) return;
        setIsLiking(true);

        // Optimistic update
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLocalLikes((prev) => (wasLiked ? prev - 1 : prev + 1));

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch("/api/react", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({
                    entity_type: "answer",
                    entity_id: id,
                    reaction_type: "thanks",
                }),
            });
            if (!res.ok) {
                // Revert on failure
                setLiked(wasLiked);
                setLocalLikes((prev) => (wasLiked ? prev + 1 : prev - 1));
            } else {
                const data = await res.json();
                setLiked(data.liked);
                setLocalLikes((prev) => {
                    // sync with server response
                    if (data.liked && !wasLiked) return prev; // already optimistically added
                    if (!data.liked && wasLiked) return prev; // already optimistically removed
                    return data.liked ? prev + 1 : prev - 1;
                });
            }
        } catch {
            setLiked(wasLiked);
            setLocalLikes((prev) => (wasLiked ? prev + 1 : prev - 1));
        } finally {
            setIsLiking(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || isReplying) return;
        setIsReplying(true);
        setReplyError(null);

        try {
            let reply_media_url = null;
            if (selectedFile) {
                const uploadRes = await uploadFile(selectedFile);
                reply_media_url = uploadRes.url;
            }

            const token = localStorage.getItem("access_token");
            const res = await fetch("/api/create-answer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({
                    question_id: questionId,
                    answer_text: replyText,
                    reply_to_id: id,
                    media_url: reply_media_url,
                }),
            });
            if (!res.ok) throw new Error(await res.text());

            setReplyText("");
            setShowReply(false);
            router.replace(router.asPath);
        } catch (err: any) {
            setReplyError(err.message || "Failed to post reply");
        } finally {
            setIsReplying(false);
        }
    };

    return (
        <div className={`relative ${isNested ? "pl-6 mt-2" : "pl-4 mt-4 first:mt-0"}`}>
            {/* Thread line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border-dark" />

            {/* Container */}
            <div className="rounded-2xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-[#1a1a1a] p-4 transition-all">
                {/* Author line */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-border-dark flex items-center justify-center overflow-hidden flex-shrink-0">
                        <svg width="18" height="18" fill="currentColor" className="text-muted-dark" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="font-bold text-ink dark:text-gray-200 text-xs">{authorName}</span>
                    <span className="text-muted-dark text-xs">•</span>
                    <span className="text-muted-dark text-xs">
                        <TimeAgo date={createdAt} />
                    </span>
                </div>

                {/* Text */}
                <p className="text-sm text-ink dark:text-gray-300 leading-relaxed">{text}</p>

                {/* Media */}
                {mediaUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-border-light dark:border-border-dark bg-black/5 max-w-md">
                        {mediaUrl.match(/\.(mp4|webm|ogg|mov)$|^data:video/i) ? (
                            <video src={mediaUrl} controls className="w-full max-h-[300px] object-contain" />
                        ) : (
                            <img src={mediaUrl} alt="Comment media" className="w-full max-h-[300px] object-contain" />
                        )}
                    </div>
                )}

                {/* Context tags */}
                {context && Object.keys(context).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(context).map(([key, value]) => (
                            <span
                                key={key}
                                className="text-[10px] rounded-lg border border-border-dark bg-surface-dark px-2 py-1 text-muted-dark"
                            >
                                {key}: {value}
                            </span>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center gap-4">
                    {/* Like button */}
                    <button
                        id={`like-comment-${id}`}
                        onClick={handleLike}
                        disabled={isGuest || isLiking}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${isGuest
                            ? "text-muted-dark opacity-50 cursor-not-allowed"
                            : liked
                                ? "text-red-500"
                                : "text-muted-dark hover:text-red-400"
                            }`}
                        title={isGuest ? "Log in to like" : liked ? "Unlike" : "Like"}
                    >
                        <svg
                            width="14"
                            height="14"
                            fill={liked ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            className={`transition-transform ${liked ? "scale-110" : ""}`}
                        >
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {localLikes}
                    </button>

                    {/* Reply button */}
                    <button
                        id={`reply-comment-${id}`}
                        onClick={() => {
                            if (isGuest) return;
                            setShowReply((v) => !v);
                        }}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${isGuest
                            ? "text-muted-dark opacity-50 cursor-not-allowed"
                            : showReply
                                ? "text-accent-blue"
                                : "text-muted-dark hover:text-accent-blue"
                            }`}
                        title={isGuest ? "Log in to reply" : "Reply"}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Reply
                    </button>

                    {/* Share */}
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-dark hover:text-white transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                    </button>
                </div>

                {/* Reply form */}
                {showReply && !isGuest && (
                    <form onSubmit={handleReply} className="mt-4 flex gap-3 items-start animate-fadeIn">
                        <div className="w-7 h-7 rounded-full bg-border-dark flex items-center justify-center overflow-hidden flex-shrink-0 mt-1">
                            <svg width="14" height="14" fill="currentColor" className="text-muted-dark" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <textarea
                                id={`reply-input-${id}`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                                placeholder={`Reply to this comment...`}
                                className="w-full rounded-xl border border-border-dark bg-transparent px-3 py-2 text-xs text-ink dark:text-gray-200 placeholder:text-muted-dark focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 outline-none transition-all resize-none"
                                autoFocus
                            />
                            {mediaPreview && (
                                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-border-dark group">
                                    {selectedFile?.type.startsWith("video/") ? (
                                        <video src={mediaPreview} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={mediaPreview} className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedFile(null); setMediaPreview(null); }}
                                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            {replyError && <p className="text-[10px] text-red-500 mt-1">{replyError}</p>}
                            <div className="flex items-center justify-between mt-2">
                                <label className="cursor-pointer p-1.5 rounded-full hover:bg-hover-dark text-muted-dark transition-colors" title="Add media">
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
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowReply(false); setReplyText(""); setSelectedFile(null); setMediaPreview(null); }}
                                        className="text-[11px] text-muted-dark hover:text-white transition-colors px-3 py-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isReplying || !replyText.trim()}
                                        className="rounded-full bg-accent-blue px-4 py-1 text-[11px] font-bold text-white transition-all shadow-sm shadow-accent-blue/20 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isReplying ? "Posting..." : "Reply"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* Render children */}
            {children && <div className="mt-1">{children}</div>}
        </div>
    );
}
