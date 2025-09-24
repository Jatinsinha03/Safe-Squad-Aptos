-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(66) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create squad_invites table
CREATE TABLE squad_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    squad_name VARCHAR(255) NOT NULL,
    creator_wallet VARCHAR(66) NOT NULL,
    invitee_wallet VARCHAR(66) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique invite per squad per invitee
    UNIQUE(squad_name, invitee_wallet)
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_wallet_address ON profiles(wallet_address);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_squad_invites_creator ON squad_invites(creator_wallet);
CREATE INDEX idx_squad_invites_invitee ON squad_invites(invitee_wallet);
CREATE INDEX idx_squad_invites_status ON squad_invites(status);
CREATE INDEX idx_squad_invites_squad_name ON squad_invites(squad_name);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_squad_invites_updated_at BEFORE UPDATE ON squad_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Row Level Security (RLS) policies removed since we're using NextAuth instead of Supabase Auth
-- Authentication and authorization will be handled at the application level through NextAuth sessions

-- Create a view for squad completion status
CREATE VIEW squad_completion_status AS
SELECT 
    squad_name,
    creator_wallet,
    COUNT(*) as total_invites,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invites,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invites,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_invites,
    CASE 
        WHEN COUNT(CASE WHEN status = 'accepted' THEN 1 END) = COUNT(*) 
        THEN true 
        ELSE false 
    END as is_complete,
    MIN(created_at) as first_invite_created,
    MAX(updated_at) as last_activity
FROM squad_invites 
GROUP BY squad_name, creator_wallet;
