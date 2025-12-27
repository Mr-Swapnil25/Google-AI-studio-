
import React, { useState, useEffect } from 'react';
import { UserRole, User, Farmer } from '../types';
import { GoogleIcon, XIcon } from './icons';
import { useToast } from '../context/ToastContext';
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { firebaseService } from '../services/firebaseService';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Role is auto-set from landing page mode selection - no role picker shown */
    initialRole: UserRole;
    onAuthenticated: (user: User) => void;
}

type AuthStep = 'auth' | 'details';

const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AuthModal = ({ isOpen, onClose, initialRole, onAuthenticated }: AuthModalProps) => {
    const [step, setStep] = useState<AuthStep>('auth');
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const { showToast } = useToast();

    // Role is automatically set from landing page selection - no picker needed
    const selectedRole = initialRole;

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setStep('auth');
            setEmail('');
            setPassword('');
            setIsSignUp(false);
            setError('');
            setName('');
        }
    }, [isOpen]);
    
    const completeAuthIfProfileExists = async (uid: string) => {
        const existing = await firebaseService.getUserProfile(uid);
        if (existing) {
            onAuthenticated(existing);
            showToast('Signed in successfully.', 'success');
            return true;
        }
        return false;
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (!email.trim() || !password) {
                setError('Email and password are required.');
                setIsLoading(false);
                return;
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                setError('Please enter a valid email address.');
                setIsLoading(false);
                return;
            }

            // Password validation for signup
            if (isSignUp) {
                if (password.length < 8) {
                    setError('Password must be at least 8 characters long.');
                    setIsLoading(false);
                    return;
                }
                if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
                    setError('Password must contain uppercase, lowercase, and a number.');
                    setIsLoading(false);
                    return;
                }
            }

            const cred = isSignUp
                ? await createUserWithEmailAndPassword(auth, email.trim(), password)
                : await signInWithEmailAndPassword(auth, email.trim(), password);

            const hadProfile = await completeAuthIfProfileExists(cred.user.uid);
            if (!hadProfile) {
                setStep('details');
            }
        } catch (err: any) {
            console.error(err);
            // Map Firebase error codes to user-friendly messages
            const errorCode = err?.code || '';
            const errorMessages: Record<string, string> = {
                'auth/user-not-found': 'No account found with this email. Please sign up.',
                'auth/wrong-password': 'Incorrect password. Please try again.',
                'auth/email-already-in-use': 'An account already exists with this email.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/weak-password': 'Password is too weak. Please use at least 8 characters.',
                'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
                'auth/network-request-failed': 'Network error. Please check your connection.',
                'auth/invalid-credential': 'Invalid email or password. Please try again.',
            };
            setError(errorMessages[errorCode] || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const cred = await signInWithPopup(auth, provider);

            const displayName = cred.user.displayName || '';
            if (displayName) setName(displayName);

            const hadProfile = await completeAuthIfProfileExists(cred.user.uid);
            if (!hadProfile) {
                // Go directly to details step if name is missing, else finalize
                if (displayName) {
                    // Auto-finalize with Google name and selected role
                    setName(displayName);
                    await finalizeProfile(cred.user.uid, displayName);
                } else {
                    setStep('details');
                }
            }
        } catch (err) {
            showToast("Failed to sign in with Google. Please try again.", 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const finalizeProfile = async (uid: string, userName: string) => {
        const newUser: User = {
            uid: uid,
            name: userName,
            role: selectedRole,
            avatarUrl: auth.currentUser?.photoURL || `https://i.pravatar.cc/150?u=${uid}`,
            email: auth.currentUser?.email || email || undefined,
        };
        
        await firebaseService.upsertUserProfile(newUser);
        await firebaseService.ensureFarmerProfile(newUser);

        onAuthenticated(newUser);
        showToast("Welcome to Anna Bazaar!", 'success');
    };
    
    const handleFinalSubmit = async () => {
        if (!name.trim()) {
            setError("Name is required.");
            return;
        }
        setIsLoading(true);
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) {
                setError('No active session found. Please sign in again.');
                setIsLoading(false);
                return;
            }
            
            await finalizeProfile(uid, name);
        } catch (error) {
            console.error("Error creating user profile:", error);
            showToast("Could not save your details. Please try again.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderAuthStep = () => (
        <>
            <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex justify-center items-center py-3 px-4 border border-stone-300 rounded-lg shadow-sm bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:bg-stone-100 transition-colors">
                {isLoading ? <Spinner /> : <><GoogleIcon className="h-5 w-5 mr-3" /> Sign in with Google</>}
            </button>
            <div className="my-4 flex items-center"><div className="flex-grow border-t border-stone-300"></div><span className="flex-shrink mx-4 text-stone-400 text-sm">OR</span><div className="flex-grow border-t border-stone-300"></div></div>
            <form onSubmit={handleEmailAuth}>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email</label>
                <input
                    type="email"
                    name="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 focus:ring-primary focus:border-primary block w-full sm:text-sm border-stone-300 rounded-lg"
                    placeholder="you@example.com"
                    autoComplete="email"
                />

                <label htmlFor="password" className="block text-sm font-medium text-stone-700 mt-4">Password</label>
                <input
                    type="password"
                    name="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 focus:ring-primary focus:border-primary block w-full sm:text-sm border-stone-300 rounded-lg"
                    placeholder="••••••••"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />

                <button type="submit" disabled={isLoading} className="mt-4 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:ring-primary disabled:bg-orange-300 transition-colors">
                    {isLoading ? <Spinner /> : isSignUp ? 'Create account' : 'Sign in'}
                </button>

                <button
                    type="button"
                    onClick={() => setIsSignUp((v) => !v)}
                    className="mt-2 w-full text-sm text-primary hover:underline"
                    disabled={isLoading}
                >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                </button>
            </form>
        </>
    );
    
    const renderDetailsStep = () => (
        <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary">person</span>
            </div>
            <h3 className="text-xl font-bold text-stone-800">Almost there!</h3>
            <p className="text-sm text-stone-500 mt-2">Please enter your full name to complete setup.</p>
            <div className="mt-6 text-left">
                <label htmlFor="name" className="block text-sm font-semibold text-stone-700">Full Name</label>
                <input 
                    type="text" 
                    name="name" 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="mt-2 focus:ring-primary focus:border-primary block w-full text-base border-stone-300 rounded-xl py-3 px-4" 
                    placeholder="Enter your full name"
                />
            </div>
            <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <p className="text-xs text-stone-500">
                    You're signing up as a <span className="font-bold text-primary">{selectedRole}</span>
                </p>
            </div>
            <button 
                onClick={handleFinalSubmit} 
                disabled={!name.trim() || isLoading} 
                className="mt-6 w-full flex justify-center items-center py-3.5 px-4 border rounded-xl shadow-sm text-base font-bold text-white bg-primary hover:bg-primary-dark focus:ring-primary disabled:bg-primary/50 transition-colors"
            >
                {isLoading ? <Spinner /> : 'Get Started'}
            </button>
        </div>
    );

    // Role indicator based on landing page selection
    const roleLabel = selectedRole === UserRole.Farmer ? 'Farmer' : 'Buyer';
    const roleColor = selectedRole === UserRole.Farmer ? 'text-primary' : 'text-primary';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md font-sans overflow-hidden animate-fade-in" style={{animationDuration: '200ms'}} onClick={e => e.stopPropagation()}>
                {/* Header with role indicator */}
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 px-6 pt-6 pb-4 border-b border-stone-100">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 transition-colors">
                        <XIcon className="h-5 w-5 text-stone-400" />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-xl">agriculture</span>
                        </div>
                        <h2 className="text-2xl font-bold text-stone-900">Anna Bazaar</h2>
                    </div>
                    {step === 'auth' && (
                        <p className="text-stone-600">
                            {isSignUp ? 'Create your account' : 'Sign in to continue'} as <span className={`font-bold ${roleColor}`}>{roleLabel}</span>
                        </p>
                    )}
                </div>
                
                {/* Content */}
                <div className="p-6">
                    {step === 'auth' && renderAuthStep()}
                    {step === 'details' && renderDetailsStep()}
                    {error && <p className="mt-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
                </div>
            </div>
        </div>
    );
};