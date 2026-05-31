-- Data Engine Complete Schema
-- Arabic Stock Exchange Data Factory

-- Stock Table (Main)
CREATE TABLE IF NOT EXISTS Stock (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    nameAr TEXT,
    nameEn TEXT,
    exchange TEXT NOT NULL,
    urlSlug TEXT,
    sector TEXT,
    industry TEXT,
    website TEXT,
    headquarters TEXT,
    foundedYear INTEGER,
    description TEXT,
    createdAt INTEGER,
    updatedAt INTEGER,
    UNIQUE(symbol, exchange)
);

-- Stock Overview (نظرة عامة)
CREATE TABLE IF NOT EXISTS StockOverview (
    id TEXT PRIMARY KEY,
    stockId TEXT NOT NULL,
    currentPrice REAL,
    changeAmount REAL,
    changePercent REAL,
    marketCap REAL,
    enterpriseValue REAL,
    peRatioTTM REAL,
    peRatioFwd REAL,
    epsTTM REAL,
    dividendYield REAL,
    dividendRate REAL,
    beta REAL,
    sharesOutstanding REAL,
    floatShares REAL,
    avgVolume REAL,
    dayHigh REAL,
    dayLow REAL,
    yearHigh REAL,
    yearLow REAL,
    fiftyDayMA REAL,
    twoHundredDayMA REAL,
    revenueFY REAL,
    netIncomeFY REAL,
    employees INTEGER,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (stockId) REFERENCES Stock(id),
    UNIQUE(stockId)
);

-- Income Statement (بيانات الدخل)
CREATE TABLE IF NOT EXISTS IncomeStatement (
    id TEXT PRIMARY KEY,
    stockId TEXT NOT NULL,
    period TEXT NOT NULL,  -- 'annual' or 'quarterly'
    fiscalYear INTEGER,
    fiscalQuarter INTEGER,
    fiscalDate TEXT,
    totalRevenue REAL,
    operatingRevenue REAL,
    costOfRevenue REAL,
    grossProfit REAL,
    operatingExpenses REAL,
    operatingIncome REAL,
    interestExpense REAL,
    otherIncomeExpense REAL,
    incomeBeforeTax REAL,
    incomeTaxExpense REAL,
    netIncome REAL,
    netIncomeContinuous REAL,
    netIncomeDiscontinued REAL,
    epsBasic REAL,
    epsDiluted REAL,
    ebitda REAL,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (stockId) REFERENCES Stock(id)
);

-- Balance Sheet (بَيَانُ المُوَازَنَة)
CREATE TABLE IF NOT EXISTS BalanceSheet (
    id TEXT PRIMARY KEY,
    stockId TEXT NOT NULL,
    period TEXT NOT NULL,
    fiscalYear INTEGER,
    fiscalQuarter INTEGER,
    fiscalDate TEXT,
    totalAssets REAL,
    currentAssets REAL,
    cashAndEquivalents REAL,
    shortTermInvestments REAL,
    netReceivables REAL,
    inventory REAL,
    otherCurrentAssets REAL,
    nonCurrentAssets REAL,
    propertyPlantEquipment REAL,
    longTermInvestments REAL,
    goodwill REAL,
    intangibleAssets REAL,
    totalLiabilities REAL,
    currentLiabilities REAL,
    accountsPayable REAL,
    shortTermDebt REAL,
    otherCurrentLiabilities REAL,
    longTermDebt REAL,
    otherNonCurrentLiabilities REAL,
    totalEquity REAL,
    commonStock REAL,
    retainedEarnings REAL,
    treasuryStock REAL,
    totalDebt REAL,
    netDebt REAL,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (stockId) REFERENCES Stock(id)
);

-- Cash Flow Statement (التدفقات النقدية)
CREATE TABLE IF NOT EXISTS CashFlowStatement (
    id TEXT PRIMARY KEY,
    stockId TEXT NOT NULL,
    period TEXT NOT NULL,
    fiscalYear INTEGER,
    fiscalQuarter INTEGER,
    fiscalDate TEXT,
    operatingCashFlow REAL,
    netIncome REAL,
    depreciationAmortization REAL,
    changesInWorkingCapital REAL,
    investingCashFlow REAL,
    capitalExpenditures REAL,
    acquisitions REAL,
    investingOther REAL,
    financingCashFlow REAL,
    dividendsPaid REAL,
    stockRepurchase REAL,
    debtIssued REAL,
    debtRepaid REAL,
    financingOther REAL,
    freeCashFlow REAL,
    beginningCash REAL,
    endingCash REAL,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (stockId) REFERENCES Stock(id)
);

-- Technical Analysis (تحليلات فنية)
CREATE TABLE IF NOT EXISTS TechnicalAnalysis (
    id TEXT PRIMARY KEY,
    stockId TEXT NOT NULL,
    timeframe TEXT NOT NULL,  -- '1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1M'
    oscillatorsBuy INTEGER,
    oscillatorsSell INTEGER,
    oscillatorsNeutral INTEGER,
    oscillatorsSummary TEXT,  -- 'buy', 'sell', 'neutral'
    maBuy INTEGER,
    maSell INTEGER,
    maNeutral INTEGER,
    maSummary TEXT,
    overallSummary TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (stockId) REFERENCES Stock(id),
    UNIQUE(stockId, timeframe)
);

-- Key Statistics (الإحصائيات الرئيسية)
CREATE TABLE IF NOT EXISTS KeyStatistics (
    id TEXT PRIMARY KEY,
    stockId TEXT NOT NULL,
    priceToBook REAL,
    priceToSales REAL,
    evToEbitda REAL,
    evToRevenue REAL,
    profitMargin REAL,
    operatingMargin REAL,
    roe REAL,
    roa REAL,
    roi REAL,
    currentRatio REAL,
    quickRatio REAL,
    debtToEquity REAL,
    interestCoverage REAL,
    assetTurnover REAL,
    inventoryTurnover REAL,
    receivablesTurnover REAL,
    payoutRatio REAL,
    bookValuePerShare REAL,
    cashPerShare REAL,
    revenuePerShare REAL,
    grossMargin REAL,
    ebitdaMargin REAL,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (stockId) REFERENCES Stock(id),
    UNIQUE(stockId)
);

-- Dividends (التوزيعات)
CREATE TABLE IF NOT EXISTS Dividend (
    id TEXT PRIMARY KEY,
    stockId TEXT NOT NULL,
    exDate TEXT,
    payDate TEXT,
    declareDate TEXT,
    amount REAL,
    currency TEXT,
    frequency TEXT,  -- 'quarterly', 'annual', 'special'
    yield REAL,
    createdAt TEXT,
    FOREIGN KEY (stockId) REFERENCES Stock(id)
);

-- Historical Data (البيانات التاريخية)
CREATE TABLE IF NOT EXISTS HistoricalData (
    id TEXT PRIMARY KEY,
    stockId TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    adjustedClose REAL,
    volume REAL,
    createdAt TEXT,
    FOREIGN KEY (stockId) REFERENCES Stock(id),
    UNIQUE(stockId, date)
);

-- Scrape Progress (تتبع التقدم)
CREATE TABLE IF NOT EXISTS ScrapeProgress (
    id TEXT PRIMARY KEY,
    exchange TEXT NOT NULL,
    stockSymbol TEXT NOT NULL,
    dataType TEXT NOT NULL,  -- 'overview', 'income', 'balance', 'cashflow', 'technical', 'statistics'
    status TEXT NOT NULL,    -- 'pending', 'in_progress', 'completed', 'failed'
    lastAttempt TEXT,
    errorMessage TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    UNIQUE(exchange, stockSymbol, dataType)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_exchange ON Stock(exchange);
CREATE INDEX IF NOT EXISTS idx_stock_symbol ON Stock(symbol);
CREATE INDEX IF NOT EXISTS idx_income_stock ON IncomeStatement(stockId);
CREATE INDEX IF NOT EXISTS idx_balance_stock ON BalanceSheet(stockId);
CREATE INDEX IF NOT EXISTS idx_cashflow_stock ON CashFlowStatement(stockId);
CREATE INDEX IF NOT EXISTS idx_technical_stock ON TechnicalAnalysis(stockId);
CREATE INDEX IF NOT EXISTS idx_historical_stock ON HistoricalData(stockId);
CREATE INDEX IF NOT EXISTS idx_dividend_stock ON Dividend(stockId);
