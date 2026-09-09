"use client";

import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SWRConfig value={{ revalidateOnFocus: false, shouldRetryOnError: false }}>
        {children}
      </SWRConfig>
      <Toaster position="bottom-right" richColors />
    </ThemeProvider>
  );
}
