const _log = (level, msg, ctx) => {
  const ts = new Date().toISOString();
  const ctxStr = ctx && Object.keys(ctx).length ? ' ' + JSON.stringify(ctx) : '';
  console.log(`[${ts}] [${level}]${ctxStr} ${msg}`);
};

const logger = {
  debug:    (msg, ctx) => _log('DEBUG', msg, ctx),
  info:     (msg, ctx) => _log('INFO',  msg, ctx),
  warn:     (msg, ctx) => _log('WARN',  msg, ctx),
  error:    (msg, ctx) => _log('ERROR', msg, ctx),
  fatal:    (msg, ctx) => { _log('FATAL', msg, ctx); },
  start:    (msg, ctx) => _log('START', msg, ctx),
  complete: (msg, ctx) => _log('DONE',  msg, ctx),
};

module.exports = { logger };
