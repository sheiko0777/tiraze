import { it, expect } from 'vitest';
import { createTestD1 } from '../helpers/d1.ts';
import { listProducts } from '../../packages/db/src/catalog.ts';
it('paginates, searches and filters 1000 synthetic products; fixtures stay hidden by default', async () => {
  const t = await createTestD1();
  try {
    const ids = 'WITH RECURSIVE ids(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM ids WHERE x<1000) ';
    await t.db.batch([
      t.db.prepare(
        ids +
          "INSERT INTO products (id,product_key,status,kind,category,is_fixture,created_at,updated_at) SELECT 'load-'||x,'load-'||x,'published','ready','test',1,0,0 FROM ids",
      ),
      t.db.prepare(
        ids +
          "INSERT INTO product_translations (product_id,locale,slug,title,description,search_text) SELECT 'load-'||x,'en','load-'||x,'Test '||x,'Synthetic test only','test '||x FROM ids",
      ),
      t.db.prepare(
        ids +
          "INSERT INTO skus (id,product_id,code,width_cm,length_cm,color,price_piastres,is_unique,weight_g,package_length_cm,package_width_cm,package_height_cm,created_at,updated_at) SELECT 'sku-'||x,'load-'||x,'LOAD-'||x,100,150,'navy',100000+x,0,4000,110,30,30,0,0 FROM ids",
      ),
      t.db.prepare(
        ids +
          "INSERT INTO inventory (sku_id,on_hand,reserved,updated_at) SELECT 'sku-'||x,10,0,0 FROM ids",
      ),
    ]);
    const start = performance.now();
    const page = await listProducts(t.db, {
      locale: 'en',
      includeFixtures: true,
      page: 42,
      pageSize: 24,
      sort: 'price_asc',
    });
    expect(page.total).toBe(1000);
    expect(page.items).toHaveLength(16);
    const search = await listProducts(t.db, { locale: 'en', includeFixtures: true, q: 'Test 999' });
    expect(search.items.map((p) => p.id)).toEqual(['load-999']);
    expect((await listProducts(t.db, { locale: 'en', includeFixtures: false })).total).toBe(0);
    expect(
      (await listProducts(t.db, { locale: 'en', includeFixtures: true, q: "' OR 1=1 --" })).total,
    ).toBe(0);
    expect(
      (
        await listProducts(t.db, {
          locale: 'en',
          includeFixtures: true,
          minPricePiastres: 100990,
          availableOnly: true,
        })
      ).total,
    ).toBe(11);
    expect(
      (await listProducts(t.db, { locale: 'en', includeFixtures: true, q: 'ع'.repeat(100) })).total,
    ).toBe(0);
    console.log(
      'Local D1 emulator: 1000 fixture records, 5 listing/search checks in ' +
        Math.round(performance.now() - start) +
        'ms. Not a production load benchmark.',
    );
  } finally {
    await t.dispose();
  }
}, 120000);
