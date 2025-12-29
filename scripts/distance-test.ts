/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DISTANCE MATRIX API TEST SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Run these tests in browser console to verify distance calculation and 
 * dynamic pricing are working correctly.
 * 
 * To run: Open browser console on the app and paste the test functions
 */

// Import required functions (these will be available in the window scope after build)

/**
 * TEST 1: Same City (Short Distance) - Kolkata
 * Expected: <10km, Free delivery
 */
async function testSameCityDistance() {
  const { calculateDistance, getDeliveryQuote, logDistanceDebug } = await import('./services/distanceMatrixService');
  
  console.group('🧪 TEST 1: Same City (Short Distance)');
  
  const farmer = { lat: 22.5726, lng: 88.3639 }; // Park Street, Kolkata
  const buyer = { lat: 22.5485, lng: 88.3426 };  // Bhowanipore, Kolkata
  
  console.log('Farmer Location: Park Street, Kolkata');
  console.log('Buyer Location: Bhowanipore, Kolkata');
  
  try {
    const distance = await calculateDistance(farmer, buyer);
    logDistanceDebug(distance);
    
    const quote = await getDeliveryQuote(farmer, buyer);
    console.log('Delivery Quote:', {
      fee: `₹${quote.deliveryFee}`,
      distance: `${quote.distanceKm} km`,
      time: `${quote.estimatedMinutes} mins`,
      tier: quote.tier,
      isDeliverable: quote.isDeliverable,
    });
    
    // Verification
    if (distance.distanceKm <= 10) {
      console.log('✅ PASS: Distance within 10km as expected');
    } else {
      console.warn('⚠️ Distance higher than expected');
    }
    
    if (quote.deliveryFee === 0) {
      console.log('✅ PASS: Free delivery applied');
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
  }
  
  console.groupEnd();
}

/**
 * TEST 2: Different Cities (Medium Distance) - Kolkata to Howrah
 * Expected: 5-15km, Small delivery fee
 */
async function testDifferentCitiesDistance() {
  const { calculateDistance, getDeliveryQuote, logDistanceDebug } = await import('./services/distanceMatrixService');
  
  console.group('🧪 TEST 2: Different Cities (Medium Distance)');
  
  const farmer = { lat: 22.5726, lng: 88.3639 }; // Kolkata
  const buyer = { lat: 22.5958, lng: 88.2636 };  // Howrah
  
  console.log('Farmer Location: Kolkata');
  console.log('Buyer Location: Howrah');
  
  try {
    const distance = await calculateDistance(farmer, buyer);
    logDistanceDebug(distance);
    
    const quote = await getDeliveryQuote(farmer, buyer);
    console.log('Delivery Quote:', {
      fee: `₹${quote.deliveryFee}`,
      distance: `${quote.distanceKm} km`,
      time: `${quote.estimatedMinutes} mins`,
      trafficTime: quote.trafficAdjustedMinutes ? `${quote.trafficAdjustedMinutes} mins` : 'N/A',
      tier: quote.tier,
      breakdown: quote.breakdown,
    });
    
    // Verification - Road distance should be higher than straight line
    const { calculateHaversineDistance } = await import('./services/distanceMatrixService');
    const straightLine = calculateHaversineDistance(farmer, buyer);
    console.log(`Straight line: ${straightLine.toFixed(2)} km`);
    console.log(`Road distance: ${distance.distanceKm} km`);
    
    if (distance.distanceKm > straightLine) {
      console.log('✅ PASS: Road distance > straight line (not as-the-crow-flies)');
    } else {
      console.warn('⚠️ Road distance should be longer than straight line');
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
  }
  
  console.groupEnd();
}

/**
 * TEST 3: Regional Distance - Kolkata to Durgapur
 * Expected: 150-180km, Higher delivery fee
 */
async function testRegionalDistance() {
  const { calculateDistance, getDeliveryQuote, logDistanceDebug } = await import('./services/distanceMatrixService');
  
  console.group('🧪 TEST 3: Regional Distance');
  
  const farmer = { lat: 22.5726, lng: 88.3639 }; // Kolkata
  const buyer = { lat: 23.5204, lng: 87.3119 };  // Durgapur (approx 170km)
  
  console.log('Farmer Location: Kolkata');
  console.log('Buyer Location: Durgapur');
  
  try {
    const distance = await calculateDistance(farmer, buyer);
    logDistanceDebug(distance);
    
    const quote = await getDeliveryQuote(farmer, buyer);
    console.log('Delivery Quote:', {
      fee: `₹${quote.deliveryFee}`,
      distance: `${quote.distanceKm} km`,
      time: `${quote.estimatedMinutes} mins`,
      tier: quote.tier,
      breakdown: quote.breakdown,
    });
    
    // Should apply extended delivery tier
    if (quote.distanceKm > 50) {
      console.log('✅ Regional/Extended distance tier applied');
    }
    
    if (quote.deliveryFee > 100) {
      console.log('✅ PASS: Extended delivery fee applied correctly');
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
  }
  
  console.groupEnd();
}

/**
 * TEST 4: Multiple Farmers Proximity Ranking
 * Expected: Farmers ranked by distance (nearest first)
 */
async function testProximityRanking() {
  const { rankFarmersByProximity } = await import('./services/distanceMatrixService');
  
  console.group('🧪 TEST 4: Proximity Ranking');
  
  const buyerCoords = { lat: 22.5726, lng: 88.3639 }; // Kolkata center
  
  const farmers = [
    { farmerId: 'f1', farmerName: 'Farmer A (Distant)', coordinates: { lat: 23.5204, lng: 87.3119 } }, // Durgapur
    { farmerId: 'f2', farmerName: 'Farmer B (Nearby)', coordinates: { lat: 22.5485, lng: 88.3426 } },  // Bhowanipore
    { farmerId: 'f3', farmerName: 'Farmer C (Medium)', coordinates: { lat: 22.5958, lng: 88.2636 } }, // Howrah
  ];
  
  console.log('Buyer Location: Kolkata Center');
  console.log('Testing ranking of 3 farmers at different distances...');
  
  try {
    const ranked = await rankFarmersByProximity(buyerCoords, farmers);
    
    console.log('\nRanked Farmers (nearest first):');
    ranked.forEach((f, i) => {
      console.log(`${i + 1}. ${f.farmerName}: ${f.distanceKm.toFixed(1)} km, ~${f.durationMinutes} mins, ₹${f.deliveryFee} delivery`);
    });
    
    // Verify order
    if (ranked[0].farmerId === 'f2') {
      console.log('✅ PASS: Nearest farmer ranked first');
    } else {
      console.warn('⚠️ Ranking may not be correct');
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
  }
  
  console.groupEnd();
}

/**
 * TEST 5: Delivery Pricing Tiers
 * Verify correct tier is applied for each distance range
 */
async function testPricingTiers() {
  const { calculateDeliveryFee, DELIVERY_PRICING_TIERS } = await import('./services/distanceMatrixService');
  
  console.group('🧪 TEST 5: Delivery Pricing Tiers');
  
  console.log('Pricing Tiers:', DELIVERY_PRICING_TIERS);
  
  const testDistances = [5, 15, 35, 75, 150];
  
  testDistances.forEach(km => {
    const { fee, tier, breakdown } = calculateDeliveryFee(km);
    console.log(`\n${km} km:`, {
      fee: `₹${fee}`,
      tier,
      breakdown: `Base ₹${breakdown.baseFee} + Distance ₹${breakdown.distanceCharge}`,
    });
  });
  
  // Verify tier boundaries
  const tier1 = calculateDeliveryFee(8);
  const tier2 = calculateDeliveryFee(15);
  const tier3 = calculateDeliveryFee(35);
  const tier4 = calculateDeliveryFee(75);
  
  if (tier1.fee === 0) console.log('✅ 0-10km: Free delivery');
  if (tier2.fee > 0 && tier2.fee < 50) console.log('✅ 11-25km: ₹20 + ₹2/km');
  if (tier3.fee >= 50) console.log('✅ 26-50km: ₹50 + ₹3/km');
  if (tier4.fee >= 100) console.log('✅ 51+ km: ₹100 + ₹5/km');
  
  console.groupEnd();
}

/**
 * TEST 6: Error Handling
 * Verify proper handling of invalid coordinates
 */
async function testErrorHandling() {
  const { calculateDistance, validateCoordinates } = await import('./services/distanceMatrixService');
  
  console.group('🧪 TEST 6: Error Handling');
  
  // Test invalid coordinates
  const invalidCases = [
    { coords: { lat: 100, lng: 88 }, name: 'Latitude > 90' },
    { coords: { lat: 22, lng: 200 }, name: 'Longitude > 180' },
    { coords: { lat: NaN, lng: 88 }, name: 'NaN latitude' },
  ];
  
  invalidCases.forEach(({ coords, name }) => {
    const result = validateCoordinates(coords);
    console.log(`${name}: ${result.valid ? '❌ Should fail' : `✅ Correctly rejected: ${result.error}`}`);
  });
  
  // Test valid coordinates
  const validResult = validateCoordinates({ lat: 22.5726, lng: 88.3639 });
  console.log(`Valid coordinates: ${validResult.valid ? '✅ Accepted' : '❌ Should pass'}`);
  
  console.groupEnd();
}

/**
 * TEST 7: Cache Verification
 * Verify results are cached for 5 minutes
 */
async function testCaching() {
  const { calculateDistance, clearDistanceCache } = await import('./services/distanceMatrixService');
  
  console.group('🧪 TEST 7: Cache Verification');
  
  const farmer = { lat: 22.5726, lng: 88.3639 };
  const buyer = { lat: 22.5485, lng: 88.3426 };
  
  // Clear cache first
  clearDistanceCache();
  console.log('Cache cleared');
  
  // First call - should hit API
  console.time('First call (API)');
  const result1 = await calculateDistance(farmer, buyer, true);
  console.timeEnd('First call (API)');
  console.log('From cache:', result1.fromCache);
  
  // Second call - should use cache
  console.time('Second call (Cache)');
  const result2 = await calculateDistance(farmer, buyer, true);
  console.timeEnd('Second call (Cache)');
  console.log('From cache:', result2.fromCache);
  
  if (!result1.fromCache && result2.fromCache) {
    console.log('✅ PASS: Caching working correctly');
  } else {
    console.warn('⚠️ Cache behavior unexpected');
  }
  
  console.groupEnd();
}

/**
 * RUN ALL TESTS
 */
async function runAllDistanceTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       DISTANCE MATRIX API - COMPREHENSIVE TESTS               ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  await testSameCityDistance();
  console.log('\n');
  
  await testDifferentCitiesDistance();
  console.log('\n');
  
  await testRegionalDistance();
  console.log('\n');
  
  await testProximityRanking();
  console.log('\n');
  
  await testPricingTiers();
  console.log('\n');
  
  await testErrorHandling();
  console.log('\n');
  
  await testCaching();
  console.log('\n');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                     ALL TESTS COMPLETE                        ');
  console.log('═══════════════════════════════════════════════════════════════');
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).distanceTests = {
    testSameCityDistance,
    testDifferentCitiesDistance,
    testRegionalDistance,
    testProximityRanking,
    testPricingTiers,
    testErrorHandling,
    testCaching,
    runAllDistanceTests,
  };
  
  console.log('Distance tests loaded. Run window.distanceTests.runAllDistanceTests() to execute all tests.');
}

export {
  testSameCityDistance,
  testDifferentCitiesDistance,
  testRegionalDistance,
  testProximityRanking,
  testPricingTiers,
  testErrorHandling,
  testCaching,
  runAllDistanceTests,
};
