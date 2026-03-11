import { createContext, useContext } from 'react';

// Phase 3: loose typing — will be tightened in Phase 4 when domain modules are defined
export type AppContextValue = Record<string, any>;

export const AppContext = createContext<AppContextValue>({});

export function useAppContext(): AppContextValue {
    return useContext(AppContext);
}
