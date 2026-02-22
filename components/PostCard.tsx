import Link from "next/link";
import VoteButton from "./VoteButton";
import TimeAgo from "./TimeAgo";

interface PostCardProps {
    id: number;
    title: string;
    authorName: string;
    createdAt: string | null;
    lastMessageAt: string | null;
    answerCount?: number;
    voteScore?: number;
}

export default function PostCard({
    id,
    title,
    authorName,
    createdAt,
    lastMessageAt,
    answerCount = 0,
    voteScore = 0,
}: PostCardProps) {
    return (
        <div className="flex flex-col rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 transition-all hover:shadow-lg mb-4">
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
                                {authorName}
                            </span>
                            <span className="text-muted-dark text-xs">•</span>
                            <span className="text-muted-dark text-xs">
                                <TimeAgo date={lastMessageAt || createdAt} />
                            </span>
                        </div>
                    </div>
                </div>
                <button className="text-muted-dark hover:text-white transition-colors">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </button>
            </div>

            {/* Content area */}
            <Link href={`/questions/${id}`} className="min-w-0 flex-1 group">
                <h3 className="text-lg font-medium text-ink dark:text-gray-100 leading-snug mb-4 group-hover:text-accent-blue transition-colors">
                    {title}
                </h3>
            </Link>

            {/* Interaction Row */}
            <div className="flex items-center gap-6 mt-2">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="p-2 rounded-full group-hover:bg-red-500/10 transition-colors">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-dark group-hover:text-red-500 transition-colors" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-muted-dark group-hover:text-red-500 transition-colors">{voteScore}</span>
                </div>

                <Link href={`/questions/${id}`} className="flex items-center gap-2 group cursor-pointer">
                    <div className="p-2 rounded-full group-hover:bg-accent-blue/10 transition-colors">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-dark group-hover:text-accent-blue transition-colors" viewBox="0 0 24 24">
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-muted-dark group-hover:text-accent-blue transition-colors">{answerCount}</span>
                </Link>

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
    );
}
