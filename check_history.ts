import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('═'.repeat(80));
  console.log('📊 HISTORICAL PRICE CHANGES - Gold, ADCO Stock, Crypto');
  console.log('═'.repeat(80));
  
  // 1. Gold Price History
  console.log('\n🥇 GOLD PRICE HISTORY (Egypt, 24 Karat):');
  console.log('-'.repeat(60));
  const goldHistory = await prisma.goldPrice.findMany({
    where: { country: 'مصر', karat: 'عيار 24' },
    orderBy: { timestamp: 'desc' },
    take: 20
  });
  
  if (goldHistory.length > 0) {
    console.log('┌─────────────────────┬────────────────┬────────────────┐');
    console.log('│ Timestamp           │ Price/Gram     │ Price/Ounce    │');
    console.log('├─────────────────────┼────────────────┼────────────────┤');
    goldHistory.forEach(g => {
      const time = g.timestamp.padEnd(19);
      const gram = (g.pricePerGram?.toFixed(2) || 'N/A').padStart(14);
      const oz = (g.pricePerOunce?.toFixed(2) || 'N/A').padStart(14);
      console.log(`│ ${time} │ ${gram} │ ${oz} │`);
    });
    console.log('└─────────────────────┴────────────────┴────────────────┘');
  } else {
    console.log('❌ No gold history found');
  }
  
  // 2. ADCO Stock History
  console.log('\n📈 ADCO (ADCI) STOCK PRICE HISTORY:');
  console.log('-'.repeat(60));
  const adcoHistory = await prisma.historicalData.findMany({
    where: { symbol: 'ADCI' },
    orderBy: { date: 'desc' },
    take: 20
  });
  
  if (adcoHistory.length > 0) {
    console.log('┌─────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
    console.log('│ Date        │ Open     │ High     │ Low      │ Close    │ Volume   │');
    console.log('├─────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
    adcoHistory.forEach(h => {
      const date = (h.date || 'N/A').padEnd(11);
      const open = (h.open?.toFixed(2) || 'N/A').padStart(8);
      const high = (h.high?.toFixed(2) || 'N/A').padStart(8);
      const low = (h.low?.toFixed(2) || 'N/A').padStart(8);
      const close = (h.close?.toFixed(2) || 'N/A').padStart(8);
      const vol = (h.volume?.toLocaleString() || 'N/A').padStart(8);
      console.log(`│ ${date} │ ${open} │ ${high} │ ${low} │ ${close} │ ${vol} │`);
    });
    console.log('└─────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
  } else {
    console.log('❌ No ADCO history found');
  }
  
  // 3. Crypto Price History (Bitcoin)
  console.log('\n₿ BITCOIN PRICE HISTORY:');
  console.log('-'.repeat(60));
  const btcHistory = await prisma.cryptoPrice.findMany({
    where: { symbol: 'BTC' },
    orderBy: { timestamp: 'desc' },
    take: 20
  });
  
  if (btcHistory.length > 0) {
    console.log('┌─────────────────────┬────────────────┬──────────────┐');
    console.log('│ Timestamp           │ Price (USD)    │ Change 24h   │');
    console.log('├─────────────────────┼────────────────┼──────────────┤');
    btcHistory.forEach(c => {
      const time = c.timestamp.padEnd(19);
      const price = ('$' + (c.priceUsd?.toLocaleString() || 'N/A')).padStart(14);
      const change = ((c.priceChange24h || 0) >= 0 ? '+' : '') + (c.priceChange24h?.toFixed(2) || '0') + '%';
      console.log(`│ ${time} │ ${price} │ ${change.padStart(12)} │`);
    });
    console.log('└─────────────────────┴────────────────┴──────────────┘');
  } else {
    console.log('❌ No Bitcoin history found');
  }
  
  // 4. Summary
  console.log('\n📊 DATABASE SUMMARY:');
  console.log('-'.repeat(60));
  
  const goldCount = await prisma.goldPrice.count();
  const stockCount = await prisma.stock.count();
  const historicalCount = await prisma.historicalData.count();
  const cryptoCount = await prisma.cryptoPrice.count();
  
  console.log(`Gold records: ${goldCount}`);
  console.log(`Stocks: ${stockCount}`);
  console.log(`Historical data: ${historicalCount}`);
  console.log(`Crypto records: ${cryptoCount}`);
  
  // 5. Show unique timestamps for gold
  const goldTimestamps = await prisma.goldPrice.findMany({
    select: { timestamp: true },
    distinct: ['timestamp'],
    orderBy: { timestamp: 'desc' },
    take: 10
  });
  console.log('\n🕐 Unique Gold Fetch Times:');
  goldTimestamps.forEach(g => console.log(`  - ${g.timestamp}`));
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
