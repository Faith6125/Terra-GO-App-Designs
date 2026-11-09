
import React, { useEffect } from 'react';
import { Icon } from './Icon';
import { ToastType, IconName } from '../types';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const toastConfig: Record<ToastType, { icon: IconName; styles: string; bg: string }> = {
    success: { icon: 'checkCircle', styles: 'text-green-600 dark:text-green-400', bg: 'bg-white dark:bg-slate-900 border-green-100 dark:border-green-950/40' },
    error: { icon: 'xCircle', styles: 'text-red-600 dark:text-red-400', bg: 'bg-white dark:bg-slate-900 border-red-100 dark:border-red-950/40' },
    info: { icon: 'alertTriangle', styles: 'text-blue-600 dark:text-blue-400', bg: 'bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-950/40' },
};

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  const config = toastConfig[type];

  return (
    <div className="absolute top-12 left-4 right-4 z-[100] flex justify-center">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-full shadow-xl ${config.bg} border animate-toast-in-out w-auto max-w-md`}>
            <div className={`p-1 rounded-full ${type === 'success' ? 'bg-green-50 dark:bg-green-950/40' : type === 'error' ? 'bg-red-50 dark:bg-red-950/40' : 'bg-blue-50 dark:bg-blue-950/40'}`}>
                <Icon name={config.icon} className={`w-5 h-5 flex-shrink-0 ${config.styles}`} />
            </div>
            <p className="font-medium text-sm text-gray-800 dark:text-slate-200 leading-tight">{message}</p>
        </div>
        <style>{`
            @keyframes toast-in-out {
              0% { opacity: 0; transform: translateY(-20px) scale(0.95); }
              15% { opacity: 1; transform: translateY(0) scale(1); }
              85% { opacity: 1; transform: translateY(0) scale(1); }
              100% { opacity: 0; transform: translateY(-20px) scale(0.95); }
            }
            .animate-toast-in-out { animation: toast-in-out 3s ease-in-out forwards; }
        `}</style>
    </div>
  );
};
