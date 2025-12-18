const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const { silentExit } = require('./helpers');
const { User } = require('@librechat/data-schemas').createModels(mongoose);
const connect = require('./connect');

// docker-compose exec api npm run export-costs --month=YYYYMM --group=user,date,model,token_type

(async () => {
  await connect();

  /**
   * Show the welcome / help menu
   */
  console.purple('-----------------------------');
  console.purple('Aggregated transactions by user/month/model/tokenType');
  console.purple('-----------------------------');

  // Parse optional parameters: --month=YYYYMM or YYYY-MM, --csv, --out=path
  // Also supports env vars: MONTH, OUT
  const argv = process.argv.slice(2);
  let npmOriginalArgs = [];
  try {
    if (process.env.npm_config_argv) {
      const parsed = JSON.parse(process.env.npm_config_argv);
      if (parsed && Array.isArray(parsed.original)) npmOriginalArgs = parsed.original;
    }
  } catch {}
  const argvAll = [...argv, ...npmOriginalArgs];

  const getArg = (name) => {
    const withEq = argvAll.find((a) => typeof a === 'string' && a.startsWith(`--${name}=`));
    if (withEq) return withEq.split('=')[1];
    const flagBool = argvAll.includes(`--${name}`);
    if (flagBool) return true;
    const envName = name.toUpperCase();
    if (process.env[envName]) return process.env[envName];
    const npmVar = `npm_config_${name}`;
    if (process.env[npmVar]) return process.env[npmVar];
    return undefined;
  };
  const monthParam = getArg('month'); // e.g., 202507 or 2025-07
  let formattedMonth;
  if (monthParam && typeof monthParam === 'string') {
    const m = monthParam.trim();
    if (/^\d{6}$/.test(m)) {
      formattedMonth = `${m.slice(0, 4)}-${m.slice(4, 6)}`;
    } else if (/^\d{4}-\d{2}$/.test(m)) {
      formattedMonth = m;
    } else {
      console.warn('Ignoring invalid --month value. Expected YYYYMM or YYYY-MM.');
    }
  } else if (monthParam === true && process.env.MONTH) {
    const m = String(process.env.MONTH).trim();
    if (/^\d{6}$/.test(m)) {
      formattedMonth = `${m.slice(0, 4)}-${m.slice(4, 6)}`;
    } else if (/^\d{4}-\d{2}$/.test(m)) {
      formattedMonth = m;
    }
  }
  const outPath = getArg('out') || (getArg('csv') ? 'user-stats.csv' : undefined);

  // Grouping parameter: --group=user,date,model,token_type (comma-separated)
  const groupParam = getArg('group');
  const normalizeGroupName = (s) => {
    const t = String(s).trim().toLowerCase().replace(/-/g, '_');
    if (t === 'tokentype') return 'token_type';
    if (t === 'month') return 'date';
    return t;
  };
  const allowedGroups = new Set(['user', 'date', 'model', 'token_type']);
  let groupFields = ['user']; // default: all
  if (groupParam && typeof groupParam === 'string') {
    const parsed = groupParam
      .split(',')
      .map(normalizeGroupName)
      .filter((x) => allowedGroups.has(x));
    if (parsed.length > 0) {
      groupFields = parsed;
    }
  }

  // Precompute month date range if filtering
  let startDate, endDate;
  if (formattedMonth) {
    const [yearStr, monthStr] = formattedMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      startDate = new Date(Date.UTC(year, month - 1, 1));
      endDate = new Date(Date.UTC(year, month, 1));
    }
  }

  // Pretty-print table without index column
  function printTable(rows, cols) {
    if (!rows || rows.length === 0) {
      console.log(cols.join(' | '));
      return;
    }
    const widths = cols.map((h) =>
      Math.max(
        h.length,
        ...rows.map((r) => String(r[h] ?? '').length),
      ),
    );
    const sep = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
    const header = '|' + cols.map((h, i) => ' ' + h.padEnd(widths[i]) + ' ').join('|') + '|';
    console.log(sep);
    console.log(header);
    console.log(sep);
    for (const r of rows) {
      const line =
        '|' +
        cols.map((h, i) => ' ' + String(r[h] ?? '').padEnd(widths[i]) + ' ').join('|') +
        '|';
      console.log(line);
    }
    console.log(sep);
  }

  // Aggregate transactions by user, month-year, model, tokenType
  const txColl = mongoose.connection.db.collection('transactions');

  const pipeline = [];

  if (formattedMonth && startDate && endDate) {
    // Match by createdAt date range for the requested month (UTC boundaries)
    pipeline.push({ $match: { createdAt: { $gte: startDate, $lt: endDate } } });
  }

  pipeline.push({
    $project: {
      user: 1,
      model: 1,
      tokenType: 1,
      rawAmount: 1,
      tokenValue: 1,
      createdAt: 1,
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } },
    },
  });

  // Build dynamic group stage based on requested grouping fields
  const groupMap = {
    user: { idKey: 'user', expr: '$user' },
    date: { idKey: 'month', expr: '$month' },
    model: { idKey: 'model', expr: '$model' },
    token_type: { idKey: 'tokenType', expr: '$tokenType' },
  };

  const groupId = {};
  for (const f of groupFields) {
    const m = groupMap[f];
    if (m) groupId[m.idKey] = m.expr;
  }

  pipeline.push({
    $group: {
      _id: groupId,
      tokens: { $sum: '$rawAmount' },
      cost: { $sum: '$tokenValue' },
    },
  });

  // If grouping includes user, enrich with user doc
  if (groupFields.includes('user')) {
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: '_id.user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
    );
  }

  // Dynamic projection for selected grouping fields
  const projectDoc = {
    _id: 0,
    tokens: '$tokens',
    cost: { $divide: ['$cost', 1e3] }, // convert credits to usd (1000 credits -> 1 USD)
  };
  if (groupFields.includes('user')) {
    projectDoc.user = {
      $ifNull: [
        { $ifNull: ['$userDoc.email', '$userDoc.name'] },
        { $toString: '$_id.user' },
      ],
    };
  }
  if (groupFields.includes('date')) {
    projectDoc.date = '$_id.month';
  }
  if (groupFields.includes('model')) {
    projectDoc.model = '$_id.model';
  }
  if (groupFields.includes('token_type')) {
    projectDoc.token_type = '$_id.tokenType';
  }
  pipeline.push({ $project: projectDoc });

  // Sort by selected grouping fields
  const sortDoc = {};
  for (const f of groupFields) {
    sortDoc[f] = 1;
  }
  pipeline.push({ $sort: sortDoc });

  if (formattedMonth) {
    console.purple(`Filter: ${formattedMonth}`);
  } else {
    console.purple('Filter: none');
  }
  const results = await txColl.aggregate(pipeline).toArray();

  const cols = [...groupFields, 'tokens', 'cost'];
  printTable(results, cols);

  if (outPath) {
    const headers = cols;
    const escapeCSV = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const csv = [headers.join(',')]
      .concat(results.map((row) => headers.map((h) => escapeCSV(row[h])).join(',')))
      .join('\n');

    try {
      fs.writeFileSync(outPath, csv);
      console.purple(`CSV written to: ${outPath}`);
    } catch (e) {
      console.error('Failed to write CSV:', e.message);
    }
  }

  silentExit(0);
})();

process.on('uncaughtException', (err) => {
  if (!err.message.includes('fetch failed')) {
    console.error('There was an uncaught error:');
    console.error(err);
  }

  if (!err.message.includes('fetch failed')) {
    process.exit(1);
  }
});
