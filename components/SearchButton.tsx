import React from 'react';

interface SearchButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const SearchButton: React.FC<SearchButtonProps> = ({ onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-blue-600 text-white font-semibold text-base py-3 px-6 rounded-md
                 transition-all duration-200 ease-in-out shadow-sm
                 hover:bg-blue-700 hover:shadow-md
                 active:bg-blue-800
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                 disabled:bg-slate-400 disabled:text-slate-100 disabled:cursor-not-allowed disabled:shadow-none"
    >
      Consultar
    </button>
  );
};

export default SearchButton;