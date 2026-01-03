import { Pool, PoolConfig } from 'pg';
import * as dns from 'dns';

// Force IPv4 resolution to avoid IPv6 connectivity issues
dns.setDefaultResultOrder('ipv4first');

const poolConfig: PoolConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'salt_app',
  user: process.env.DATABASE_USER || 'salt_app',
  password: process.env.DATABASE_PASSWORD,
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// Secondary pool for surf_analytics database (read-only access)
const analyticsPoolConfig: PoolConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: 'surf_analytics',
  user: process.env.DATABASE_USER || 'salt_app',
  password: process.env.DATABASE_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const analyticsPool = new Pool(analyticsPoolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

analyticsPool.on('error', (err) => {
  console.error('Unexpected error on analytics pool idle client', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const analyticsQuery = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await analyticsPool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed analytics query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Analytics database query error:', error);
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  client.query = (...args: any[]) => {
    return query.apply(client, args as any);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
};
