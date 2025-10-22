import React, { ReactNode } from 'react';
import AppHeader from './Header';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <AppHeader />
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-8">
                {children}
            </main>
        </div>
    );
}

export default Layout;