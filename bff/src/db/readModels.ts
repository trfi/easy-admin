import type { ObjectId } from 'mongodb'

// ── Collections in the shared easyquiz DB the dashboard reads ──
// Names are Mongoose's DEFAULT pluralization of each model — none of the
// source schemas set an explicit `collection:`, so e.g. model 'AiProviderConfig'
// → collection 'aiproviderconfigs'. Verified against both repos' *.model.ts.
export const COLLECTIONS = {
  users: 'users',
  paymentHistory: 'paymenthistories',
  pointTransaction: 'pointtransactions',
  aiProviderConfig: 'aiproviderconfigs',
  aiModelComboConfig: 'aimodelcomboconfigs',
  aiProviderStatus: 'aiprovidermodelstatuses',
} as const

// ── Superset user view (unions fields EasyQuiz + Hepi write to the same docs) ──
// Hand-reconciled against Hepi user.model.ts and EasyQuiz auth user model.
// R2: verify against a sampled real doc via scripts/sample-docs.ts before trusting.
export interface UserPlanView {
  name: string
  startDate?: Date
  endDate?: Date
  isReward?: boolean
  isTrial?: boolean
  isLifetime?: boolean
  packageDuration?: string
}

export interface UserPointsView {
  recurring: number
  permanent: number
  total: number
  updatedAt?: Date
  lastRenew?: Date
}

export interface AdminUserView {
  _id: string
  name?: string
  email: string
  username?: string
  role: 'Admin' | 'User'
  avatar?: string | null
  plan?: UserPlanView
  points: UserPointsView
  subscriptionPackage?: string
  isBlacklisted?: boolean
  trialActivatedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Raw doc shape as stored (Mongo). Mapped to AdminUserView at the boundary.
export interface UserDoc {
  _id: ObjectId
  name?: string
  email: string
  username?: string
  role?: 'Admin' | 'User'
  avatar?: string | null
  plan?: UserPlanView
  points?: Partial<UserPointsView>
  subscriptionPackage?: string
  isBlacklisted?: boolean
  trialActivatedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export function toAdminUserView(doc: UserDoc): AdminUserView {
  const recurring = doc.points?.recurring ?? 0
  const permanent = doc.points?.permanent ?? 0
  return {
    _id: doc._id.toHexString(),
    name: doc.name,
    email: doc.email,
    username: doc.username,
    role: doc.role ?? 'User',
    avatar: doc.avatar ?? null,
    plan: doc.plan,
    points: {
      recurring,
      permanent,
      total: doc.points?.total ?? recurring + permanent,
      updatedAt: doc.points?.updatedAt,
      lastRenew: doc.points?.lastRenew,
    },
    subscriptionPackage: doc.subscriptionPackage,
    isBlacklisted: doc.isBlacklisted,
    trialActivatedAt: doc.trialActivatedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

// ── Payment history (revenue source of truth — no TTL) ──
export type Currency = 'VND' | 'USD'

export interface PaymentDoc {
  _id: ObjectId
  user: ObjectId
  amount: number
  points?: number
  currency: Currency
  date: Date
  type: 'Deposit' | 'Withdraw'
  reason: 'Subscription' | 'Top-up'
  status: 'Pending' | 'Completed' | 'Failed'
  paymentGateway: 'Bank' | 'Wallet' | 'Card'
  paymentName: string
  voucherCode?: string
  createdAt: Date
  updatedAt: Date
}

export interface PaymentView {
  _id: string
  userId: string
  amount: number
  currency: Currency
  date: Date
  type: 'Deposit' | 'Withdraw'
  reason: 'Subscription' | 'Top-up'
  status: 'Pending' | 'Completed' | 'Failed'
  paymentGateway: 'Bank' | 'Wallet' | 'Card'
  paymentName: string
  voucherCode?: string
}

export function toPaymentView(doc: PaymentDoc): PaymentView {
  return {
    _id: doc._id.toHexString(),
    userId: doc.user.toHexString(),
    amount: doc.amount,
    currency: doc.currency,
    date: doc.date,
    type: doc.type,
    reason: doc.reason,
    status: doc.status,
    paymentGateway: doc.paymentGateway,
    paymentName: doc.paymentName,
    voucherCode: doc.voucherCode,
  }
}

// ── AI provider config (apiKey MUST be stripped — see ai.service strip boundary) ──
export interface AiProviderDoc {
  _id: ObjectId
  providerId: string
  name: string
  apiKey: string
  baseURL: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AiProviderView {
  providerId: string
  name: string
  baseURL: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AiModelComboCandidate {
  providerId: string
  modelId: string
  active: boolean
}

export interface AiModelComboDoc {
  _id: ObjectId
  comboId: string
  strategy: 'fallback'
  candidates: AiModelComboCandidate[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AiProviderStatusDoc {
  _id: ObjectId
  providerId: string
  active: boolean
  failureCount: number
  lastFailureAt?: Date
  lastSuccessAt?: Date
  lastErrorCode?: string
  lastErrorMessage?: string
  disabledAt?: Date
  disabledReason?: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}
