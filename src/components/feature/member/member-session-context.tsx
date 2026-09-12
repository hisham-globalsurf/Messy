"use client";

import { createContext, useContext } from "react";

const MemberNameContext = createContext<string | null>(null);

export function MemberNameProvider({ name, children }: { name: string; children: React.ReactNode }) {
  return <MemberNameContext.Provider value={name}>{children}</MemberNameContext.Provider>;
}

/** The logged-in member's own name, set once by MemberShell from the server session. */
export function useMemberName(): string {
  const name = useContext(MemberNameContext);
  if (name === null) throw new Error("useMemberName() must be used within MemberShell");
  return name;
}
