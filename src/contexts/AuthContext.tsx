import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
const ADMIN_EMAILS = ['noelkiu@gmail.com', 'iamnoel888@gmail.com'];

interface ApprovalStatus {
    isApproved: boolean;
    isAdmin: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isApproved, setIsApproved] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const sessionCheckId = useRef(0);

    // Check if email is in approved_emails table
    const checkApproval = useCallback(async (email: string): Promise<ApprovalStatus> => {
        const normalizedEmail = email.toLowerCase();
        const cacheKey = `approval_${normalizedEmail}`;

        try {
            // Check cache first
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                const { isApproved: cachedApproved, isAdmin: cachedAdmin } = JSON.parse(cached);
                console.log('Using cached approval status for:', normalizedEmail);
                return {
                    isApproved: cachedApproved,
                    isAdmin: cachedAdmin,
                };
            }

            // Query database - only select email since is_admin column may not exist
            const { data, error } = await supabase
                .from('approved_emails')
                .select('email')
                .ilike('email', normalizedEmail)
                .maybeSingle();

            if (error || !data) {
                console.log('Email not approved or error:', error?.message);
                // Don't cache negative results to allow retry
                return {
                    isApproved: false,
                    isAdmin: false,
                };
            }

            // Email exists in approved list - user is approved
            // For admin check, use a hardcoded list since table doesn't have is_admin column
            const adminStatus = ADMIN_EMAILS.includes(normalizedEmail);

            const approvalData = {
                isApproved: true,
                isAdmin: adminStatus
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(approvalData));

            return approvalData;
        } catch (err) {
            console.error('Error checking approval:', err);
            // On error, check if we have a cached value to fall back to
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                const { isApproved: cachedApproved, isAdmin: cachedAdmin } = JSON.parse(cached);
                console.log('Falling back to cached approval due to error');
                return {
                    isApproved: cachedApproved,
                    isAdmin: cachedAdmin,
                };
            }

            // Only deny access if there's no cache to fall back to
            return {
                isApproved: false,
                isAdmin: false,
            };
        }
    }, []);

    const applySession = useCallback(async (nextSession: Session | null) => {
        const checkId = ++sessionCheckId.current;
        setIsLoading(true);
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (!nextSession?.user?.email) {
            setIsApproved(false);
            setIsAdmin(false);
            setIsLoading(false);
            return;
        }

        const approval = await checkApproval(nextSession.user.email);

        if (checkId !== sessionCheckId.current) {
            return;
        }

        setIsApproved(approval.isApproved);
        setIsAdmin(approval.isAdmin);
        setIsLoading(false);
    }, [checkApproval]);

    useEffect(() => {
        // Get initial session with timeout to prevent infinite loading
        const sessionTimeout = setTimeout(() => {
            console.warn('Session check timed out after 5 seconds');
            setIsLoading(false);
        }, 5000);

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            clearTimeout(sessionTimeout);
            await applySession(session);
        }).catch((err) => {
            clearTimeout(sessionTimeout);
            console.error('Error getting session:', err);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state change event:', event);
                await applySession(session);
            }
        );

        return () => subscription.unsubscribe();
    }, [applySession]);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    prompt: 'select_account',
                },
            },
        });
        if (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    };

    const signOut = useCallback(async () => {
        // Clear approval cache
        if (user?.email) {
            sessionStorage.removeItem(`approval_${user.email.toLowerCase()}`);
        }

        // Increment check ID to abort any pending applySession calls
        sessionCheckId.current += 1;

        // Force clear local state IMMEDIATELY to guarantee UI updates
        // This ensures the user instantly sees the Login screen and is not blocked by network hangs
        setSession(null);
        setUser(null);
        setIsApproved(false);
        setIsAdmin(false);
        setIsLoading(false);

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Exception during sign out:', error);
        }
    }, [user]);

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
