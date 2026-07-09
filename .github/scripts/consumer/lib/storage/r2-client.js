/**
 * R2 Storage Client — Cloudflare R2 (S3-compatible) for ZJP data files.
 *
 * Usage:
 *   const { createR2Client } = require('../storage/r2-client');
 *   const r2 = createR2Client();
 *   await r2.uploadJson('all_jobs.json', jobsArray);
 *   const data = await r2.downloadJson('all_jobs.json');
 */

const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Create an R2 client from environment variables.
 *
 * Required env vars (set as GitHub Actions secrets):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME
 *
 * @param {Object} [options] - Override defaults
 * @param {string} [options.prefix] - Key prefix for all operations (e.g. 'data/')
 * @param {number} [options.retries] - Max retries per operation (default: 3)
 */
function createR2Client(options = {}) {
  const { prefix = '', retries = 3 } = options;

  const stripQuotes = v => (v || '').trim().replace(/^["']|["']$/g, '');
  const bucket = stripQuotes(process.env.R2_BUCKET_NAME);

  // OUT-CANADABOARD-R2-1: normalize endpoint — strip quotes (secret may have literal quotes),
  // ensure https:// protocol, + forcePathStyle for R2. Fixes 'Invalid URL' / ENOTFOUND errors.
  const rawEndpoint = (process.env.R2_ENDPOINT || '').trim().replace(/^["']|["']$/g, '');
  const endpoint = rawEndpoint && !/^https?:\/\//i.test(rawEndpoint)
    ? `https://${rawEndpoint}`
    : rawEndpoint;
  const client = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: stripQuotes(process.env.R2_ACCESS_KEY_ID),
      secretAccessKey: stripQuotes(process.env.R2_SECRET_ACCESS_KEY),
    },
    maxAttempts: retries,
  });

  function key(name) {
    return prefix ? `${prefix}${name}` : name;
  }

  /**
   * Upload a JSON object to R2.
   * Uses atomic-write pattern: write to temp key, then copy to final key.
   * On failure, the temp key is cleaned up; final key remains unchanged.
   */
  async function uploadJson(name, data, metadata = {}) {
    const body = JSON.stringify(data);
    const finalKey = key(name);
    const tempKey = `${finalKey}.tmp-${Date.now()}`;

    try {
      // Write to temp key first
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: tempKey,
        Body: body,
        ContentType: 'application/json',
        Metadata: metadata,
      }));

      // Overwrite final key with temp key's content (atomic from reader's perspective)
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        Body: body,
        ContentType: 'application/json',
        Metadata: metadata,
      }));

      // Clean up temp key
      await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: tempKey,
      })).catch(() => {}); // Non-fatal cleanup

      console.log(`R2 upload OK: ${name} (${(body.length / 1024).toFixed(1)} KB)`);
      return true;
    } catch (err) {
      // Clean up temp key on failure
      await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: tempKey,
      })).catch(() => {});

      console.error(`R2 upload FAILED: ${name} — ${err.message}`);
      return false;
    }
  }

  /**
   * Upload a raw buffer or string to R2.
   */
  async function uploadRaw(name, body, contentType = 'application/octet-stream') {
    const finalKey = key(name);
    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        Body: body,
        ContentType: contentType,
      }));
      console.log(`R2 upload OK: ${name} (${(body.length / 1024).toFixed(1)} KB)`);
      return true;
    } catch (err) {
      console.error(`R2 upload FAILED: ${name} — ${err.message}`);
      return false;
    }
  }

  /**
   * Download and parse a JSON object from R2.
   * Returns null if the key doesn't exist or parsing fails.
   */
  async function downloadJson(name) {
    const k = key(name);
    try {
      const resp = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: k,
      }));
      const body = await resp.Body.transformToString();
      return JSON.parse(body);
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error(`R2 download FAILED: ${name} — ${err.message}`);
      return null;
    }
  }

  /**
   * Download raw bytes from R2. Returns null if key doesn't exist.
   */
  async function downloadRaw(name) {
    try {
      const resp = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key(name),
      }));
      return await resp.Body.transformToByteArray();
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error(`R2 download FAILED: ${name} — ${err.message}`);
      return null;
    }
  }

  /**
   * Check if a key exists and return its metadata (size, last modified).
   */
  async function head(name) {
    try {
      const resp = await client.send(new HeadObjectCommand({
        Bucket: bucket,
        Key: key(name),
      }));
      return {
        size: resp.ContentLength,
        lastModified: resp.LastModified,
        contentType: resp.ContentType,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * List keys with the given prefix.
   */
  async function list(prefixFilter = '') {
    const resp = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: key(prefixFilter),
      MaxKeys: 1000,
    }));
    return (resp.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  }

  /**
   * Write the last-updated manifest — timestamp marker for freshness checks.
   */
  async function writeManifest(extra = {}) {
    return uploadJson('last-updated.json', {
      timestamp: new Date().toISOString(),
      source: 'zjp-pipeline',
      ...extra,
    });
  }

  /**
   * Upload multiple JSONL lines as a single file.
   */
  async function uploadJsonl(name, lines, contentType = 'application/x-jsonlines') {
    const body = Array.isArray(lines) ? lines.join('\n') : lines;
    return uploadRaw(name, body, contentType);
  }

  return {
    uploadJson,
    uploadRaw,
    downloadJson,
    downloadRaw,
    head,
    list,
    writeManifest,
    uploadJsonl,
    bucket,
  };
}

module.exports = { createR2Client };
