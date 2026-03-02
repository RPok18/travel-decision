import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../components/AuthContext";
import PostCard from "../components/PostCard";
import { useRouter } from "next/router";

interface ProfileData {
  username: string;
  stats: {
    helped_answers: number;
    cards_used: number;
    answer_saves: number;
  };
  liked_questions: any[];
  questions: any[];
  answers: any[];
}

export default function Profile() {
  const { user, isGuest } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [activeTab, setActiveTab] = useState<"activity" | "liked">("activity");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProfile = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch("/api/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setNewUsername(data.username);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch profile:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isGuest) {
      router.push("/login");
      return;
    }
    fetchProfile();
  }, [isGuest, router]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch("/api/profile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      alert("Error updating profile");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="space-y-6">
        {/* Profile header card */}
        <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-accent/5">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-br from-accent/80 via-accent-blue/80 to-accent/80 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse" />
          </div>

          <div className="p-6 -mt-12 relative z-10">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-card-light dark:bg-card-dark border-4 border-card-light dark:border-card-dark flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 group">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-border-light to-border-dark dark:from-border-dark dark:to-black/40 flex items-center justify-center overflow-hidden">
                <svg
                  width="48"
                  height="48"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  className="text-muted-light dark:text-muted-dark group-hover:text-accent transition-colors"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-accent">u/</span>
                    <input
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="text-2xl font-bold bg-transparent border-b-2 border-accent outline-none text-ink dark:text-white"
                      placeholder="Enter username"
                      autoFocus
                    />
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold text-ink dark:text-gray-100 tracking-tight">
                    u/{data?.username || user?.email?.split('@')[0] || "traveler"}
                  </h1>
                )}
                <p className="text-sm text-muted-light dark:text-muted-dark flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Experience passport • Member since 2026
                </p>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 rounded-full border border-border-dark text-muted-dark font-bold text-sm hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isUpdating}
                      className="px-6 py-2 rounded-full bg-accent text-white font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-accent/20"
                    >
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold text-sm hover:bg-accent hover:text-white transition-all transform hover:scale-105 active:scale-95"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-t border-border-light dark:border-border-dark px-6">
            <button
              onClick={() => setActiveTab("activity")}
              className={`py-4 px-6 text-sm font-bold transition-all border-b-2 ${activeTab === "activity" ? "border-accent text-accent" : "border-transparent text-muted-dark hover:text-ink dark:hover:text-white"}`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab("liked")}
              className={`py-4 px-6 text-sm font-bold transition-all border-b-2 ${activeTab === "liked" ? "border-accent text-accent" : "border-transparent text-muted-dark hover:text-ink dark:hover:text-white"}`}
            >
              Liked Posts
            </button>
          </div>
        </div>

        {activeTab === "activity" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Post Karma", value: data?.questions.length || 0, icon: "📝" },
                { label: "Comment Karma", value: data?.answers.length || 0, icon: "💬" },
                { label: "Helped Others", value: data?.stats.helped_answers || 0, icon: "🤝" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 transition-all hover:border-accent/40 group">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl p-3 rounded-xl bg-black/5 dark:bg-white/5 transition-transform group-hover:scale-110">{stat.icon}</span>
                    <div>
                      <p className="text-2xl font-bold text-ink dark:text-gray-100">{stat.value}</p>
                      <p className="text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6">
                  <h2 className="text-lg font-bold text-ink dark:text-gray-100 mb-6 flex items-center gap-2 italic">
                    <span className="w-1.5 h-6 bg-accent rounded-full" />
                    Recent Questions
                  </h2>
                  <div className="space-y-4">
                    {data?.questions.map((q: any) => (
                      <PostCard
                        key={q.id}
                        id={q.id}
                        title={q.question_text}
                        authorName={data.username}
                        authorId={q.author_id}
                        createdAt={q.created_at}
                        lastMessageAt={q.created_at}
                        answerCount={q.answers?.length || 0}
                        mediaUrl={q.media_url}
                      />
                    ))}
                    {data?.questions.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-dark italic">No questions asked yet.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6">
                  <h2 className="text-lg font-bold text-ink dark:text-gray-100 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-accent rounded-full" />
                    Stats
                  </h2>
                  <ul className="space-y-4">
                    <li className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <span className="text-sm text-muted-light dark:text-muted-dark italic">Questions Asked</span>
                      <span className="font-bold text-accent">{data?.questions.length || 0}</span>
                    </li>
                    <li className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <span className="text-sm text-muted-light dark:text-muted-dark italic">Answers Posted</span>
                      <span className="font-bold text-accent-blue">{data?.answers.length || 0}</span>
                    </li>
                    <li className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <span className="text-sm text-muted-light dark:text-muted-dark italic">Cards Used</span>
                      <span className="font-bold text-green-500">{data?.stats.cards_used || 0}</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 opacity-60">
                  <h2 className="text-lg font-bold text-ink dark:text-gray-100 mb-4 italic">Achievements</h2>
                  <div className="flex gap-2 filter grayscale">
                    {["🌍", "✈️", "🗺️", "🍜"].map(a => (
                      <div key={a} className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-xl" title="Locked Achievement">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">❤️</span>
              <h2 className="text-xl font-bold text-ink dark:text-gray-100 italic">
                Liked Posts
              </h2>
            </div>

            {data?.liked_questions && data.liked_questions.length > 0 ? (
              <div className="space-y-4">
                {data.liked_questions.map((question: any) => (
                  <PostCard
                    key={question.id}
                    id={question.id}
                    title={question.question_text || "Untitled Post"}
                    authorName={question.author_username || "traveler"}
                    authorId={question.author_id}
                    createdAt={question.created_at}
                    lastMessageAt={question.last_message_at || question.created_at}
                    answerCount={question.answer_count || 0}
                    mediaUrl={question.media_url}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center rounded-2xl border-2 border-dashed border-border-light dark:border-border-dark">
                <p className="text-sm text-muted-light dark:text-muted-dark italic">
                  No liked posts yet. Start Hearting!
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}
