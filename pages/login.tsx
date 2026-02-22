import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../components/AuthContext";
import Layout from "../components/Layout";
import { API_URL } from "../lib/api-client";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState(""); // Not used by backend but required for OAuth2 form
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Backend expects OAuth2 form data (multipart/form-data or application/x-www-form-urlencoded)
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password || "pass");

            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Login failed");
            }

            const data = await response.json();
            const token = data.access_token;

            // Now fetch user details
            const meResponse = await fetch(`${API_URL}/users/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!meResponse.ok) throw new Error("Failed to fetch user details");
            const meData = await meResponse.json();

            login(token, meData.id, meData.email, meData.is_admin || false);
            router.push("/");
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "Something went wrong. Check your backend.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-full max-w-md p-8 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-ink dark:text-white mb-2">Welcome Back</h1>
                        <p className="text-sm text-muted-dark">Join the global traveler community</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-muted-dark uppercase tracking-widest mb-2 ml-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nomad@travel.dev"
                                required
                                className="w-full rounded-2xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-hover-dark px-5 py-3 text-sm text-ink dark:text-gray-200 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-dark uppercase tracking-widest mb-2 ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                className="w-full rounded-2xl border border-border-light dark:border-border-dark bg-hover-light dark:bg-hover-dark px-5 py-3 text-sm text-ink dark:text-gray-200 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-500 text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 rounded-2xl bg-accent-blue text-white font-bold text-sm shadow-lg shadow-accent-blue/25 hover:brightness-110 active:scale-[0.98] transition-all ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                        >
                            {isSubmitting ? "Logging in..." : "Continue"}
                        </button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border-dark opacity-20"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-card-dark text-muted-dark">or</span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-dark">
                            Don't have an account?{" "}
                            <button onClick={() => setEmail("traveler@example.com")} className="text-accent-blue hover:underline font-bold">
                                Try guest login
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
