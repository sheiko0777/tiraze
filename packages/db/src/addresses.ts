import { randomId, type AddressInput } from '@tiraze/core';
import { all, first, returning, type Db } from './sql.ts';

export interface Address extends AddressInput {
  id: string;
  createdAt: number;
}

type Row = {
  id: string;
  recipient_name: string;
  phone: string;
  governorate: string;
  city: string;
  line1: string;
  line2: string | null;
  notes: string | null;
  created_at: number;
};

function map(r: Row): Address {
  return {
    id: r.id,
    recipientName: r.recipient_name,
    phone: r.phone,
    governorate: r.governorate,
    city: r.city,
    line1: r.line1,
    line2: r.line2 ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

export async function listAddresses(db: Db, userId: string): Promise<Address[]> {
  const rows = await all<Row>(db, `SELECT * FROM addresses WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20`, userId);
  return rows.map(map);
}

/** Ownership is part of the lookup: another customer's address id resolves to null. */
export async function getOwnedAddress(db: Db, userId: string, addressId: string): Promise<Address | null> {
  const r = await first<Row>(db, `SELECT * FROM addresses WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, addressId, userId);
  return r ? map(r) : null;
}

export async function createAddress(db: Db, userId: string, input: AddressInput, now: number): Promise<Address> {
  const count = await first<{ n: number }>(db, `SELECT COUNT(*) AS n FROM addresses WHERE user_id = ? AND deleted_at IS NULL`, userId);
  if ((count?.n ?? 0) >= 20) throw new Error('address_limit');
  const id = randomId();
  await db
    .prepare(
      `INSERT INTO addresses (id, user_id, recipient_name, phone, governorate, city, line1, line2, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, input.recipientName, input.phone, input.governorate, input.city, input.line1, input.line2 ?? null, input.notes ?? null, now)
    .run();
  return { ...input, id, createdAt: now };
}

export async function deleteAddress(db: Db, userId: string, addressId: string, now: number): Promise<boolean> {
  const r = await returning(
    db.prepare(`UPDATE addresses SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL RETURNING id`).bind(now, addressId, userId),
  );
  return r.length === 1;
}
