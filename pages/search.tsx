import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState, useRef } from "react";
import Link from "next/link";

import CardItem from "../components/feed/CardItem";
import PostCard from "../components/feed/PostCard";
import Layout from "../components/layout/Layout";
import { fetcher } from "../lib/api-client";
import { Card, City, Topic, Question } from "../types";

interface SearchProps {
  cards: Card[];
  cities: City[];
  topics: Topic[];
  posts: Question[];
  query: string;
  selectedCityId: string;
}

import { useAuth } from "../components/auth/AuthContext";

export default function Search({ cards, cities, topics, posts, query, selectedCityId }: SearchProps) {
  const router = useRouter();
  const { isGuest } = useAuth();
  const [cityFilter, setCityFilter] = useState(selectedCityId);
  const formRef = useRef<HTMLFormElement>(null);

  // Limited results for guests
  const displayCards = isGuest ? cards.slice(0, 2) : cards;
  const displayPosts = isGuest ? posts.slice(0, 2) : posts;

  const getCityName = (cityId: number) =>
    cities.find((c) => c.id === cityId)?.name;

  // Cities whose names match the query text
  const matchingCities = query
    ? cities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <Layout>
      <section className="space-y-4">
        {/* Header */}
        <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink dark:text-gray-100 italic">
                Search
              </h1>
              <p className="mt-1 text-sm text-muted-dark">
                Find posts and experience cards by city, topic, or keyword.
              </p>
            </div>
            {isGuest && (
              <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3 max-w-[200px]">
                <p className="text-[10px] font-bold text-accent uppercase mb-1">Guest Mode</p>
                <p className="text-[11px] text-muted-dark leading-tight">Search results are limited. Log in for full access.</p>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <form
          ref={formRef}
          className="rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const data = new FormData(form);
            const params = new URLSearchParams();
            data.forEach((value, key) => {
              if (value) params.set(key, value.toString());
            });
            router.push(`/search?${params.toString()}`);
          }}
        >
          {/* Text search */}
          <div className="mb-4">
            <label className="text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wide">
              Keyword
            </label>
            <div className="relative mt-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                defaultValue={query}
                className="w-full rounded-xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-hover-dark pl-10 pr-4 py-2 text-sm text-ink dark:text-gray-200 placeholder:text-muted-dark focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 outline-none transition-all"
                placeholder="Bangkok, wifi, family, cheap..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wide">
                City
              </label>
              <select
                name="city_id"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-hover-dark p-2 text-sm text-ink dark:text-gray-200 outline-none focus:border-accent-blue transition-all"
              >
                <option value="">All cities</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wide">
                Topic
              </label>
              <select
                name="topic_id"
                className="mt-1 w-full rounded-xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-hover-dark p-2 text-sm text-ink dark:text-gray-200 outline-none focus:border-accent-blue transition-all"
              >
                <option value="">All topics</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wide">
                Budget tier
              </label>
              <select
                name="budget_tier"
                className="mt-1 w-full rounded-xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-hover-dark p-2 text-sm text-ink dark:text-gray-200 outline-none focus:border-accent-blue transition-all"
              >
                <option value="">Any</option>
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-wide">
                Requirements (comma separated)
              </label>
              <input
                name="requirements"
                className="mt-1 w-full rounded-xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-hover-dark p-2 text-sm text-ink dark:text-gray-200 placeholder:text-muted-dark outline-none focus:border-accent-blue transition-all"
                placeholder="quiet, safe, good_internet"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-full bg-accent-blue px-4 py-2 text-sm font-bold text-white hover:brightness-110 transition-all active:scale-95 shadow-md shadow-accent-blue/20"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {/* City name pills (when query matches city names) */}
        {matchingCities.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-dark uppercase tracking-wide mb-2">📍 Cities matching &quot;{query}&quot;</p>
            <div className="flex flex-wrap gap-2">
              {matchingCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => {
                    setCityFilter(String(city.id));
                    // Submit the form with the city pre-filled
                    const params = new URLSearchParams();
                    if (query) params.set("q", query);
                    params.set("city_id", String(city.id));
                    router.push(`/search?${params.toString()}`);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-accent-blue/30 bg-accent-blue/10 px-4 py-1.5 text-sm font-semibold text-accent-blue hover:bg-accent-blue/20 transition-all"
                >
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Posts section (shown when there's a text query) */}
        {query && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink dark:text-gray-100 uppercase tracking-wide">
                💬 Posts ({displayPosts.length})
              </h2>
              {isGuest && posts.length > 2 && (
                <Link href="/login" className="text-xs text-accent-blue hover:underline">Log in to see all</Link>
              )}
            </div>
            {displayPosts.length > 0 ? (
              <div className="space-y-3">
                {displayPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    authorName={post.author?.display_name ?? "Unknown"}
                    authorId={post.author?.id ?? 0}
                    createdAt={post.created_at}
                    lastMessageAt={post.last_message_at}
                    answerCount={post.answer_count ?? 0}
                    voteScore={post.vote_score ?? 0}
                    likeCount={post.like_count ?? 0}
                    mediaUrl={post.media_url}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 text-center text-sm text-muted-dark">
                No posts match &quot;{query}&quot;.
              </div>
            )}
          </div>
        )}

        {/* Experience cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink dark:text-gray-100 uppercase tracking-wide">
              🃏 Experience Cards ({displayCards.length})
            </h2>
            {isGuest && cards.length > 2 && (
              <Link href="/login" className="text-xs text-accent-blue hover:underline">Log in to see all</Link>
            )}
          </div>
          <div className="grid gap-3">
            {displayCards.map((card) => (
              <CardItem
                key={card.id}
                id={card.id}
                title={card.title}
                summary={card.summary}
                requirements={card.requirements}
                budgetTier={card.budget_tier}
                duration={card.duration}
                cityName={getCityName(card.city_id)}
              />
            ))}
            {displayCards.length === 0 && (
              <div className="rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-12 text-center text-sm text-muted-dark shadow-sm">
                No cards match your filters.
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const params = new URLSearchParams();
  const keys = ["city_id", "topic_id", "budget_tier", "requirements"];

  keys.forEach((key) => {
    const value = query[key];
    if (value && value !== "") params.set(key, value.toString());
  });

  const q = (query.q as string) || "";

  try {
    const [cards, cities, topics] = await Promise.all([
      fetcher<Card[]>(`/search/cards?${params.toString()}`),
      fetcher<City[]>("/cities"),
      fetcher<Topic[]>("/topics"),
    ]);

    // Fetch posts when there's a text query
    let posts: Question[] = [];
    if (q) {
      const feedData = await fetcher<{ items: Question[] }>(`/feed?q=${encodeURIComponent(q)}`);
      posts = feedData.items ?? [];
    }

    return {
      props: {
        cards,
        cities,
        topics,
        posts,
        query: q,
        selectedCityId: (query.city_id as string) || "",
      },
    };
  } catch (error: any) {
    console.error("Failed to fetch search data:", error);
    return {
      props: {
        cards: [],
        cities: [],
        topics: [],
        posts: [],
        query: q,
        selectedCityId: "",
      },
    };
  }
};
