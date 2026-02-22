import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
    id: number;
    email: string;
    isAdmin?: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    login: (token: string, userId: number, email: string, isAdmin: boolean) => void;
    logout: () => void;
    isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        const userId = localStorage.getItem("user_id");
        const email = localStorage.getItem("user_email");
        const isAdmin = localStorage.getItem("user_is_admin") === "true";
        if (token && userId && email) {
            setUser({ id: parseInt(userId), email, isAdmin });
            setIsLoggedIn(true);
        }
    }, []);

    const login = (token: string, userId: number, email: string, isAdmin: boolean) => {
        localStorage.setItem("access_token", token);
        localStorage.setItem("user_id", userId.toString());
        localStorage.setItem("user_email", email);
        localStorage.setItem("user_is_admin", isAdmin.toString());
        setUser({ id: userId, email, isAdmin });
        setIsLoggedIn(true);
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_is_admin");
        setUser(null);
        setIsLoggedIn(false);
    };

    return (
        <AuthContext.Provider value={{ user, isLoggedIn, login, logout, isGuest: !isLoggedIn }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
