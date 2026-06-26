/**
 * Consumer Utilities
 *
 * Common utility functions for README generation and job processing.
 * Extracted from the monolithic job-board-shared/lib/utils.js during
 * INF-SUBMODULE-1 decomposition. Only contains functions actually used
 * by readme-generator.js and update-readme-only.js.
 */

// Company database (loaded per-repo via initCompanyDatabase)
let companies = {};
let ALL_COMPANIES = [];
let COMPANY_BY_NAME = {};

/**
 * Initialize company database from per-repo companies.json
 */
function initCompanyDatabase(companiesData) {
  if (companiesData) {
    companies = companiesData;
    ALL_COMPANIES = Object.values(companies).flat();
    COMPANY_BY_NAME = {};
    ALL_COMPANIES.forEach(company => {
      COMPANY_BY_NAME[company.name.toLowerCase()] = company;
      company.api_names.forEach(name => {
        COMPANY_BY_NAME[name.toLowerCase()] = company;
      });
    });
  }
}

function getCompanyEmoji(companyName) {
  const company = COMPANY_BY_NAME[companyName.toLowerCase()];
  return company ? company.emoji : '🏢';
}

function getCompanyCareerUrl(companyName) {
  const company = COMPANY_BY_NAME[companyName.toLowerCase()];
  return company ? company.career_url : '#';
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'Recently';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffInHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs < 60 * 60 * 1000) {
    return `${Math.max(1, Math.floor(diffMs / 60000))}m`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1d';
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w`;
    return `${Math.floor(diffInDays / 30)}mo`;
  }
}

function formatLocation(city, state) {
  if (!city && !state) return 'Remote';
  if (!city) return state;
  if (!state) return city;
  if (city.toLowerCase() === 'remote') return 'Remote 🏠';
  return `${city}, ${state}`;
}

function getExperienceLevel(title, description = '', config) {
  const titleLower = (title || '').toLowerCase();
  const fullText = `${titleLower} ${(description || '').toLowerCase()}`;

  if (config && config.categories && config.categories.experienceLevels) {
    const levels = config.categories.experienceLevels;

    if (levels['Senior'] && levels['Senior'].some(keyword => titleLower.includes(keyword))) {
      return 'Senior';
    }
    if (levels['Entry-Level'] && levels['Entry-Level'].some(keyword => fullText.includes(keyword))) {
      return 'Entry-Level';
    }
    if (levels['Mid-Level'] && levels['Mid-Level'].some(keyword => fullText.includes(keyword))) {
      return 'Mid-Level';
    }
  }

  if (titleLower.includes('senior') || titleLower.includes('sr.') || titleLower.includes('lead') ||
      titleLower.includes('principal') || titleLower.includes('staff') || titleLower.includes('architect')) {
    return 'Senior';
  }

  if (fullText.includes('entry') || fullText.includes('junior') || fullText.includes('jr.') ||
      fullText.includes('new grad') || fullText.includes('graduate') || fullText.includes('intern') ||
      fullText.includes('associate') || fullText.includes('level 1') || fullText.includes('l1') ||
      fullText.includes('campus') || fullText.includes('student') || fullText.includes('early career')) {
    return 'Entry-Level';
  }

  return 'Entry-Level';
}

function normalizeCompanyNameStr(company) {
  if (!company) return '';
  return company
    .toLowerCase()
    .trim()
    .replace(/\s+(inc\.?|llc|corp\.?|corporation|ltd\.?|limited|gmbh|co|company)$/i, '')
    .replace(/\s+/g, ' ');
}

function generateMinimalJobFingerprint(job) {
  let title = (job.title || job.job_title || '').toLowerCase().trim();
  title = title
    .replace(/[-_\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  const company = normalizeCompanyNameStr(job.company_name || job.employer_name || job.company || '');

  let location = '';
  if (job.locations && Array.isArray(job.locations) && job.locations.length > 0) {
    location = job.locations[0].split(',')[0];
  } else {
    location = (job.job_city || job.location || '').split(',')[0];
  }
  location = location.toLowerCase().trim();

  return `${company}::${title}::${location}`;
}

module.exports = {
  initCompanyDatabase,
  companies,
  ALL_COMPANIES,
  getCompanyEmoji,
  getCompanyCareerUrl,
  formatTimeAgo,
  formatLocation,
  getExperienceLevel,
  generateMinimalJobFingerprint,
};
