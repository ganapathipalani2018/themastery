CREATE TABLE IF NOT EXISTS resume_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    style VARCHAR(50) NOT NULL, -- e.g., 'modern', 'traditional', 'creative'
    description TEXT,
    content JSONB NOT NULL, -- stores the template structure/content
    metadata JSONB, -- for additional info (e.g., preview image, tags)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for style/category filtering
CREATE INDEX IF NOT EXISTS idx_resume_templates_style ON resume_templates(style); 