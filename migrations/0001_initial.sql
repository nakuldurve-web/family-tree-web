-- Family Tree Database Schema
-- Run with: wrangler d1 execute family-tree-db --local --file=migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  parent_id TEXT,
  tooltip TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  status TEXT DEFAULT 'approved',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spouses (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  person_id TEXT NOT NULL,
  image_url TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_html TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS galleries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  gdrive_link TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  person_name TEXT DEFAULT '',
  person_full_name TEXT DEFAULT '',
  parent_id TEXT DEFAULT '',
  spouse_of TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  link_description TEXT DEFAULT '',
  tooltip TEXT DEFAULT '',
  submitter_name TEXT DEFAULT '',
  submitter_email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  submitted_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_people_parent_id ON people(parent_id);
CREATE INDEX IF NOT EXISTS idx_people_status ON people(status);
CREATE INDEX IF NOT EXISTS idx_spouses_person_id ON spouses(person_id);
CREATE INDEX IF NOT EXISTS idx_links_person_id ON links(person_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
