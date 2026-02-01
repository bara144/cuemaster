
export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export type UserStatus = 'ACTIVE' | 'LOCKED';

export type Language = 'en' | 'ckb';
export type Theme = 'light' | 'dark';

export type UsageSession = {
  timestamp: number;
  expiresAt: number;
};

export type UserUsageLimits = {
  maxUsesPerMonth: number;
  sessionDurationHours: number;
  history: UsageSession[];
};

export type Notification = {
  id: string;
  text: string;
  timestamp: number;
  hallId: string;
};

export type User = {
  id: string;
  username: string;
  role: Role;
  permissions: string[];
  password: string;
  hallId?: string;
  status: UserStatus;
  subscriptionExpiresAt?: number;
  usageLimits?: UserUsageLimits;
  systemMessage?: string; // Legacy field
};

export type AttendanceRecord = {
  id: string;
  userId: string;
  username: string;
  clockIn: number;
  clockOut: number | null;
  logouts: number[]; 
  date: string;
};

export type MarketOrder = {
  name: string;
  price: number;
  quantity: number;
};

// Added MarketItem type to define items available for sale in the market
export type MarketItem = {
  id: string;
  name: string;
  price: number;
};

export type Session = {
  id: string;
  playerName: string;
  startTime: number;
  gameStartTimes: number[];
  gameTables: number[]; 
  gamesPlayed: number;
  pricePerGame: number;
  isActive: boolean;
  tableNumber: number;
  marketItems: MarketOrder[];
};

export type PaymentMethod = 'CASH' | 'CREDIT' | 'DEBT';

export type Transaction = {
  id: string;
  sessionId: string;
  playerName: string;
  amount: number;
  discount: number;
  marketTotal: number;
  totalPaid: number;
  paymentMethod: PaymentMethod;
  timestamp: number;
  gameStartTimes: number[];
  gameTables: number[]; 
  collectedBy: string;
  marketItems: MarketOrder[];
  isSettled?: boolean;
  note?: string;
};

export type PrizeProbability = 'NEVER' | 'RARE' | 'NORMAL' | 'ENHANCED' | 'FREQUENT';

export type AppSettings = {
  cashDiscountRate: number;
  pricePerGame: number;
  language: Language;
  theme: Theme;
  playerNameFontSize: number;
  wheelPrizes: string[];
  prizeWeights: Record<string, PrizeProbability>;
  tableCount: number;
  protectedPlayers: string[]; 
  reportEmail?: string;
  // added subscriptionWarningMsg property to fix error on App.tsx:323
  subscriptionWarningMsg?: string;
  // Added marketItems list to hold global market inventory definitions
  marketItems: MarketItem[];
};