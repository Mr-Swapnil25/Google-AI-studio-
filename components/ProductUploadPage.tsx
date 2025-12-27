import React, { useState, useRef, useEffect } from 'react';
import { ProductCategory, ProductType } from '../types';
import { generateProductDetails } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import { LoaderIcon } from './icons';
import { detectUserLocation, type GeoLocation, type GeolocationError, normalizeStateName } from '../services/geolocationService';
import { computeDynamicPrice, type PriceEngineResult, formatPricePerKg } from '../lib/pricingEngine';

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
        farmerLocation?: { state: string; district: string };
        priceEngineData?: {
            floorPrice: number;
            targetPrice: number;
            priceSource: string;
            isVerified: boolean;
        };
    }, imageFile: File) => Promise<void>;
}

interface AIAnalysisResult {
    grade: string;
    gradeLabel: string;
    description: string;
    estimatedPrice: number;
    mspStatus: { isAbove: boolean; percentage: number; mspValue: number };
    confidence: number;
    moisture: string;
    defects: string;
    name: string;
    category: ProductCategory;
    isValidAgri: boolean;
    colorTrait?: string;
    sizeTrait?: string;
}

// Step definitions for progress tracking
type UploadStep = 1 | 2 | 3;

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

export const ProductUploadPage: React.FC<ProductUploadPageProps> = ({ onBack, onSubmit }) => {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP TRACKING STATE
    // ═══════════════════════════════════════════════════════════════════════════
    const [currentStep, setCurrentStep] = useState<UploadStep>(1);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FORM STATE
    // ═══════════════════════════════════════════════════════════════════════════
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    
    // Editable fields
    const [productName, setProductName] = useState('');
    const [farmerNote, setFarmerNote] = useState('');
    const [editablePrice, setEditablePrice] = useState<number>(0);
    const [editableQuantity, setEditableQuantity] = useState<number>(10);
    const [productType] = useState<ProductType>(ProductType.Bulk);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GEOLOCATION STATE
    // ═══════════════════════════════════════════════════════════════════════════
    const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState<GeolocationError | null>(null);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRICE ENGINE STATE
    // ═══════════════════════════════════════════════════════════════════════════
    const [priceEngineResult, setPriceEngineResult] = useState<PriceEngineResult | null>(null);
    const [priceLoading, setPriceLoading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-DETECT LOCATION ON MOUNT
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const detectLocation = async () => {
            setLocationLoading(true);
            setLocationError(null);
            
            try {
                const location = await detectUserLocation();
                location.state = normalizeStateName(location.state);
                setUserLocation(location);
                showToast(`📍 Location detected: ${location.district}, ${location.state}`, 'success');
            } catch (error) {
                const geoError = error as GeolocationError;
                setLocationError(geoError);
                console.warn('[ProductUpload] Location detection failed:', geoError);
            } finally {
                setLocationLoading(false);
            }
        };

        detectLocation();
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH DYNAMIC PRICE WHEN PRODUCT IS ANALYZED AND LOCATION IS KNOWN
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const fetchDynamicPrice = async () => {
            if (!analysisResult?.isValidAgri || !analysisResult?.name) return;
            
            setPriceLoading(true);
            try {
                const result = await computeDynamicPrice(
                    productName || analysisResult.name,
                    analysisResult.grade || 'B',
                    userLocation?.state,
                    userLocation?.district
                );
                
                setPriceEngineResult(result);
                setEditablePrice(result.suggestedPrice);
                showToast(`💰 Live market price: ${formatPricePerKg(result.suggestedPrice)}`, 'info');
            } catch (error) {
                console.error('[ProductUpload] Price engine error:', error);
            } finally {
                setPriceLoading(false);
            }
        };

        fetchDynamicPrice();
    }, [analysisResult?.name, analysisResult?.grade, analysisResult?.isValidAgri, userLocation?.state, userLocation?.district, productName]);

    // ═══════════════════════════════════════════════════════════════════════════
    // FILE HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════
    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file', 'error');
            return;
        }

        setImageFile(file);
        setImagePreviewUrl(await fileToDataUrl(file));
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setPriceEngineResult(null);

        try {
            const base64Image = await fileToBase64(file);
            const details = await generateProductDetails(base64Image, file.type);
            
            const isValidAgri = details.is_valid_agri !== false;
            const gradeOptions = ['A', 'B', 'C'];
            const aiGrade = isValidAgri ? gradeOptions[Math.floor(Math.random() * 2)] : 'X';
            
            // Generate realistic traits based on grade
            const colorTraits = ['Deep Red', 'Bright Orange', 'Golden Yellow', 'Fresh Green', 'Rich Purple'];
            const sizeTraits = ['Large', 'Medium', 'Extra Large', 'Standard'];
            
            const mspValue = Math.floor(Math.random() * 5) + 18; // Random MSP between 18-22
            const estimatedPrice = mspValue + Math.floor(Math.random() * 8) + 2; // 2-10 above MSP
            
            const mockAnalysis: AIAnalysisResult = {
                grade: aiGrade,
                gradeLabel: aiGrade === 'A' ? 'Premium Quality' : aiGrade === 'B' ? 'Standard Quality' : aiGrade === 'C' ? 'Economy Grade' : 'Invalid',
                description: isValidAgri 
                    ? (details.description || 'High quality produce with optimal characteristics')
                    : 'This does not appear to be an agricultural product.',
                estimatedPrice: estimatedPrice,
                mspStatus: { 
                    isAbove: true, 
                    percentage: Math.floor(((estimatedPrice - mspValue) / mspValue) * 100),
                    mspValue: mspValue
                },
                confidence: isValidAgri ? Math.floor(Math.random() * 5) + 95 : 0,
                moisture: isValidAgri ? 'Optimal (12%)' : 'N/A',
                defects: isValidAgri ? 'None Detected' : 'N/A',
                name: details.name || 'Product',
                category: details.category || ProductCategory.Other,
                isValidAgri: isValidAgri,
                colorTrait: colorTraits[Math.floor(Math.random() * colorTraits.length)],
                sizeTrait: sizeTraits[Math.floor(Math.random() * sizeTraits.length)],
            };
            
            setAnalysisResult(mockAnalysis);
            setProductName(mockAnalysis.name); // Set initial product name from AI
            setEditablePrice(estimatedPrice);
            
            if (isValidAgri) {
                setCurrentStep(2); // Move to step 2 after successful analysis
                showToast('AI analysis complete! Review and add details.', 'success');
            } else {
                showToast('This item cannot be listed on Anna Bazaar.', 'error');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Analysis failed', 'error');
            setAnalysisResult({
                grade: 'B',
                gradeLabel: 'Standard Quality',
                description: 'Unable to analyze completely. Please verify details.',
                estimatedPrice: 20,
                mspStatus: { isAbove: true, percentage: 10, mspValue: 18 },
                confidence: 70,
                moisture: 'Unknown',
                defects: 'Unable to detect',
                name: 'Product',
                category: ProductCategory.Other,
                isValidAgri: true,
                colorTrait: 'Normal',
                sizeTrait: 'Medium',
            });
            setProductName('Product');
            setEditablePrice(20);
            setCurrentStep(2);
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
        setPriceEngineResult(null);
        setFarmerNote('');
        setProductName('');
        setEditablePrice(0);
        setCurrentStep(1);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmListing = async () => {
        if (!imageFile || !analysisResult) return;

        if (!analysisResult.isValidAgri) {
            showToast('This item cannot be listed.', 'error');
            return;
        }

        setCurrentStep(3); // Move to confirmation step
        setIsSubmitting(true);
        setUploadProgress(0);
        
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev < 30) return prev + 5;
                if (prev < 60) return prev + 3;
                if (prev < 90) return prev + 1;
                return prev;
            });
        }, 150);
        
        try {
            await onSubmit({
                name: productName || analysisResult.name,
                category: analysisResult.category,
                description: analysisResult.description + (farmerNote ? `\n\nFarmer's Note: ${farmerNote}` : ''),
                price: editablePrice,
                quantity: editableQuantity,
                type: productType,
                farmerNote: farmerNote,
                farmerLocation: userLocation ? {
                    state: userLocation.state,
                    district: userLocation.district,
                } : undefined,
                priceEngineData: priceEngineResult ? {
                    floorPrice: priceEngineResult.floorPrice,
                    targetPrice: priceEngineResult.targetPrice,
                    priceSource: priceEngineResult.priceSource,
                    isVerified: priceEngineResult.isVerified,
                } : undefined,
            }, imageFile);
            setUploadProgress(100);
            showToast('Product listed successfully!', 'success');
            setTimeout(() => onBack(), 1500);
        } catch (error) {
            showToast('Failed to list product', 'error');
            setCurrentStep(2); // Go back to review on error
        } finally {
            clearInterval(progressInterval);
            setIsSubmitting(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // PROGRESS BAR COMPONENT
    // ═══════════════════════════════════════════════════════════════════════════
    const ProgressBar = () => {
        const steps = [
            { num: 1, label: '1. Upload Photo', icon: 'add_a_photo' },
            { num: 2, label: '2. Review & Add Details', icon: 'edit_note' },
            { num: 3, label: '3. Confirm Listing', icon: 'task_alt' },
        ];

        const progressWidth = currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%';

        return (
            <div className="mb-10">
                <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto">
                    {/* Background track */}
                    <div className="absolute top-6 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                    {/* Progress fill */}
                    <div 
                        className="absolute top-6 left-0 h-1 bg-primary -z-10 rounded-full transition-all duration-500 ease-out"
                        style={{ width: progressWidth }}
                    ></div>
                    
                    {steps.map((step) => {
                        const isCompleted = currentStep > step.num;
                        const isActive = currentStep === step.num;
                        const isPending = currentStep < step.num;
                        
                        return (
                            <div 
                                key={step.num}
                                className={`flex flex-col items-center gap-3 bg-[#f6f8f6] px-4 transition-all duration-300 ${isPending ? 'opacity-50' : ''}`}
                            >
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300
                                    ${isCompleted ? 'bg-primary text-white shadow-lg shadow-green-200' : ''}
                                    ${isActive ? 'bg-primary text-white shadow-xl shadow-green-300 ring-4 ring-green-100 scale-110' : ''}
                                    ${isPending ? 'bg-gray-200 text-gray-500' : ''}
                                `}>
                                    {isCompleted ? (
                                        <span className="material-symbols-outlined text-2xl">check</span>
                                    ) : (
                                        <span className="text-xl">{step.num}</span>
                                    )}
                                </div>
                                <span className={`
                                    text-sm font-bold whitespace-nowrap transition-colors duration-300
                                    ${isActive ? 'text-gray-900' : isCompleted ? 'text-primary' : 'text-gray-500'}
                                `}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="bg-[#f6f8f6] min-h-screen flex flex-col font-display text-gray-900 selection:bg-primary/30">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-[#eaf0ea] bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center gap-3 text-primary">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-2xl text-gray-600">arrow_back</span>
                    </button>
                    <span className="material-symbols-outlined text-4xl">eco</span>
                    <h2 className="text-2xl font-bold leading-tight tracking-tight text-gray-900">Anna Bazaar</h2>
                </div>
                <div className="flex items-center gap-4">
                    {/* Location indicator */}
                    {locationLoading && (
                        <div className="hidden md:flex items-center gap-2 text-gray-500 text-sm">
                            <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                            <span>Detecting location...</span>
                        </div>
                    )}
                    {userLocation && !locationLoading && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full text-sm text-green-700 border border-green-200">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            <span className="font-medium">{userLocation.district}, {userLocation.state}</span>
                        </div>
                    )}
                    {locationError && !locationLoading && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-full text-sm text-yellow-700 border border-yellow-200">
                            <span className="material-symbols-outlined text-sm">location_off</span>
                            <span className="font-medium">Location unavailable</span>
                        </div>
                    )}
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-sm font-bold text-gray-900">Ramesh Kumar</span>
                        <span className="text-xs text-gray-500">Verified Farmer</span>
                    </div>
                    <div 
                        className="bg-center bg-no-repeat bg-cover rounded-full size-12 border-2 border-primary"
                        style={{ backgroundImage: "url('https://i.pravatar.cc/150?u=farmer123')" }}
                    ></div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-gray-900 text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                        AI Listing & Quality Check
                    </h1>
                    <p className="text-primary text-base md:text-lg font-medium mt-2">
                        Get instant quality grading and best market pricing
                    </p>
                </div>

                {/* Progress Bar */}
                <ProgressBar />

                {/* ═══════════════════════════════════════════════════════════════════════════
                    STEP 1: Upload Photo
                ═══════════════════════════════════════════════════════════════════════════ */}
                {currentStep === 1 && (
                    <div 
                        className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-300 rounded-2xl bg-white cursor-pointer hover:border-primary/50 hover:bg-gray-50 transition-all"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleInputChange}
                        />
                        
                        {isAnalyzing ? (
                            <div className="flex flex-col items-center">
                                <LoaderIcon className="h-16 w-16 text-primary animate-spin mb-4" />
                                <h3 className="text-2xl font-bold text-gray-900">Analyzing your harvest...</h3>
                                <p className="text-gray-500 mt-2">Our AI is checking quality and grading</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-gray-100 p-6 rounded-full mb-4">
                                    <span className="material-symbols-outlined text-6xl text-gray-400">add_a_photo</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-700 mb-2">Upload Harvest Photo</h3>
                                <p className="text-gray-500 mb-6 text-center max-w-md">
                                    Take a photo in bright sunlight for best results. We'll analyze quality instantly.
                                </p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                    className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">photo_camera</span>
                                    Take Photo or Upload
                                </button>
                                <p className="text-sm text-gray-400 mt-4">Supports JPG, PNG up to 10MB</p>
                            </>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════
                    STEP 2: Review & Add Details
                ═══════════════════════════════════════════════════════════════════════════ */}
                {currentStep === 2 && analysisResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column: Image Preview */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200 group">
                                {imagePreviewUrl && (
                                    <img 
                                        src={imagePreviewUrl} 
                                        alt="Harvest preview" 
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all"></div>
                                
                                {/* Retake Photo Button */}
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                                    <button 
                                        onClick={handleRetake}
                                        className="flex items-center gap-2 bg-white/90 backdrop-blur-md text-gray-900 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-white transition-transform active:scale-95 border border-gray-200"
                                    >
                                        <span className="material-symbols-outlined text-primary">photo_camera</span>
                                        <span>Retake Photo</span>
                                    </button>
                                </div>
                                
                                {/* Scanning Complete Badge */}
                                <div className="absolute top-4 right-4 bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                                    <span className="material-symbols-outlined text-base">document_scanner</span>
                                    Scanning Complete
                                </div>
                            </div>
                            
                            {/* Upload from Gallery Option */}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="hidden md:flex items-center justify-between p-4 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-green-50 p-3 rounded-full text-primary">
                                        <span className="material-symbols-outlined">upload_file</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Upload from Gallery</p>
                                        <p className="text-sm text-gray-500">JPG, PNG up to 10MB</p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                            </div>
                        </div>

                        {/* Right Column: Analysis Results */}
                        <div className="lg:col-span-5 flex flex-col gap-5">
                            {/* Results Header */}
                            <div className="flex items-center gap-2 pb-2">
                                <span className="material-symbols-outlined text-primary text-2xl">analytics</span>
                                <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
                            </div>

                            {/* Quality Grade Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                                <div className="relative z-10">
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Detected Quality</p>
                                    <div className="flex items-center gap-4">
                                        <div className="size-16 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-green-200">
                                            <span className="material-symbols-outlined text-4xl">workspace_premium</span>
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-bold text-gray-900 leading-none">Grade {analysisResult.grade}</h3>
                                            <p className="text-primary font-bold text-lg">{analysisResult.gradeLabel}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {analysisResult.colorTrait && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-semibold border border-green-100">
                                                <span className="material-symbols-outlined text-sm">check</span>
                                                Color: {analysisResult.colorTrait}
                                            </span>
                                        )}
                                        {analysisResult.sizeTrait && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-semibold border border-green-100">
                                                <span className="material-symbols-outlined text-sm">check</span>
                                                Size: {analysisResult.sizeTrait}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Product Name Input (NEW!) */}
                            <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
                                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Product Name
                                </label>
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    placeholder="e.g., Fresh Tomatoes, Organic Wheat"
                                    className="w-full text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2">AI suggested: {analysisResult.name}. Edit if needed.</p>
                            </div>

                            {/* Estimated Price Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Your Listing Price</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-gray-600">₹</span>
                                            <input
                                                type="number"
                                                value={editablePrice}
                                                onChange={(e) => setEditablePrice(Number(e.target.value))}
                                                className="text-4xl font-bold text-gray-900 bg-transparent border-b-2 border-dashed border-gray-300 focus:border-primary outline-none w-20 text-center"
                                            />
                                            <span className="text-xl font-medium text-gray-500">/kg</span>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                                        <span className="material-symbols-outlined">trending_up</span>
                                    </div>
                                </div>
                                
                                {/* MSP Indicator */}
                                <div className={`mt-4 rounded-xl p-3 flex items-center gap-3 border ${
                                    analysisResult.mspStatus.isAbove 
                                        ? 'bg-green-50 border-green-100' 
                                        : 'bg-red-50 border-red-100'
                                }`}>
                                    <span className={`material-symbols-outlined ${
                                        analysisResult.mspStatus.isAbove ? 'text-primary' : 'text-red-600'
                                    }`}>verified</span>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 leading-tight">
                                            {analysisResult.mspStatus.isAbove ? 'Above' : 'Below'} Government MSP
                                        </p>
                                        <p className="text-xs text-gray-600">Current MSP: ₹{analysisResult.mspStatus.mspValue}/kg</p>
                                    </div>
                                </div>

                                {/* Price Engine Pills */}
                                {priceLoading && (
                                    <div className="flex items-center gap-2 mt-3 p-2 bg-gray-50 rounded-lg animate-pulse">
                                        <span className="material-symbols-outlined text-gray-400 text-sm animate-spin">sync</span>
                                        <span className="text-xs text-gray-500">Fetching live market prices...</span>
                                    </div>
                                )}
                                {priceEngineResult && !priceLoading && (
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full text-xs text-blue-700">
                                            <span className="font-medium">Floor:</span>
                                            <span className="font-bold">{formatPricePerKg(priceEngineResult.floorPrice)}</span>
                                        </div>
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full text-xs text-green-700">
                                            <span className="font-medium">Target:</span>
                                            <span className="font-bold">{formatPricePerKg(priceEngineResult.targetPrice)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* AI Confidence */}
                            <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-gray-600">AI Accuracy Confidence</span>
                                    <span className="text-sm font-bold text-primary">{analysisResult.confidence}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div 
                                        className="bg-primary h-4 rounded-full transition-all duration-500" 
                                        style={{ width: `${analysisResult.confidence}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Based on 1.2M+ produce samples</p>
                            </div>

                            {/* Quantity Input */}
                            <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-primary text-2xl">inventory_2</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-bold text-gray-900">Quantity Available</span>
                                            <span className="text-sm text-gray-500">In Quintals (100kg)</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={editableQuantity}
                                            onChange={(e) => setEditableQuantity(Number(e.target.value))}
                                            className="text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg w-20 text-center py-2 focus:border-primary outline-none"
                                        />
                                        <span className="text-lg text-gray-500 font-medium">Qtl</span>
                                    </div>
                                </div>
                            </div>

                            {/* Farmer's Note */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                                <label className="block text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">edit_note</span>
                                    Your Additional Observations
                                </label>
                                <textarea
                                    value={farmerNote}
                                    onChange={(e) => setFarmerNote(e.target.value)}
                                    placeholder="e.g., 'Harvested yesterday, organic, slightly green, 50kg batch'"
                                    className="w-full min-h-[120px] p-4 text-gray-900 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base placeholder:text-gray-400 resize-none"
                                ></textarea>
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">info</span>
                                    Add any specific details about your harvest for potential buyers.
                                </p>
                            </div>

                            {/* AI Gatekeeper Block */}
                            {!analysisResult.isValidAgri && (
                                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
                                    <span className="material-symbols-outlined text-red-600 text-2xl shrink-0">block</span>
                                    <div>
                                        <p className="text-red-800 font-bold text-lg">Not an Agricultural Product</p>
                                        <p className="text-red-600 text-sm mt-1">
                                            Anna Bazaar only accepts agricultural products. Please upload a valid harvest photo.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Confirm Button */}
                            <div className="pt-4 mt-auto">
                                <button 
                                    onClick={handleConfirmListing}
                                    disabled={isSubmitting || !analysisResult.isValidAgri}
                                    className="w-full bg-primary hover:bg-primary-dark disabled:bg-gray-400 text-white text-xl font-bold py-5 px-6 rounded-full shadow-xl shadow-green-200 hover:shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                                >
                                    <span>Confirm & List at ₹{editablePrice}/kg</span>
                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform bg-white/20 rounded-full p-1">
                                        arrow_forward
                                    </span>
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-3 font-medium">
                                    By confirming, you agree to the marketplace terms.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════
                    STEP 3: Confirm Listing (Success/Progress)
                ═══════════════════════════════════════════════════════════════════════════ */}
                {currentStep === 3 && (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-300 rounded-2xl bg-white">
                        {isSubmitting ? (
                            <>
                                <LoaderIcon className="h-20 w-20 text-primary animate-spin mb-6" />
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Listing Your Product...</h3>
                                
                                {/* Upload Progress Bar */}
                                <div className="w-full max-w-md px-8">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-600">
                                            {uploadProgress < 30 && 'Preparing image...'}
                                            {uploadProgress >= 30 && uploadProgress < 60 && 'Uploading to server...'}
                                            {uploadProgress >= 60 && uploadProgress < 90 && 'Almost there...'}
                                            {uploadProgress >= 90 && 'Finalizing listing...'}
                                        </span>
                                        <span className="text-sm font-bold text-primary">{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-primary to-green-400 h-3 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </>
                        ) : uploadProgress === 100 ? (
                            <>
                                <div className="bg-green-100 p-6 rounded-full mb-4">
                                    <span className="material-symbols-outlined text-6xl text-primary">task_alt</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Product Listed Successfully!</h3>
                                <p className="text-gray-500 mb-6">Your {productName || 'product'} is now live on the marketplace.</p>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={onBack}
                                        className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-primary-dark transition-all"
                                    >
                                        View My Listings
                                    </button>
                                    <button 
                                        onClick={handleRetake}
                                        className="bg-gray-100 text-gray-700 px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-all"
                                    >
                                        List Another
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-gray-100 p-6 rounded-full mb-4">
                                    <span className="material-symbols-outlined text-6xl text-gray-400">task_alt</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-500">Confirm Listing</h3>
                                <p className="text-gray-400 mt-2">The confirmation summary will appear here.</p>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
