CREATE TABLE IF NOT EXISTS laboratory_order_calls (
    id SERIAL PRIMARY KEY,
    laboratory_order_id INTEGER NOT NULL REFERENCES laboratory_orders(id),
    result VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'call',
    next_contact_date DATE,
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_order_calls_order_id ON laboratory_order_calls(laboratory_order_id);
