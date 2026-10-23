import { z } from 'zod';
import { infrai, InfraiError } from './infrai.js';

export const paymentEventSchema = z.object({
  eventId: z.string().min(1),
  accountId: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  riskScore: z.number().min(0).max(100),
  cardCountry: z.string().min(2).max(2),
  memo: z.string().max(120).optional()
});

export type PaymentEvent = z.infer<typeof paymentEventSchema>;

export type PaymentAction = 'approve' | 'hold_for_review' | 'notify';

export type PaymentDecision = {
  action: PaymentAction;
  notificationChannel: 'audit_log' | 'none';
  reasons: string[];
};

export function decidePayment(event: PaymentEvent, auditNotificationsEnabled: boolean): PaymentDecision {
  const reasons: string[] = [];

  if (event.riskScore >= 80) {
    reasons.push('high risk score');
    return {
      action: 'hold_for_review',
      notificationChannel: auditNotificationsEnabled ? 'audit_log' : 'none',
      reasons
    };
  }

  if (event.amountCents >= 500000) {
    reasons.push('large payment');
  }

  if (auditNotificationsEnabled) {
    reasons.push('audit notifications enabled');
  }

  return {
    action: reasons.includes('large payment') ? 'notify' : 'approve',
    notificationChannel: auditNotificationsEnabled ? 'audit_log' : 'none',
    reasons: reasons.length ? reasons : ['standard approval']
  };
}

export async function processPaymentEvent(input: unknown): Promise<PaymentDecision> {
  const event = paymentEventSchema.parse(input);
  const flag = await infrai.flags.get_value('fintech.audit_notifications');
  const enabled = Boolean(flag.value);
  return decidePayment(event, enabled);
}

export function renderAdrdiff(decision: PaymentDecision): string {
  return [
    `action: ${decision.action}`,
    `notificationChannel: ${decision.notificationChannel}`,
    `reasons: ${decision.reasons.join(', ')}`
  ].join('\n');
}

export function mapInfraiErrorToStatus(error: unknown): number {
  if (error instanceof InfraiError) return 409;
  return 500;
}
