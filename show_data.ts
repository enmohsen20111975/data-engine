import fs from 'fs';

// Read all data files
const metalsForex = JSON.parse(fs.readFileSync('./data-engine/data/metals_forex_latest.json', 'utf-8'));
const crypto = JSON.parse(fs.readFileSync('./data-engine/data/crypto_latest.json', 'utf-8'));
const stocks = JSON.parse(fs.readFileSync('./data-engine/data/stocks_data.json', 'utf-8'));
const autoRefresh = JSON.parse(fs.readFileSync('./data-engine/data/auto_refresh_status.json', 'utf-8'));

console.log('\n');
console.log('═'.repeat(80));
console.log('📊 تقرير البيانات - التاريخ والوقت والسعر');
console.log('═'.repeat(80));

// Gold Data
console.log('\n🥇 الذهب والعملات:');
console.log('-'.repeat(60));
console.log(`التاريخ/الوقت: ${metalsForex.timestamp}`);
console.log(`سعر الذهب (أونصة): ${metalsForex.gold.gold_usd_per_ounce} دولار`);
console.log(`سعر الذهب (جرام): ${metalsForex.gold.gold_usd_per_gram.toFixed(2)} دولار`);
console.log(`\n📍 سعر الذهب في مصر:`);
console.log(`   عيار 24: ${metalsForex.gold.countries['مصر'].prices_by_karat['عيار 24']} ج.م`);
console.log(`   عيار 21: ${metalsForex.gold.countries['مصر'].prices_by_karat['عيار 21']} ج.م`);
console.log(`   سعر الدولار: ${metalsForex.gold.countries['مصر'].exchange_rate_to_usd} ج.م`);

// Crypto Data
console.log('\n₿ العملات الرقمية:');
console.log('-'.repeat(60));
console.log(`التاريخ/الوقت: ${crypto.timestamp}`);
console.log(`عدد العملات: ${crypto.total_cryptos}`);
console.log('\nأعلى 10 عملات:');
crypto.top_10.forEach((c: any) => {
  const change = c.price_change_24h >= 0 ? '🟢' : '🔴';
  console.log(`${c.rank}. ${c.name} (${c.symbol}): $${c.price_usd?.toLocaleString()} ${change} ${c.price_change_24h?.toFixed(2)}%`);
});

// Stocks Data
console.log('\n📈 الأسهم:');
console.log('-'.repeat(60));

// Egypt stocks
const egyptStocks = stocks.filter((s: any) => s.market === 'مصر');
console.log(`\n🇪🇬 مصر - عدد الأسهم: ${egyptStocks.length}`);
egyptStocks.slice(0, 5).forEach((s: any) => {
  const change = s.change_percent >= 0 ? '🟢' : '🔴';
  console.log(`   ${s.symbol} - ${s.name}: ${s.price} ج.م ${change} ${s.change_percent}%`);
});

// Saudi stocks
const saudiStocks = stocks.filter((s: any) => s.market === 'السعودية');
console.log(`\n🇸🇦 السعودية - عدد الأسهم: ${saudiStocks.length}`);
saudiStocks.slice(0, 5).forEach((s: any) => {
  const change = s.change_percent >= 0 ? '🟢' : '🔴';
  console.log(`   ${s.symbol} - ${s.name}: ${s.price} ر.س ${change} ${s.change_percent}%`);
});

// Kuwait stocks
const kuwaitStocks = stocks.filter((s: any) => s.market === 'الكويت');
console.log(`\n🇰🇼 الكويت - عدد الأسهم: ${kuwaitStocks.length}`);
kuwaitStocks.slice(0, 5).forEach((s: any) => {
  const change = s.change_percent >= 0 ? '🟢' : '🔴';
  console.log(`   ${s.symbol} - ${s.name}: ${s.price} د.ك ${change} ${s.change_percent}%`);
});

// Qatar stocks
const qatarStocks = stocks.filter((s: any) => s.market === 'قطر');
console.log(`\n🇶🇦 قطر - عدد الأسهم: ${qatarStocks.length}`);
qatarStocks.slice(0, 5).forEach((s: any) => {
  const change = s.change_percent >= 0 ? '🟢' : '🔴';
  console.log(`   ${s.symbol} - ${s.name}: ${s.price} ر.ق ${change} ${s.change_percent}%`);
});

// ADCO Stock
const adco = stocks.find((s: any) => s.symbol === 'ADCI' || s.name === 'أدكو');
if (adco) {
  console.log('\n🔍 سهم أدكو بالتفصيل:');
  console.log('-'.repeat(60));
  console.log(`الرمز: ${adco.symbol}`);
  console.log(`الاسم: ${adco.name}`);
  console.log(`السعر: ${adco.price} ج.م`);
  console.log(`التغير: ${adco.change_percent}%`);
  console.log(`حجم التداول: ${adco.volume}`);
  console.log(`القيمة السوقية: ${adco.market_cap}`);
}

// Auto Refresh Status
console.log('\n🔄 حالة التحديث التلقائي:');
console.log('-'.repeat(60));
console.log(`الحالة: ${autoRefresh.running ? '✅ شغال' : '❌ متوقف'}`);
console.log(`بدأ في: ${autoRefresh.started_at}`);
console.log(`آخر تشغيل: ${autoRefresh.last_run}`);
console.log(`التشغيل القادم: ${autoRefresh.next_run}`);

console.log('\n📋 جدول التحديثات:');
console.log('┌──────────────────────────────────────────────────────────────┐');
console.log('│ المهمة            │ آخر تشغيل           │ الحالة          │');
console.log('├──────────────────────────────────────────────────────────────┤');
Object.entries(autoRefresh.tasks).forEach(([key, task]: [string, any]) => {
  const status = task.status === 'success' ? '✅ نجاح' : '❌ فشل';
  const lastRun = task.last_run?.split('T')[1]?.split('.')[0] || 'غير محدد';
  console.log(`│ ${task.name.padEnd(16)} │ ${lastRun.padEnd(20)} │ ${status.padEnd(14)} │`);
});
console.log('└──────────────────────────────────────────────────────────────┘');

console.log('\n' + '═'.repeat(80));
