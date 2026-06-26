/**
 * Canada-Tech-Internships-2027-private Configuration
 */
module.exports = {
  version: 1,
  repoPrefix: 'can',
  headingImageAlt: 'Canada Tech Internships 2027',
  title: 'Canada Tech Internships 2027',
  tagline: '(Private Verification Sandbox)',
  jobCountBadgeLabel: 'Canada Tech Internships',
  descriptionLine1: '🚀 Entry-level and internship/co-op tech roles across Canada, sourced live from the canada-tech-internships R2 feed and reviewed privately before any public rollout.',
  descriptionLine2: '',
  noteType: 'TIP',
  noteText: '🔒 Private verification sandbox. The workflow runs on manual trigger only (no schedule) until go-live — no public surface yet.',
  features: { internships: true, moreResources: false, showVisaColumn: false },
  defaultCategory: 'other',
  // R2 feed location (consumed by update-readme-only.js)
  feedKey: 'canada-tech-internships.jsonl',
  r2Prefix: 'data/',
  // Rendered into the README top section as a go-live checklist (see consumer/lib/readme-generator.js)
  goLiveSecrets: [
    { name: 'R2_ACCESS_KEY_ID', description: 'Cloudflare R2 access key (set in repo Settings → Secrets before enabling the workflow).' },
    { name: 'R2_SECRET_ACCESS_KEY', description: 'Cloudflare R2 secret access key.' },
    { name: 'R2_ENDPOINT', description: 'R2 S3 endpoint, e.g. https://<accountid>.r2.cloudflarestorage.com.' },
    { name: 'R2_BUCKET_NAME', description: 'R2 bucket holding the data/ feed (e.g. zjp-data).' },
    { name: 'GH_PAT', description: 'GitHub PAT with repo scope — used by the workflow to checkout and push the regenerated README.' },
  ],
};
