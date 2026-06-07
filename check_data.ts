import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'file:./data-engine/data/data_engine.db'
});

async function main() {
  // Check gold prices
  console.log('=== GOLD PRICES (Latest 10) ===');
  const gold = await prisma.$queryRaw`SELECT * FROM gold ORDER BY date DESC LIMIT 10`;
  console.log(JSON.stringify(gold, null, 2));
  
  // Find ADCO stock
  console.log('\n=== ADCO STOCK ===');
  const adco = await prisma.$queryRaw`SELECT * FROM stocks WHERE symbol LIKE '%ADCO%' OR name LIKE '%أدكو%' OR name LIKE '%ADCO%'`;
  console.log(JSON.stringify(adco, null, 2));
  
  // Check stock count by country
  console.log('\n=== STOCKS BY COUNTRY ===');
  const byCountry = await prisma.$queryRaw`SELECT country, COUNT(*) as count FROM stocks GROUP BY country`;
  console.log(JSON.stringify(byCountry, null, 2));
  
  // Check latest historical data
  console.log('\n=== LATEST HISTORICAL DATA ===');
  const latest = await prisma.$queryRaw`SELECT * FROM historical_data ORDER BY date DESC LIMIT 5`;
  console.log(JSON.stringify(latest, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
