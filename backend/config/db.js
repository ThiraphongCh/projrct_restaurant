const { Pool } = require('pg');

// PostgreSQL connection pool
// Credentials: default user 'postgres', password 12345, db 'restaurant_demo'
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345',
  database: process.env.PGDATABASE || 'restaurant_demo',
  options: '-c timezone=Asia/Bangkok',
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS menus (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_th VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        description_th TEXT NOT NULL DEFAULT '',
        price NUMERIC(10, 2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        image_url TEXT NOT NULL DEFAULT '',
        available BOOLEAN NOT NULL DEFAULT true,
        featured BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Safely add bilingual columns if the table already exists without them
    await client.query(`ALTER TABLE menus ADD COLUMN IF NOT EXISTS name_th VARCHAR(255) NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE menus ADD COLUMN IF NOT EXISTS description_th TEXT NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE menus ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(20) UNIQUE NOT NULL,
        items JSONB NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL DEFAULT '',
        table_number VARCHAR(20) NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        order_type VARCHAR(20) NOT NULL DEFAULT 'dine_in',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(30) NOT NULL DEFAULT '',
        paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        change_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        paid_at TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Safely add order fields if the table already exists without them
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'dine_in'`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_amount NUMERIC(10, 2) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`);

    // Key/value settings (e.g. restaurant table count)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Concurrency-safe order number sequence.
    await client.query(`CREATE SEQUENCE IF NOT EXISTS orders_order_num_seq START 1`);
    await client.query(`
      SELECT setval('orders_order_num_seq',
        GREATEST(
          COALESCE((SELECT MAX((substring(order_number from 5))::int) FROM orders), 1),
          COALESCE((SELECT last_value FROM orders_order_num_seq), 1)
        )
      )
    `);

    console.log('PostgreSQL database initialized');
  } finally {
    client.release();
  }
};

// Helper: serialize a row from menus table to a plain object
const rowToMenu = (row) => ({
  _id: String(row.id),
  id: row.id,
  name: row.name,
  nameTh: row.name_th,
  description: row.description,
  descriptionTh: row.description_th,
  price: Number(row.price),
  category: row.category,
  imageUrl: row.image_url,
  available: row.available,
  featured: row.featured,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

module.exports = { pool, initDb, rowToMenu };