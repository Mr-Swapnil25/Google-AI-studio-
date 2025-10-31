
import React, { useState, useEffect } from 'react';
import { UserRole, User, Farmer } from '../types';
import { GoogleIcon, XIcon, ShoppingCartIcon, LeafIcon } from './icons';
import { auth, db } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, GoogleAuthProvider, ConfirmationResult } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from '../context/ToastContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRole: UserRole;
}

type AuthStep = 'auth' | 'otp' | 'role' | 'details';

const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// This is a global variable to hold the recaptcha verifier instance
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export const AuthModal = ({ isOpen, onClose, initialRole }: AuthModalProps) => {
    const [step, setStep] = useState<AuthStep>('auth');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setStep('auth');
            setPhone('');
            setOtp(new Array(6).fill(""));
            setError('');
            setName('');
            setSelectedRole(initialRole);
        }
    }, [isOpen, initialRole]);
    
    const generateRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {},
            });
        }
    };

    const handleSendOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\d{10}$/.test(phone)) {
            setError('Please enter a valid 10-digit phone number.');
            return;
        }
        setIsLoading(true);
        generateRecaptcha();
        const appVerifier = window.recaptchaVerifier!;
        signInWithPhoneNumber(auth, `+91${phone}`, appVerifier)
            .then((confirmationResult) => {
                window.confirmationResult = confirmationResult;
                setIsLoading(false);
                setStep('otp');
            }).catch((err) => {
                console.error("SMS not sent error", err);
                showToast("Failed to send OTP. Please try again or check the number.", 'error');
                setIsLoading(false);
                window.recaptchaVerifier?.clear();
            });
    };

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const enteredOtp = otp.join('');
        if (enteredOtp.length !== 6) {
            setError('Please enter the full 6-digit OTP.');
            return;
        }
        setIsLoading(true);
        // FIX: Changed `verify` to `confirm` for OTP verification as per Firebase Auth API. The `ConfirmationResult` object has a `confirm` method, not `verify`.
        window.confirmationResult!.confirm(enteredOtp).then(async (result) => {
            const user = result.user;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                onClose(); // Existing user, just close modal, app state will update
            } else {
                setStep('details'); // New user, ask for details
            }
            setIsLoading(false);
        }).catch((err) => {
            showToast("Invalid OTP. Please try again.", 'error');
            setIsLoading(false);
        });
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                onClose();
            } else {
                // Pre-fill name from Google and ask for role
                setName(user.displayName || '');
                setStep('role');
            }
        } catch (err) {
            showToast("Failed to sign in with Google. Please try again.", 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFinalSubmit = async () => {
        const user = auth.currentUser;
        if (!user || !name.trim()) {
            setError("Name is required.");
            return;
        }
        setIsLoading(true);
        try {
            // Create user document
            const newUser: User = {
                uid: user.uid,
                name: name,
                email: user.email || undefined,
                phone: user.phoneNumber || undefined,
                avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
                role: selectedRole,
            };
            await setDoc(doc(db, "users", user.uid), newUser);

            // If farmer, create farmer profile
            if (selectedRole === UserRole.Farmer) {
                const farmerProfile: Omit<Farmer, 'id'> = {
                    name: name,
                    profileImageUrl: newUser.avatarUrl!,
                    isVerified: false,
                    rating: 0,
                    bio: 'Welcome! Tell us about your farm.',
                    yearsFarming: 0,
                    location: 'Not specified',
                };
                await setDoc(doc(db, "farmers", user.uid), farmerProfile);
            }

            onClose();
        } catch (error) {
            console.error("Error creating user profile:", error);
            showToast("Could not save your details. Please try again.", 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRoleSelectionSubmit = () => {
      // If name came from Google, we can finalize. Otherwise, go to details step.
      if (name.trim()) { 
        handleFinalSubmit();
      } else {
        setStep('details');
      }
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (/^[0-9]$/.test(e.target.value) || e.target.value === "") {
            const newOtp = [...otp];
            newOtp[index] = e.target.value;
            setOtp(newOtp);
            if (e.target.value !== "" && index < 5) (e.target.nextElementSibling as HTMLInputElement | null)?.focus();
        }
    };

    const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && otp[index] === "" && index > 0) (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.focus();
    };

    if (!isOpen) return null;

    const renderAuthStep = () => (
        <>
            <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex justify-center items-center py-3 px-4 border border-stone-300 rounded-lg shadow-sm bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:bg-stone-100 transition-colors">
                {isLoading ? <Spinner /> : <><GoogleIcon className="h-5 w-5 mr-3" /> Sign in with Google</>}
            </button>
            <div className="my-4 flex items-center"><div className="flex-grow border-t border-stone-300"></div><span className="flex-shrink mx-4 text-stone-400 text-sm">OR</span><div className="flex-grow border-t border-stone-300"></div></div>
            <form onSubmit={handleSendOtp}>
                <label htmlFor="phone" className="block text-sm font-medium text-stone-700">Phone Number</label>
                <div className="mt-1 relative rounded-md shadow-sm"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-stone-500 sm:text-sm">+91</span></div><input type="tel" name="phone" id="phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} className="focus:ring-primary focus:border-primary block w-full pl-12 sm:text-sm border-stone-300 rounded-lg" placeholder="98765 43210"/></div>
                <button type="submit" disabled={isLoading} className="mt-4 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:ring-primary disabled:bg-orange-300 transition-colors">
                    {isLoading ? <Spinner /> : 'Send OTP'}
                </button>
            </form>
        </>
    );

    const renderOtpStep = () => (
        <form onSubmit={handleVerifyOtp} className="text-center">
            <h3 className="text-lg font-medium text-stone-800">Enter Verification Code</h3>
            <p className="text-sm text-stone-500 mt-1">We've sent a 6-digit code to +91 {phone}.</p>
            <div className="flex justify-center gap-2 my-6">
                {otp.map((data, index) => <input key={index} type="text" name="otp" maxLength={1} value={data} onChange={(e) => handleOtpChange(e, index)} onKeyDown={(e) => handleOtpKeyDown(e, index)} className="w-10 h-12 text-center text-lg font-semibold border border-stone-300 rounded-lg focus:ring-primary focus:border-primary"/>)}
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:ring-primary disabled:bg-orange-300 transition-colors">
                 {isLoading ? <Spinner /> : 'Verify'}
            </button>
            <button type="button" onClick={() => setStep('auth')} className="mt-2 text-sm text-primary hover:underline">Change phone number</button>
        </form>
    );
    
    const renderDetailsStep = () => (
        <div className="text-center">
            <h3 className="text-lg font-medium text-stone-800">A little about you...</h3>
            <p className="text-sm text-stone-500 mt-1">Please enter your full name to continue.</p>
            <div className="mt-6 text-left">
                <label htmlFor="name" className="block text-sm font-medium text-stone-700">Full Name</label>
                <input type="text" name="name" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 focus:ring-primary focus:border-primary block w-full sm:text-sm border-stone-300 rounded-lg" placeholder="Rajesh Kumar"/>
            </div>
            <button onClick={() => setStep('role')} disabled={!name.trim()} className="mt-6 w-full flex justify-center py-3 px-4 border rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:ring-primary disabled:bg-orange-300 transition-colors">
                Next
            </button>
        </div>
    );

    const renderRoleStep = () => (
        <div className="text-center">
            <h3 className="text-lg font-medium text-stone-800">One last step!</h3>
            <p className="text-sm text-stone-500 mt-1">Please select your role on Anna Bazaar.</p>
            <div className="grid grid-cols-2 gap-4 my-6">
                <button onClick={() => setSelectedRole(UserRole.Buyer)} className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center transition-colors ${selectedRole === UserRole.Buyer ? 'border-primary bg-primary/10' : 'border-stone-300 hover:border-primary/50'}`}>
                    <ShoppingCartIcon className={`h-8 w-8 mb-2 ${selectedRole === UserRole.Buyer ? 'text-primary' : 'text-stone-500'}`} />
                    <span className="font-semibold">Buyer</span>
                </button>
                <button onClick={() => setSelectedRole(UserRole.Farmer)} className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center transition-colors ${selectedRole === UserRole.Farmer ? 'border-farmer-primary bg-farmer-primary/10' : 'border-stone-300 hover:border-farmer-primary/50'}`}>
                    <LeafIcon className={`h-8 w-8 mb-2 ${selectedRole === UserRole.Farmer ? 'text-farmer-primary' : 'text-stone-500'}`} />
                    <span className="font-semibold">Farmer</span>
                </button>
            </div>
            <button onClick={handleRoleSelectionSubmit} disabled={isLoading} className="w-full flex justify-center py-3 px-4 border rounded-lg shadow-sm text-sm font-medium text-stone-900 bg-accent hover:bg-yellow-400 focus:ring-accent transition-colors disabled:bg-yellow-200">
                {isLoading ? <Spinner /> : 'Get Started'}
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm m-4 font-sans p-6 sm:p-8 animate-fade-in" style={{animationDuration: '200ms'}} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"><XIcon className="h-6 w-6" /></button>
                {step === 'auth' && <h2 className="text-xl font-bold font-heading text-stone-800 mb-4">Welcome to Anna Bazaar</h2>}
                {step === 'auth' && renderAuthStep()}
                {step === 'otp' && renderOtpStep()}
                {step === 'details' && renderDetailsStep()}
                {step === 'role' && renderRoleStep()}
                {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
            </div>
        </div>
    );
};