const labels: Record<string, [string, string]> = {
  awaiting_payment: ['بانتظار الدفع', 'Awaiting payment'],
  pending_cod_review: ['بانتظار تأكيد فريق تيراز', 'Awaiting staff confirmation'],
  confirmed: ['تم تأكيد الطلب', 'Confirmed'],
  cancelled: ['ملغي', 'Cancelled'],
  completed: ['مكتمل', 'Completed'],
  unpaid: ['لم يُدفع بعد', 'Not paid yet'],
  pending: ['الدفع قيد التحقق', 'Payment being verified'],
  paid: ['تم الدفع', 'Paid'],
  failed: ['لم تكتمل عملية الدفع', 'Payment did not complete'],
  refund_pending: ['الاسترداد قيد المتابعة', 'Refund under review'],
  partially_refunded: ['تم استرداد جزء من المبلغ', 'Partially refunded'],
  refunded: ['تم استرداد المبلغ', 'Refunded'],
  paid_unallocated: [
    'وصل الدفع — فريقنا يراجع تخصيص القطعة',
    'Payment received — allocation under review',
  ],
};
export const label = (status: string, locale: string) =>
  labels[status]?.[locale === 'ar' ? 0 : 1] ?? status;
