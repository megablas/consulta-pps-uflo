import React, { useState, useEffect } from 'react';

interface WelcomeBannerAdminProps {
  name: string;
}

const WelcomeBannerAdmin: React.FC<WelcomeBannerAdminProps> = ({ name }) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Buenos días');
    } else if (hour >= 12 && hour < 20) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }
  }, []);

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
        {greeting}, <span className="text-blue-600 dark:text-blue-400">{name.split(' ')[0]}</span>.
      </h1>
      <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
        Bienvenido a tu panel de gestión de Prácticas Profesionales Supervisadas.
      </p>
    </div>
  );
};

export default WelcomeBannerAdmin;
