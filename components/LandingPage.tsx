import React, { useState, useEffect } from 'react';
import { Role } from './landing';
import { InteractiveCard } from './ui/InteractiveCard';
import WaveBackground from './ui/WaveBackground';

// Avatar images for trusted users display
const FARMER_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBighv8nd3YMk1MHCbUt320hu6D74fM28vi1MpJol5d-atDtS9h2dh18lfVsImQMFQy5fVvFQEwDWJH_7ltxHbE9cUshb8RPD03ACeT4kAicaiz38nzPvCkV02YSmpJl_Eg9ouVfZjRR8sCTkRB9jVBRNOQ73FnqfxmyAUn_G1WUVorijUOLoK0_ypvsBksnP4SHsusM0D2vYyhQ0QBZsaxjwlKSCe78C49iwn8a7on8hfO4ieasHvFI7PqrHVZ784Nxf1w1kXvFAKp',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuABhSatR6mgj64hpemmbjhCqknUbaJ30Vm4YUXuyLB8QNf_8vCByFM7o_yu3kVgV13tyJqkTx1_s_jylINFY065rFghAL4IqZxL-vz9j11uMC15WSIVDpc5pbz_zEQackFcdNLIK30GqTaQdWFAMxddGZw6ZE0FeZf56eAZZccjQzvuB7fLa1-kD-NyLl_TejVy44zv8wlkUB5GeagBYUhL6By7OBcxdRPn2BoXLQrxgIYXTizI5EBpU0TWN6mhrjdUuBwT5PwnzUXO',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBIMi14f4BmFlU2kPX32boAloKUC_e1kiUX8EnERwldtxWt0WcUtL0gixaaK4cOhOedtocS75kGp84klkwdjheJPSq7M8RZFAXc1mVxOw57BecKPu68hNZou7rOjCgSPxulfJFyOd_FUvBSqgA0e38fXnW6RUEt3weZNy8qWDFx9nBU_FkjxU02lkNCVCUNOd0RaXmW_3txPMQjESUFWQbYuEgi2HzIoFzBylYk8XAZyQEc7fX1iBrWptfBAHcrGBoM8oAh_T0kfw4x',
];

const BUYER_AVATARS = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face',
];

// localStorage keys
const STORAGE_KEYS = {
  ROLE: 'anna_bazaar_role',
  LANGUAGE: 'anna_bazaar_language',
};

// Role-specific hero images
const HERO_IMAGES = {
  farmer: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALwxxDrpLMQ0PAEXnp1MIHSzbZRt1sD_WfaHf96_rURNNJS5EQ9YN_m376vwNz2v20bBh81xnlwPHeSFyN7diR183u08oIzt5BlzuTrl1ddjcv29m3DXG4HVMzoA2hSEIHsVd7sLJQSBywZsBXoT1yPQ-OLA_tQKIGuZ2NMRmmCwY7dGGMsb8a52OnVQCiPj5SXiyB7Vay27nZzB7qw3datcM9XQ59woQ8Pp5IOGPchlOOCKGbBlzESvjsNiqoUmBlER9dZTRReP-Z',
  buyer: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop',
};

// Market ticker data
const MARKET_DATA = [
  { name: 'Wheat', price: '₹2,125/q', change: '+2.5%', isUp: true },
  { name: 'Rice', price: '₹1,950/q', change: '-0.8%', isUp: false },
  { name: 'Cotton', price: '₹6,200/q', change: '+1.2%', isUp: true },
  { name: 'Maize', price: '₹1,850/q', change: '+0.5%', isUp: true },
];

// Success stories
const SUCCESS_STORIES = [
  {
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCD49NPALeLbBz0qmZY5QvBYI0JBxxLVbue3_po-0M5Y8Wt0kywTh4Dbxiyy7OubvcAg-SJM57PrGzg1a-bTYtyvdojK73pEXX_PM51rp9vHelktiVgOcjkMstCws6hljHwdxTTPwX5dWYFWQMhks1itBHQa2O0XhJXRffh5KGBka4Xy00uUKGxlj4mK_LCYQ4QSiW0FuYhv1VWhvHyc8nHYMMS5YJOEM8OowMyX8ZikK2_GOVR16Gv_hjna4TIbAyr8Bgis2r6FMi3',
    quote: 'I sold my tomatoes at 20% higher rate than the local market.',
    author: 'Rajesh Kumar',
    location: 'Maharashtra',
    rating: 5,
    featured: true,
  },
  {
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ_HxCrIT4FzSXJgZKAkTmtu4ACYy0wFXQGxGM1rbLE4cZlzXuiALU2NoOug4OlqQx037ytv1JuEP-Fvw_QGedbgBn-NDLDx4EHiXDcFlNFRw5ACEuscsWzFd8CCS_s9EPKWRDQ4eOJJTQx3WeRWg5uh8Bpv2ObOml5gtXr9wh92f5JrC0WnyC4TKqat0YehPdu98ayRL5GI9RES1_Ase3NXKvTiS1IS57h8dCrDyk8zpXVPPVtNTnmDpJVDqUp9SkVXHFI6Uyv0CX',
    title: 'Premium Quality Grains',
    featured: false,
  },
  {
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBM9pnduQcqSONfsUD8ifmRky6JuJ92XYbFmo-4Gih2nyq33cNGBgIdBqNfP0hpnEBQAerhT-iKILauNOVYAwA5OGCDxdAm6lUto2POWoXIYMpCQVWzBD7W20cHuzV6SsKJbgA3X200m89CfZ_7ngCMyCfEWkJrH5LkAaQ31q8PXBXpZ5qRj3AQNMlz5GYbeUihUm9dmAHHGMk5tyys_mJdlek0PsSTE0u1UrueqL-pPSOgbeB3EI6aIGdqIZOFTCH4ZDpZmUMhDaob',
    title: 'Modern Techniques',
    hasVideo: true,
    featured: false,
  },
];

// Features data based on role
const FEATURES = {
  farmer: [
    {
      icon: 'account_balance_wallet',
      title: 'Instant Payments',
      description: 'No more waiting. Get money directly in your bank account immediately after the buyer accepts your produce.',
      color: 'primary',
    },
    {
      icon: 'thunderstorm',
      title: 'Smart Weather Alerts',
      description: 'Protect your crops with localized weather forecasts and actionable advisories sent via SMS and Voice.',
      color: 'blue',
    },
    {
      icon: 'monitoring',
      title: 'Fair Market Rates',
      description: 'Transparent pricing based on real-time Mandi data. Compare prices and sell at the best time for maximum profit.',
      color: 'green',
    },
  ],
  buyer: [
    {
      icon: 'verified',
      title: 'Quality Verified',
      description: 'All produce is quality-checked and verified before listing. Get exactly what you see with our AI grading system.',
      color: 'orange',
    },
    {
      icon: 'local_shipping',
      title: 'Fast Delivery',
      description: 'Direct farm-to-door logistics ensure freshness. Track your orders in real-time with our delivery partners.',
      color: 'amber',
    },
    {
      icon: 'handshake',
      title: 'Direct Negotiation',
      description: 'Chat directly with farmers, negotiate bulk prices, and build long-term supply relationships.',
      color: 'blue',
    },
  ],
};

interface LandingPageProps {
  onGetStarted: (role: Role) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  // Initialize state from localStorage
  const [role, setRole] = useState<Role>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
      return (saved === 'farmer' || saved === 'buyer') ? saved : 'farmer';
    }
    return 'farmer';
  });

  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en';
    }
    return 'en';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persist role to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
  }, [role]);

  // Persist language to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  // Role-specific content
  const heroContent = {
    farmer: {
      title: 'Better Prices for',
      highlight: 'Your Harvest',
      description: 'Sell your crops directly to verified buyers. Secure payments, fair prices, and instant settlements straight to your bank.',
      cta: 'Sell Now',
      ctaSecondary: 'Voice Assistant',
    },
    buyer: {
      title: 'Fresh From Farm to',
      highlight: 'Your Business',
      description: 'Direct sourcing means fresher produce, better prices, and transparent supply chains. Bulk orders welcome.',
      cta: 'Browse Products',
      ctaSecondary: 'Talk to Sellers',
    },
  };

  const content = heroContent[role];
  const heroImage = HERO_IMAGES[role];
  const features = FEATURES[role];

  return (
    <div className="relative min-h-screen w-full text-slate-900 dark:text-white font-display overflow-x-hidden selection:bg-primary selection:text-white">
      {/* Animated Wave Background - Indian Theme */}
      <WaveBackground theme={role} backdropBlurAmount="md" />

      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0 cursor-pointer group">
              <div className={`size-10 flex items-center justify-center rounded-xl ${role === 'farmer' ? 'bg-primary' : 'bg-orange-500'} text-white shadow-[0_0_15px_rgba(43,75,238,0.5)] transition-colors duration-300`}>
                <span className="material-symbols-outlined text-[28px]">agriculture</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white">Anna Bazaar</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Farm ↔ Fork</span>
              </div>
            </div>

            {/* Persona Switcher (Segmented Button) - Desktop */}
            <div className="hidden md:flex items-center justify-center bg-white/10 p-1 rounded-xl border border-white/10">
              <label className="cursor-pointer relative flex items-center justify-center px-6 py-2 rounded-lg transition-all duration-200">
                <input
                  checked={role === 'farmer'}
                  className="peer sr-only"
                  name="persona"
                  type="radio"
                  value="farmer"
                  onChange={() => setRole('farmer')}
                />
                <div className={`absolute inset-0 ${role === 'farmer' ? 'bg-primary' : 'bg-transparent'} rounded-lg shadow-sm transition-all duration-300`} />
                <span className={`relative z-10 text-sm font-bold ${role === 'farmer' ? 'text-white' : 'text-white/60'} transition-colors`}>
                  Farmer Mode
                </span>
              </label>
              <label className="cursor-pointer relative flex items-center justify-center px-6 py-2 rounded-lg transition-all duration-200">
                <input
                  checked={role === 'buyer'}
                  className="peer sr-only"
                  name="persona"
                  type="radio"
                  value="buyer"
                  onChange={() => setRole('buyer')}
                />
                <div className={`absolute inset-0 ${role === 'buyer' ? 'bg-orange-500' : 'bg-transparent'} rounded-lg shadow-sm transition-all duration-300`} />
                <span className={`relative z-10 text-sm font-bold ${role === 'buyer' ? 'text-white' : 'text-white/60'} transition-colors`}>
                  Buyer Mode
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                aria-label="Language"
                className="flex items-center justify-center size-10 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <span className="material-symbols-outlined">translate</span>
              </button>
              <button
                onClick={() => onGetStarted(role)}
                className="flex items-center justify-center h-10 px-5 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-bold hover:bg-white/20 transition-colors"
              >
                Login
              </button>
              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex items-center justify-center size-10 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Persona Switcher */}
          <div className={`md:hidden pb-4 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
            <div className="flex w-full bg-white/10 p-1 rounded-xl border border-white/10">
              <label
                className={`flex-1 cursor-pointer text-center py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all ${
                  role === 'farmer' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Farmer Mode
                <input
                  checked={role === 'farmer'}
                  className="sr-only"
                  name="mobile-persona"
                  type="radio"
                  onChange={() => setRole('farmer')}
                />
              </label>
              <label
                className={`flex-1 cursor-pointer text-center py-2.5 rounded-lg text-sm font-bold transition-all ${
                  role === 'buyer' ? 'bg-orange-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Buyer Mode
                <input
                  checked={role === 'buyer'}
                  className="sr-only"
                  name="mobile-persona"
                  type="radio"
                  onChange={() => setRole('buyer')}
                />
              </label>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <main className="flex flex-col w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-8">
        {/* Market Ticker (Trust Signal) */}
        <div className="w-full bg-black/50 backdrop-blur-xl rounded-xl overflow-hidden py-3 border-2 border-white/20 shadow-lg">
          <div className="ticker-container">
            <div className="ticker-content">
              {/* First set of items */}
              {MARKET_DATA.map((item, index) => (
                <span key={`a-${index}`} className="ticker-item">
                  <span className={`material-symbols-outlined text-lg ${item.isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {item.isUp ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                  {item.name}: {item.price} ({item.change})
                </span>
              ))}
              <span className="ticker-item text-white/40">|</span>
              <span className="ticker-item">🌤️ Weather Alert: Heavy rain expected in Punjab region tomorrow.</span>
              {/* Duplicate for seamless loop */}
              {MARKET_DATA.map((item, index) => (
                <span key={`b-${index}`} className="ticker-item">
                  <span className={`material-symbols-outlined text-lg ${item.isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {item.isUp ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                  {item.name}: {item.price} ({item.change})
                </span>
              ))}
              <span className="ticker-item text-white/40">|</span>
              <span className="ticker-item">🌤️ Weather Alert: Heavy rain expected in Punjab region tomorrow.</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="@container">
          <div className="flex flex-col-reverse lg:flex-row gap-8 lg:gap-12 items-center py-8 lg:py-16">
            {/* Content */}
            <div className="flex flex-col gap-6 flex-1 text-left">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${role === 'farmer' ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'} border w-fit`}>
                <span className={`size-2 rounded-full ${role === 'farmer' ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
                <span className={`${role === 'farmer' ? 'text-green-500' : 'text-orange-500'} text-xs font-bold uppercase tracking-wide`}>
                  Live Mandi Prices
                </span>
              </div>

              <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                {content.title} <br />
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${role === 'farmer' ? 'from-primary to-emerald-400' : 'from-orange-500 to-amber-300'}`}>
                  {content.highlight}
                </span>
              </h1>

              <p className="text-white/90 text-lg sm:text-xl font-normal leading-relaxed max-w-xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                {content.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => onGetStarted(role)}
                  className={`group flex items-center justify-center gap-3 h-14 px-8 rounded-xl ${role === 'farmer' ? 'bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(46,125,50,0.4)] hover:shadow-[0_0_30px_rgba(46,125,50,0.6)]' : 'bg-orange-500 hover:bg-orange-500/90 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]'} text-white text-lg font-bold transition-all hover:-translate-y-1`}
                >
                  <span>{content.cta}</span>
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                </button>
                <button className="flex items-center justify-center gap-3 h-14 px-8 rounded-xl bg-white/15 backdrop-blur-xl border-2 border-white/30 hover:bg-white/25 hover:border-white/50 text-white text-lg font-bold transition-all shadow-lg">
                  <span className="material-symbols-outlined">mic</span>
                  <span>{content.ctaSecondary}</span>
                </button>
              </div>

              {/* Trusted Users */}
              <div className="flex items-center gap-4 pt-4 text-sm text-white/80">
                <div className="flex -space-x-3">
                  {(role === 'farmer' ? FARMER_AVATARS : BUYER_AVATARS).map((avatar, i) => (
                    <div
                      key={i}
                      className="size-10 rounded-full border-2 border-white/30 bg-gray-300 bg-cover bg-center shadow-lg"
                      style={{ backgroundImage: `url('${avatar}')` }}
                    />
                  ))}
                </div>
                <p>
                  Trusted by <strong className="text-white font-semibold">{role === 'farmer' ? '10,000+ farmers' : '5,000+ buyers'}</strong> across India
                </p>
              </div>
            </div>

            {/* Hero Image */}
            <div className="w-full lg:w-[500px] xl:w-[600px] aspect-[4/3] relative group">
              <div className={`absolute inset-0 bg-gradient-to-tr ${role === 'farmer' ? 'from-primary/20 to-emerald-500/20' : 'from-orange-500/20 to-amber-500/20'} rounded-2xl blur-2xl -z-10 group-hover:blur-3xl transition-all duration-500`} />
              
              <InteractiveCard
                InteractiveColor={role === 'farmer' ? '#22c55e' : '#f97316'}
                tailwindBgClass="bg-transparent"
                borderRadius="16px"
                rotationFactor={0.25}
                className="w-full h-full overflow-hidden border-2 border-white/30 shadow-2xl shadow-black/40"
              >
                <div className="relative w-full h-full bg-[#191e33]">
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101322] via-transparent to-transparent opacity-60 z-10" />
                  
                  {/* Main Image */}
                  <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ 
                      backgroundImage: `url('${heroImage}')`,
                      filter: 'contrast(1.1) saturate(1.1)',
                    }}
                  />

                  {/* Floating Card 1 - Payment */}
                  <div className="absolute bottom-6 left-6 z-20 bg-black/60 backdrop-blur-xl p-4 rounded-xl flex items-center gap-3 max-w-[200px] border-2 border-white/20 shadow-xl animate-bounce-slow">
                    <div className="size-10 rounded-full bg-green-500/30 flex items-center justify-center text-green-400">
                      <span className="material-symbols-outlined">payments</span>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">{role === 'farmer' ? 'Payment Received' : 'Order Value'}</p>
                      <p className="text-lg font-bold text-white">₹ 45,000</p>
                    </div>
                  </div>

                  {/* Floating Card 2 - Rate */}
                  <div className={`absolute top-6 right-6 z-20 bg-black/60 backdrop-blur-xl p-3 rounded-xl flex flex-col gap-1 w-32 border-l-4 ${role === 'farmer' ? 'border-l-primary' : 'border-l-orange-500'} border-2 border-white/20 shadow-xl`}>
                    <p className="text-[10px] text-white/70 uppercase font-bold">Today's Rate</p>
                    <p className="text-xl font-bold text-white">₹ 2,125</p>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">trending_up</span> +2.4%
                    </p>
                  </div>
                </div>
              </InteractiveCard>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-8 text-center md:text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            Why Choose Anna Bazaar?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index}>
                <InteractiveCard
                  InteractiveColor={
                    feature.color === 'primary' ? '#22c55e' :
                    feature.color === 'blue' ? '#3b82f6' :
                    feature.color === 'green' ? '#22c55e' :
                    feature.color === 'orange' ? '#f97316' :
                    feature.color === 'amber' ? '#f59e0b' : '#f97316'
                  }
                  tailwindBgClass="bg-black/40 backdrop-blur-xl"
                  borderRadius="16px"
                  rotationFactor={0.3}
                  className="border-2 border-white/20 hover:border-white/40 shadow-xl shadow-black/20 transition-all duration-300 h-full"
                >
                  <div className="group relative p-6 h-full">
                    {/* Background Icon */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <span className="material-symbols-outlined text-8xl">{feature.icon}</span>
                    </div>
                    
                    {/* Icon */}
                    <div className={`size-14 rounded-xl ${
                      feature.color === 'primary' ? 'bg-primary/10 text-primary' :
                      feature.color === 'blue' ? 'bg-blue-400/10 text-blue-400' :
                      feature.color === 'green' ? 'bg-green-500/10 text-green-500' :
                      feature.color === 'orange' ? 'bg-orange-400/10 text-orange-400' :
                      feature.color === 'amber' ? 'bg-amber-400/10 text-amber-400' : 'bg-orange-400/10 text-orange-400'
                    } flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/80 leading-relaxed">{feature.description}</p>
                  </div>
                </InteractiveCard>
              </div>
            ))}
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Success Stories</h2>
              <p className="text-white/80">See how {role === 'farmer' ? 'farmers' : 'buyers'} like you are growing with Anna Bazaar.</p>
            </div>
            <button className={`${role === 'farmer' ? 'text-green-400 hover:text-green-300' : 'text-orange-400 hover:text-orange-300'} font-bold transition-colors flex items-center gap-2`}>
              View All Stories <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[300px] md:min-h-[300px]">
            {/* Featured Large Item */}
            <div className="col-span-1 md:col-span-2 row-span-1 rounded-2xl overflow-hidden relative group cursor-pointer h-[300px] md:h-full border-2 border-white/20 shadow-xl">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url('${SUCCESS_STORIES[0].image}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <div className="flex items-center gap-1 text-yellow-400 mb-2">
                  {[...Array(SUCCESS_STORIES[0].rating || 5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-white font-bold text-lg">"{SUCCESS_STORIES[0].quote}"</p>
                <p className="text-slate-300 text-sm mt-1">- {SUCCESS_STORIES[0].author}, {SUCCESS_STORIES[0].location}</p>
              </div>
            </div>

            {/* Small Items */}
            {SUCCESS_STORIES.slice(1).map((story, index) => (
              <div key={index} className="col-span-1 rounded-2xl overflow-hidden relative group cursor-pointer h-[200px] md:h-full border-2 border-white/20 shadow-xl hover:border-white/40 transition-all">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url('${story.image}')` }}
                />
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors" />
                <div className="absolute bottom-4 left-4">
                  {story.hasVideo && (
                    <div className="size-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2">
                      <span className="material-symbols-outlined text-white text-sm">play_arrow</span>
                    </div>
                  )}
                  <p className="text-white font-bold">{story.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Call to Action */}
        <section className="mt-8 mb-16">
          <div className={`w-full rounded-3xl bg-gradient-to-r ${role === 'farmer' ? 'from-primary to-emerald-500' : 'from-orange-500 to-amber-500'} p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden border-2 border-white/30 shadow-2xl`}>
            {/* Decorative Circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -translate-x-1/3 translate-y-1/3 blur-xl" />

            <div className="relative z-10 max-w-xl">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
                {role === 'farmer' ? 'Ready to get the best price?' : 'Ready to source fresh produce?'}
              </h2>
              <p className="text-white/80 text-lg">
                Join Anna Bazaar today. It takes less than 2 minutes to create your profile.
              </p>
            </div>

            <div className="relative z-10 flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => onGetStarted(role)}
                className={`bg-white ${role === 'farmer' ? 'text-primary' : 'text-orange-600'} hover:bg-slate-100 px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105`}
              >
                Create Account
              </button>
              <p className="text-white/70 text-sm text-center">No hidden fees. Free registration.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-white/20 bg-black/60 backdrop-blur-xl py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-2">
                <div className={`size-8 flex items-center justify-center rounded-lg ${role === 'farmer' ? 'bg-primary' : 'bg-orange-500'} text-white`}>
                  <span className="material-symbols-outlined text-xl">agriculture</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white">Anna Bazaar</span>
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/70">Farm ↔ Fork</span>
                </div>
              </div>
              <p className="text-white/80 text-sm">Empowering farmers, connecting India.</p>
            </div>

            {/* Contact Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#"
                className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/15 border-2 border-white/25 hover:bg-white/25 hover:border-white/40 transition-all group shadow-lg"
              >
                <span className="material-symbols-outlined text-green-400 group-hover:scale-110 transition-transform">chat</span>
                <div className="text-left">
                  <p className="text-xs text-white/70">Chat on WhatsApp</p>
                  <p className="text-white font-bold text-sm">+91 98765 43210</p>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/15 border-2 border-white/25 hover:bg-white/25 hover:border-white/40 transition-all group shadow-lg"
              >
                <span className={`material-symbols-outlined ${role === 'farmer' ? 'text-green-400' : 'text-orange-400'} group-hover:scale-110 transition-transform`}>call</span>
                <div className="text-left">
                  <p className="text-xs text-white/70">Call Support (24/7)</p>
                  <p className="text-white font-bold text-sm">1800-123-4567</p>
                </div>
              </a>
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row justify-between items-center mt-12 pt-8 border-t-2 border-white/20 gap-4 text-xs text-white/60">
            <p>© 2024 Anna Bazaar Technologies Pvt Ltd.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom CSS Animations */}
      <style>{`
        /* Ticker Animation - Infinite Scroll */
        .ticker-container {
          width: 100%;
          overflow: hidden;
        }
        .ticker-content {
          display: flex;
          gap: 2rem;
          animation: ticker-scroll 25s linear infinite;
          width: max-content;
        }
        .ticker-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-content:hover {
          animation-play-state: paused;
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};