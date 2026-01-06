import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isApproved: boolean;
    isAdmin: boolean;
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isApproved, setIsApproved] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check if email is in approved_emails table
    const checkApproval = async (email: string): Promise<void> => {
        try {
            // Check cache first
            const cacheKey = `approval_${email}`;
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                const { isApproved: cachedApproved, isAdmin: cachedAdmin } = JSON.parse(cached);
                console.log('Using cached approval status for:', email);
                setIsApproved(cachedApproved);
                setIsAdmin(cachedAdmin);
                return;
            }

            // Query database without timeout - let Supabase handle its own timeout
            const { data, error } = await supabase
                .from('approved_emails')
                .select('is_admin')
                .eq('email', email)
                .single();

            if (error || !data) {
                console.log('Email not approved or error:', error?.message);
                setIsApproved(false);
                setIsAdmin(false);
                // Don't cache negative results to allow retry
                return;
            }

            // Cache the positive result
            const approvalData = {
                isApproved: true,
                isAdmin: data.is_admin || false
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(approvalData));

            setIsApproved(true);
            setIsAdmin(data.is_admin || false);
        } catch (err) {
            console.error('Error checking approval:', err);
            // On error, check if we have a cached value to fall back to
            const cacheKey = `approval_${email}`;
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                const { isApproved: cachedApproved, isAdmin: cachedAdmin } = JSON.parse(cached);
                console.log('Falling back to cached approval due to error');
                setIsApproved(cachedApproved);
                setIsAdmin(cachedAdmin);
            } else {
                // Only deny access if there's no cache to fall back to
                setIsApproved(false);
                setIsAdmin(false);
            }
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user?.email) {
                await checkApproval(session.user.email);
            }
            setIsLoading(false);
        }).catch(() => {
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state change event:', event);
                setSession(session);
                setUser(session?.user ?? null);

                // Only check approval on SIGNED_IN event
                // For all other events (TOKEN_REFRESHED, USER_UPDATED, etc.), preserve existing state
                if (event === 'SIGNED_IN') {
                    if (session?.user?.email) {
                        await checkApproval(session.user.email);
                    } else {
                        setIsApproved(false);
                        setIsAdmin(false);
                    }
                } else if (event === 'SIGNED_OUT') {
                    setIsApproved(false);
                    setIsAdmin(false);
                    // Clear cache on sign out
                    if (session?.user?.email) {
                        sessionStorage.removeItem(`approval_${session.user.email}`);
                    }
                }
                // For TOKEN_REFRESHED, USER_UPDATED, and other events, keep existing approval state

                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    };

    const signOut = async () => {
        // Clear approval cache
        if (user?.email) {
            sessionStorage.removeItem(`approval_${user.email}`);
        }

        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
            throw error;
        }
        setIsApproved(false);
        setIsAdmin(false);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                isApproved,
                isAdmin,
                isLoading,
                signInWithGoogle,
                signOut,
            }}
        >
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
