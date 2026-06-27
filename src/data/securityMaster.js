/**
 * Security Master & Market Data
 * Automatically parsed from the official list of G-Secs outstanding.
 * Calibrated with exact actual Clean Prices from the CCIL MTM sheet of June 25, 2026.
 */

import { solveYTMFromCleanPrice, calculateCleanPriceFromYield, formatDate } from '../utils/analyticsEngine.js';

export const BASELINE_SETTLEMENT_DATE = '2026-06-25';

export const staticBondsList = [
  {
    isin: 'IN0020120039',
    name: '8.33% GS 2026',
    coupon: 0.0833,
    issueDate: '2012-07-09',
    maturityDate: '2026-07-09',
    outstandingAmount: 31058.318,
    baselineCleanPrice: 100.080000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020160035',
    name: '6.97% GS 2026',
    coupon: 0.0697,
    issueDate: '2016-09-06',
    maturityDate: '2026-09-06',
    outstandingAmount: 47969.764,
    baselineCleanPrice: 100.282500,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020010081',
    name: '10.18% GS 2026',
    coupon: 0.1018,
    issueDate: '2001-09-11',
    maturityDate: '2026-09-11',
    outstandingAmount: 15000.0,
    baselineCleanPrice: 100.930276,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230119',
    name: '7.33% GS 2026',
    coupon: 0.0733,
    issueDate: '2023-10-30',
    maturityDate: '2026-10-30',
    outstandingAmount: 45784.792,
    baselineCleanPrice: 100.583855,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020210186',
    name: '5.74% GS 2026',
    coupon: 0.0574,
    issueDate: '2021-11-15',
    maturityDate: '2026-11-15',
    outstandingAmount: 46694.583,
    baselineCleanPrice: 100.070331,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020140060',
    name: '8.15% GS 2026',
    coupon: 0.0815,
    issueDate: '2014-11-24',
    maturityDate: '2026-11-24',
    outstandingAmount: 32978.88,
    baselineCleanPrice: 101.040000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020060078',
    name: '8.24% GS 2027',
    coupon: 0.0824,
    issueDate: '2007-02-15',
    maturityDate: '2027-02-15',
    outstandingAmount: 60494.474,
    baselineCleanPrice: 101.573671,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020170026',
    name: '6.79% GS 2027',
    coupon: 0.0679,
    issueDate: '2017-05-15',
    maturityDate: '2027-05-15',
    outstandingAmount: 105908.561,
    baselineCleanPrice: 100.941474,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240043',
    name: '7.02% GS 2027',
    coupon: 0.0702,
    issueDate: '2024-05-27',
    maturityDate: '2027-05-27',
    outstandingAmount: 38000.0,
    baselineCleanPrice: 101.178324,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020220037',
    name: '7.38% GS 2027',
    coupon: 0.0738,
    issueDate: '2022-06-20',
    maturityDate: '2027-06-20',
    outstandingAmount: 109905.0,
    baselineCleanPrice: 101.313025,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020070036',
    name: '8.26% GS 2027',
    coupon: 0.08259999999999999,
    issueDate: '2007-08-02',
    maturityDate: '2027-08-02',
    outstandingAmount: 86382.287,
    baselineCleanPrice: 102.489123,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020070069',
    name: '8.28% GS 2027',
    coupon: 0.0828,
    issueDate: '2007-09-21',
    maturityDate: '2027-09-21',
    outstandingAmount: 84680.104,
    baselineCleanPrice: 102.745647,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240167',
    name: '6.64% GS 2027',
    coupon: 0.0664,
    issueDate: '2024-12-09',
    maturityDate: '2027-12-09',
    outstandingAmount: 38616.264,
    baselineCleanPrice: 100.907710,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020170174',
    name: '7.17% GS 2028',
    coupon: 0.0717,
    issueDate: '2018-01-08',
    maturityDate: '2028-01-08',
    outstandingAmount: 103337.934,
    baselineCleanPrice: 101.770000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020020247',
    name: '6.01% GS 2028 (C Align)',
    coupon: 0.0601,
    issueDate: '2003-08-08',
    maturityDate: '2028-03-25',
    outstandingAmount: 15000.0,
    baselineCleanPrice: 99.987063,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230010',
    name: '7.06% GS 2028',
    coupon: 0.0706,
    issueDate: '2023-04-10',
    maturityDate: '2028-04-10',
    outstandingAmount: 92183.0,
    baselineCleanPrice: 101.830000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020140011',
    name: '8.60% GS 2028',
    coupon: 0.086,
    issueDate: '2014-06-02',
    maturityDate: '2028-06-02',
    outstandingAmount: 88399.707,
    baselineCleanPrice: 104.579805,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020030022',
    name: '6.13% GS 2028',
    coupon: 0.0613,
    issueDate: '2003-06-04',
    maturityDate: '2028-06-04',
    outstandingAmount: 10990.0,
    baselineCleanPrice: 100.142800,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250034',
    name: '5.91% GS 2028',
    coupon: 0.0591,
    issueDate: '2025-06-30',
    maturityDate: '2028-06-30',
    outstandingAmount: 51000.0,
    baselineCleanPrice: 99.704651,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230101',
    name: '7.37% GS 2028',
    coupon: 0.0737,
    issueDate: '2023-10-23',
    maturityDate: '2028-10-23',
    outstandingAmount: 55609.704,
    baselineCleanPrice: 102.591097,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020180454',
    name: '7.26% GS 2029',
    coupon: 0.0726,
    issueDate: '2019-01-14',
    maturityDate: '2029-01-14',
    outstandingAmount: 119708.881,
    baselineCleanPrice: 102.505562,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250125',
    name: '6.03% GS 2029',
    coupon: 0.0603,
    issueDate: '2026-01-27',
    maturityDate: '2029-01-27',
    outstandingAmount: 51000.0,
    baselineCleanPrice: 99.342094,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020150069',
    name: '7.59% GS 2029',
    coupon: 0.0759,
    issueDate: '2015-10-19',
    maturityDate: '2029-03-20',
    outstandingAmount: 103445.434,
    baselineCleanPrice: 103.465631,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020220011',
    name: '7.10% GS 2029',
    coupon: 0.071,
    issueDate: '2022-04-18',
    maturityDate: '2029-04-18',
    outstandingAmount: 151867.832,
    baselineCleanPrice: 102.236201,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240050',
    name: '7.04% GS 2029',
    coupon: 0.0704,
    issueDate: '2024-06-03',
    maturityDate: '2029-06-03',
    outstandingAmount: 87068.875,
    baselineCleanPrice: 102.100092,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020190362',
    name: '6.45% GS 2029',
    coupon: 0.0645,
    issueDate: '2019-10-07',
    maturityDate: '2029-10-07',
    outstandingAmount: 114840.157,
    baselineCleanPrice: 100.595684,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240183',
    name: '6.75% GS 2029',
    coupon: 0.0675,
    issueDate: '2024-12-23',
    maturityDate: '2029-12-23',
    outstandingAmount: 87000.0,
    baselineCleanPrice: 101.520042,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020160118',
    name: '6.79% GS 2029',
    coupon: 0.0679,
    issueDate: '2016-12-26',
    maturityDate: '2029-12-26',
    outstandingAmount: 119829.66,
    baselineCleanPrice: 101.500000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020150028',
    name: '7.88% GS 2030',
    coupon: 0.0788,
    issueDate: '2015-05-11',
    maturityDate: '2030-03-19',
    outstandingAmount: 119660.442,
    baselineCleanPrice: 105.148619,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230036',
    name: '7.17% GS 2030',
    coupon: 0.0717,
    issueDate: '2023-04-17',
    maturityDate: '2030-04-17',
    outstandingAmount: 103000.0,
    baselineCleanPrice: 102.817484,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020160019',
    name: '7.61% GS 2030',
    coupon: 0.0761,
    issueDate: '2016-05-09',
    maturityDate: '2030-05-09',
    outstandingAmount: 100989.438,
    baselineCleanPrice: 104.035600,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200070',
    name: '5.79% GS 2030',
    coupon: 0.0579,
    issueDate: '2020-05-11',
    maturityDate: '2030-05-11',
    outstandingAmount: 111618.586,
    baselineCleanPrice: 98.139241,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250067',
    name: '6.01% GS 2030',
    coupon: 0.0601,
    issueDate: '2025-07-21',
    maturityDate: '2030-07-21',
    outstandingAmount: 117000.0,
    baselineCleanPrice: 98.815000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200153',
    name: '5.77% GS 2030',
    coupon: 0.057699999999999994,
    issueDate: '2020-08-03',
    maturityDate: '2030-08-03',
    outstandingAmount: 123000.0,
    baselineCleanPrice: 97.860200,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020130053',
    name: '9.20% GS 2030',
    coupon: 0.092,
    issueDate: '2013-09-30',
    maturityDate: '2030-09-30',
    outstandingAmount: 65560.488,
    baselineCleanPrice: 110.359900,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230135',
    name: '7.32% GS 2030',
    coupon: 0.0732,
    issueDate: '2023-11-13',
    maturityDate: '2030-11-13',
    outstandingAmount: 70000.0,
    baselineCleanPrice: 103.450000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200294',
    name: '5.85% GS 2030',
    coupon: 0.058499999999999996,
    issueDate: '2020-12-01',
    maturityDate: '2030-12-01',
    outstandingAmount: 120831.686,
    baselineCleanPrice: 97.950000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020110055',
    name: '8.97% GS 2030',
    coupon: 0.0897,
    issueDate: '2011-12-05',
    maturityDate: '2030-12-05',
    outstandingAmount: 93709.824,
    baselineCleanPrice: 109.766498,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250141',
    name: '6.36% GS 2031',
    coupon: 0.0636,
    issueDate: '2026-02-16',
    maturityDate: '2031-02-16',
    outstandingAmount: 81000.0,
    baselineCleanPrice: 99.725000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240076',
    name: '7.02% GS 2031',
    coupon: 0.0702,
    issueDate: '2024-06-18',
    maturityDate: '2031-06-18',
    outstandingAmount: 64000.0,
    baselineCleanPrice: 102.400000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020210095',
    name: '6.10% GS 2031',
    coupon: 0.061,
    issueDate: '2021-07-12',
    maturityDate: '2031-07-12',
    outstandingAmount: 152365.96,
    baselineCleanPrice: 98.390000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020170042',
    name: '6.68% GS 2031',
    coupon: 0.0668,
    issueDate: '2017-09-04',
    maturityDate: '2031-09-17',
    outstandingAmount: 118723.231,
    baselineCleanPrice: 100.740000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240191',
    name: '6.79% GS 2031',
    coupon: 0.0679,
    issueDate: '2024-12-30',
    maturityDate: '2031-12-30',
    outstandingAmount: 63000.0,
    baselineCleanPrice: 101.051405,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020210244',
    name: '6.54% GS 2032',
    coupon: 0.0654,
    issueDate: '2022-01-17',
    maturityDate: '2032-01-17',
    outstandingAmount: 156000.0,
    baselineCleanPrice: 99.870000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020060086',
    name: '8.28% GS 2032',
    coupon: 0.0828,
    issueDate: '2007-02-15',
    maturityDate: '2032-02-15',
    outstandingAmount: 131247.302,
    baselineCleanPrice: 108.104224,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250059',
    name: '6.28% GS 2032',
    coupon: 0.06280000000000001,
    issueDate: '2025-07-14',
    maturityDate: '2032-07-14',
    outstandingAmount: 55000.0,
    baselineCleanPrice: 98.442413,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020070044',
    name: '8.32% GS 2032',
    coupon: 0.0832,
    issueDate: '2007-08-02',
    maturityDate: '2032-08-02',
    outstandingAmount: 121874.181,
    baselineCleanPrice: 108.570630,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020220060',
    name: '7.26% GS 2032',
    coupon: 0.0726,
    issueDate: '2022-08-22',
    maturityDate: '2032-08-22',
    outstandingAmount: 148000.0,
    baselineCleanPrice: 103.265280,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020020106',
    name: '7.95% GS 2032',
    coupon: 0.0795,
    issueDate: '2002-08-28',
    maturityDate: '2032-08-28',
    outstandingAmount: 149380.295,
    baselineCleanPrice: 106.622500,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020070077',
    name: '8.33% GS 2032',
    coupon: 0.0833,
    issueDate: '2007-09-21',
    maturityDate: '2032-09-21',
    outstandingAmount: 1522.48,
    baselineCleanPrice: 108.697170,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250133',
    name: '6.68% GS 2033',
    coupon: 0.0668,
    issueDate: '2026-01-27',
    maturityDate: '2033-01-27',
    outstandingAmount: 55000.0,
    baselineCleanPrice: 100.240000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020220151',
    name: '7.26% GS 2033',
    coupon: 0.0726,
    issueDate: '2023-02-06',
    maturityDate: '2033-02-06',
    outstandingAmount: 150000.0,
    baselineCleanPrice: 103.100000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020190065',
    name: '7.57% GS 2033',
    coupon: 0.0757,
    issueDate: '2019-05-20',
    maturityDate: '2033-06-17',
    outstandingAmount: 147588.967,
    baselineCleanPrice: 104.877935,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230085',
    name: '7.18% GS 2033',
    coupon: 0.0718,
    issueDate: '2023-08-14',
    maturityDate: '2033-08-14',
    outstandingAmount: 201000.0,
    baselineCleanPrice: 102.690000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020140052',
    name: '8.24% GS 2033',
    coupon: 0.0824,
    issueDate: '2014-11-10',
    maturityDate: '2033-11-10',
    outstandingAmount: 117494.032,
    baselineCleanPrice: 109.205548,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020160100',
    name: '6.57% GS 2033',
    coupon: 0.06570000000000001,
    issueDate: '2016-12-05',
    maturityDate: '2033-12-05',
    outstandingAmount: 156240.132,
    baselineCleanPrice: 99.472446,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240019',
    name: '7.10% GS 2034',
    coupon: 0.071,
    issueDate: '2024-04-08',
    maturityDate: '2034-04-08',
    outstandingAmount: 180000.0,
    baselineCleanPrice: 102.100000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020040039',
    name: '7.50% GS 2034',
    coupon: 0.075,
    issueDate: '2004-08-10',
    maturityDate: '2034-08-10',
    outstandingAmount: 124055.37,
    baselineCleanPrice: 104.864084,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200096',
    name: '6.19% GS 2034',
    coupon: 0.061900000000000004,
    issueDate: '2020-06-01',
    maturityDate: '2034-09-16',
    outstandingAmount: 149372.304,
    baselineCleanPrice: 97.007710,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240126',
    name: '6.79% GS 2034',
    coupon: 0.0679,
    issueDate: '2024-10-07',
    maturityDate: '2034-10-07',
    outstandingAmount: 184000.0,
    baselineCleanPrice: 100.370000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020150051',
    name: '7.73% GS 2034',
    coupon: 0.07730000000000001,
    issueDate: '2015-10-12',
    maturityDate: '2034-12-19',
    outstandingAmount: 112547.408,
    baselineCleanPrice: 106.322778,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200245',
    name: '6.22% GS 2035',
    coupon: 0.0622,
    issueDate: '2020-11-02',
    maturityDate: '2035-03-16',
    outstandingAmount: 130714.701,
    baselineCleanPrice: 96.100000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250026',
    name: '6.33% GS 2035',
    coupon: 0.0633,
    issueDate: '2025-05-05',
    maturityDate: '2035-05-05',
    outstandingAmount: 183373.827,
    baselineCleanPrice: 97.230000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020210020',
    name: '6.64% GS 2035',
    coupon: 0.0664,
    issueDate: '2021-04-12',
    maturityDate: '2035-06-16',
    outstandingAmount: 169334.776,
    baselineCleanPrice: 98.800000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020050012',
    name: '7.40% GS 2035',
    coupon: 0.07400000000000001,
    issueDate: '2005-09-09',
    maturityDate: '2035-09-09',
    outstandingAmount: 154196.058,
    baselineCleanPrice: 104.621442,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250091',
    name: '6.48% GS 2035',
    coupon: 0.06480000000000001,
    issueDate: '2025-10-06',
    maturityDate: '2035-10-06',
    outstandingAmount: 226000.0,
    baselineCleanPrice: 97.850000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020210152',
    name: '6.67% GS 2035',
    coupon: 0.0667,
    issueDate: '2021-09-13',
    maturityDate: '2035-12-15',
    outstandingAmount: 170922.88,
    baselineCleanPrice: 98.962500,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020260025',
    name: '6.94% GS 2036',
    coupon: 0.0694,
    issueDate: '2026-05-11',
    maturityDate: '2036-05-11',
    outstandingAmount: 68000.0,
    baselineCleanPrice: 101.205000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020220029',
    name: '7.54% GS 2036',
    coupon: 0.0754,
    issueDate: '2022-05-23',
    maturityDate: '2036-05-23',
    outstandingAmount: 153904.049,
    baselineCleanPrice: 105.130000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020060045',
    name: '8.33% GS 2036',
    coupon: 0.0833,
    issueDate: '2006-06-07',
    maturityDate: '2036-06-07',
    outstandingAmount: 125531.37,
    baselineCleanPrice: 110.605485,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020220102',
    name: '7.41% GS 2036',
    coupon: 0.0741,
    issueDate: '2022-12-19',
    maturityDate: '2036-12-19',
    outstandingAmount: 165026.404,
    baselineCleanPrice: 104.200000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230077',
    name: '7.18% GS 2037',
    coupon: 0.0718,
    issueDate: '2023-07-24',
    maturityDate: '2037-07-24',
    outstandingAmount: 172000.0,
    baselineCleanPrice: 102.450000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020080050',
    name: '6.83% GS 2039',
    coupon: 0.0683,
    issueDate: '2009-01-19',
    maturityDate: '2039-01-19',
    outstandingAmount: 18644.627,
    baselineCleanPrice: 98.260000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240027',
    name: '7.23% GS 2039',
    coupon: 0.0723,
    issueDate: '2024-04-15',
    maturityDate: '2039-04-15',
    outstandingAmount: 117000.0,
    baselineCleanPrice: 102.260000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020190024',
    name: '7.62% GS 2039',
    coupon: 0.0762,
    issueDate: '2019-04-08',
    maturityDate: '2039-09-15',
    outstandingAmount: 60557.142,
    baselineCleanPrice: 105.600000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240134',
    name: '6.92% GS 2039',
    coupon: 0.0692,
    issueDate: '2024-11-18',
    maturityDate: '2039-11-18',
    outstandingAmount: 129703.868,
    baselineCleanPrice: 100.176735,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020100031',
    name: '8.30% GS 2040',
    coupon: 0.083,
    issueDate: '2010-07-02',
    maturityDate: '2040-07-02',
    outstandingAmount: 162451.833,
    baselineCleanPrice: 111.893824,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250042',
    name: '6.68% GS 2040',
    coupon: 0.0668,
    issueDate: '2025-07-07',
    maturityDate: '2040-07-07',
    outstandingAmount: 211000.0,
    baselineCleanPrice: 96.930000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020110063',
    name: '8.83% GS 2041',
    coupon: 0.0883,
    issueDate: '2011-12-12',
    maturityDate: '2041-12-12',
    outstandingAmount: 91771.394,
    baselineCleanPrice: 115.395300,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020120062',
    name: '8.30% GS 2042',
    coupon: 0.083,
    issueDate: '2012-12-31',
    maturityDate: '2042-12-31',
    outstandingAmount: 105699.938,
    baselineCleanPrice: 110.452500,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020190040',
    name: '7.69% GS 2043',
    coupon: 0.07690000000000001,
    issueDate: '2019-04-30',
    maturityDate: '2043-06-17',
    outstandingAmount: 38920.288,
    baselineCleanPrice: 104.432294,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020130079',
    name: '9.23% GS 2043',
    coupon: 0.09230000000000001,
    issueDate: '2013-12-23',
    maturityDate: '2043-12-23',
    outstandingAmount: 79472.28,
    baselineCleanPrice: 119.740264,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020140078',
    name: '8.17% GS 2044',
    coupon: 0.0817,
    issueDate: '2014-12-01',
    maturityDate: '2044-12-01',
    outstandingAmount: 98958.741,
    baselineCleanPrice: 109.094969,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020150044',
    name: '8.13% GS 2045',
    coupon: 0.08130000000000001,
    issueDate: '2015-06-22',
    maturityDate: '2045-06-22',
    outstandingAmount: 98000.0,
    baselineCleanPrice: 108.674916,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020160068',
    name: '7.06% GS 2046',
    coupon: 0.0706,
    issueDate: '2016-10-10',
    maturityDate: '2046-10-10',
    outstandingAmount: 105500.126,
    baselineCleanPrice: 97.435502,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020190032',
    name: '7.72% GS 2049',
    coupon: 0.07719999999999999,
    issueDate: '2019-04-15',
    maturityDate: '2049-06-15',
    outstandingAmount: 84540.305,
    baselineCleanPrice: 104.173290,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200054',
    name: '7.16% GS 2050',
    coupon: 0.0716,
    issueDate: '2020-04-20',
    maturityDate: '2050-09-20',
    outstandingAmount: 102695.807,
    baselineCleanPrice: 97.637408,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200252',
    name: '6.67% GS 2050',
    coupon: 0.0667,
    issueDate: '2020-11-02',
    maturityDate: '2050-12-17',
    outstandingAmount: 149162.33,
    baselineCleanPrice: 92.400000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020160092',
    name: '6.62% GS 2051',
    coupon: 0.0662,
    issueDate: '2016-11-28',
    maturityDate: '2051-11-28',
    outstandingAmount: 62696.876,
    baselineCleanPrice: 91.130948,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020210194',
    name: '6.99% GS 2051',
    coupon: 0.0699,
    issueDate: '2021-11-15',
    maturityDate: '2051-12-15',
    outstandingAmount: 148358.609,
    baselineCleanPrice: 95.545000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020220086',
    name: '7.36% GS 2052',
    coupon: 0.0736,
    issueDate: '2022-09-12',
    maturityDate: '2052-09-12',
    outstandingAmount: 161966.574,
    baselineCleanPrice: 100.000000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230051',
    name: '7.30% GS 2053',
    coupon: 0.073,
    issueDate: '2023-06-19',
    maturityDate: '2053-06-19',
    outstandingAmount: 195000.0,
    baselineCleanPrice: 99.181600,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240118',
    name: '7.09% GS 2054',
    coupon: 0.0709,
    issueDate: '2024-08-05',
    maturityDate: '2054-08-05',
    outstandingAmount: 148000.0,
    baselineCleanPrice: 96.550000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250075',
    name: '7.24% GS 2055',
    coupon: 0.0724,
    issueDate: '2025-08-18',
    maturityDate: '2055-08-18',
    outstandingAmount: 98000.0,
    baselineCleanPrice: 98.740000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020150077',
    name: '7.72% GS 2055',
    coupon: 0.07719999999999999,
    issueDate: '2015-10-26',
    maturityDate: '2055-10-26',
    outstandingAmount: 100969.242,
    baselineCleanPrice: 103.544320,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020190057',
    name: '7.63% GS 2059',
    coupon: 0.07629999999999999,
    issueDate: '2019-05-06',
    maturityDate: '2059-06-17',
    outstandingAmount: 83461.952,
    baselineCleanPrice: 102.195120,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200039',
    name: '7.19% GS 2060',
    coupon: 0.0719,
    issueDate: '2020-04-13',
    maturityDate: '2060-09-15',
    outstandingAmount: 98391.667,
    baselineCleanPrice: 96.622359,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200187',
    name: '6.80% GS 2060',
    coupon: 0.068,
    issueDate: '2020-08-31',
    maturityDate: '2060-12-15',
    outstandingAmount: 105856.194,
    baselineCleanPrice: 91.736581,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020200401',
    name: '6.76% GS 2061',
    coupon: 0.0676,
    issueDate: '2021-02-22',
    maturityDate: '2061-02-22',
    outstandingAmount: 149021.969,
    baselineCleanPrice: 91.196139,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020210202',
    name: '6.95% GS 2061',
    coupon: 0.0695,
    issueDate: '2021-11-22',
    maturityDate: '2061-12-16',
    outstandingAmount: 157283.499,
    baselineCleanPrice: 93.510874,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020220094',
    name: '7.40% GS 2062',
    coupon: 0.07400000000000001,
    issueDate: '2022-09-19',
    maturityDate: '2062-09-19',
    outstandingAmount: 161828.492,
    baselineCleanPrice: 99.102725,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230044',
    name: '7.25% GS 2063',
    coupon: 0.0725,
    issueDate: '2023-06-12',
    maturityDate: '2063-06-12',
    outstandingAmount: 240000.0,
    baselineCleanPrice: 96.472500,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240035',
    name: '7.34% GS 2064',
    coupon: 0.07339999999999999,
    issueDate: '2024-04-22',
    maturityDate: '2064-04-22',
    outstandingAmount: 241038.322,
    baselineCleanPrice: 98.490000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250018',
    name: '6.90% GS 2065',
    coupon: 0.069,
    issueDate: '2025-04-15',
    maturityDate: '2065-04-15',
    outstandingAmount: 198000.0,
    baselineCleanPrice: 92.750000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020260033',
    name: '7.71% GS 2066',
    coupon: 0.0771,
    issueDate: '2026-05-18',
    maturityDate: '2066-05-18',
    outstandingAmount: 22000.0,
    baselineCleanPrice: 103.850000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020230127',
    name: '7.46% GS 2073',
    coupon: 0.0746,
    issueDate: '2023-11-06',
    maturityDate: '2073-11-06',
    outstandingAmount: 117000.0,
    baselineCleanPrice: 99.212500,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020240142',
    name: '7.09% GS 2074',
    coupon: 0.0709,
    issueDate: '2024-11-25',
    maturityDate: '2074-11-25',
    outstandingAmount: 170000.0,
    baselineCleanPrice: 94.605000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
  {
    isin: 'IN0020250117',
    name: '7.43% GS 2076',
    coupon: 0.07429999999999999,
    issueDate: '2026-01-19',
    maturityDate: '2076-01-19',
    outstandingAmount: 61000.0,
    baselineCleanPrice: 99.050000,
    description: 'Central Government Dated Security (Fixed Rate)'
  },
];

/**
 * Generate 30 days of historical yields and clean prices for a specific bond.
 * Simulates a random walk in yields and prices them correctly based on date.
 * @param {object} bond - bond static object
 * @returns {object[]} Array of { date, cleanPrice, ytm }
 */
export function generateHistoricalData(bond) {
  const history = [];
  const startDay = new Date(BASELINE_SETTLEMENT_DATE);
  
  const baseYTM = solveYTMFromCleanPrice(
    bond.baselineCleanPrice,
    BASELINE_SETTLEMENT_DATE,
    bond.maturityDate,
    bond.issueDate,
    bond.coupon
  );

  let seed = 0;
  for (let i = 0; i < bond.isin.length; i++) {
    seed += bond.isin.charCodeAt(i);
  }
  
  function pseudoRandom() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  let currentYTM = baseYTM;
  
  for (let day = 0; day < 30; day++) {
    const date = new Date(startDay);
    const calendarDaysAgo = Math.floor(day * 7 / 5);
    date.setDate(startDay.getDate() - calendarDaysAgo);

    if (date.getDay() === 0) {
      date.setDate(date.getDate() - 2);
    } else if (date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    }

    const dateStr = formatDate(date);
    const yChange = (pseudoRandom() - 0.48) * 0.0008; 
    currentYTM = currentYTM - yChange;

    let cleanPrice = calculateCleanPriceFromYield(
      currentYTM,
      dateStr,
      bond.maturityDate,
      bond.issueDate,
      bond.coupon
    );

    cleanPrice = Math.max(50, Math.min(150, cleanPrice));

    history.push({
      date: dateStr,
      cleanPrice: parseFloat(cleanPrice.toFixed(4)),
      ytm: parseFloat(currentYTM.toFixed(6))
    });
  }

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  return history;
}

export const bondsData = staticBondsList.map(bond => {
  const history = generateHistoricalData(bond);
  const currentData = history[history.length - 1];

  return {
    ...bond,
    currentCleanPrice: currentData.cleanPrice,
    currentYTM: currentData.ytm,
    history
  };
});
