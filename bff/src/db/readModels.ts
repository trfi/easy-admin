import type { ObjectId } from 'mongodb'

// ── Collections in the shared easyquiz DB the dashboard reads ──
// Names are Mongoose's DEFAULT pluralization of each model — verified against
// both repos' *.model.ts. The AI-config collections are owned + served by Hepi
// (60s runtime cache), so the BFF reaches them via Hepi's /ai-models API rather
// than reading Mongo directly — see modules/ai/ai.service.ts.
export const COLLECTIONS = {
  users: 'users',
  paymentHistory: 'paymenthistories',
  pointTransaction: 'pointtransactions',
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
  createdAt: Date
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
    createdAt: doc.createdAt,
    type: doc.type,
    reason: doc.reason,
    status: doc.status,
    paymentGateway: doc.paymentGateway,
    paymentName: doc.paymentName,
    voucherCode: doc.voucherCode,
  }
}
