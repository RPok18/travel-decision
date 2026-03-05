/**  Render a human-friendly relative timestamp like "3h ago". */
export default function TimeAgo({ date }: { date: string | null | undefined }) {
    if (!date) return <span>—</span>;

    const seconds = Math.floor(
        (Date.now() - new Date(date).getTime()) / 1000
    );
    if (seconds < 0) return <span>just now</span>;

    const intervals: [number, string][] = [
        [31536000, "y"],
        [2592000, "mo"],
        [86400, "d"],
        [3600, "h"],
        [60, "m"],
    ];

    for (const [secs, label] of intervals) {
        const count = Math.floor(seconds / secs);
        if (count >= 1) return <span>{count}{label} ago</span>;
    }

    return <span>just now</span>;
}
