import { decimalToPiastres } from '../../../../packages/core/src/money.ts';
const language = document.documentElement.lang === 'en' ? 'en' : 'ar';
const prefix = '/' + language;
const text = (ar: string, en: string) => (language === 'ar' ? ar : en);
function notice(message: string) {
  const el = document.querySelector('#notice');
  if (el) el.textContent = message;
}
const errors: Record<string, [string, string]> = {
  authentication_required: ['يرجى تسجيل الدخول', 'Please sign in'],
  email_not_verified: ['يرجى تأكيد بريدك أولًا', 'Please verify your email'],
  checkout_disabled: ['استقبال الطلبات لم يُفتح بعد', 'Orders are not open yet'],
  shipping_unavailable: [
    'الشحن غير متاح لهذا العنوان أو المقاس',
    'Shipping unavailable for this address or package',
  ],
  cart_changed: ['السلة اتغيرت. راجع الطلب مجددًا', 'Your bag changed. Please review it again'],
  insufficient_stock: ['الكمية المطلوبة لم تعد متاحة', 'Requested quantity is no longer available'],
  state_conflict: [
    'تغيّرت الحالة. حدّث الصفحة وراجع البيانات',
    'State changed. Refresh and review',
  ],
  staff_mfa_required: [
    'حساب موظف بمصادقة ثنائية مطلوب',
    'A staff account with two-factor authentication is required',
  ],
  step_up_required: [
    'أدخل رمز مصادقة حديثًا لفتح الإدارة',
    'Enter a current authenticator code to unlock administration',
  ],
  forbidden: ['لا تملك صلاحية هذه العملية', 'You do not have permission'],
  rate_limited: ['محاولات كثيرة. يرجى الانتظار', 'Too many requests. Please wait'],
};
async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
) {
  const response = await fetch('/api/' + path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as { ok?: boolean; error?: string; code?: string };
  if (!response.ok || data.ok === false) {
    const key = data.error ?? data.code ?? 'temporarily_unavailable';
    throw new Error(
      errors[key]?.[language === 'ar' ? 0 : 1] ??
        text(
          'تعذّر إتمام العملية. راجع البيانات وحاول مجددًا.',
          'Unable to complete this action. Review the details and try again.',
        ),
    );
  }
  return data as T;
}
type GuestItem = { skuId: string; qty: number };
function guest(): GuestItem[] {
  try {
    const values = JSON.parse(localStorage.getItem('tiraze-commerce-cart') ?? '[]');
    return Array.isArray(values)
      ? values
          .filter(
            (v) =>
              typeof v.skuId === 'string' && Number.isInteger(v.qty) && v.qty > 0 && v.qty <= 20,
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
function saveGuest(items: GuestItem[]) {
  localStorage.setItem('tiraze-commerce-cart', JSON.stringify(items));
}
async function mergeGuest() {
  const items = guest();
  if (items.length) {
    await api('cart/merge', { items });
    saveGuest([]);
  }
}
function safeNext() {
  const next = new URL(location.href).searchParams.get('next');
  return next && next.startsWith(prefix + '/') && !next.includes('\\') ? next : prefix + '/account';
}
document.addEventListener('submit', async (event) => {
  const form = (event.target as Element).closest<HTMLFormElement>(
    'form[data-store],form[data-auth]',
  );
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button[type=submit],button:not([type])');
  if (button) button.disabled = true;
  const error = form.querySelector<HTMLElement>('.error');
  if (error) error.textContent = '';
  const fields = Object.fromEntries(new FormData(form));
  try {
    if (form.dataset.auth) {
      const action = form.dataset.auth;
      const body: Record<string, unknown> = { ...fields };
      if (action === 'sign-up/email') body.callbackURL = location.origin + prefix + '/account';
      if (action === 'request-password-reset')
        body.redirectTo = location.origin + prefix + '/account?reset=1';
      if (action === 'reset-password') {
        body.token = new URL(location.href).searchParams.get('token');
      }
      const data = await api<{
        totpURI?: string;
        backupCodes?: string[];
        twoFactorRedirect?: boolean;
      }>('auth/' + action, body);
      if (action === 'sign-up/email' || action === 'request-password-reset') {
        notice(text('راجع بريدك الإلكتروني لاستكمال الخطوة.', 'Check your email to continue.'));
        return;
      }
      if (action === 'two-factor/enable') {
        const output = form.querySelector('[data-mfa-output]');
        if (output)
          output.textContent =
            String(data.totpURI ?? '') + '\n' + (data.backupCodes ?? []).join('\n');
        notice(
          text(
            'أضف المفتاح إلى تطبيق المصادقة واحفظ رموز الاستعادة ثم أكّد الرمز.',
            'Add this key to your authenticator, save the recovery codes and verify a code.',
          ),
        );
        return;
      }
      if (data.twoFactorRedirect) {
        notice(
          text(
            'أدخل رمز تطبيق المصادقة لإكمال الدخول.',
            'Enter your authenticator code to finish signing in.',
          ),
        );
        return;
      }
      if (action === 'reset-password') {
        location.assign(prefix + '/account');
        return;
      }
      await mergeGuest();
      location.assign(safeNext());
      return;
    }
    switch (form.dataset.store) {
      case 'add-cart': {
        const item = { skuId: String(fields.skuId), qty: Number(fields.qty) };
        const me = await fetch('/api/me', { credentials: 'same-origin' });
        if (me.status === 401) {
          const values = guest().filter((v) => v.skuId !== item.skuId);
          saveGuest([...values, item]);
          notice(
            text(
              'أضيفت للحقيبة. سجّل الدخول لإتمام طلبك.',
              'Added to your bag. Sign in to place your order.',
            ),
          );
        } else {
          if (!me.ok)
            throw new Error(text('الخدمة غير متاحة مؤقتًا', 'Service temporarily unavailable'));
          await api('cart', item);
          notice(text('أضيفت إلى الحقيبة', 'Added to bag'));
        }
        break;
      }
      case 'address':
        await api('addresses', fields);
        location.reload();
        break;
      case 'quote': {
        const body = {
          ...fields,
          widthCm: Number(fields.widthCm),
          lengthCm: Number(fields.lengthCm),
          phone: fields.phone || undefined,
          budgetEgp: fields.budgetEgp ? Number(fields.budgetEgp) : undefined,
          consent: fields.consent === 'on',
          locale: language,
        };
        const result = await api<{ reference: string }>('quotes', body);
        notice(text('استلمنا طلبك. رقم المرجع: ', 'Your enquiry reference: ') + result.reference);
        form.reset();
        break;
      }
      case 'checkout': {
        const body = {
          addressId: form.dataset.addressId,
          shippingVersionId: form.dataset.shippingVersion,
          paymentMethod: fields.paymentMethod,
          cartVersion: Number(form.dataset.cartVersion),
          locale: language,
        };
        const fingerprint = JSON.stringify(body);
        let saved;
        try {
          saved = JSON.parse(sessionStorage.getItem('tiraze-checkout-attempt') ?? 'null');
        } catch {}
        if (saved?.fingerprint !== fingerprint) saved = { fingerprint, key: crypto.randomUUID() };
        sessionStorage.setItem('tiraze-checkout-attempt', JSON.stringify(saved));
        const result = await api<{ orderId: string }>('checkout', {
          ...body,
          idempotencyKey: saved.key,
        });
        sessionStorage.removeItem('tiraze-checkout-attempt');
        location.assign(prefix + '/orders/' + result.orderId);
        break;
      }
      case 'step-up':
        await api('admin/step-up', fields);
        notice(text('الإدارة متاحة لمدة ١٥ دقيقة', 'Administration unlocked for 15 minutes'));
        break;
      case 'import-validate': {
        const file = fields.file;
        if (!(file instanceof File) || file.size > 1500000)
          throw new Error(text('الملف كبير أو غير صالح', 'File is too large or invalid'));
        const r = await api<{
          id: string;
          errors: unknown[];
          rowCount: number;
          productCount: number;
        }>('admin/imports', { csv: await file.text() });
        const output = form.querySelector('[data-import-report]');
        if (output) output.textContent = JSON.stringify(r, null, 2);
        if (!r.errors.length) {
          const input = document.querySelector<HTMLInputElement>(
            '[data-store=import-commit] [name=id]',
          );
          if (input) input.value = r.id;
        }
        break;
      }
      case 'import-commit': {
        let done = false;
        while (!done) {
          const r = await api<{ done: boolean; cursor: number; total: number }>(
            'admin/imports/' + encodeURIComponent(String(fields.id)) + '/step',
            {},
          );
          done = r.done;
          const progress = form.querySelector('[data-import-progress]');
          if (progress) progress.textContent = r.cursor + ' / ' + r.total;
        }
        notice(text('اكتمل الاستيراد', 'Import completed'));
        break;
      }
      case 'admin-cod':
        await api('admin/orders/' + encodeURIComponent(String(fields.orderId)) + '/cod', {
          decision: fields.decision,
          reason: fields.reason,
        });
        notice(text('تم تسجيل القرار', 'Decision recorded'));
        break;
      case 'admin-fulfillment':
        await api(
          'admin/orders/' + encodeURIComponent(String(fields.orderId)) + '/' + fields.action,
          {
            carrier: fields.carrier,
            trackingNumber: fields.trackingNumber,
            trackingUrl: fields.trackingUrl || undefined,
          },
        );
        notice(text('تم تحديث الشحن', 'Fulfillment updated'));
        break;
      case 'admin-collection':
        await api(
          'admin/collections/' +
            encodeURIComponent(String(fields.orderId)) +
            (fields.action === 'settle' ? '/settle' : ''),
          {
            amountPiastres:
              fields.action === 'settle' ? undefined : decimalToPiastres(String(fields.amountEgp)),
            reference: fields.reference,
          },
        );
        notice(text('تم تسجيل العملية', 'Operation recorded'));
        break;
      case 'admin-cancel':
        await api('admin/orders/' + encodeURIComponent(String(fields.id)) + '/cancel', {
          reason: fields.reason,
        });
        notice(
          text(
            'أُلغي الطلب، ويُراجع أي استرداد بشكل منفصل',
            'Order cancelled; review refunds separately',
          ),
        );
        break;
      case 'admin-gate':
        await api('admin/settings', { checkoutEnabled: fields.checkoutEnabled === 'true' });
        notice(text('تم تحديث استقبال الطلبات', 'Order intake updated'));
        break;
      case 'admin-refund-reconcile': {
        const result = await api(
          'admin/refunds/' + encodeURIComponent(String(fields.id)) + '/reconcile',
          { providerTransactionId: fields.providerTransactionId },
        );
        notice(text('حالة الاسترداد: ', 'Refund state: ') + String(result.state));
        break;
      }
      case 'admin-refund': {
        const fp = JSON.stringify(fields);
        let key = sessionStorage.getItem('tiraze-refund:' + fp);
        if (!key) {
          key = crypto.randomUUID();
          sessionStorage.setItem('tiraze-refund:' + fp, key);
        }
        const result = await api('admin/refunds/' + encodeURIComponent(String(fields.orderId)), {
          paymentAttemptId: fields.paymentAttemptId || undefined,
          amountPiastres: decimalToPiastres(String(fields.amountEgp)),
          reason: fields.reason,
          idempotencyKey: key,
        });
        notice(
          text('حالة طلب الاسترداد: ', 'Refund request status: ') +
            String(result.state ?? result.error),
        );
        break;
      }
      case 'admin-quote':
        await api(
          'admin/quotes/' + encodeURIComponent(String(fields.id)),
          { status: fields.status, note: fields.note || undefined },
          'PATCH',
        );
        notice(text('تم تحديث الاستفسار', 'Enquiry updated'));
        break;
      case 'admin-catalog':
        await api(
          'admin/catalog/' + encodeURIComponent(String(fields.id)),
          fields.action === 'status'
            ? { status: fields.status }
            : { skuId: fields.skuId, pricePiastres: decimalToPiastres(String(fields.amountEgp)) },
          'PATCH',
        );
        notice(text('تم تحديث القطعة', 'Product updated'));
        break;
      case 'admin-shipping':
        await api('admin/shipping', JSON.parse(String(fields.matrix)));
        notice(text('تم اعتماد إصدار الشحن', 'Shipping version activated'));
        break;
      case 'admin-roles':
        await api('admin/roles', {
          email: fields.email,
          role: fields.role,
          grant: fields.grant === 'true',
        });
        notice(text('تم تحديث الصلاحيات', 'Permissions updated'));
        break;
      case 'inventory':
        await api('admin/inventory', { ...fields, delta: Number(fields.delta) });
        notice(text('تم تعديل المخزون وتسجيل العملية', 'Inventory updated and audited'));
        break;
    }
  } catch (cause) {
    if (error) error.textContent = (cause as Error).message;
    else notice((cause as Error).message);
  } finally {
    if (button) button.disabled = false;
  }
});
document.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!button) return;
  try {
    if (button.hasAttribute('data-signout')) {
      await api('auth/sign-out', {});
      location.assign(prefix + '/account');
    }
    if (button.dataset.remove) {
      await api('cart', { skuId: button.dataset.remove, qty: 0 });
      location.reload();
    }
    if (button.dataset.guestRemove) {
      saveGuest(guest().filter((v) => v.skuId !== button.dataset.guestRemove));
      location.reload();
    }
    if (button.dataset.payOrder) {
      button.disabled = true;
      const result = await api<{ redirectUrl: string }>(
        'orders/' + button.dataset.payOrder + '/pay',
        {},
      );
      const url = new URL(result.redirectUrl);
      if (
        url.protocol !== 'https:' ||
        !(url.hostname === 'kashier.io' || url.hostname.endsWith('.kashier.io'))
      )
        throw new Error('Invalid payment destination');
      location.assign(url.href);
    }
    if (button.dataset.adminArea) {
      const rows = await api<Record<string, unknown>[]>('admin/' + button.dataset.adminArea);
      const target = document.querySelector('#admin-data');
      if (target) {
        target.replaceChildren();
        if (!rows.length) {
          target.textContent = text('لا توجد بيانات', 'No records');
          return;
        }
        const table = document.createElement('table'),
          head = document.createElement('tr');
        const keys = Object.keys(rows[0]!).filter(
          (k) =>
            ![
              'payload',
              'address_snapshot',
              'shipping_snapshot',
              'request_hash',
              'idempotency_key',
              'meta',
            ].includes(k),
        );
        for (const key of keys) {
          const cell = document.createElement('th');
          cell.scope = 'col';
          cell.textContent = key;
          head.appendChild(cell);
        }
        const thead = document.createElement('thead');
        thead.appendChild(head);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        for (const row of rows) {
          const tr = document.createElement('tr');
          for (const key of keys) {
            const td = document.createElement('td');
            td.textContent = String(row[key] ?? '');
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        target.appendChild(table);
      }
    }
    if (button.dataset.action === 'video') toggleFilm();
  } catch (cause) {
    notice((cause as Error).message);
    button.disabled = false;
  }
});
const guestElement = document.querySelector('#guest-cart');
if (guestElement && !guestElement.hasAttribute('hidden')) {
  const items = guest();
  if (!items.length) guestElement.textContent = text('حقيبتك فارغة', 'Your bag is empty');
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'panel';
    const label = document.createElement('p');
    label.textContent = item.skuId + ' × ' + item.qty;
    const remove = document.createElement('button');
    remove.dataset.guestRemove = item.skuId;
    remove.textContent = text('إزالة', 'Remove');
    row.appendChild(label);
    row.appendChild(remove);
    guestElement.appendChild(row);
  }
}
const video = document.querySelector<HTMLVideoElement>('#hero-video');
function filmLabel() {
  const button = document.querySelector<HTMLButtonElement>('[data-action=video]');
  if (!button || !video) return;
  button.setAttribute(
    'aria-label',
    video.paused ? text('تشغيل الفيديو', 'Play film') : text('إيقاف الفيديو', 'Pause film'),
  );
  button.textContent = video.paused ? '▶' : 'Ⅱ';
}
async function toggleFilm() {
  if (!video) return;
  if (video.paused) {
    video.closest('.hero')?.classList.add('user-play');
    try {
      await video.play();
    } catch {
      notice(text('تعذّر تشغيل الفيديو', 'Unable to play film'));
    }
  } else video.pause();
  filmLabel();
}
if (video) {
  video.addEventListener('play', filmLabel);
  video.addEventListener('pause', filmLabel);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.autoplay = false;
    video.pause();
  } else video.play().catch(filmLabel);
  filmLabel();
}

let galleryIndex = 0;
const shots = [
  ['carpet', 'حكاية تنسجها الأيدي', 'A story woven by hand'],
  ['safaa', 'عاجي يلتقط الضوء', 'Ivory that catches the light'],
  ['rawda', 'حديقة من الحرير', 'A garden in silk'],
  ['silk-detail', 'تفاصيل تستحق التأمل', 'Details worth a closer look'],
];
document.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-slide]');
  if (!button) return;
  galleryIndex = (galleryIndex + Number(button.dataset.slide) + shots.length) % shots.length;
  const gallery = document.querySelector('#gallery-stage');
  if (!gallery) return;
  gallery.querySelectorAll<HTMLImageElement>('.gallery-stage img').forEach((image, i) => {
    const shot = shots[(galleryIndex + i + shots.length - 1) % shots.length]!;
    image.src = '/assets/' + shot[0] + '.webp';
    image.alt = shot[language === 'ar' ? 1 : 2]!;
  });
  const caption = gallery.querySelector('.gallery-caption');
  if (caption) caption.textContent = shots[galleryIndex]![language === 'ar' ? 1 : 2]!;
  const count = gallery.querySelector('.slider-controls span');
  if (count) count.textContent = '0' + (galleryIndex + 1) + ' / 04';
});

const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu]'),
  mobileNavigation = document.querySelector<HTMLElement>('#mobile-navigation');
menuToggle?.addEventListener('click', () => {
  if (!mobileNavigation) return;
  mobileNavigation.hidden = !mobileNavigation.hidden;
  menuToggle.setAttribute('aria-expanded', String(!mobileNavigation.hidden));
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileNavigation && !mobileNavigation.hidden) {
    mobileNavigation.hidden = true;
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.focus();
  }
});
