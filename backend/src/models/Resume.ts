export interface Resume {
  id: string;
  user_id: string;
  title: string;
  template_id: string;
  is_public: boolean;
  slug?: string;
  theme_color: string;
  font_family: string;
  created_at: Date;
  updated_at: Date;
}

export interface PersonalInfo {
  id: string;
  resume_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  linkedin_url?: string;
  github_url?: string;
  summary?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkExperience {
  id: string;
  resume_id: string;
  company: string;
  position: string;
  location?: string;
  start_date: Date;
  end_date?: Date;
  is_current: boolean;
  description?: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Education {
  id: string;
  resume_id: string;
  institution: string;
  degree: string;
  field_of_study?: string;
  location?: string;
  start_date?: Date;
  end_date?: Date;
  is_current: boolean;
  gpa?: number;
  description?: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Skill {
  id: string;
  resume_id: string;
  name: string;
  category: string;
  proficiency_level: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  resume_id: string;
  title: string;
  description?: string;
  technologies: string[];
  project_url?: string;
  github_url?: string;
  start_date?: Date;
  end_date?: Date;
  is_ongoing: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Certification {
  id: string;
  resume_id: string;
  name: string;
  issuing_organization: string;
  issue_date?: Date;
  expiration_date?: Date;
  credential_id?: string;
  credential_url?: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Language {
  id: string;
  resume_id: string;
  language: string;
  proficiency: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CustomSection {
  id: string;
  resume_id: string;
  title: string;
  content?: string;
  section_type: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  preview_image_url?: string;
  is_premium: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateResumeRequest {
  title: string;
  template_id?: string;
  theme_color?: string;
  font_family?: string;
}

export interface UpdateResumeRequest {
  title?: string;
  template_id?: string;
  is_public?: boolean;
  theme_color?: string;
  font_family?: string;
}

export interface ResumeWithSections {
  resume: Resume;
  personal_info?: PersonalInfo;
  work_experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  custom_sections: CustomSection[];
} 