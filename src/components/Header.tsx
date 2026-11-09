import React from 'react';

interface HeaderProps {
    title: string;
    onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack }) => (
    <div className="p-4 shadow-sm flex items-center justify-between sticky top-0 z-10 bg-white border-b border-gray-100">
        {onBack ? <button onClick={onBack} className="font-medium flex items-center gap-1 text-[#303690] hover:text-[#E70D8D] transition-colors">&larr; Back</button> : <div className="w-12"/>}
        <h1 className="text-lg font-bold text-center tracking-tight text-[#303690]">{title}</h1>
        <div className='w-12'/>
    </div>
);
