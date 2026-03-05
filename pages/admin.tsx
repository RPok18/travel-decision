import Layout from "../components/layout/Layout";

export default function Admin() {
  return (
    <Layout>
      <section className="space-y-4">
        {/* Header */}
        <div className="rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4">
          <h1 className="text-xl font-bold text-ink dark:text-gray-100">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm text-muted-light dark:text-muted-dark">
            Moderate reports, edit card drafts, and manage questions.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink dark:text-gray-100">
                Reports Queue
              </h2>
              <span className="rounded-full bg-green-500/20 text-green-500 px-2 py-0.5 text-xs font-bold">
                0 new
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-light dark:text-muted-dark">
              No new reports. Check back later.
            </p>
          </div>

          <div className="rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4">
            <h2 className="text-base font-bold text-ink dark:text-gray-100">
              Card Drafts
            </h2>
            <p className="mt-2 text-sm text-muted-light dark:text-muted-dark">
              Review draft cards generated from Q&A threads.
            </p>
            <button className="mt-3 rounded-full border border-border-light dark:border-border-dark px-4 py-1.5 text-sm font-bold text-ink dark:text-gray-200 hover:bg-hover-light dark:hover:bg-hover-dark transition-colors">
              Open drafts
            </button>
          </div>
        </div>

        {/* Pipeline */}
        <div className="rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4">
          <h2 className="text-base font-bold text-ink dark:text-gray-100">
            Question Pipeline
          </h2>
          <div className="mt-3 space-y-2">
            {[
              { status: "OPEN", count: 4, color: "bg-accent" },
              { status: "COMPILING", count: 1, color: "bg-yellow-500" },
              { status: "RESOLVED", count: 8, color: "bg-green-500" },
            ].map((item) => (
              <div
                key={item.status}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className={`w-2 h-2 rounded-full ${item.color}`}
                />
                <span className="font-bold text-ink dark:text-gray-200 uppercase tracking-wide text-xs w-24">
                  {item.status}
                </span>
                <span className="text-muted-light dark:text-muted-dark">
                  {item.count} questions
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
