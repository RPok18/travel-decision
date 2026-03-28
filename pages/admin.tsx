import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import { fetcher } from "../lib/api-client";
import { Card } from "../types";
import { useAuth } from "../components/auth/AuthContext";
import Link from "next/link";
import TimeAgo from "../components/ui/TimeAgo";

export default function Admin() {
  const { user, isGuest } = useAuth();
  const [drafts, setDrafts] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest || !user?.isAdmin) return;

    const loadDrafts = async () => {
      try {
        const data = await fetcher<Card[]>("/cards?include_drafts=true");
        // backend might return all, so we filter for drafts
        setDrafts(data.filter((c) => c.status === "draft"));
      } catch (err: any) {
        console.error("Load drafts error:", err);
        setError(err.message || "Failed to load drafts");
      } finally {
        setLoading(false);
      }
    };
    loadDrafts();
  }, [user, isGuest]);

  const handlePublish = async (cardId: number) => {
    if (!confirm("Are you sure you want to publish this card?")) return;

    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ status: "published" }),
      });

      if (!res.ok) throw new Error(await res.text());

      // Remove from list on success
      setDrafts((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err: any) {
      console.error("Publish error:", err);
      alert(err.message || "Failed to publish card");
    }
  };

  if (isGuest || !user?.isAdmin) {
    return (
      <Layout>
        <div className="p-12 text-center rounded-3xl border border-dashed border-red-500/30 bg-red-500/5">
          <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-dark">Only administrators can access the panel.</p>
          <Link href="/" className="mt-6 inline-block text-sm text-accent-blue hover:underline">Return to Feed</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-ink dark:text-gray-100 italic">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm text-muted-dark">
            Review draft cards generated from Q&A threads and publish them.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-ink dark:text-gray-100 uppercase tracking-widest">
                📝 Draft Cards ({drafts.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center rounded-2xl border border-border-dark bg-card-dark/30 animate-pulse">
                <p className="text-sm text-muted-dark">Loading drafts...</p>
              </div>
            ) : drafts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-border-dark bg-card-dark/30">
                <p className="text-sm text-muted-dark">No drafts pending review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((card) => (
                  <div
                    key={card.id}
                    className="group rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5 transition-all hover:border-accent-blue/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/cards/${card.id}`} className="text-base font-bold text-ink dark:text-white hover:text-accent-blue transition-colors truncate block">
                          {card.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-dark line-clamp-2 leading-relaxed">
                          {card.summary}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            {card.budget_tier}
                          </span>
                          <span className="rounded-full bg-hover-dark px-2 py-0.5 text-[10px] text-muted-dark font-medium">
                            {card.duration}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        <button
                          onClick={() => handlePublish(card.id)}
                          className="px-4 py-1.5 rounded-full bg-accent-blue text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-accent-blue/20"
                        >
                          Publish
                        </button>
                        <Link
                          href={`/cards/${card.id}`}
                          className="px-4 py-1.5 rounded-full border border-border-dark text-xs font-bold text-muted-dark hover:text-white hover:bg-hover-dark text-center transition-all"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-ink dark:text-gray-100 uppercase tracking-widest">
              📊 Stats & Pipelines
            </h2>
            <div className="rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-muted-dark uppercase tracking-widest mb-2">Question Pipeline</p>
                <div className="space-y-3">
                  {[
                    { status: "OPEN", count: 4, color: "bg-accent-blue" },
                    { status: "COMPILING", count: 1, color: "bg-yellow-500" },
                    { status: "RESOLVED", count: drafts.length, color: "bg-green-500", label: "Pending Drafts" },
                  ].map((item) => (
                    <div key={item.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                        <span className="text-muted-dark font-medium uppercase">{item.label || item.status}</span>
                      </div>
                      <span className="font-bold text-ink dark:text-white">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border-dark">
                <p className="text-[10px] font-bold text-muted-dark uppercase tracking-widest mb-2">System Health</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-500 font-medium">API Online</span>
                  <span className="text-[10px] text-muted-dark">v1.2.0-MVP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
