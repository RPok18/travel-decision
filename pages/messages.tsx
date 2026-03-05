import Layout from "../components/layout/Layout";

export default function MessagesPage() {
  return (
    <Layout>
      <section className="space-y-4">
        {/* Header */}
        <div className="rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4">
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 20 20"
              className="text-accent"
            >
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H8l-4 3v-3H4a2 2 0 01-2-2V5z" />
            </svg>
            <h1 className="text-xl font-bold text-ink dark:text-gray-100">
              Messages
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-1">
          <button className="flex-1 rounded-sm bg-hover-light dark:bg-hover-dark px-3 py-2 text-sm font-bold text-ink dark:text-gray-100 transition-colors">
            Notifications
          </button>
          <button className="flex-1 px-3 py-2 text-sm font-bold text-muted-light dark:text-muted-dark hover:bg-hover-light dark:hover:bg-hover-dark rounded-sm transition-colors">
            Messages
          </button>
        </div>

        {/* Empty state */}
        <div className="rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-12 text-center">
          <svg
            width="48"
            height="48"
            fill="currentColor"
            viewBox="0 0 20 20"
            className="mx-auto text-muted-light dark:text-muted-dark opacity-30"
          >
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H8l-4 3v-3H4a2 2 0 01-2-2V5z" />
          </svg>
          <p className="mt-4 text-sm text-muted-light dark:text-muted-dark">
            Nothing here yet. Private chats between users are coming soon!
          </p>
        </div>
      </section>
    </Layout>
  );
}
