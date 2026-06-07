import { PrismaClient } from '@prisma/client';

// Connect to the real database
const prisma = new PrismaClient({
  datasourceUrl: 'file:./data-engine/data/data_engine.db'
});

async function main() {
  console.log('═'.repeat(80));
  console.log('📊 HISTORICAL PRICE CHANGES - Gold, ADCO Stock, Crypto');
  console.log('═'.repeat(80));
  
  // 1. Check all tables
  const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`;
  console.log('\n📋 Tables in database:');
  console.log(JSON.stringify(tables, null, 2));
  
  // 2. Check table structure
  const goldSchema = await prisma.$queryRaw`PRAGMA table_info(gold_prices)`;
  console.log('\n📋 gold_prices table schema:');
  console.log(JSON.stringify(goldSchema, null, 2));
  
  // 3. Gold Price History
  console.log('\n🥇 GOLD PRICE HISTORY:');
  try {
    const goldHistory = await prisma.$queryRaw`SELECT * FROM gold_prices ORDER BY timestamp DESC LIMIT 20`;
    console.log(JSON.stringify(goldHistory, null, 2));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  
  // 4. Historical Data for ADCO
  console.log('\n📈 HISTORICAL DATA FOR ADCO:');
  try {
    const adcoHistory = await prisma.$queryRaw`SELECT * FROM historical_data WHERE symbol LIKE '%ADCI%' OR symbol LIKE '%ADCO%' ORDER BY date DESC LIMIT 20`;
    console.log(JSON.stringify(adcoHistory, null, 2));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  
  // 5. Crypto History
  console.log('\n₿ CRYPTO HISTORY:');
  try {
    const cryptoHistory = await prisma.$queryRaw`SELECT * FROM crypto_prices ORDER BY timestamp DESC LIMIT 20`;
    console.log(JSON.stringify(cryptoHistory, null, 2));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  
  // 6. Count records
  console.log('\n📊 RECORD COUNTS:');
  try {
    const goldCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM gold_prices`;
    const stockCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM stocks`;
    const historicalCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM historical_data`;
    const cryptoCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM crypto_prices`;
    console.log('Gold prices:', goldCount);
    console.log('Stocks:', stockCount);
    console.log('Historical data:', historicalCount);
    console.log('Crypto prices:', cryptoCount);
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
