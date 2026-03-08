import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
    id: string;
    username: string | null;
    role: 'user' | 'admin';
    university_domain: string | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: {
        username?: string;
        role?: string;
        university_domain?: string;
        full_name?: string;
        institution_name?: string;
        phone?: string;
        onboarding_completed?: boolean;
    } | null;
    isAdmin: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
    completeOnboarding: (data: { full_name: string; username: string; institution_name: string; phone: string }) => Promise<void>;
    updateProfile: (data: Partial<{ full_name: string; username: string; institution_name: string; phone: string }>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, username, role, university_domain, full_name, institution_name, phone, onboarding_completed")
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
        // 1. Obtener sesión inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        // 2. Escuchar cambios de estado
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

    const completeOnboarding = async (data: { full_name: string; username: string; institution_name: string; phone: string }) => {
        if (!user) {
            console.error("No user logged in to complete onboarding.");
            return;
        }
        try {
            const { error } = await supabase
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

            // Re-fetch profile to update context
            await fetchProfile(user.id);
        } catch (err) {
            console.error("Error completing onboarding:", err);
            throw err;
        }
    };

    const updateProfile = async (updates: Partial<{ full_name: string; username: string; institution_name: string; phone: string }>) => {
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

    return (
        <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, signOut, completeOnboarding, updateProfile }}
        >
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
