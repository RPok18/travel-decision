import VoteButton from "./VoteButton";
import TimeAgo from "./TimeAgo";

interface CommentCardProps {
    id: number;
    authorName?: string;
    text: string;
    createdAt?: string;
    context?: Record<string, string>;
}

export default function CommentCard({
    id,
    authorName = "Anonymous",
    text,
    createdAt,
    context,
}: CommentCardProps) {
    return (
        <div className="relative pl-4 mt-4 first:mt-0">
            {/* Thread line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border-dark" />

            {/* Container */}
            <div className="rounded-2xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-[#1a1a1a] p-4 transition-all">
                {/* Author line */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-border-dark flex items-center justify-center overflow-hidden">
                        <svg width="18" height="18" fill="currentColor" className="text-muted-dark" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="font-bold text-ink dark:text-gray-200 text-xs">
                        {authorName}
                    </span>
                    <span className="text-muted-dark text-xs">•</span>
                    <span className="text-muted-dark text-xs">
                        <TimeAgo date={createdAt} />
                    </span>
                </div>

                {/* Text */}
                <p className="text-sm text-ink dark:text-gray-300 leading-relaxed">
                    {text}
                </p>

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
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-dark hover:text-white transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        12
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-dark hover:text-white transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Reply
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-dark hover:text-white transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
}
