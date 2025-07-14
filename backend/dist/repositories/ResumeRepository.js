"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeRepository = void 0;
const db_1 = __importDefault(require("../db"));
class ResumeRepository {
    constructor() {
        this.db = db_1.default;
    }
    async createResume(userId, resumeData) {
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
    async findByUserId(userId) {
        const query = 'SELECT * FROM resumes WHERE user_id = $1 ORDER BY updated_at DESC';
        const result = await this.db.query(query, [userId]);
        return result.rows;
    }
    async findById(id) {
        const query = 'SELECT * FROM resumes WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rows[0] || null;
    }
    async findByIdAndUserId(id, userId) {
        const query = 'SELECT * FROM resumes WHERE id = $1 AND user_id = $2';
        const result = await this.db.query(query, [id, userId]);
        return result.rows[0] || null;
    }
    async findBySlug(slug) {
        const query = 'SELECT * FROM resumes WHERE slug = $1 AND is_public = true';
        const result = await this.db.query(query, [slug]);
        return result.rows[0] || null;
    }
    async updateResume(id, userId, updates) {
        const fields = Object.keys(updates);
        const values = fields.map(field => updates[field]);
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
    async deleteResume(id, userId) {
        const query = 'DELETE FROM resumes WHERE id = $1 AND user_id = $2';
        const result = await this.db.query(query, [id, userId]);
        return (result.rowCount || 0) > 0;
    }
    async getResumeWithSections(id, userId) {
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
        const [personalInfoResult, workExperienceResult, educationResult, skillsResult, projectsResult, certificationsResult, languagesResult, customSectionsResult] = await Promise.all([
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
    async generateUniqueSlug(title) {
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
    async setPublic(id, userId, isPublic) {
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
exports.ResumeRepository = ResumeRepository;
