import React, { useState, useRef, useEffect } from 'react';
import { ProductCategory, ProductType, GeoLocation, PricingEngineResult, User } from '../types';
import { generateProductDetails } from '../services/geminiService';
import { autoDetectLocation, getMarketPricing, INDIAN_STATES, MAJOR_DISTRICTS } from '../services/marketService';
import { formatPrice, parseGradeLabel } from '../lib/pricingEngine';
import { useToast } from '../context/ToastContext';
import { XIcon, LoaderIcon } from './icons';

interface ProductUploadPageProps {
    onBack: () => void;
    onSubmit: (product: {
        name: string;
        category: ProductCategory;
        description: string;
        price: number;
        quantity: number;
        type: ProductType;
        farmerNote: string;
    }, imageFile: File) => Promise<void>;
    currentUser?: User;
}

interface AIAnalysisResult {
    grade: string;
    gradeLabel: string;
    description: string;
    estimatedPrice: number;
    mspStatus: { isAbove: boolean; percentage: number };
    confidence: number;
    moisture: string;
    defects: string;
    name: string;
    category: ProductCategory;
    isValidAgri: boolean;
    isVerified: boolean; // True if AI verified, false if manual override
}

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

export const ProductUploadPage: React.FC<ProductUploadPageProps> = ({ onBack, onSubmit, currentUser }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0); // 0-100 progress
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [farmerNote, setFarmerNote] = useState('');
    const [editablePrice, setEditablePrice] = useState<number>(0);
    const [editableQuantity, setEditableQuantity] = useState<number>(10);
    const [productType, setProductType] = useState<ProductType>(ProductType.Bulk);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    // Location & Pricing State
    const [location, setLocation] = useState<GeoLocation | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [showManualLocation, setShowManualLocation] = useState(false);
    const [manualState, setManualState] = useState('');
    const [manualDistrict, setManualDistrict] = useState('');
    
    // Mandi Pricing State
    const [pricingResult, setPricingResult] = useState<PricingEngineResult | null>(null);
    const [isLoadingPricing, setIsLoadingPricing] = useState(false);

    // Auto-detect location on mount
    useEffect(() => {
        detectLocation();
    }, []);

    const detectLocation = async () => {
        setIsLoadingLocation(true);
        setLocationError(null);
        try {
            const detectedLocation = await autoDetectLocation();
            if (detectedLocation.state && detectedLocation.isAutoDetected) {
                setLocation(detectedLocation);
                showToast(`Location detected: ${detectedLocation.district}, ${detectedLocation.state}`, 'success');
            } else {
                setShowManualLocation(true);
                setLocationError('Could not detect your location. Please select manually.');
            }
        } catch (error) {
            console.error('Location detection failed:', error);
            setShowManualLocation(true);
            setLocationError('Location access denied. Please select manually.');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleManualLocationSubmit = () => {
        if (manualState && manualDistrict) {
            setLocation({
                state: manualState,
                district: manualDistrict,
                isAutoDetected: false,
            });
            setShowManualLocation(false);
            setLocationError(null);
            showToast(`Location set: ${manualDistrict}, ${manualState}`, 'success');
        }
    };

    // Fetch mandi pricing when we have both location and analysis result
    useEffect(() => {
        if (location && analysisResult) {
            fetchMandiPricing();
        }
    }, [location, analysisResult]);

    const fetchMandiPricing = async () => {
        if (!location || !analysisResult) return;
        
        setIsLoadingPricing(true);
        try {
            const response = await getMarketPricing({
                commodityName: analysisResult.name,
                category: analysisResult.category,
                grade: analysisResult.grade,
                location,
            });
            
            setPricingResult(response.pricing);
            
            // Auto-fill with target price (recommended fair price)
            setEditablePrice(Math.round(response.pricing.targetPrice));
            
            if (response.pricing.isFallback) {
                showToast('Using national average prices (local mandi data unavailable)', 'info');
            }
        } catch (error) {
            console.error('Failed to fetch mandi pricing:', error);
            showToast('Could not fetch market prices', 'error');
        } finally {
            setIsLoadingPricing(false);
        }
    };

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file', 'error');
            return;
        }

        setImageFile(file);
        setImagePreviewUrl(await fileToDataUrl(file));
        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            const base64Image = await fileToBase64(file);
            const details = await generateProductDetails(base64Image, file.type);
            
            // Check if agricultural product is valid
            if (!details.isValidAgri) {
                // REJECTED - Not an agricultural product
                showToast(
                    details.rejectionMessage || 
                    'यह कृषि उत्पाद नहीं है / This is not an agricultural product. Please upload vegetables, fruits, or grains only.',
                    'error'
                );
                
                // Allow manual override but mark as unverified
                setAnalysisResult({
                    grade: 'C',
                    gradeLabel: 'Unverified',
                    description: 'Product could not be verified. Please enter details manually.',
                    estimatedPrice: 0,
                    mspStatus: { isAbove: false, percentage: 0 },
                    confidence: 0,
                    moisture: 'Unknown',
                    defects: 'Unable to verify',
                    name: '',
                    category: ProductCategory.Other,
                    isValidAgri: false,
                    isVerified: false,
                });
                setEditablePrice(0);
                return;
            }
            
            // VALID agricultural product - use AI-verified details
            const realAnalysis: AIAnalysisResult = {
                grade: details.grade,
                gradeLabel: details.gradeLabel,
                description: details.description || 'High quality produce with optimal characteristics',
                estimatedPrice: 0, // Will be set by pricing engine
                mspStatus: { isAbove: true, percentage: 0 }, // Will be calculated
                confidence: details.confidence,
                moisture: details.moistureEstimate,
                defects: details.visualDefects,
                name: details.name || 'Fresh Produce',
                category: details.category || ProductCategory.Vegetable,
                isValidAgri: true,
                isVerified: true,
            };
            
            setAnalysisResult(realAnalysis);
            // Price will be set by fetchMandiPricing effect
            showToast('✓ Agricultural product verified!', 'success');
        } catch (error) {
            console.error('Analysis failed:', error);
            showToast(error instanceof Error ? error.message : 'Analysis failed - entering manual mode', 'error');
            
            // Manual Overdrive Mode - allow manual entry but mark as unverified
            setAnalysisResult({
                grade: 'B',
                gradeLabel: 'Manual Entry',
                description: 'Unable to analyze. Please verify details manually.',
                estimatedPrice: 20,
                mspStatus: { isAbove: true, percentage: 10 },
                confidence: 0,
                moisture: 'Unknown',
                defects: 'Unable to detect',
                name: 'Product',
                category: ProductCategory.Other,
                isValidAgri: true, // Allow submission
                isVerified: false, // But mark as unverified
            });
            setEditablePrice(20);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleRetake = () => {
        setImageFile(null);
        setImagePreviewUrl(null);
        setAnalysisResult(null);
        setFarmerNote('');
        setEditablePrice(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmListing = async () => {
        if (!imageFile || !analysisResult) return;

        setIsSubmitting(true);
        setUploadProgress(0);
        
        // Simulate progress while upload happens
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                // Slow down as we approach 90% to wait for actual completion
                if (prev < 30) return prev + 5;
                if (prev < 60) return prev + 3;
                if (prev < 90) return prev + 1;
                return prev; // Stay at ~90 until done
            });
        }, 150);
        
        try {
            await onSubmit({
                name: analysisResult.name,
                category: analysisResult.category,
                description: analysisResult.description + (farmerNote ? `\n\nFarmer's Note: ${farmerNote}` : ''),
                price: editablePrice,
                quantity: editableQuantity,
                type: productType,
                farmerNote: farmerNote,
            }, imageFile);
            setUploadProgress(100); // Complete!
            showToast('Product listed successfully!', 'success');
            onBack();
        } catch (error) {
            showToast('Failed to list product', 'error');
        } finally {
            clearInterval(progressInterval);
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="bg-[#f6f8f6] font-display text-[#131613] min-h-screen flex flex-col">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 bg-white border-b border-[#f1f3f1] px-6 py-4 shadow-sm">
                <div className="max-w-[1440px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            aria-label="Go back" 
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-3xl">arrow_back</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="size-8 text-[#2E7D32]">
                                <span className="material-symbols-outlined text-4xl">agriculture</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-[#131613]">Anna Bazaar</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-bold">{currentUser?.name || 'Farmer'}</span>
                            <span className="text-xs text-gray-500">Farmer • {location ? `${location.district}, ${location.state?.slice(0,2).toUpperCase()}` : 'India'}</span>
                        </div>
                        <div 
                            className="bg-center bg-no-repeat bg-cover rounded-full size-12 border-2 border-white shadow-md cursor-pointer" 
                            style={{ backgroundImage: `url('${currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.name || 'F'}&background=2E7D32&color=fff`}')` }}
                        ></div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow w-full max-w-[1440px] mx-auto px-6 py-8">
                {/* Page Heading Section */}
                <div className="mb-8">
                    <h2 className="text-4xl md:text-5xl font-black text-[#131613] tracking-tight mb-3">
                        Upload a photo of your harvest
                    </h2>
                    <p className="text-lg md:text-xl text-[#6b806c] font-medium max-w-2xl">
                        Ensure the photo is taken in bright sunlight for best results. We'll analyze quality instantly.
                    </p>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* Left Column: Input / Camera Zone */}
                    <div className="lg:col-span-7 w-full h-full flex flex-col">
                        <div 
                            className={`relative group flex flex-col items-center justify-center w-full min-h-[500px] lg:h-[650px] rounded-xl border-4 border-dashed ${imagePreviewUrl ? 'border-[#2E7D32]' : 'border-[#dee3de]'} bg-white hover:bg-gray-50 hover:border-[#2E7D32]/50 transition-all cursor-pointer overflow-hidden`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => !imagePreviewUrl && fileInputRef.current?.click()}
                        >
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleInputChange}
                            />
                            
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20">
                                    <LoaderIcon className="h-16 w-16 text-[#2E7D32] animate-spin" />
                                    <p className="mt-4 text-xl font-bold text-[#131613]">Analyzing your harvest...</p>
                                    <p className="text-gray-500">This may take a few seconds</p>
                                </div>
                            )}

                            {imagePreviewUrl ? (
                                <div className="w-full h-full relative">
                                    <img 
                                        src={imagePreviewUrl} 
                                        alt="Harvest preview" 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-4 right-4">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRetake(); }}
                                            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                                        >
                                            <XIcon className="h-6 w-6 text-gray-600" />
                                        </button>
                                    </div>
                                    {analysisResult && (
                                        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                                            <div className="flex items-center gap-2 text-[#2E7D32]">
                                                <span className="material-symbols-outlined">check_circle</span>
                                                <span className="font-bold">Image analyzed successfully</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Content inside drag zone */}
                                    <div className="flex flex-col items-center gap-8 p-8 text-center z-10">
                                        <div className="size-24 rounded-full bg-[#2E7D32]/10 flex items-center justify-center text-[#2E7D32] mb-4">
                                            <span className="material-symbols-outlined text-6xl">add_a_photo</span>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-3xl font-bold text-gray-900">Drag & Drop or Click</h3>
                                            <p className="text-xl text-gray-500">to upload harvest photo</p>
                                        </div>
                                        <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                                className="w-full h-16 bg-[#2E7D32] hover:bg-green-700 text-white rounded-full flex items-center justify-center gap-3 text-lg font-bold shadow-lg transition-transform active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-2xl">photo_camera</span>
                                                Activate Camera
                                            </button>
                                            <span className="text-sm font-medium text-gray-400">Supports JPG, PNG</span>
                                        </div>
                                    </div>
                                    {/* Subtle background pattern */}
                                    <div 
                                        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                                        style={{ backgroundImage: 'radial-gradient(#2E7D32 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                                    ></div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Column: AI Results Output */}
                    <div className="lg:col-span-5 w-full flex flex-col gap-6">
                        {/* Results Header */}
                        <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                            <span className="material-symbols-outlined text-[#2E7D32] text-3xl">auto_awesome</span>
                            <h3 className="text-2xl font-bold text-gray-900">AI Analysis Results</h3>
                        </div>

                        {analysisResult ? (
                            <>
                                {/* Main Result Card */}
                                <div className="bg-white rounded-xl shadow-lg p-1 border border-gray-100">
                                    {/* Grade Badge */}
                                    <div className={`p-6 rounded-lg mb-1 ${
                                        analysisResult.isVerified 
                                            ? 'bg-gradient-to-br from-green-50 to-emerald-100' 
                                            : 'bg-gradient-to-br from-yellow-50 to-amber-100'
                                    }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            {/* Verification Status Badge */}
                                            {analysisResult.isVerified ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-xs font-bold uppercase tracking-wider text-[#2E7D32] border border-[#2E7D32]/20">
                                                    <span className="material-symbols-outlined text-base">verified</span>
                                                    AI Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-xs font-bold uppercase tracking-wider text-yellow-700 border border-yellow-400">
                                                    <span className="material-symbols-outlined text-base">warning</span>
                                                    Unverified - Manual Entry
                                                </span>
                                            )}
                                            <span className={`material-symbols-outlined text-4xl opacity-20 ${
                                                analysisResult.isVerified ? 'text-[#2E7D32]' : 'text-yellow-600'
                                            }`}>workspace_premium</span>
                                        </div>
                                        <div className="flex flex-col gap-1 mb-6">
                                            <h4 className="text-4xl md:text-5xl font-black text-[#131613] tracking-tight">
                                                Grade {analysisResult.grade} - {analysisResult.gradeLabel}
                                            </h4>
                                            <p className="text-lg text-[#6b806c] font-medium">{analysisResult.description}</p>
                                        </div>
                                        {/* Price Estimation - Editable */}
                                        <div className="flex flex-col sm:flex-row items-baseline gap-2 sm:gap-4 mt-4 pt-4 border-t border-green-200">
                                            <span className="text-sm font-bold text-[#6b806c] uppercase tracking-wide">Your Price</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-[#2E7D32]">₹</span>
                                                <input 
                                                    type="number" 
                                                    value={editablePrice}
                                                    onChange={(e) => setEditablePrice(Number(e.target.value))}
                                                    className="text-4xl font-bold text-[#2E7D32] bg-transparent border-b-2 border-dashed border-[#2E7D32]/30 focus:border-[#2E7D32] outline-none w-24 text-center"
                                                />
                                                <span className="text-xl text-gray-500 font-medium">/kg</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mandi Price Reference Card - NEW */}
                                {(pricingResult || isLoadingPricing) && (
                                    <div className={`bg-white p-5 rounded-xl border shadow-sm ${pricingResult?.isFallback ? 'border-orange-200 bg-orange-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`size-10 rounded-full flex items-center justify-center ${pricingResult?.isFallback ? 'bg-orange-100' : 'bg-blue-100'}`}>
                                                <span className={`material-symbols-outlined ${pricingResult?.isFallback ? 'text-orange-600' : 'text-blue-600'}`}>
                                                    {isLoadingPricing ? 'sync' : 'store'}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">
                                                    {isLoadingPricing ? 'Fetching Market Prices...' : 'Live Mandi Reference'}
                                                </h4>
                                                {pricingResult?.mandiReference && (
                                                    <p className="text-xs text-gray-500">
                                                        {pricingResult.mandiReference.marketName} • Updated {new Date(pricingResult.mandiReference.priceDate).toLocaleDateString('en-IN')}
                                                    </p>
                                                )}
                                                {pricingResult?.isFallback && (
                                                    <p className="text-xs text-orange-600">Using national average prices</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {isLoadingPricing ? (
                                            <div className="flex items-center justify-center py-4">
                                                <LoaderIcon className="h-6 w-6 text-blue-500 animate-spin" />
                                            </div>
                                        ) : pricingResult && (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                                                    <p className="text-xs text-gray-500 font-medium">Floor Price</p>
                                                    <p className="text-lg font-bold text-red-600">₹{pricingResult.floorPrice.toFixed(0)}/kg</p>
                                                    <p className="text-[10px] text-gray-400">Minimum</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border-2 border-green-400 text-center ring-2 ring-green-100">
                                                    <p className="text-xs text-gray-500 font-medium">Target Price</p>
                                                    <p className="text-lg font-bold text-green-600">₹{pricingResult.targetPrice.toFixed(0)}/kg</p>
                                                    <p className="text-[10px] text-green-600">Recommended</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                                                    <p className="text-xs text-gray-500 font-medium">Premium Price</p>
                                                    <p className="text-lg font-bold text-blue-600">₹{pricingResult.stretchPrice.toFixed(0)}/kg</p>
                                                    <p className="text-[10px] text-gray-400">Generous</p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {pricingResult?.mandiReference && (
                                            <p className="text-xs text-gray-500 mt-3 text-center">
                                                Mandi Modal: ₹{pricingResult.mandiReference.modalPricePerQuintal}/quintal 
                                                (₹{pricingResult.mandiReference.modalPricePerKg.toFixed(2)}/kg)
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Location Badge */}
                                <div className="bg-white p-4 rounded-xl border border-[#dee3de] shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-full flex items-center justify-center ${location ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                <span className={`material-symbols-outlined ${location ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {isLoadingLocation ? 'sync' : 'location_on'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">
                                                    {isLoadingLocation ? 'Detecting location...' : 
                                                     location ? `${location.district}, ${location.state}` : 
                                                     'Location not set'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {location?.isAutoDetected ? 'Auto-detected' : location ? 'Manually set' : 'Required for mandi prices'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowManualLocation(true)}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    
                                    {/* Manual Location Selector */}
                                    {showManualLocation && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                            <select
                                                value={manualState}
                                                onChange={(e) => { setManualState(e.target.value); setManualDistrict(''); }}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                            >
                                                <option value="">Select State</option>
                                                {INDIAN_STATES.map(state => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                            {manualState && MAJOR_DISTRICTS[manualState] && (
                                                <select
                                                    value={manualDistrict}
                                                    onChange={(e) => setManualDistrict(e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                                >
                                                    <option value="">Select District</option>
                                                    {MAJOR_DISTRICTS[manualState].map(district => (
                                                        <option key={district} value={district}>{district}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {manualState && !MAJOR_DISTRICTS[manualState] && (
                                                <input
                                                    type="text"
                                                    placeholder="Enter district name"
                                                    value={manualDistrict}
                                                    onChange={(e) => setManualDistrict(e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                                />
                                            )}
                                            <button
                                                onClick={handleManualLocationSubmit}
                                                disabled={!manualState || !manualDistrict}
                                                className="w-full py-2 bg-green-600 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                Confirm Location
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Quantity Input */}
                                <div className="bg-white p-5 rounded-xl border border-[#dee3de] shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-[#2E7D32] text-2xl">inventory_2</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-gray-900">Quantity Available</span>
                                                <span className="text-sm text-gray-500">How much can you supply?</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={editableQuantity}
                                                onChange={(e) => setEditableQuantity(Number(e.target.value))}
                                                className="text-2xl font-bold text-[#131613] bg-gray-50 border border-gray-200 rounded-lg w-20 text-center py-2 focus:border-[#2E7D32] outline-none"
                                            />
                                            <span className="text-lg text-gray-500 font-medium">Quintals</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Product Type Toggle */}
                                <div className="bg-white p-5 rounded-xl border border-[#dee3de] shadow-sm">
                                    <div className="flex flex-col gap-3">
                                        <span className="text-lg font-bold text-gray-900">Listing Type</span>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setProductType(ProductType.Retail)}
                                                className={`flex-1 py-3 rounded-lg font-bold transition-all ${productType === ProductType.Retail ? 'bg-[#2E7D32] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                Retail (Fixed Price)
                                            </button>
                                            <button 
                                                onClick={() => setProductType(ProductType.Bulk)}
                                                className={`flex-1 py-3 rounded-lg font-bold transition-all ${productType === ProductType.Bulk ? 'bg-[#2E7D32] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                Bulk (Negotiable)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Validation & Confidence */}
                                <div className="grid grid-cols-1 gap-4">
                                    {/* MSP Validation */}
                                    <div className={`bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 ${analysisResult.mspStatus.isAbove ? 'border-green-200' : 'border-red-200'}`}>
                                        <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${analysisResult.mspStatus.isAbove ? 'bg-green-100' : 'bg-red-100'}`}>
                                            <span className={`material-symbols-outlined text-3xl ${analysisResult.mspStatus.isAbove ? 'text-[#2E7D32]' : 'text-red-600'}`}>
                                                {analysisResult.mspStatus.isAbove ? 'check_circle' : 'warning'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-lg font-bold text-gray-900">
                                                {analysisResult.mspStatus.isAbove ? 'Above Government MSP' : 'Below Government MSP'}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                Price is {analysisResult.mspStatus.percentage}% {analysisResult.mspStatus.isAbove ? 'higher' : 'lower'} than MSP
                                            </span>
                                        </div>
                                    </div>

                                    {/* Confidence Meter */}
                                    <div className="bg-white p-5 rounded-xl border border-[#dee3de] shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#2E7D32]">psychology</span>
                                                AI Confidence Score
                                            </span>
                                            <span className="text-xl font-bold text-[#2E7D32]">{analysisResult.confidence}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                            <div className="bg-[#2E7D32] h-4 rounded-full transition-all duration-500" style={{ width: `${analysisResult.confidence}%` }}></div>
                                        </div>
                                        <p className="text-xs text-gray-500">Based on color analysis and defect detection models.</p>
                                    </div>
                                </div>

                                {/* Detailed Metrics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                                        <div className="text-gray-500 text-sm mb-1 font-medium">Moisture</div>
                                        <div className="text-xl font-bold text-gray-900">{analysisResult.moisture}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                                        <div className="text-gray-500 text-sm mb-1 font-medium">Defects</div>
                                        <div className="text-xl font-bold text-gray-900">{analysisResult.defects}</div>
                                    </div>
                                </div>

                                {/* Farmer's Note Section */}
                                <div className="bg-white p-5 rounded-xl border border-[#dee3de] shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-[#2E7D32]">edit_note</span>
                                        <span className="text-lg font-bold text-gray-900">Farmer's Note</span>
                                        <span className="text-xs text-gray-400">(Optional)</span>
                                    </div>
                                    <textarea 
                                        value={farmerNote}
                                        onChange={(e) => setFarmerNote(e.target.value)}
                                        placeholder="Add any special details about your harvest - organic, pesticide-free, harvest date, storage conditions, etc."
                                        className="w-full h-28 p-4 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/20 outline-none text-gray-700 placeholder:text-gray-400"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">This note will be visible to buyers on your listing.</p>
                                </div>

                                {/* Action Area */}
                                <div className="mt-4 flex flex-col gap-3 sticky bottom-4 z-20">
                                    {/* Progress bar while uploading */}
                                    {isSubmitting && (
                                        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Uploading product...</span>
                                                <span className="text-sm font-bold text-[#2E7D32]">{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] h-2.5 rounded-full transition-all duration-300 ease-out"
                                                    style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 text-center">
                                                {uploadProgress < 30 && 'Preparing image...'}
                                                {uploadProgress >= 30 && uploadProgress < 60 && 'Uploading to server...'}
                                                {uploadProgress >= 60 && uploadProgress < 90 && 'Almost there...'}
                                                {uploadProgress >= 90 && 'Finalizing listing...'}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <button 
                                        onClick={handleConfirmListing}
                                        disabled={isSubmitting}
                                        className="w-full py-5 bg-[#2E7D32] hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 group"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <LoaderIcon className="h-6 w-6 animate-spin" />
                                                <span className="text-xl font-bold">Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xl font-bold">Confirm & List at ₹{editablePrice}/kg</span>
                                                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                            </>
                                        )}
                                    </button>
                                    <button 
                                        onClick={handleRetake}
                                        disabled={isSubmitting}
                                        className="w-full py-3 bg-transparent border-2 border-gray-200 hover:border-gray-400 text-gray-600 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined">refresh</span>
                                        Retake Photo
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Placeholder when no image is uploaded */
                            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-gray-400 text-4xl">image_search</span>
                                </div>
                                <h4 className="text-xl font-bold text-gray-400 mb-2">No Image Uploaded</h4>
                                <p className="text-gray-400 max-w-xs">
                                    Upload a photo of your harvest to get AI-powered quality analysis and price estimation.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
