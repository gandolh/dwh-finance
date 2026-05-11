export interface AlphaVantageRequest {
  function: string;
  symbol: string;
  apikey: string;
  outputsize?: 'compact' | 'full';
}

export interface AlphaVantageDailyQuote {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

export interface AlphaVantageResponse {
  'Meta Data'?: Record<string, string>;
  'Time Series (Daily)'?: Record<string, AlphaVantageDailyQuote>;
  'Error Message'?: string;
  Note?: string;
}

export interface CoinGeckoRequest {
  vs_currency: string;
  days: string | number;
  interval?: string;
}

export interface CoinGeckoResponse {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface FrankfurterRequest {
  from: string;
  to: string;
}

export interface FrankfurterResponse {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
}

export interface PolygonRequest {
  apiKey: string;
  adjusted?: boolean;
  sort?: 'asc' | 'desc';
  limit?: number;
}

export interface PolygonResult {
  volume: number;
  volumeWeightedAveragePrice?: number;
  open: number;
  close: number;
  high: number;
  low: number;
  timestamp: number;
  numberOfTransactions?: number;
}

export interface PolygonResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results?: PolygonResult[];
  status: string;
  request_id: string;
  count: number;
}

export interface TwelveDataRequest {
  symbol: string;
  interval: string;
  apikey: string;
  outputsize?: number;
  start_date?: string;
  end_date?: string;
}

export interface TwelveDataTimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface TwelveDataResponse {
  meta?: Record<string, any>;
  values?: TwelveDataTimeSeriesValue[];
  status: string;
  message?: string;
}

export interface YahooFinanceRequest {
  period1: number;
  period2: number;
  interval: string;
  includePrePost?: boolean;
  events?: string;
}

export interface YahooFinanceQuote {
  open: (number | null)[];
  close: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  volume: (number | null)[];
}

export interface YahooFinanceResult {
  meta: Record<string, any>;
  timestamp?: number[];
  indicators: {
    quote: YahooFinanceQuote[];
  };
}

export interface YahooFinanceResponse {
  chart: {
    result: YahooFinanceResult[] | null;
    error: any;
  };
}
