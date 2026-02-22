import type { AppProps } from "next/app";
import { ThemeProvider } from "../components/ThemeProvider";
import "../styles/globals.css";

import { AuthProvider } from "../components/AuthContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}
