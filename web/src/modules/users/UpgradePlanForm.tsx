import { useState } from 'react'
import { Crown, Loader2, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/apiClient'
import type { AdminUserView } from './users.api'
import { useUpgradePlan } from './users.api'
import { generateAdminReference, PAYMENT_METHODS, periodsForPlan, priceFor, UPGRADE_PLANS, VND_PRICES, type PaymentMethod, type UpgradePeriod, type UpgradePlan } from './upgrade.constants'

export function UpgradePlanForm({ user }: { user: AdminUserView }) {
  const [plan, setPlan] = useState<UpgradePlan>('Pro')
  const [period, setPeriod] = useState<UpgradePeriod>('Month')
  const [amount, setAmount] = useState(VND_PRICES.Pro.Month)
  const [method, setMethod] = useState<PaymentMethod>('VCB')
  const [reference, setReference] = useState(generateAdminReference)
  const [trackPaymentHistory, setTrackPaymentHistory] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const mutation = useUpgradePlan()

  function selectPlan(value: UpgradePlan) {
    const nextPeriod = value === 'Premium' && period === 'Week' ? 'Month' : period
    setPlan(value)
    setPeriod(nextPeriod)
    setAmount(priceFor(value, nextPeriod))
  }
  function selectPeriod(value: UpgradePeriod) {
    setPeriod(value)
    setAmount(priceFor(plan, value))
  }
  async function submit() {
    try {
      await mutation.mutateAsync({
        userId: user._id,
        identifier: user._id,
        plan,
        packageName: period,
        trackPaymentHistory,
        ...(trackPaymentHistory
          ? { amount, paymentMethod: method, transactionReference: reference.trim() }
          : {})
      })
      toast.success(`${plan} ${period} activated for ${user.email}`)
      setReference(generateAdminReference())
      setConfirming(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Unable to upgrade plan')
    }
  }

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-xl border bg-background/10 p-5">
        <div className="flex items-start gap-3"><div className="rounded-lg bg-amber-500/15 p-2 text-amber-600"><Crown className="h-5 w-5" /></div><div><p className="font-semibold">Current plan: {user.plan?.name ?? 'None'}</p><p className="text-sm text-muted-foreground">{user.plan?.packageDuration ?? 'No package'} · {user.plan?.isLifetime ? 'Lifetime access' : user.plan?.endDate ? `Ends ${new Date(user.plan.endDate).toLocaleDateString()}` : 'No active end date'}</p></div></div>
      </div>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel>Plan</FieldLabel><Select value={plan} onValueChange={(v) => selectPlan(v as UpgradePlan)}><SelectTrigger id="upgrade-plan"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{UPGRADE_PLANS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          <Field><FieldLabel>Period</FieldLabel><Select value={period} onValueChange={(v) => selectPeriod(v as UpgradePeriod)}><SelectTrigger id="upgrade-period"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{periodsForPlan(plan).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
        </div>
        <Field orientation="horizontal" className="rounded-xl border bg-muted/30 p-4">
          <div className="flex-1"><FieldLabel htmlFor="track-payment-history">Track payment history</FieldLabel><FieldDescription>Create a PaymentHistory record with amount, method, and transaction reference.</FieldDescription></div>
          <Switch id="track-payment-history" checked={trackPaymentHistory} onCheckedChange={setTrackPaymentHistory} />
        </Field>
        {trackPaymentHistory && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field><FieldLabel htmlFor="upgrade-amount">Amount received (VND)</FieldLabel><Input id="upgrade-amount" type="number" min="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /><FieldDescription>Official price is prefilled; edit this to the actual offline payment.</FieldDescription></Field>
            <Field><FieldLabel>Payment method</FieldLabel><Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}><SelectTrigger id="upgrade-payment-method"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{PAYMENT_METHODS.map((item) => <SelectItem key={item} value={item}>{item === 'VCB' ? 'Bank / VCB' : item === 'MoMo' ? 'Wallet / MoMo' : 'Card / Dodo'}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          </div>
          <Field><FieldLabel htmlFor="upgrade-reference">Transaction reference</FieldLabel><div className="flex gap-2"><Input id="upgrade-reference" value={reference} onChange={(e) => setReference(e.target.value)} /><Button id="regenerate-upgrade-reference" type="button" variant="outline" onClick={() => setReference(generateAdminReference())}><ReceiptText data-icon="inline-start" />Regenerate</Button></div><FieldDescription>Keep the generated value or replace it with the real gateway transaction ID. Reusing it with changed details is rejected.</FieldDescription></Field>
        </>}
        {!trackPaymentHistory && <FieldDescription className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">No payment amount, gateway, transaction reference, or PaymentHistory entry will be recorded. Plan, subscription, points, and notifications are still updated.</FieldDescription>}
        <Button id="review-plan-upgrade" type="button" onClick={() => setConfirming(true)} disabled={(trackPaymentHistory && (!reference.trim() || amount <= 0)) || mutation.isPending}><Crown data-icon="inline-start" />Review upgrade</Button>
      </FieldGroup>
      <AlertDialog open={confirming} onOpenChange={setConfirming}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Replace the current subscription?</AlertDialogTitle><AlertDialogDescription>This will activate {plan} {period} for {user.email}{trackPaymentHistory ? `, record ${amount.toLocaleString('vi-VN')} VND via ${method},` : ' without recording payment history,'} and apply EasyQuiz fulfillment. This action can change the active plan and credit recurring points.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction id="confirm-plan-upgrade" onClick={(e) => { e.preventDefault(); void submit() }} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}Confirm upgrade</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}
