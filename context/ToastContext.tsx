
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { XIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '../components/icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast = ({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeClasses = {
    success: {
      bg: 'bg-green-50 border-green-400',
      iconColor: 'text-green-500',
      icon: <CheckCircleIcon className="h-6 w-6" />,
    },
    error: {
      bg: 'bg-red-50 border-red-400',
      iconColor: 'text-red-500',
      icon: <XCircleIcon className="h-6 w-6" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-400',
      iconColor: 'text-blue-500',
      icon: <InformationCircleIcon className="h-6 w-6" />,
    },
  };

  const { bg, iconColor, icon } = typeClasses[type];

  return (
    <div 
        className={`w-full max-w-sm p-4 bg-white rounded-lg shadow-lg border-l-4 ${bg} flex items-start space-x-3 animate-fade-in`}
        role={type === 'error' ? 'alert' : 'status'}
        aria-live="assertive"
    >
      <div className={`flex-shrink-0 ${iconColor}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-stone-800">{message}</p>
      </div>
      <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts((prevToasts) => [...prevToasts, { id: Date.now(), message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};