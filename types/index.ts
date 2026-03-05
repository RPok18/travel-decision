export interface User {
    id: number;
    email: string;
    username?: string;
    is_admin: boolean;
    isAdmin?: boolean;
}

export interface UserProfile {
    id: number;
    user_id: number;
    bio?: string;
    avatar_url?: string;
    cities_of_experience: string[];
}

export interface Author {
    id: number;
    display_name: string;
    username?: string;
}

export interface Question {
    id: number;
    title: string;
    question_text: string;
    author_id: number;
    author_display_name?: string;
    author_username?: string;
    author?: Author; // Support both nested and flat author info
    created_at: string;
    last_message_at: string | null;
    answer_count: number;
    like_count: number;
    vote_score?: number;
    media_url?: string | null;
    status: string;
    answers?: Answer[];
}

export interface Answer {
    id: number;
    question_id: number;
    user_id: number;
    author_id?: number;
    author_username?: string;
    author_display_name?: string;
    answer_text: string;
    created_at: string;
    media_url?: string | null;
    reply_to_id?: number | null;
    like_count?: number;
    context?: any;
}

export interface Card {
    id: number;
    title: string;
    summary: string;
    recommendations: string[];
    risks: string[];
    fit_for: string[];
    status: string;
    city_id: number;
    topic_id: number;
    budget_tier: string;
    requirements: string[];
    duration: string;
}

export interface City {
    id: number;
    name: string;
}

export interface Topic {
    id: number;
    name: string;
}
