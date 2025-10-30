import { Product, Negotiation, ProductCategory, ProductType, NegotiationStatus, ChatMessage, Farmer } from './types';

export const initialFarmers: Farmer[] = [
    {
        id: 'f1',
        name: 'Rajesh Kumar',
        profileImageUrl: 'https://picsum.photos/seed/farmer1/200/200',
        isVerified: true,
        rating: 4.8,
        bio: 'A passionate farmer from Punjab, specializing in organic grains and vegetables for over 20 years. My goal is to bring the freshest produce directly to your table.',
        yearsFarming: 22,
        location: 'Punjab, India',
    },
    {
        id: 'f2',
        name: 'Sunita Devi',
        profileImageUrl: 'https://picsum.photos/seed/farmer2/200/200',
        isVerified: false,
        rating: 4.6,
        bio: 'Based in the beautiful orchards of Maharashtra, I cultivate world-famous Alphonso mangoes and a variety of other tropical fruits with sustainable farming practices.',
        yearsFarming: 15,
        location: 'Maharashtra, India',
    }
];

export const initialProducts: Product[] = [
  { id: 'p1', name: 'Organic Tomatoes', description: 'Fresh, juicy tomatoes from local farms.', price: 150, quantity: 100, category: ProductCategory.Vegetable, imageUrl: 'https://picsum.photos/seed/tomatoes/400/300', farmerId: 'f1', type: ProductType.Retail },
  { id: 'p2', name: 'Basmati Rice (Bulk)', description: 'Premium quality Basmati rice for bulk purchase.', price: 5000, quantity: 50, category: ProductCategory.Grain, imageUrl: 'https://picsum.photos/seed/rice/400/300', farmerId: 'f1', type: ProductType.Bulk },
  { id: 'p3', name: 'Hapus Mangoes', description: 'Sweet and delicious Alphonso mangoes.', price: 800, quantity: 200, category: ProductCategory.Fruit, imageUrl: 'https://picsum.photos/seed/mangoes/400/300', farmerId: 'f2', type: ProductType.Retail },
  { id: 'p4', name: 'Potatoes (Bulk)', description: 'High-quality potatoes, perfect for wholesalers.', price: 2000, quantity: 100, category: ProductCategory.Vegetable, imageUrl: 'https://picsum.photos/seed/potatoes/400/300', farmerId: 'f2', type: ProductType.Bulk },
];

export const initialNegotiations: Negotiation[] = [
    { id: 'n1', productId: 'p2', productName: 'Basmati Rice (Bulk)', productImageUrl: 'https://picsum.photos/seed/rice/400/300', buyerId: 'b1', farmerId: 'f1', initialPrice: 5000, offeredPrice: 4800, quantity: 10, status: NegotiationStatus.Pending, notes: "Looking for a long term supply." },
    { id: 'n2', productId: 'p4', productName: 'Potatoes (Bulk)', productImageUrl: 'https://picsum.photos/seed/potatoes/400/300', buyerId: 'b1', farmerId: 'f2', initialPrice: 2000, offeredPrice: 1800, counterPrice: 1900, quantity: 20, status: NegotiationStatus.CounterOffer, notes: "Need these for my restaurant." }
];

export const initialMessages: ChatMessage[] = [
    { id: 'm1', negotiationId: 'n1', senderId: 'b1', text: 'Hi, is the price negotiable further?', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
    { id: 'm2', negotiationId: 'n1', senderId: 'f1', text: 'For this quantity, this is the best I can do.', timestamp: new Date(Date.now() - 1000 * 60 * 4) },
    { id: 'm3', negotiationId: 'n1', senderId: 'b1', text: 'Okay, sounds good. I will await your response on the offer.', timestamp: new Date(Date.now() - 1000 * 60 * 2) },
    { id: 'm4', negotiationId: 'n2', senderId: 'b1', text: 'Can you deliver by Friday?', timestamp: new Date(Date.now() - 1000 * 60 * 10) },
];
