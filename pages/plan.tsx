import { useState, useRef, useEffect } from "react";
import Layout from "../components/layout/Layout";
import { useAuth } from "../components/auth/AuthContext";
import Link from "next/link";

interface Message {
    role: "user" | "model";
    content: string;
}

const STARTERS = [
    "Family of 4 to Bali for 10 days, mid budget 🌴",
    "Solo backpacker, Southeast Asia 3 weeks, budget traveler 🎒",
    "Couple honeymoon trip to Japan for 2 weeks 🌸",
    "First time visiting Bangkok with kids, 5 days 🐘",
];

export default function Plan() {
    const { isGuest } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg: Message = { role: "user", content: text.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/ai-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "AI error");
            setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                { role: "model", content: `⚠️ Sorry, something went wrong: ${err.message}` },
            ]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    // Simple markdown → HTML renderer (bold, bullet, headers)
    const renderMarkdown = (text: string) => {
        return text
            .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-white mt-4 mb-1">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-white mt-5 mb-2">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mt-5 mb-2">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-5rem)]">
                {/* Header */}
                <div className="rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5 mb-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-accent-blue flex items-center justify-center shadow-lg">
                            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-ink dark:text-white">AI Trip Planner</h1>
                            <p className="text-xs text-muted-dark">Describe your trip and get a personalized itinerary instantly.</p>
                        </div>
                        {isGuest && (
                            <div className="ml-auto">
                                <Link href="/login" className="text-xs font-bold text-accent-blue hover:underline">
                                    Log in for full access →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
                    {/* Welcome state */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
                            <div className="text-center">
                                <div className="text-5xl mb-4">✈️</div>
                                <h2 className="text-xl font-bold text-ink dark:text-white mb-2">Where are you heading?</h2>
                                <p className="text-sm text-muted-dark max-w-sm">
                                    Tell me about your trip — destination, group size, budget, and duration — and I'll create a tailored itinerary.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                {STARTERS.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => sendMessage(s)}
                                        className="rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4 text-sm text-left text-ink dark:text-gray-200 hover:border-accent-blue hover:bg-accent-blue/5 transition-all active:scale-98"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {msg.role === "model" && (
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-accent-blue flex-shrink-0 flex items-center justify-center mt-1">
                                    <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                        ? "bg-accent-blue text-white rounded-tr-sm"
                                        : "bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-ink dark:text-gray-200 rounded-tl-sm"
                                    }`}
                            >
                                {msg.role === "model" ? (
                                    <div
                                        className="prose-sm prose-invert"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                    />
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-accent-blue flex-shrink-0 flex items-center justify-center">
                                <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex gap-1.5 items-center h-5">
                                    <span className="w-2 h-2 rounded-full bg-muted-dark animate-bounce [animation-delay:0ms]" />
                                    <span className="w-2 h-2 rounded-full bg-muted-dark animate-bounce [animation-delay:150ms]" />
                                    <span className="w-2 h-2 rounded-full bg-muted-dark animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input bar */}
                <div className="border-t border-border-light dark:border-border-dark pt-4">
                    <div className="flex gap-3 items-end bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark p-3 focus-within:border-accent-blue transition-colors">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            placeholder="Describe your trip... (Enter to send, Shift+Enter for newline)"
                            className="flex-1 bg-transparent text-sm text-ink dark:text-gray-200 placeholder:text-muted-dark resize-none outline-none leading-relaxed max-h-32"
                            style={{ height: "auto" }}
                            onInput={(e) => {
                                const t = e.currentTarget;
                                t.style.height = "auto";
                                t.style.height = t.scrollHeight + "px";
                            }}
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || loading}
                            className="flex-shrink-0 w-9 h-9 rounded-xl bg-accent-blue flex items-center justify-center text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-accent-blue/20"
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-muted-dark mt-2">
                        Powered by Google Gemini · Responses may not be 100% accurate
                    </p>
                </div>
            </div>
        </Layout>
    );
}
