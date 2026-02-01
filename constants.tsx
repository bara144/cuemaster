
import { Role, User, AppSettings } from './types';

export const INITIAL_ADMIN: User = {
  id: 'admin-1',
  username: 'admin',
  role: Role.ADMIN,
  permissions: ['all'],
  password: '1234',
  status: 'ACTIVE',
  hallId: 'MAIN' // The first hall is assigned to the Super Admin
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
  // Initialized marketItems with an empty array to prevent undefined errors in MarketManagement
  marketItems: []
};