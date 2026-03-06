import Link from "next/link";

interface CardItemProps {
  id: number;
  title: string;
  summary: string;
  requirements: string[];
  budgetTier: string;
  duration: string;
  cityName?: string;
}

export default function CardItem({
  id,
  title,
  summary,
  requirements,
  budgetTier,
  duration,
  cityName,
}: CardItemProps) {
  return (
    <Link
      href={`/cards/${id}`}
      className="block rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5 transition-all hover:border-accent-blue hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-bold text-ink dark:text-gray-100 leading-snug">
          {title}
        </h3>
        <span className="shrink-0 rounded-full bg-accent/10 text-accent px-2.5 py-0.5 text-xs font-bold capitalize">
          {budgetTier}
        </span>
      </div>

      {cityName && (
        <div className="flex items-center gap-1 mb-3">
          <svg width="13" height="13" fill="currentColor" className="text-accent-blue" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-semibold text-accent-blue">{cityName}</span>
        </div>
      )}

      <p className="mt-1 text-sm text-muted-light dark:text-muted-dark leading-relaxed line-clamp-2">
        {summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-hover-light dark:bg-hover-dark border border-border-light dark:border-border-dark px-2.5 py-0.5 text-xs text-muted-light dark:text-muted-dark">
          {duration}
        </span>
        {requirements.map((req) => (
          <span
            key={req}
            className="rounded-full bg-hover-light dark:bg-hover-dark border border-border-light dark:border-border-dark px-2.5 py-0.5 text-xs text-muted-light dark:text-muted-dark"
          >
            {req}
          </span>
        ))}
      </div>
    </Link>
  );
}
