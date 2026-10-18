-- LOCAL ONLY synthetic stock/prices. Never apply to a remote merchant database.
-- This seed does not enable checkout. Set FIXTURES_VISIBLE=true only in local .dev.vars to view it.
INSERT OR IGNORE INTO products (id,product_key,status,kind,category,is_fixture,created_at,updated_at) VALUES ('fixture-noor','fixture-noor','published','ready','test',1,0,0);
INSERT OR IGNORE INTO product_translations (product_id,locale,slug,title,description,material,technique,origin_note,care,search_text) VALUES ('fixture-noor','ar','fixture-noor','قطعة اختبار — نور','بيانات اختبار محلية فقط، ليست قطعة معروضة للبيع.','TEST','TEST','TEST ONLY','تنظيف متخصص','قطعه اختبار نور');
INSERT OR IGNORE INTO product_translations (product_id,locale,slug,title,description,material,technique,origin_note,care,search_text) VALUES ('fixture-noor','en','fixture-noor','Test fixture — Noor','Synthetic local test data. Not a real item for sale.','TEST','TEST','TEST ONLY','Specialist cleaning','test fixture noor');
INSERT OR IGNORE INTO skus (id,product_id,code,width_cm,length_cm,color,price_piastres,is_unique,weight_g,package_length_cm,package_width_cm,package_height_cm,created_at,updated_at) VALUES ('fixture-noor-sku','fixture-noor','FIXTURE-NOOR',120,180,'navy',100000,1,4000,120,30,30,0,0);
INSERT OR IGNORE INTO inventory (sku_id,on_hand,reserved,updated_at) VALUES ('fixture-noor-sku',1,0,0);
INSERT OR IGNORE INTO media (id,product_id,url,alt_ar,alt_en,sort_order) VALUES ('fixture-noor-media','fixture-noor','/assets/carpet.webp','تصور تصميم نور — صورة اختبار','Noor concept — test image',0);
