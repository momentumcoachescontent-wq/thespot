import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type FilterType = 'mine' | 'all' | string;

interface FilterContextType {
    selectedDomain: FilterType;
    setSelectedDomain: (domain: FilterType) => void;
    resolvedDomain: string | null; // El dominio real filtrado (null si es 'all')
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useAuth();
    const [selectedDomain, setSelectedDomain] = useState<FilterType>('mine');
    const [resolvedDomain, setResolvedDomain] = useState<string | null>(null);

    useEffect(() => {
        if (selectedDomain === 'mine') {
            const email = (profile as any)?.edu_email || '';
            const domain = email.split('@')[1];
            setResolvedDomain(domain || null);
        } else if (selectedDomain === 'all') {
            setResolvedDomain(null);
        } else {
            setResolvedDomain(selectedDomain);
        }
    }, [selectedDomain, profile]);

    return (
        <FilterContext.Provider value={{ selectedDomain, setSelectedDomain, resolvedDomain }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilter = () => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilter must be used within a FilterProvider');
    }
    return context;
};
