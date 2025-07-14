import { Pool } from 'pg';
import { Resume, CreateResumeRequest, UpdateResumeRequest, ResumeWithSections } from '../models/Resume';
import pool from '../db';

export class ResumeRepository {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  async createResume(userId: string, resumeData: CreateResumeRequest): Promise<Resume> {
    const query = `
      INSERT INTO resumes (user_id, title, template_id, theme_color, font_family)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      userId,
      resumeData.title,
      resumeData.template_id || 'modern',
      resumeData.theme_color || '#3B82F6',
      resumeData.font_family || 'Inter'
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findByUserId(userId: string): Promise<Resume[]> {
    const query = 'SELECT * FROM resumes WHERE user_id = $1 ORDER BY updated_at DESC';
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async findById(id: string): Promise<Resume | null> {
    const query = 'SELECT * FROM resumes WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Resume | null> {
    const query = 'SELECT * FROM resumes WHERE id = $1 AND user_id = $2';
    const result = await this.db.query(query, [id, userId]);
    return result.rows[0] || null;
  }

  async findBySlug(slug: string): Promise<Resume | null> {
    const query = 'SELECT * FROM resumes WHERE slug = $1 AND is_public = true';
    const result = await this.db.query(query, [slug]);
    return result.rows[0] || null;
  }

  async updateResume(id: string, userId: string, updates: UpdateResumeRequest): Promise<Resume | null> {
    const fields = Object.keys(updates);
    const values = fields.map(field => updates[field as keyof UpdateResumeRequest]);
    
    if (fields.length === 0) {
      return this.findByIdAndUserId(id, userId);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const query = `
      UPDATE resumes 
      SET ${setClause}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [id, userId, ...values]);
    return result.rows[0] || null;
  }

  async deleteResume(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM resumes WHERE id = $1 AND user_id = $2';
    const result = await this.db.query(query, [id, userId]);
    return (result.rowCount || 0) > 0;
  }

  async getResumeWithSections(id: string, userId?: string): Promise<ResumeWithSections | null> {
    // First get the resume
    const resumeQuery = userId 
      ? 'SELECT * FROM resumes WHERE id = $1 AND user_id = $2'
      : 'SELECT * FROM resumes WHERE id = $1 AND is_public = true';
    
    const resumeParams = userId ? [id, userId] : [id];
    const resumeResult = await this.db.query(resumeQuery, resumeParams);
    
    if (resumeResult.rows.length === 0) {
      return null;
    }

    const resume = resumeResult.rows[0];

    // Get all sections in parallel
    const [
      personalInfoResult,
      workExperienceResult,
      educationResult,
      skillsResult,
      projectsResult,
      certificationsResult,
      languagesResult,
      customSectionsResult
    ] = await Promise.all([
      this.db.query('SELECT * FROM personal_info WHERE resume_id = $1', [id]),
      this.db.query('SELECT * FROM work_experience WHERE resume_id = $1 ORDER BY sort_order, start_date DESC', [id]),
      this.db.query('SELECT * FROM education WHERE resume_id = $1 ORDER BY sort_order, start_date DESC', [id]),
      this.db.query('SELECT * FROM skills WHERE resume_id = $1 ORDER BY sort_order, category, name', [id]),
      this.db.query('SELECT * FROM projects WHERE resume_id = $1 ORDER BY sort_order, start_date DESC', [id]),
      this.db.query('SELECT * FROM certifications WHERE resume_id = $1 ORDER BY sort_order, issue_date DESC', [id]),
      this.db.query('SELECT * FROM languages WHERE resume_id = $1 ORDER BY sort_order, language', [id]),
      this.db.query('SELECT * FROM custom_sections WHERE resume_id = $1 ORDER BY sort_order, title', [id])
    ]);

    return {
      resume,
      personal_info: personalInfoResult.rows[0] || undefined,
      work_experience: workExperienceResult.rows,
      education: educationResult.rows,
      skills: skillsResult.rows,
      projects: projectsResult.rows,
      certifications: certificationsResult.rows,
      languages: languagesResult.rows,
      custom_sections: customSectionsResult.rows
    };
  }

  async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingResume = await this.findBySlug(slug);
      if (!existingResume) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async setPublic(id: string, userId: string, isPublic: boolean): Promise<Resume | null> {
    let slug = null;
    
    if (isPublic) {
      const resume = await this.findByIdAndUserId(id, userId);
      if (resume) {
        slug = await this.generateUniqueSlug(resume.title);
      }
    }

    const query = `
      UPDATE resumes 
      SET is_public = $1, slug = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;

    const result = await this.db.query(query, [isPublic, slug, id, userId]);
    return result.rows[0] || null;
  }
} 