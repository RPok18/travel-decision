import { GetServerSideProps } from "next";

import CardItem from "../../components/feed/CardItem";
import Layout from "../../components/layout/Layout";
import { API_URL } from "../../lib/api-client";
import { Card } from "../../types";

interface CityPageProps {
  cityName: string;
  cards: Card[];
}

export default function CityPage({ cityName, cards }: CityPageProps) {
  return (
    <Layout>
      <section className="space-y-6">
        <div>
          <p className="text-xs uppercase text-slate-400">City focus</p>
          <h1 className="text-2xl font-semibold text-ink">{cityName}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Topic shelves curated from Q&A threads and moderator summaries.
          </p>
        </div>
        <div className="grid gap-4">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              id={card.id}
              title={card.title}
              summary={card.summary}
              requirements={card.requirements}
              budgetTier={card.budget_tier}
              duration={card.duration}
            />
          ))}
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const cityId = params?.id;
  const [cityRes, cardsRes] = await Promise.all([
    fetch(`${API_URL}/cities`),
    fetch(`${API_URL}/cards?city_id=${cityId}`)
  ]);
  const cities = await cityRes.json();
  const cards = await cardsRes.json();
  const city = cities.find((item: { id: number }) => item.id === Number(cityId));
  return { props: { cityName: city?.name ?? "City", cards } };
};
