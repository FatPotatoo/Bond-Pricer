/**
 * BondIQ Analytics Engine
 * Quantitative calculations for fixed income analysis of dated GOI Securities.
 * Following CCIL/RBI standard conventions:
 * - Day Count: US 30/360
 * - Coupon Frequency: Semiannual (2 per year)
 * - Face Value: ₹100
 */

// Formats a date object to YYYY-MM-DD in local time to avoid timezone shift
export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Check if a year is a leap year (needed for some 30/360 edge cases)
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Calculates the number of days between two dates using the US 30/360 day count convention.
 * @param {Date|string} date1 - Start date
 * @param {Date|string} date2 - End date
 * @returns {number} Number of days
 */
export function getDays30360(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  let yy1 = d1.getFullYear();
  let mm1 = d1.getMonth() + 1; // 1-indexed (1 to 12)
  let dd1 = d1.getDate();

  let yy2 = d2.getFullYear();
  let mm2 = d2.getMonth() + 1;
  let dd2 = d2.getDate();

  // Apply US 30/360 adjustment rules (Bond Basis)
  
  // Rule 1: Adjust d1 if it falls on the 31st or is the last day of February
  // Check if date1 is the last day of February
  const isLastFeb1 = (mm1 === 2 && (dd1 === 29 || (dd1 === 28 && !isLeapYear(yy1))));
  if (isLastFeb1) {
    dd1 = 30;
  }
  if (dd1 === 31) {
    dd1 = 30;
  }

  // Rule 2: Adjust d2 if dd2 is 31, and dd1 >= 30
  // Or if dd2 is the last day of February and dd1 is also the last day of February
  const isLastFeb2 = (mm2 === 2 && (dd2 === 29 || (dd2 === 28 && !isLeapYear(yy2))));
  if (isLastFeb1 && isLastFeb2) {
    dd2 = 30;
  }
  if (dd2 === 31 && dd1 >= 30) {
    dd2 = 30;
  }

  return 360 * (yy2 - yy1) + 30 * (mm2 - mm1) + (dd2 - dd1);
}

/**
 * Generate all coupon dates backwards from Maturity Date to Issue Date.
 * @param {Date|string} maturityDate 
 * @param {Date|string} issueDate 
 * @returns {Date[]} Array of coupon Dates sorted chronologically
 */
export function getCouponDates(maturityDate, issueDate) {
  const mat = new Date(maturityDate);
  const iss = new Date(issueDate);

  const couponDates = [];
  let current = new Date(mat);

  const targetDay = mat.getDate();
  const targetMonth = mat.getMonth(); // 0-11

  // Backward loop from Maturity Date to Issue Date
  while (current >= iss) {
    couponDates.push(new Date(current));

    // Move back 6 months
    let y = current.getFullYear();
    let m = current.getMonth();

    if (m < 6) {
      m = m + 6;
      y = y - 1;
    } else {
      m = m - 6;
    }

    // Set to the specific day to avoid date shifting (e.g. Feb 31 overflow)
    // Adjusting for months with fewer days than targetDay
    let tempDate = new Date(y, m, targetDay);
    // If the day shifted because the target month doesn't have targetDay (e.g., Feb 30th)
    if (tempDate.getDate() !== targetDay) {
      // Set to the last day of that month
      tempDate = new Date(y, m + 1, 0); 
    }
    current = tempDate;
  }

  // Add issue date as a coupon anchor if it is not already in the list
  // Note: Interest starts accruing from the Issue Date.
  // We sort and return.
  couponDates.sort((a, b) => a - b);
  return couponDates;
}

/**
 * Get the previous and next coupon dates relative to a settlement date.
 * @param {Date|string} settlementDate 
 * @param {Date[]} couponDates 
 * @param {Date|string} issueDate 
 * @returns {object} { prev, next, isExpired }
 */
export function getPreviousAndNextCoupon(settlementDate, couponDates, issueDate) {
  const s = new Date(settlementDate);
  const iss = new Date(issueDate);

  // If settlement is before issue date, default to issue date
  const evalDate = s < iss ? iss : s;

  const nextIndex = couponDates.findIndex(d => d >= evalDate);
  if (nextIndex === -1) {
    return { prev: null, next: null, isExpired: true };
  }

  const next = couponDates[nextIndex];
  
  // Previous accrual date is either the preceding coupon date or the issue date
  let prev = null;
  if (nextIndex > 0) {
    prev = couponDates[nextIndex - 1];
  } else {
    prev = new Date(issueDate);
  }

  return { prev, next, isExpired: false };
}

/**
 * Calculates Accrued Interest for a bond.
 * @param {Date|string} settlementDate 
 * @param {Date|string} maturityDate 
 * @param {Date|string} issueDate 
 * @param {number} couponRate - annual coupon rate (e.g., 0.0718 for 7.18%)
 * @param {number} faceValue - standard 100
 * @returns {number} Accrued Interest
 */
export function calculateAccruedInterest(settlementDate, maturityDate, issueDate, couponRate, faceValue = 100) {
  const couponDates = getCouponDates(maturityDate, issueDate);
  const { prev, next, isExpired } = getPreviousAndNextCoupon(settlementDate, couponDates, issueDate);

  if (isExpired) return 0;

  const daysAccrued = getDays30360(prev, settlementDate);
  const daysPeriod = getDays30360(prev, next);

  if (daysPeriod === 0) return 0;

  // Accrued Interest = Face Value * (Coupon / 2) * (Days Accrued / Days in Period)
  const accrued = faceValue * (couponRate / 2) * (daysAccrued / daysPeriod);
  return Math.max(0, accrued);
}

/**
 * Generates the future cash flow schedule from a settlement date.
 * @param {Date|string} settlementDate 
 * @param {Date|string} maturityDate 
 * @param {Date|string} issueDate 
 * @param {number} couponRate 
 * @param {number} faceValue 
 * @returns {object[]} Array of cash flows { date, type, amount, daysTo, timeTo }
 */
export function generateCashFlowSchedule(settlementDate, maturityDate, issueDate, couponRate, faceValue = 100) {
  const s = new Date(settlementDate);
  const couponDates = getCouponDates(maturityDate, issueDate);
  
  const schedule = [];
  
  // Filter for future coupon dates (greater than settlement)
  const futureCouponDates = couponDates.filter(d => d > s);
  
  futureCouponDates.forEach((date, index) => {
    const isMaturity = index === futureCouponDates.length - 1;
    const daysTo = getDays30360(s, date);
    const timeTo = daysTo / 360;

    let amount = faceValue * (couponRate / 2);
    let type = 'Coupon';
    
    if (isMaturity) {
      amount += faceValue;
      type = 'Redemption';
    }

    schedule.push({
      date: formatDate(date),
      type,
      amount,
      daysTo,
      timeTo
    });
  });

  return schedule;
}

/**
 * Computes the Dirty Price of a bond given its Yield to Maturity (YTM).
 * @param {number} ytm - Yield to Maturity (decimal, e.g., 0.0718 for 7.18%)
 * @param {object[]} cashFlows - Cash flow schedule from generateCashFlowSchedule
 * @returns {number} Dirty Price
 */
export function calculateDirtyPriceFromYield(ytm, cashFlows) {
  let dirtyPrice = 0;
  for (const cf of cashFlows) {
    // Discount factor for semiannual compounding: 1 / (1 + y/2)^(2 * t)
    const discountFactor = 1 / Math.pow(1 + ytm / 2, 2 * cf.timeTo);
    dirtyPrice += cf.amount * discountFactor;
  }
  return dirtyPrice;
}

/**
 * Solves for Yield to Maturity (YTM) given a Clean Price.
 * Uses Binary Search (Bisection Method).
 * @param {number} cleanPriceTarget 
 * @param {Date|string} settlementDate 
 * @param {Date|string} maturityDate 
 * @param {Date|string} issueDate 
 * @param {number} couponRate 
 * @param {number} faceValue 
 * @returns {number} Solved YTM (decimal)
 */
export function solveYTMFromCleanPrice(
  cleanPriceTarget,
  settlementDate,
  maturityDate,
  issueDate,
  couponRate,
  faceValue = 100
) {
  const accrued = calculateAccruedInterest(settlementDate, maturityDate, issueDate, couponRate, faceValue);
  const dirtyPriceTarget = cleanPriceTarget + accrued;
  const cashFlows = generateCashFlowSchedule(settlementDate, maturityDate, issueDate, couponRate, faceValue);

  if (cashFlows.length === 0) return 0;

  // Yield bounds for binary search
  let low = -0.20; // -20%
  let high = 2.0;  // 200%
  let mid = 0;
  let precision = 1e-8;
  let maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    mid = (low + high) / 2;
    const dirtyPriceEstimated = calculateDirtyPriceFromYield(mid, cashFlows);

    if (Math.abs(dirtyPriceEstimated - dirtyPriceTarget) < 1e-6) {
      return mid;
    }

    // Since bond prices are inversely related to yield:
    // If estimated price is HIGHER than target, we need a HIGHER yield to bring it down.
    if (dirtyPriceEstimated > dirtyPriceTarget) {
      low = mid;
    } else {
      high = mid;
    }

    if (high - low < precision) {
      break;
    }
  }

  return mid;
}

/**
 * Calculates Duration (Macaulay and Modified), Convexity, and DV01.
 * @param {number} ytm - solved YTM (decimal)
 * @param {Date|string} settlementDate 
 * @param {Date|string} maturityDate 
 * @param {Date|string} issueDate 
 * @param {number} couponRate 
 * @param {number} faceValue 
 * @returns {object} Analytics metrics
 */
export function calculateRiskMetrics(
  ytm,
  settlementDate,
  maturityDate,
  issueDate,
  couponRate,
  faceValue = 100
) {
  const cashFlows = generateCashFlowSchedule(settlementDate, maturityDate, issueDate, couponRate, faceValue);
  const dirtyPrice = calculateDirtyPriceFromYield(ytm, cashFlows);

  if (cashFlows.length === 0 || dirtyPrice === 0) {
    return {
      macaulayDuration: 0,
      modifiedDuration: 0,
      convexity: 0,
      dv01: 0,
      dirtyPrice: 0,
      accruedInterest: 0
    };
  }

  const accruedInterest = calculateAccruedInterest(settlementDate, maturityDate, issueDate, couponRate, faceValue);

  let weightedTimeSum = 0;
  let convexitySum = 0;

  for (const cf of cashFlows) {
    const pv = cf.amount / Math.pow(1 + ytm / 2, 2 * cf.timeTo);
    
    // Macaulay Duration numerator: sum( t * PV(CF_t) )
    weightedTimeSum += cf.timeTo * pv;

    // Convexity numerator: sum( t * (t + 0.5) * PV(CF_t) / (1 + y/2)^2 )
    // Expressing second derivative of price w.r.t yield
    convexitySum += (cf.timeTo * (cf.timeTo + 0.5) * pv) / Math.pow(1 + ytm / 2, 2);
  }

  const macaulayDuration = weightedTimeSum / dirtyPrice;
  const modifiedDuration = macaulayDuration / (1 + ytm / 2);
  const convexity = convexitySum / dirtyPrice;
  
  // DV01 = Modified Duration * Dirty Price * 0.0001
  const dv01 = modifiedDuration * dirtyPrice * 0.0001;

  return {
    macaulayDuration,
    modifiedDuration,
    convexity,
    dv01,
    dirtyPrice,
    accruedInterest,
    cleanPrice: dirtyPrice - accruedInterest
  };
}

/**
 * Solves Clean Price given YTM.
 * @param {number} ytmTarget - target yield (decimal)
 * @param {Date|string} settlementDate 
 * @param {Date|string} maturityDate 
 * @param {Date|string} issueDate 
 * @param {number} couponRate 
 * @param {number} faceValue 
 * @returns {number} Clean Price
 */
export function calculateCleanPriceFromYield(
  ytmTarget,
  settlementDate,
  maturityDate,
  issueDate,
  couponRate,
  faceValue = 100
) {
  const cashFlows = generateCashFlowSchedule(settlementDate, maturityDate, issueDate, couponRate, faceValue);
  const dirtyPrice = calculateDirtyPriceFromYield(ytmTarget, cashFlows);
  const accrued = calculateAccruedInterest(settlementDate, maturityDate, issueDate, couponRate, faceValue);
  return Math.max(0, dirtyPrice - accrued);
}
