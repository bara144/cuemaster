
import { Role, User, AppSettings } from './types';

export const INITIAL_ADMIN: User = {
  id: 'admin-1',
  username: 'admin',
  role: Role.ADMIN,
  permissions: ['all'],
  password: '1234',
  status: 'ACTIVE',
  hallId: 'MAIN' 
};

export const DEFAULT_SETTINGS: AppSettings = {
  cashDiscountRate: 10,
  pricePerGame: 1000,
  language: 'en',
  theme: 'dark',
  playerNameFontSize: 20,
  wheelPrizes: ['1 Game Free', 'Free Tea', '5,000 IQD Discount', 'Try Again', 'Snack Free'],
  prizeWeights: {},
  tableCount: 3,
  protectedPlayers: [],
  reportEmail: '',
  subscriptionWarningMsg: '',
  marketItems: [],
  discountTiers: {
    4: 1000,
    7: 2000,
    9: 3000,
    11: 4000,
    15: 5000
  },
  tableGameDurations: {
    1: { min: 8, max: 12 },
    2: { min: 10, max: 15 },
    3: { min: 10, max: 15 }
  }
};
