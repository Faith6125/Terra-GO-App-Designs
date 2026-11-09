import React from 'react';
import { X } from 'react-feather';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex justify-center items-end p-4 pb-6">
      <button 
        className="absolute inset-0 bg-black bg-opacity-50 w-full h-full cursor-default border-none" 
        onClick={onClose}
        aria-label="Close modal"
        tabIndex={-1}
      />
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-[22px] sm:rounded-3xl shadow-2xl w-full max-w-lg p-4 sm:p-6 animate-slide-up border border-gray-100 dark:border-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-slate-200" aria-label="Close">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div>{children}</div>
      </div>
       <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};