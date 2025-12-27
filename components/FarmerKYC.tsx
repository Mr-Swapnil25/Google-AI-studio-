import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XIcon, LoaderIcon } from './icons';
import { useToast } from '../context/ToastContext';
import { firebaseService } from '../services/firebaseService';
import { User } from '../types';
import { NeonProgressBar, KYC_STEPS } from './ui/NeonProgressBar';

interface FarmerKYCProps {
    isOpen: boolean;
    currentUser: User;
    onClose: () => void;
    onComplete: () => void;
    /** When true, user cannot close the modal - they must complete KYC */
    required?: boolean;
}

type KYCStep = 1 | 2 | 3;

interface PersonalInfo {
    fullName: string;
    mobile: string;
    dateOfBirth: string;
    village: string;
    photoFile: File | null;
    photoPreview: string | null;
}

interface DocumentInfo {
    aadhaarFile: File | null;
    aadhaarPreview: string | null;
    kisanFile: File | null;
    kisanPreview: string | null;
}

interface BankInfo {
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
}

const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

export const FarmerKYC = ({ isOpen, currentUser, onClose, onComplete, required = false }: FarmerKYCProps) => {
    const [step, setStep] = useState<KYCStep>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
        fullName: currentUser.name || '',
        mobile: currentUser.phone || '',
        dateOfBirth: '',
        village: currentUser.location || '',
        photoFile: null,
        photoPreview: currentUser.avatarUrl || null,
    });

    const photoInputRef = useRef<HTMLInputElement>(null);

    const [documents, setDocuments] = useState<DocumentInfo>({
        aadhaarFile: null,
        aadhaarPreview: null,
        kisanFile: null,
        kisanPreview: null,
    });

    const [bankInfo, setBankInfo] = useState<BankInfo>({
        accountHolder: currentUser.name || '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
    });

    const aadhaarInputRef = useRef<HTMLInputElement>(null);
    const kisanInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setPersonalInfo({
                fullName: currentUser.name || '',
                mobile: currentUser.phone || '',
                dateOfBirth: '',
                village: currentUser.location || '',
                photoFile: null,
                photoPreview: currentUser.avatarUrl || null,
            });
            setDocuments({ aadhaarFile: null, aadhaarPreview: null, kisanFile: null, kisanPreview: null });
            setBankInfo({ accountHolder: currentUser.name || '', accountNumber: '', ifscCode: '', bankName: '' });
        }
    }, [isOpen, currentUser]);

    const goToStep = useCallback((newStep: KYCStep) => {
        setSlideDirection(newStep > step ? 'right' : 'left');
        setStep(newStep);
    }, [step]);

    const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPersonalInfo((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const preview = await fileToDataUrl(file);
        setPersonalInfo((prev) => ({ ...prev, photoFile: file, photoPreview: preview }));
    };

    const handleBankInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBankInfo((prev) => ({ ...prev, [name]: value }));
    };

    const handleAadhaarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const preview = await fileToDataUrl(file);
        setDocuments((prev) => ({ ...prev, aadhaarFile: file, aadhaarPreview: preview }));
    };

    const handleKisanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const preview = await fileToDataUrl(file);
        setDocuments((prev) => ({ ...prev, kisanFile: file, kisanPreview: preview }));
    };

    const removeAadhaar = () => {
        setDocuments((prev) => ({ ...prev, aadhaarFile: null, aadhaarPreview: null }));
        if (aadhaarInputRef.current) aadhaarInputRef.current.value = '';
    };

    const removeKisan = () => {
        setDocuments((prev) => ({ ...prev, kisanFile: null, kisanPreview: null }));
        if (kisanInputRef.current) kisanInputRef.current.value = '';
    };

    const validateStep1 = () => {
        if (!personalInfo.fullName.trim()) {
            showToast('Please enter your full name.', 'error');
            return false;
        }
        if (!personalInfo.mobile.trim() || personalInfo.mobile.length < 10) {
            showToast('Please enter a valid mobile number.', 'error');
            return false;
        }
        if (!personalInfo.village.trim()) {
            showToast('Please enter your village/locality.', 'error');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!documents.aadhaarFile) {
            showToast('Please upload your Aadhaar card.', 'error');
            return false;
        }
        if (!documents.kisanFile) {
            showToast('Please upload your Kisan card.', 'error');
            return false;
        }
        return true;
    };

    const validateStep3 = () => {
        if (!bankInfo.accountHolder.trim()) {
            showToast('Please enter account holder name.', 'error');
            return false;
        }
        if (!bankInfo.accountNumber.trim() || bankInfo.accountNumber.length < 9) {
            showToast('Please enter a valid account number.', 'error');
            return false;
        }
        if (!bankInfo.ifscCode.trim() || bankInfo.ifscCode.length !== 11) {
            showToast('Please enter a valid IFSC code (11 characters).', 'error');
            return false;
        }
        if (!bankInfo.bankName.trim()) {
            showToast('Please enter your bank name.', 'error');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            goToStep(2);
        } else if (step === 2 && validateStep2()) {
            goToStep(3);
        }
    };

    const handleBack = () => {
        if (step === 2) goToStep(1);
        else if (step === 3) goToStep(2);
    };

    const handleSubmit = async () => {
        if (!validateStep3()) return;

        setIsSubmitting(true);
        try {
            // Upload documents to Firebase Storage using dedicated KYC upload function
            let aadhaarUrl = '';
            let kisanUrl = '';
            if (documents.aadhaarFile) {
                aadhaarUrl = await firebaseService.uploadKYCDocument(documents.aadhaarFile, currentUser.uid, 'aadhaar');
            }
            if (documents.kisanFile) {
                kisanUrl = await firebaseService.uploadKYCDocument(documents.kisanFile, currentUser.uid, 'kisan');
            }

            // Save KYC data to Firestore
            await firebaseService.saveFarmerKYC(currentUser.uid, {
                personalInfo,
                documents: {
                    aadhaarUrl,
                    kisanUrl,
                },
                bankInfo,
                status: 'pending',
                submittedAt: new Date(),
            });

            // Update user profile with location
            await firebaseService.upsertUserProfile({
                ...currentUser,
                name: personalInfo.fullName,
                phone: personalInfo.mobile,
                location: personalInfo.village,
            });

            showToast('KYC submitted successfully! We will verify your details shortly.', 'success');
            onComplete();
        } catch (error) {
            console.error('KYC submission failed:', error);
            showToast('Failed to submit KYC. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto">
            {/* Clean Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {(step > 1 || !required) && (
                            <button
                                onClick={step === 1 ? onClose : handleBack}
                                className="p-2 -ml-2 rounded-2xl hover:bg-gray-100 transition-colors text-gray-600"
                            >
                                <span className="material-symbols-outlined text-xl">arrow_back</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="size-8 flex items-center justify-center bg-primary text-white rounded-2xl">
                                <span className="material-symbols-outlined text-lg">agriculture</span>
                            </div>
                            <span className="font-heading font-bold text-gray-900">Anna Bazaar</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Step {step} of 3</span>
                        {!required && (
                            <button onClick={onClose} className="p-2 rounded-2xl hover:bg-gray-100">
                                <XIcon className="h-5 w-5 text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Progress Bar - Horizontal Pulse */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex-1 flex items-center gap-2">
                                <div className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-gray-200'}`} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-medium text-gray-500">
                        <span className={step >= 1 ? 'text-primary' : ''}>Personal Info</span>
                        <span className={step >= 2 ? 'text-primary' : ''}>Documents</span>
                        <span className={step >= 3 ? 'text-primary' : ''}>Bank Details</span>
                    </div>
                </div>
            </div>

            {/* Main Content - Constrained Width */}
            <main className="max-w-xl mx-auto px-4 py-6 pb-28">
                <div
                    className={`transform transition-all duration-200 ease-out ${
                        slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
                    }`}
                    key={step}
                >
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Tell Us About Yourself</h1>
                                <p className="text-sm text-gray-600">Your details help us serve you better</p>
                            </div>

                            {/* Profile Photo - Compact */}
                            <div className="flex flex-col items-center mb-6">
                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="group relative"
                                >
                                    <div className="size-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-colors hover:border-primary">
                                        {personalInfo.photoPreview ? (
                                            <img src={personalInfo.photoPreview} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-2xl text-gray-400">add_a_photo</span>
                                        )}
                                    </div>
                                    {personalInfo.photoPreview && (
                                        <div className="absolute -bottom-1 -right-1 size-6 bg-primary text-white rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </div>
                                    )}
                                </button>
                                <span className="text-xs text-gray-500 mt-2">Add Photo (Optional)</span>
                            </div>

                            {/* Form Fields - Classic Style */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Full Name *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">person</span>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={personalInfo.fullName}
                                            onChange={handlePersonalInfoChange}
                                            className="input-classic pl-10"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Mobile Number *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">smartphone</span>
                                        <input
                                            type="tel"
                                            name="mobile"
                                            value={personalInfo.mobile}
                                            onChange={handlePersonalInfoChange}
                                            className="input-classic pl-10"
                                            placeholder="+91 Mobile number"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Date of Birth</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">calendar_month</span>
                                            <input
                                                type="date"
                                                name="dateOfBirth"
                                                value={personalInfo.dateOfBirth}
                                                onChange={handlePersonalInfoChange}
                                                className="input-classic pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Village *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">home_pin</span>
                                            <input
                                                type="text"
                                                name="village"
                                                value={personalInfo.village}
                                                onChange={handlePersonalInfoChange}
                                                className="input-classic pl-10"
                                                placeholder="Village name"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h1>
                                <p className="text-sm text-gray-600">Upload your Aadhaar and Kisan card</p>
                            </div>

                            {/* Photo Tips - Compact */}
                            <div className="flex justify-center gap-6 mb-6">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="size-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <span className="material-symbols-outlined text-sm">wb_sunny</span>
                                    </div>
                                    <span className="text-xs text-gray-600">Good Light</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="size-8 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                                        <span className="material-symbols-outlined text-sm">blur_off</span>
                                    </div>
                                    <span className="text-xs text-gray-600">No Blur</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                                        <span className="material-symbols-outlined text-sm">crop_free</span>
                                    </div>
                                    <span className="text-xs text-gray-600">Full Card</span>
                                </div>
                            </div>

                            {/* Aadhaar Upload */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Aadhaar Card (Front) *</label>
                                {documents.aadhaarPreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white">
                                        <img src={documents.aadhaarPreview} alt="Aadhaar" className="w-full h-40 object-cover" />
                                        <button
                                            onClick={removeAadhaar}
                                            className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-2xl hover:bg-white transition-colors shadow-sm"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-primary/90 px-3 py-2 flex items-center gap-2 text-white text-sm">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            <span className="font-medium">Aadhaar Uploaded</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => aadhaarInputRef.current?.click()}
                                        className="relative aspect-[16/9] bg-white rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2">
                                            <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Tap to Capture Aadhaar</span>
                                        <span className="text-xs text-gray-500">Front side only</span>
                                    </div>
                                )}
                                <input ref={aadhaarInputRef} type="file" accept="image/*" onChange={handleAadhaarUpload} className="hidden" />
                            </div>

                            {/* Kisan Card Upload */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Kisan Card *</label>
                                {documents.kisanPreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white">
                                        <img src={documents.kisanPreview} alt="Kisan Card" className="w-full h-40 object-cover" />
                                        <button
                                            onClick={removeKisan}
                                            className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-2xl hover:bg-white transition-colors shadow-sm"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-primary/90 px-3 py-2 flex items-center gap-2 text-white text-sm">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            <span className="font-medium">Kisan Card Uploaded</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => kisanInputRef.current?.click()}
                                        className="relative aspect-[16/9] bg-white rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2">
                                            <span className="material-symbols-outlined text-2xl">credit_card</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Tap to Capture Kisan Card</span>
                                        <span className="text-xs text-gray-500">Your farmer ID card</span>
                                    </div>
                                )}
                                <input ref={kisanInputRef} type="file" accept="image/*" onChange={handleKisanUpload} className="hidden" />
                            </div>

                            {/* Security Footer */}
                            <div className="flex items-center justify-center gap-4 pt-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-green-600 text-sm">lock</span>
                                    <span>256-bit Encrypted</span>
                                </div>
                                <div className="w-px h-3 bg-gray-300" />
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-green-600 text-sm">verified</span>
                                    <span>Govt. Approved</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="size-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                                </div>
                                <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Bank Account Details</h1>
                                <p className="text-sm text-gray-600">Add your bank details to receive payments</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Account Holder Name *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">person</span>
                                        <input
                                            type="text"
                                            name="accountHolder"
                                            value={bankInfo.accountHolder}
                                            onChange={handleBankInfoChange}
                                            className="input-classic pl-10"
                                            placeholder="As per bank records"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Account Number *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">pin</span>
                                        <input
                                            type="text"
                                            name="accountNumber"
                                            value={bankInfo.accountNumber}
                                            onChange={handleBankInfoChange}
                                            className="input-classic pl-10"
                                            placeholder="Enter account number"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">IFSC Code *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">tag</span>
                                            <input
                                                type="text"
                                                name="ifscCode"
                                                value={bankInfo.ifscCode}
                                                onChange={handleBankInfoChange}
                                                className="input-classic pl-10 uppercase"
                                                placeholder="SBIN0001234"
                                                maxLength={11}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Bank Name *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">account_balance</span>
                                            <input
                                                type="text"
                                                name="bankName"
                                                value={bankInfo.bankName}
                                                onChange={handleBankInfoChange}
                                                className="input-classic pl-10"
                                                placeholder="Bank name"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Benefits Strip */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <div className="size-10 mx-auto rounded-2xl bg-green-50 flex items-center justify-center text-primary mb-1.5">
                                <span className="material-symbols-outlined text-lg">payments</span>
                            </div>
                            <span className="text-xs font-medium text-gray-700">Direct Pay</span>
                        </div>
                        <div className="text-center">
                            <div className="size-10 mx-auto rounded-2xl bg-green-50 flex items-center justify-center text-primary mb-1.5">
                                <span className="material-symbols-outlined text-lg">bolt</span>
                            </div>
                            <span className="text-xs font-medium text-gray-700">Fast Approval</span>
                        </div>
                        <div className="text-center">
                            <div className="size-10 mx-auto rounded-2xl bg-green-50 flex items-center justify-center text-primary mb-1.5">
                                <span className="material-symbols-outlined text-lg">verified_user</span>
                            </div>
                            <span className="text-xs font-medium text-gray-700">100% Secure</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Bottom CTA - Professional 44px height */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
                <div className="max-w-xl mx-auto">
                    <button
                        onClick={step === 3 ? handleSubmit : handleNext}
                        disabled={isSubmitting}
                        className="w-full h-11 bg-primary hover:bg-primary-dark text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <LoaderIcon className="h-4 w-4 animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <span>
                                    {step === 1 && 'Continue to ID Upload'}
                                    {step === 2 && 'Continue to Bank Details'}
                                    {step === 3 && 'Submit & Verify'}
                                </span>
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slide-in-right {
                    from { opacity: 0; transform: translateX(12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slide-in-left {
                    from { opacity: 0; transform: translateX(-12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in-right { animation: slide-in-right 0.2s ease-out forwards; }
                .animate-slide-in-left { animation: slide-in-left 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};
