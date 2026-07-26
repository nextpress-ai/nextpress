import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll } from 'vitest';
import * as schema from '@shared/schema';

/** Import this module only from tests that need an in-memory PGlite database. */

const client = new PGlite();
export const testDb = drizzle(client, { schema });

const TEST_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR,
	email VARCHAR UNIQUE,
	email_verified BOOLEAN DEFAULT false NOT NULL,
	first_name VARCHAR,
	last_name VARCHAR,
	profile_image_url VARCHAR,
	username VARCHAR UNIQUE NOT NULL,
	display_username VARCHAR,
	password VARCHAR,
	status VARCHAR DEFAULT 'active',
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	other JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS auth_sessions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	expires_at TIMESTAMP NOT NULL,
	token VARCHAR NOT NULL UNIQUE,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
	ip_address VARCHAR,
	user_agent TEXT,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	account_id VARCHAR NOT NULL,
	provider_id VARCHAR NOT NULL,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	access_token TEXT,
	refresh_token TEXT,
	id_token TEXT,
	access_token_expires_at TIMESTAMP,
	refresh_token_expires_at TIMESTAMP,
	scope TEXT,
	password TEXT,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS verifications (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	identifier VARCHAR NOT NULL,
	value VARCHAR NOT NULL,
	expires_at TIMESTAMP NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR,
	description TEXT,
	logo_url VARCHAR,
	favicon_url VARCHAR,
	site_url VARCHAR,
	owner_id UUID NOT NULL REFERENCES users(id),
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	settings JSONB DEFAULT '{}',
	active_theme_id UUID,
	is_default BOOLEAN DEFAULT false,
	other JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS pages (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	title VARCHAR NOT NULL,
	slug VARCHAR NOT NULL,
	site_id UUID NOT NULL REFERENCES sites(id),
	status VARCHAR DEFAULT 'draft',
	author_id UUID NOT NULL REFERENCES users(id),
	featured_image VARCHAR,
	published_at TIMESTAMP,
	allow_comments BOOLEAN DEFAULT true,
	password VARCHAR,
	parent_id UUID,
	menu_order INTEGER DEFAULT 0,
	template_id UUID,
	blocks JSONB DEFAULT '[]',
	version INTEGER NOT NULL DEFAULT 0,
	history JSONB DEFAULT '[]',
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	other JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS blogs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR NOT NULL,
	description TEXT,
	slug VARCHAR NOT NULL,
	status VARCHAR DEFAULT 'draft',
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	site_id UUID,
	author_id UUID NOT NULL REFERENCES users(id),
	page_id UUID REFERENCES pages(id),
	settings JSONB DEFAULT '{}',
	other JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS posts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	title VARCHAR NOT NULL,
	slug VARCHAR NOT NULL,
	status VARCHAR DEFAULT 'draft',
	author_id UUID NOT NULL REFERENCES users(id),
	featured_image VARCHAR,
	excerpt TEXT,
	published_at TIMESTAMP,
	allow_comments BOOLEAN DEFAULT true,
	password VARCHAR,
	parent_id UUID,
	template_id UUID,
	blocks JSONB DEFAULT '[]',
	version INTEGER NOT NULL DEFAULT 0,
	settings JSONB DEFAULT '{}',
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	blog_id UUID REFERENCES blogs(id),
	other JSONB DEFAULT '{"categories":[],"tags":[]}'
);

CREATE TABLE IF NOT EXISTS comments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	post_id UUID NOT NULL REFERENCES posts(id),
	author_id UUID REFERENCES users(id),
	author_name VARCHAR,
	author_email VARCHAR,
	content TEXT NOT NULL,
	status VARCHAR DEFAULT 'pending',
	parent_id UUID,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	other JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS media (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	filename VARCHAR NOT NULL,
	original_name VARCHAR NOT NULL,
	mime_type VARCHAR NOT NULL,
	size INTEGER NOT NULL,
	url VARCHAR NOT NULL,
	site_id UUID NOT NULL,
	author_id UUID NOT NULL REFERENCES users(id),
	alt VARCHAR,
	caption TEXT,
	description TEXT,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE media ADD COLUMN IF NOT EXISTS site_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE TABLE IF NOT EXISTS themes (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR NOT NULL,
	description TEXT,
	author_id UUID NOT NULL REFERENCES users(id),
	version VARCHAR NOT NULL,
	requires VARCHAR NOT NULL,
	renderer VARCHAR,
	is_paid BOOLEAN DEFAULT false,
	price INTEGER DEFAULT 0,
	currency VARCHAR DEFAULT 'USD',
	status VARCHAR DEFAULT 'draft',
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	settings JSONB DEFAULT '{}',
	other JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS plugins (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR NOT NULL,
	description TEXT,
	runs_when VARCHAR DEFAULT 'rendering',
	author_id UUID NOT NULL REFERENCES users(id),
	status VARCHAR DEFAULT 'inactive',
	version VARCHAR NOT NULL,
	requires VARCHAR NOT NULL,
	is_paid BOOLEAN DEFAULT false,
	price INTEGER DEFAULT 0,
	currency VARCHAR DEFAULT 'USD',
	settings JSONB DEFAULT '{}',
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	other JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS options (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR NOT NULL,
	value TEXT NOT NULL,
	site_id UUID NOT NULL,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	other JSONB DEFAULT '{}'
);

ALTER TABLE options ADD COLUMN IF NOT EXISTS site_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE TABLE IF NOT EXISTS templates (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR NOT NULL,
	type VARCHAR NOT NULL,
	description TEXT,
	author_id UUID NOT NULL REFERENCES users(id),
	blocks JSONB NOT NULL DEFAULT '[]',
	settings JSONB DEFAULT '{}',
	other JSONB DEFAULT '{}',
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR NOT NULL,
	description TEXT,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),
	capabilities JSONB DEFAULT '[]',
	site_id UUID,
	other JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_roles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id),
	role_id UUID NOT NULL REFERENCES roles(id),
	site_id UUID NOT NULL,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW()
);
`;

beforeAll(async () => {
	await client.exec(TEST_SCHEMA_SQL);
});

afterAll(async () => {
	await client.close();
});
