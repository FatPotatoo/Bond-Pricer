import {
  getDays30360,
  getCouponDates,
  getPreviousAndNextCoupon,
  calculateAccruedInterest,
  generateCashFlowSchedule,
  solveYTMFromCleanPrice,
  calculateRiskMetrics,
  calculateCleanPriceFromYield
} from '../utils/analyticsEngine.js';

console.log("=== BondIQ Math Engine Verification ===");

// Let's test the 30/360 day count
const dateA = new Date('2026-02-14');
const dateB = new Date('2026-06-27');
const days = getDays30360(dateA, dateB);
console.log(`30/360 Days between Feb 14, 2026 and June 27, 2026: ${days} (Expected: 133)`);

// Let's test getCouponDates for 8.33% GS 2026 (Issue: 2012-07-09, Maturity: 2026-07-09)
const couponDates = getCouponDates('2026-07-09', '2012-07-09');
console.log(`\nGenerated ${couponDates.length} coupon dates for 8.33% GS 2026.`);
console.log(`First coupon date: ${couponDates[0].toISOString().split('T')[0]}`);
console.log(`Last coupon date (Maturity): ${couponDates[couponDates.length - 1].toISOString().split('T')[0]}`);

// Let's verify next and prev coupon for settlement 2026-06-27
const settlement = '2026-06-27';
const { prev, next } = getPreviousAndNextCoupon(settlement, couponDates, '2012-07-09');
console.log(`\nSettlement: ${settlement}`);
console.log(`Previous Coupon Date: ${prev ? prev.toISOString().split('T')[0] : 'None'}`);
console.log(`Next Coupon Date: ${next ? next.toISOString().split('T')[0] : 'None'}`);

// Let's calculate accrued interest
const couponRate = 0.0833;
const faceValue = 100;
const accrued = calculateAccruedInterest(settlement, '2026-07-09', '2012-07-09', couponRate, faceValue);
console.log(`Accrued Interest for settlement 2026-06-27: ₹${accrued.toFixed(6)}`);
// Days accrued = 30/360 from 2026-01-09 to 2026-06-27:
// Jan 9 to June 27:
// Jan 9 to June 9 = 5 months = 150 days
// June 9 to June 27 = 18 days
// Total = 168 days
// AI = 100 * (0.0833 / 2) * (168 / 180) = 4.165 * 0.9333333333333333 = 3.887333
const expectedAI = 100 * (couponRate / 2) * (getDays30360(prev, settlement) / getDays30360(prev, next));
console.log(`Calculated Days Accrued: ${getDays30360(prev, settlement)}`);
console.log(`Calculated Coupon Period: ${getDays30360(prev, next)}`);
console.log(`Expected Accrued Interest: ₹${expectedAI.toFixed(6)}`);

// Let's test cash flows
const cashFlows = generateCashFlowSchedule(settlement, '2026-07-09', '2012-07-09', couponRate, faceValue);
console.log(`\nFuture Cash Flows from settlement:`);
cashFlows.forEach((cf, i) => {
  console.log(`  ${i+1}. Date: ${cf.date}, Type: ${cf.type}, Amount: ₹${cf.amount}, Days to: ${cf.daysTo}, Time to: ${cf.timeTo.toFixed(4)} years`);
});

// Let's solve YTM for clean price of 100.08 on June 25, 2026
const settlementCCIL = '2026-06-25';
const cleanPriceCCIL = 100.08;
const solvedYTM = solveYTMFromCleanPrice(cleanPriceCCIL, settlementCCIL, '2026-07-09', '2012-07-09', couponRate, faceValue);
console.log(`\nCCIL Settlement: ${settlementCCIL}, Clean Price: ₹${cleanPriceCCIL}`);
console.log(`Solved YTM: ${(solvedYTM * 100).toFixed(4)}%`);

// Let's check risk metrics
const metrics = calculateRiskMetrics(solvedYTM, settlementCCIL, '2026-07-09', '2012-07-09', couponRate, faceValue);
console.log(`Dirty Price: ₹${metrics.dirtyPrice.toFixed(6)}`);
console.log(`Accrued Interest: ₹${metrics.accruedInterest.toFixed(6)}`);
console.log(`Clean Price: ₹${metrics.cleanPrice.toFixed(6)}`);
console.log(`Macaulay Duration: ${metrics.macaulayDuration.toFixed(4)} years`);
console.log(`Modified Duration: ${metrics.modifiedDuration.toFixed(4)} years`);
console.log(`Convexity: ${metrics.convexity.toFixed(6)}`);
console.log(`DV01: ₹${metrics.dv01.toFixed(6)}`);

// Verify roundtrip: YTM -> Price
const roundtripCleanPrice = calculateCleanPriceFromYield(solvedYTM, settlementCCIL, '2026-07-09', '2012-07-09', couponRate, faceValue);
console.log(`Roundtrip Clean Price: ₹${roundtripCleanPrice.toFixed(6)} (Expected: ${cleanPriceCCIL})`);
