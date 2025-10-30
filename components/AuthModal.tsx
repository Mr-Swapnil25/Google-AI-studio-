import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { GoogleIcon, XIcon, ShoppingCartIcon, LeafIcon } from './icons';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: (user: { name: string, phone?: string, email?: string, role: UserRole, avatarUrl?: string }) => void;
    initialRole: UserRole;
}

type AuthStep = 'auth' | 'otp' | 'role';

const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AuthModal = ({ isOpen, onClose, onAuthSuccess, initialRole }: AuthModalProps) => {
    const [activeTab, setActiveTab] = useState<'signIn' | 'signUp'>('signIn');
    const [step, setStep] = useState<AuthStep>('auth');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [mockUserData, setMockUserData] = useState<{ name: string, phone?: string, email?: string, avatarUrl?: string } | null>(null);

    useEffect(() => {
        setSelectedRole(initialRole);
    }, [initialRole]);

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setTimeout(() => {
                setActiveTab('signIn');
                setStep('auth');
                setPhone('');
                setOtp(new Array(6).fill(""));
                setIsLoading(false);
                setError('');
                setMockUserData(null);
            }, 300);
        }
    }, [isOpen]);

    const handleSendOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\d{10}$/.test(phone)) {
            setError('Please enter a valid 10-digit phone number.');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep('otp');
            setMockUserData({ name: `User ${phone.slice(-4)}`, phone });
        }, 1500);
    };

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const enteredOtp = otp.join('');
        if (enteredOtp !== '123456') { // Mock OTP
            setError('Invalid OTP. Please try again.');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep('role');
        }, 1500);
    };

    const handleGoogleSignIn = () => {
        setIsLoading(true);
        setError('');
        setTimeout(() => {
            setIsLoading(false);
            setStep('role');
            setMockUserData({ name: 'Google User', email: 'user@google.com', avatarUrl: `https://picsum.photos/seed/googleuser/100/100` });
        }, 1500);
    };
    
    const handleFinalSubmit = () => {
        if (mockUserData) {
            onAuthSuccess({ ...mockUserData, role: selectedRole });
        }
    };
    
    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (/^[0-9]$/.test(e.target.value) || e.target.value === "") {
            const newOtp = [...otp];
            newOtp[index] = e.target.value;
            setOtp(newOtp);
            // Move to next input
            if (e.target.value !== "" && index < 5) {
                const nextSibling = e.target.nextElementSibling as HTMLInputElement | null;
                nextSibling?.focus();
            }
        }
    };

    const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        // Move to previous input on backspace
        if (e.key === "Backspace" && otp[index] === "" && index > 0) {
            const prevSibling = e.currentTarget.previousElementSibling as HTMLInputElement | null;
            prevSibling?.focus();
        }
    };

    if (!isOpen) return null;

    const renderAuthStep = () => (
        <>
            <button 
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? <Spinner /> : <GoogleIcon className="h-5 w-5 mr-3" />}
                Sign {activeTab === 'signIn' ? 'in' : 'up'} with Google
            </button>
            <div className="my-4 flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <form onSubmit={handleSendOtp}>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">+91</span>
                    </div>
                    <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={10}
                        className="focus:ring-primary focus:border-primary block w-full pl-12 sm:text-sm border-gray-300 rounded-lg"
                        placeholder="98765 43210"
                    />
                </div>
                <button type="submit" disabled={isLoading} className="mt-4 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-green-300 transition-colors">
                    {isLoading ? <Spinner /> : 'Send OTP'}
                </button>
            </form>
        </>
    );

    const renderOtpStep = () => (
        <form onSubmit={handleVerifyOtp} className="text-center">
            <h3 className="text-lg font-medium text-gray-800">Enter Verification Code</h3>
            <p className="text-sm text-gray-500 mt-1">We've sent a 6-digit code to +91 {phone}.</p>
            <div className="flex justify-center gap-2 my-6">
                {otp.map((data, index) => (
                    <input
                        key={index}
                        type="text"
                        name="otp"
                        maxLength={1}
                        value={data}
                        onChange={(e) => handleOtpChange(e, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        className="w-10 h-12 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                ))}
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-green-300 transition-colors">
                 {isLoading ? <Spinner /> : 'Verify'}
            </button>
            <button type="button" onClick={() => setStep('auth')} className="mt-2 text-sm text-primary hover:underline">
                Change phone number
            </button>
        </form>
    );

    const renderRoleStep = () => (
        <div className="text-center">
            <h3 className="text-lg font-medium text-gray-800">One last step!</h3>
            <p className="text-sm text-gray-500 mt-1">Please select your role on Anna Bazaar.</p>
            <div className="grid grid-cols-2 gap-4 my-6">
                <button onClick={() => setSelectedRole(UserRole.Buyer)} className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center transition-colors ${selectedRole === UserRole.Buyer ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary/50'}`}>
                    <ShoppingCartIcon className={`h-8 w-8 mb-2 ${selectedRole === UserRole.Buyer ? 'text-primary' : 'text-gray-500'}`} />
                    <span className="font-semibold">Buyer</span>
                </button>
                <button onClick={() => setSelectedRole(UserRole.Farmer)} className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center transition-colors ${selectedRole === UserRole.Farmer ? 'border-farmer-primary bg-farmer-primary/10' : 'border-gray-300 hover:border-farmer-primary/50'}`}>
                    <LeafIcon className={`h-8 w-8 mb-2 ${selectedRole === UserRole.Farmer ? 'text-farmer-primary' : 'text-gray-500'}`} />
                    <span className="font-semibold">Farmer</span>
                </button>
            </div>
            <button onClick={handleFinalSubmit} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-accent text-gray-900 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors">
                Get Started
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-xl w-full max-w-sm m-4 font-sans p-6 sm:p-8" 
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                {step === 'auth' && (
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-6">
                            <button onClick={() => setActiveTab('signIn')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'signIn' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                Sign In
                            </button>
                            <button onClick={() => setActiveTab('signUp')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'signUp' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                Sign Up
                            </button>
                        </nav>
                    </div>
                )}
                
                {step === 'auth' && renderAuthStep()}
                {step === 'otp' && renderOtpStep()}
                {step === 'role' && renderRoleStep()}
                
                {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
            </div>
        </div>
    );
};