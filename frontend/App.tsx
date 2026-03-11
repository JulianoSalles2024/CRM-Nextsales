import React from 'react';
import { useAppState } from '@/src/app/useAppState';
import { AppContext } from '@/src/app/AppContext';
import RootLayout from '@/src/app/RootLayout';

const App: React.FC = () => {
    const appState = useAppState();
    return (
        <AppContext.Provider value={appState}>
            <RootLayout />
        </AppContext.Provider>
    );
};

export default App;
