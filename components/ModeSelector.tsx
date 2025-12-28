import React from 'react';
import { UserRole } from '../types';

interface ModeSelectorProps {
    currentMode: UserRole;
    onModeChange: () => void;
    isLoading?: boolean;
}

/**
 * Clean Mode Selector - Toggle between Farmer and Buyer modes
 */
export const ModeSelector: React.FC<ModeSelectorProps> = ({ 
    currentMode, 
    onModeChange,
    isLoading = false 
}) => {
    const isFarmer = currentMode === UserRole.Farmer;

    return (
        <div className="relative">
            {/* Clean Container */}
            <div className="flex items-center rounded-lg bg-gray-100 border border-gray-200 p-1 gap-0.5">
                {/* Farmer Button */}
                <button
                    onClick={() => !isFarmer && !isLoading && onModeChange()}
                    disabled={isLoading}
                    className={`
                        relative flex items-center gap-1.5 px-3 py-2 rounded-md
                        font-body font-semibold text-sm
                        transition-all duration-200 ease-out
                        ${isFarmer 
                            ? 'bg-[#15803D] text-white shadow-sm' 
                            : 'text-gray-600 hover:bg-white'
                        }
                        ${isLoading ? 'cursor-wait opacity-70' : 'cursor-pointer'}
                    `}
                    aria-label="Switch to Farmer mode"
                    aria-pressed={isFarmer}
                >
                    <span className="text-base" role="img" aria-hidden="true">🌾</span>
                    <span className="hidden sm:inline">Farmer</span>
                </button>

                {/* Buyer Button */}
                <button
                    onClick={() => isFarmer && !isLoading && onModeChange()}
                    disabled={isLoading}
                    className={`
                        relative flex items-center gap-1.5 px-3 py-2 rounded-md
                        font-body font-semibold text-sm
                        transition-all duration-200 ease-out
                        ${!isFarmer 
                            ? 'bg-[#15803D] text-white shadow-sm' 
                            : 'text-gray-600 hover:bg-white'
                        }
                        ${isLoading ? 'cursor-wait opacity-70' : 'cursor-pointer'}
                    `}
                    aria-label="Switch to Buyer mode"
                    aria-pressed={!isFarmer}
                >
                    <span className="text-base" role="img" aria-hidden="true">🛒</span>
                    <span className="hidden sm:inline">Buyer</span>
                </button>
            </div>

            {/* Loading indicator */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                    <div className="w-4 h-4 border-2 border-[#15803D] border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
};

export default ModeSelector;
