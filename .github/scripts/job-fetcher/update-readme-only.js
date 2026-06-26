#!/usr/bin/env node
/**
 * update-readme-only.js — Canada consumer README regenerator.
 *
 * Reads the Canada tech feed from Cloudflare R2 (S3-compatible) via the shared
 * r2-client, falling back to the committed snapshot (.github/data/current_jobs.json)
 * when R2 credentials are absent or the read fails (e.g. pre-secrets local runs).
 *
 * Feed key + prefix come from config.js (feedKey, r2Prefix) — single source of truth.
 */
const fs = require('fs');
const path = require('path');
const { logger } = require('../consumer/index.js');
const { updateReadme } = require('./readme-generator');
const { createR2Client } = require('../consumer/lib/storage/r2-client');
const config = require(path.join(__dirname, 'config.js'));

const SNAPSHOT = path.join(__dirname, '../../data/current_jobs.json');
const FEED_KEY = config.feedKey;
const R2_PREFIX = config.r2Prefix || 'data/';

function parseNdjson(text) {
  return text.trim().split(/\n+/).filter(Boolean).map(line => JSON.parse(line));
}

async function loadFromR2() {
  // createR2Client throws synchronously if R2_BUCKET_NAME is unset → caught by caller.
  const r2 = createR2Client({ prefix: R2_PREFIX });
  const raw = await r2.downloadRaw(FEED_KEY);
  if (raw == null) throw new Error(`R2 read returned no data for key: ${R2_PREFIX}${FEED_KEY}`);
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8')
    : raw instanceof Uint8Array ? Buffer.from(raw).toString('utf8')
    : String(raw);
  return parseNdjson(text);
}

function loadFromSnapshot() {
  if (!fs.existsSync(SNAPSHOT)) throw new Error(`Snapshot missing: ${SNAPSHOT}`);
  return JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
}

function normalizeJob(row) {
  return {
    employer_name: row.company_name || row.employer_name || 'Unknown',
    job_title: row.title || row.job_title || '',
    job_location: row.location || row.job_location || '',
    job_city: row.job_city || '',
    job_state: row.job_state || '',
    job_posted_at_datetime_utc: row.posted_at || row.job_posted_at_datetime_utc || null,
    job_apply_link: row.apply_url || row.job_apply_link || row.url || '#',
    enrichment: row.enrichment || {},
  };
}

async function main() {
  try {
    logger.start('README regeneration', { mode: 'R2 preferred, snapshot fallback', feed: FEED_KEY });
    let rawJobs;
    let source;
    try {
      rawJobs = await loadFromR2();
      source = 'r2';
      logger.info('Loaded live feed from R2', { source, key: R2_PREFIX + FEED_KEY, count: rawJobs.length });
    } catch (err) {
      source = 'snapshot';
      logger.warn('Falling back to committed snapshot', { source, reason: err.message });
      rawJobs = loadFromSnapshot();
    }
    const allJobs = rawJobs.map(normalizeJob);
    const stats = { totalByCompany: {}, byLevel: {}, byLocation: {}, byCategory: {} };
    allJobs.forEach(job => {
      stats.totalByCompany[job.employer_name] = (stats.totalByCompany[job.employer_name] || 0) + 1;
    });
    await updateReadme(allJobs, [], null, stats);
    logger.complete('README regenerated', { source, jobs_processed: allJobs.length, companies: Object.keys(stats.totalByCompany).length });
  } catch (error) {
    logger.fatal('Error updating README', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}
main();
