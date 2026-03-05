import type { AppProps } from "next/app";
import { ThemeProvider } from "../components/layout/ThemeProvider";
import "../styles/globals.css";

import { AuthProvider } from "../components/auth/AuthContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}
