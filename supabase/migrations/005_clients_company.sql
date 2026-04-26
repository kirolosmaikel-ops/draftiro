-- Add company column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company TEXT;
