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
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );

            const queryPromise = supabase
                .from('approved_emails')
                .select('is_admin')
                .eq('email', email)
                .single();

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as Awaited<typeof queryPromise>;

            if (error || !data) {
                console.log('Email not approved or error:', error?.message);
                setIsApproved(false);
                setIsAdmin(false);
                return;
            }

            setIsApproved(true);
            setIsAdmin(data.is_admin || false);
        } catch (err) {
            console.error('Error checking approval:', err);
            setIsApproved(false);
            setIsAdmin(false);
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
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user?.email) {
                    await checkApproval(session.user.email);
                } else {
                    setIsApproved(false);
                    setIsAdmin(false);
                }
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
