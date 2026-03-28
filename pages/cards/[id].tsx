import { GetServerSideProps } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import Layout from "../../components/layout/Layout";
import { API_URL } from "../../lib/api-client";

import { Card } from "../../types";

interface CardPageProps {
  card_initial: Card | null;
  card_id: string;
}

export default function CardPage({ card_initial, card_id }: CardPageProps) {
  const [card, setCard] = useState<Card | null>(card_initial);
  const [loading, setLoading] = useState(!card_initial);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // If we have initial data, we're good
    if (card_initial) return;

    // Otherwise, fetch via the Next.js proxy (which forwards auth token to backend)
    const loadCard = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`/api/cards/${card_id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Error ${res.status}`);
        }
        const data = await res.json();
        setCard(data);
      } catch (err: any) {
        console.error("Client side fetch failed:", err);
        setError(err.message || "Failed to load card");
      } finally {
        setLoading(false);
      }
    };

    loadCard();
  }, [card_id, card_initial]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue"></div>
          <p className="mt-4 text-muted-dark">Loading experience card...</p>
        </div>
      </Layout>
    );
  }

  if (error || !card) {
    return (
      <Layout>
        <div className="p-12 text-center rounded-3xl border border-dashed border-red-500/30 bg-red-500/5">
          <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-dark">{error || "Card not found or access restricted."}</p>
          <Link href="/" className="mt-6 inline-block text-sm text-accent-blue hover:underline">Return to Feed</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase text-slate-400">Experience card {card.status === 'draft' && <span className="text-orange-500">(DRAFT)</span>}</p>
          <h1 className="text-2xl font-semibold text-ink dark:text-gray-100">{card.title}</h1>
          <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed">{card.summary}</p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-hover-light dark:bg-hover-dark px-3 py-1 border border-border-light dark:border-border-dark">{card.duration}</span>
            <span className="rounded-full bg-hover-light dark:bg-hover-dark px-3 py-1 border border-border-light dark:border-border-dark">{card.budget_tier}</span>
            {card.requirements.map((req) => (
              <span key={req} className="rounded-full bg-hover-light dark:bg-hover-dark px-3 py-1 border border-border-light dark:border-border-dark">
                {req}
              </span>
            ))}
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-sm">
            <h2 className="text-base font-bold text-ink dark:text-gray-100 mb-4">Recommendations</h2>
            <ul className="list-disc space-y-3 pl-5 text-sm text-muted-dark">
              {card.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-sm">
            <h2 className="text-base font-bold text-ink dark:text-gray-100 mb-4 text-orange-500">Risks to watch</h2>
            <ul className="list-disc space-y-3 pl-5 text-sm text-muted-dark">
              {card.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-sm">
          <h2 className="text-base font-bold text-ink dark:text-gray-100 mb-4">Best fit for</h2>
          <div className="flex flex-wrap gap-2">
            {card.fit_for.map((item) => (
              <span key={item} className="rounded-full border border-border-light dark:border-border-dark px-4 py-1.5 text-xs text-muted-dark font-medium bg-hover-light dark:bg-hover-dark">
                {item}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 pt-4">
          <button className="rounded-full border border-border-light dark:border-border-dark px-6 py-2.5 text-sm font-bold text-muted-dark hover:bg-hover-light dark:hover:bg-hover-dark transition-all">
            Save Card
          </button>
          <button className="rounded-full border border-border-light dark:border-border-dark px-6 py-2.5 text-sm font-bold text-muted-dark hover:bg-hover-light dark:hover:bg-hover-dark transition-all">
            Share
          </button>
          <Link
            href="/"
            className="rounded-full bg-accent-blue px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-blue/20 hover:brightness-110 active:scale-[0.98] transition-all ml-auto"
          >
            Back to Feed
          </Link>
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const cardId = params?.id as string;
  try {
    const res = await fetch(`${API_URL}/cards/${cardId}`);
    if (!res.ok) {
        // Return null card to let client side fetch try with auth
        return { props: { card_initial: null, card_id: cardId } };
    }
    const card = await res.json();
    return { props: { card_initial: card, card_id: cardId } };
  } catch (err) {
    console.error("SSR Page Fetch error:", err);
    return { props: { card_initial: null, card_id: cardId } };
  }
};

