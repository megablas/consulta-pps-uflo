import React, { ReactNode } from 'react';
import AppHeader from './Header';
import Footer from './Footer';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { isSuperUserMode } = useAuth();

    return (
        <div className="flex flex-col min-h-screen">
            <AppHeader />
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
            {!isSuperUserMode && (
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                   <Footer />
                </div>
            )}
        </div>
    );
}

export default Layout;