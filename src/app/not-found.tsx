import Link from "next/link";
import type { Metadata } from "next";
import { Compass, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Page not found — Messy",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-5" />
          </div>
          <CardTitle className="text-2xl">404</CardTitle>
          <CardDescription>This page doesn&apos;t exist, or has moved.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full cursor-pointer">
            <Link href="/dashboard">
              <Compass className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
