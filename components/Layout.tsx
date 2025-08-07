import React, { ReactNode } from 'react';
import AppHeader from './Header';
import Footer from './Footer';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AppHeader />
            <main className="mt-8">
                {children}
            </main>
            <Footer />
        </div>
    );
}

export default Layout;