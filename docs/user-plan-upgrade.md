# Admin user plan upgrades

Easy Admin upgrades subscriptions through the authenticated BFF route `POST /api/users/plan/upgrade`. The BFF validates the request and proxies it to EasyQuiz `POST /user/plan/upgrade` with `X-Admin-Secret`; it never mutates shared MongoDB collections.

The form is available from a selected user's **Upgrade plan** tab. It supports Pro for Week, Month, Quarter, Year, or Lifetime, while Premium remains limited to Month, Quarter, Year, or Lifetime. Pro Week prefills the official 20,000 VND price. Other official VND prices are also prefilled, but the amount remains editable so the ledger reflects the payment actually received. Supported manual payment records are Bank/VCB, Wallet/MoMo, and Card/Dodo.

A generated transaction reference is required and may be replaced with the real gateway transaction ID when **Track payment history** is enabled, which is the default. EasyQuiz treats an identical tracked replay as a no-op and rejects reuse with a different user, amount, method, plan, or period. Administrators may explicitly disable tracking; this omits amount, method, transaction reference, and PaymentHistory creation while still updating the plan, SubscriptionHistory, recurring points, notifications, and transaction log. Because idempotency is backed by PaymentHistory, an untracked upgrade cannot be safely replayed. The confirmation dialog intentionally states the selected behavior and shows the active plan because fulfillment may replace a different tier or stack time for the same tier.

EasyQuiz remains the owner of fulfillment through `payment.service.ts/processPayment`, including plan dates, recurring points, expiration entries, subscription and payment histories, trial transitions, notifications, and transaction logging.
