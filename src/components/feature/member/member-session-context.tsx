"use client";

import { createContext, useContext } from "react";

interface MemberSession {
  name: string;
  personId: string;
}

const MemberSessionContext = createContext<MemberSession | null>(null);

export function MemberSessionProvider({
  name,
  personId,
  children,
}: MemberSession & { children: React.ReactNode }) {
  return <MemberSessionContext.Provider value={{ name, personId }}>{children}</MemberSessionContext.Provider>;
}

function useMemberSession(): MemberSession {
  const session = useContext(MemberSessionContext);
  if (session === null) throw new Error("useMemberSession() must be used within MemberShell");
  return session;
}

/** The logged-in member's own name, set once by MemberShell from the server session. */
export function useMemberName(): string {
  return useMemberSession().name;
}

/** The logged-in member's own Person id, set once by MemberShell from the server session. */
export function useMemberPersonId(): string {
  return useMemberSession().personId;
}
