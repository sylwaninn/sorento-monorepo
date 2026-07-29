import { createContext } from "react";
import type { Session, User } from "@sorento/supabase-client";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
