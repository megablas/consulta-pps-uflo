import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center my-10 sm:my-12">
      <div className="border-4 border-slate-200 border-t-blue-500 rounded-full w-10 h-10 animate-spin"></div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
};

export default Loader;
