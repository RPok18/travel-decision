import { GetServerSideProps } from "next";
import Link from "next/link";

import Layout from "../../components/layout/Layout";
import { API_URL } from "../../lib/api-client";
import { Card } from "../../types";

interface CardPageProps {
  card: Card;
}

export default function CardPage({ card }: CardPageProps) {
  return (
    <Layout>
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase text-slate-400">Experience card</p>
          <h1 className="text-2xl font-semibold text-ink">{card.title}</h1>
          <p className="text-sm text-slate-600">{card.summary}</p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1">{card.duration}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1">{card.budget_tier}</span>
            {card.requirements.map((req) => (
              <span key={req} className="rounded-full bg-slate-100 px-2 py-1">
                {req}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-ink">Recommendations</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {card.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-ink">Risks to watch</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {card.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-ink">Best fit</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
            {card.fit_for.map((item) => (
              <span key={item} className="rounded-full border border-slate-200 px-2 py-1">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm">
            Save card
          </button>
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm">
            Share
          </button>
          <Link
            href="/questions/1"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Ask a question
          </Link>
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const cardId = params?.id;
  const res = await fetch(`${API_URL}/cards/${cardId}`);
  const card = await res.json();
  return { props: { card } };
};
