-- SQL script to create the safe_senders table in Supabase
-- Run this in your Supabase SQL Editor

-- Create the safe_senders table
CREATE TABLE IF NOT EXISTS safe_senders (
  id BIGSERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain, user_id) -- Prevent duplicate entries for the same domain and user
);

-- Create RLS (Row Level Security) policies
ALTER TABLE safe_senders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own safe senders
CREATE POLICY "Users can view their own safe senders" ON safe_senders
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own safe senders
CREATE POLICY "Users can insert their own safe senders" ON safe_senders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own safe senders
CREATE POLICY "Users can update their own safe senders" ON safe_senders
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own safe senders  
CREATE POLICY "Users can delete their own safe senders" ON safe_senders
  FOR DELETE USING (auth.uid() = user_id);

-- Create an index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_safe_senders_user_id ON safe_senders(user_id);
CREATE INDEX IF NOT EXISTS idx_safe_senders_domain ON safe_senders(domain);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER update_safe_senders_updated_at 
  BEFORE UPDATE ON safe_senders 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
