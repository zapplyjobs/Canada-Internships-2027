const fs = require('fs');
const path = require('path');
const consumerUtils = require('../consumer/lib/utils');
let companies = {};
const companiesPath = path.join(__dirname, 'companies.json');
if (fs.existsSync(companiesPath)) {
  companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
  const firstCategory = Object.values(companies)[0];
  if (Array.isArray(firstCategory)) consumerUtils.initCompanyDatabase(companies);
}
module.exports = { ...consumerUtils, companies, ALL_COMPANIES: consumerUtils.ALL_COMPANIES };
