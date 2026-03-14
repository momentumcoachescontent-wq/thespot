import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
    id: string;
    username: string | null;
    role: 'user' | 'admin';
    is_premium: boolean;
    subscription_status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing' | null;
    subscription_expires_at: string | null;
    stripe_customer_id: string | null;
    premium_granted_by_admin: boolean;
    university_domain: string | null;
    avatar_emoji?: string | null;
    full_name?: string | null;
    institution_name?: string | null;
    phone?: string | null;
    onboarding_completed?: boolean;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    isAdmin: boolean;
    isPremium: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
    completeOnboarding: (data: { full_name: string; username: string; institution_name: string; phone: string }) => Promise<void>;
    updateProfile: (data: Partial<{ full_name: string; username: string; institution_name: string; phone: string; avatar_emoji: string }>) => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (uid: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("id, username, role, is_premium, subscription_status, subscription_expires_at, stripe_customer_id, premium_granted_by_admin, university_domain, full_name, institution_name, phone, onboarding_completed, avatar_emoji")
                .eq("id", uid)
                .single();

            if (error) throw error;
            setProfile(data as Profile);
        } catch (err) {
            console.error("Error fetching profile:", err);
            setProfile(null);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    const completeOnboarding = async (data: { full_name: string; username: string; institution_name: string; phone: string }) => {
        if (!user) return;
        try {
            const { error } = await (supabase as any)
                .from("profiles")
                .update({
                    full_name: data.full_name,
                    username: data.username,
                    institution_name: data.institution_name,
                    phone: data.phone,
                    onboarding_completed: true,
                })
                .eq("id", user.id);

            if (error) throw error;
            await fetchProfile(user.id);
        } catch (err) {
            console.error("Error completing onboarding:", err);
            throw err;
        }
    };

    const updateProfile = async (updates: Partial<{ full_name: string; username: string; institution_name: string; phone: string; avatar_emoji: string }>) => {
        if (!user) return;
        try {
            const { error } = await (supabase as any)
                .from("profiles")
                .update(updates)
                .eq("id", user.id);

            if (error) throw error;
            await fetchProfile(user.id);
        } catch (err) {
            console.error("Error updating profile:", err);
            throw err;
        }
    };

    const isAdmin = profile?.role === 'admin';
    // Premium: either Stripe active subscription, or manually granted by admin, or is admin
    const isPremium = isAdmin || profile?.is_premium === true;

    return (
        <AuthContext.Provider value={{ session, user, profile, isAdmin, isPremium, loading, signOut, completeOnboarding, updateProfile, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }
    return context;
};
