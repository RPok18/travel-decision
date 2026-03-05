import { useState } from "react";

interface VoteButtonProps {
    initialScore?: number;
    vertical?: boolean;
}

export default function VoteButton({ initialScore = 0, vertical = true }: VoteButtonProps) {
    const [vote, setVote] = useState<"up" | "down" | null>(null);
    const score = initialScore + (vote === "up" ? 1 : vote === "down" ? -1 : 0);

    return (
        <div className={`flex ${vertical ? "flex-col" : "flex-row"} items-center gap-0.5`}>
            {/* Upvote */}
            <button
                aria-label="Upvote"
                onClick={() => setVote((v) => (v === "up" ? null : "up"))}
                className={`p-1 rounded hover:bg-hover-light dark:hover:bg-hover-dark transition-colors ${vote === "up" ? "text-accent" : "text-muted-light dark:text-muted-dark"
                    }`}
            >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3l7 7h-4v7H7v-7H3l7-7z" />
                </svg>
            </button>

            {/* Score */}
            <span
                className={`text-xs font-bold min-w-[20px] text-center ${vote === "up"
                        ? "text-accent"
                        : vote === "down"
                            ? "text-accent-blue"
                            : "text-ink dark:text-gray-300"
                    }`}
            >
                {score}
            </span>

            {/* Downvote */}
            <button
                aria-label="Downvote"
                onClick={() => setVote((v) => (v === "down" ? null : "down"))}
                className={`p-1 rounded hover:bg-hover-light dark:hover:bg-hover-dark transition-colors ${vote === "down" ? "text-accent-blue" : "text-muted-light dark:text-muted-dark"
                    }`}
            >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 17l-7-7h4V3h6v7h4l-7 7z" />
                </svg>
            </button>
        </div>
    );
}
