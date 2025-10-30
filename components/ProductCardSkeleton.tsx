import React from 'react';

export const ProductCardSkeleton = () => {
    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="relative">
                {/* Image Placeholder */}
                <div className="w-full h-52 bg-gray-200 animate-pulse"></div>
                {/* Product Name on Image Placeholder */}
                <div className="absolute bottom-4 left-5 h-6 w-3/4 bg-gray-300/50 animate-pulse rounded"></div>
            </div>
            <div className="p-5">
                {/* Description Placeholder */}
                <div className="space-y-2 h-10 mb-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
                </div>
                <div className="flex justify-between items-center mt-4">
                    {/* Price Placeholder */}
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
                    {/* Button Placeholder */}
                    <div className="h-10 bg-gray-200 rounded-full animate-pulse w-28"></div>
                </div>
            </div>
        </div>
    );
};
