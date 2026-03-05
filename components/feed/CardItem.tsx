import Link from "next/link";

interface CardItemProps {
  id: number;
  title: string;
  summary: string;
  requirements: string[];
  budgetTier: string;
  duration: string;
}

export default function CardItem({
  id,
  title,
  summary,
  requirements,
  budgetTier,
  duration,
}: CardItemProps) {
  return (
    <Link
      href={`/cards/${id}`}
      className="block rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4 transition-colors hover:border-accent"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-base font-bold text-ink dark:text-gray-100">
          {title}
        </h3>
        <span className="rounded-full bg-accent/10 text-accent px-2.5 py-0.5 text-xs font-bold">
          {budgetTier}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-light dark:text-muted-dark leading-relaxed">
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
