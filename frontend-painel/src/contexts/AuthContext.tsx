import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { Tables } from '@/types/database';

type Profile = Tables<'profiles'>;

function getGoogleProfilePatch(user: User, profile: Profile) {
  const metadata = user.user_metadata || {};
  const googleName = [metadata.full_name, metadata.name].find((value) => typeof value === 'string' && value.trim());
  const googleAvatar = [metadata.avatar_url, metadata.picture].find((value) => typeof value === 'string' && value.trim());
  const currentName = profile.full_name?.trim();
  const currentLooksWeak = !currentName || currentName === profile.email || currentName === user.email;
  const patch: Partial<Profile> = {};

  if (currentLooksWeak && googleName) {
    patch.full_name = googleName.trim();
  }

  if (!profile.avatar_url && googleAvatar) {
    patch.avatar_url = googleAvatar.trim();
  }

  return patch;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  tenantId: string | null;
  tenantStatus: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    // CRITICAL: The callback must be SYNCHRONOUS.
    // An async callback causes setLoading(false) to be delayed by await calls,
    // which is the root cause of the infinite loading bug.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        if (ignore) return;

        setSession(sess);
        setUser(sess?.user ?? null);

        // ALWAYS stop loading immediately — profile is loaded lazily
        setLoading(false);

        // Fetch profile in the background (non-blocking)
        if (sess?.user) {
          const uid = sess.user.id;
          setProfileLoading(true);
          (async () => {
            try {
              const { data } = await supabase
                .from('profiles')
                .select('*, tenant:tenants(active)')
                .eq('id', uid)
                .single();
              if (!ignore && data) {
                const profileData = data as any;
                const googlePatch = getGoogleProfilePatch(sess.user, profileData);
                const nextProfile = { ...profileData, ...googlePatch };
                setProfile(profileData);
                setTenantStatus(profileData.tenant?.active ? 'active' : 'inactive');

                if (Object.keys(googlePatch).length > 0) {
                  setProfile(nextProfile);
                  await supabase.from('profiles').update(googlePatch).eq('id', uid);
                }
              }
            } catch {
              if (!ignore) {
                setProfile(null);
                setTenantStatus(null);
              }
            } finally {
              if (!ignore) setProfileLoading(false);
            }
          })();
        } else {
          setProfile(null);
          setTenantStatus(null);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    try {
      const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: supabaseAnonKey },
      });

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if (settings?.external?.google !== true) {
          return {
            error: new Error('Login com Google ainda nao esta habilitado no Supabase. Use email e senha ou habilite o provedor Google em Authentication > Providers.'),
          };
        }
      }
    } catch {
      // If the settings check is unavailable, let Supabase handle the OAuth attempt.
    }

    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'openid email profile',
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTenantStatus(null);
    setSession(null);
    setProfileLoading(false);
  };

  const tenantId = profile?.tenant_id ?? null;

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, profileLoading, tenantId, tenantStatus, signIn, signInWithGoogle, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

