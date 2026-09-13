"use client";

import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/feature/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SWRConfig value={{ revalidateOnFocus: false, shouldRetryOnError: false }}>
        {children}
      </SWRConfig>
      <Toaster position="bottom-right" duration={2000} richColors />
      <PwaRegister />
    </ThemeProvider>
  );
}
