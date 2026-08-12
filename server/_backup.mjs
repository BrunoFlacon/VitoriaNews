import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ghtkdkauseesambzqfrd.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTUwMTQsImV4cCI6MjA4OTUzMTAxNH0.X1OeIwLezATvztpzJzDJWMSUgukNXIWNQp2L1rHkLGs';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BACKUP_DIR = path.resolve('C:/wamp64/www/lovableproj/social-canvas-hub/supabase/backups/full_backup_2026-07-10_15-54');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const SCHEMA_FILE = path.join(BACKUP_DIR, '02_schema_ddl.sql');
const DATA_FILE = path.join(BACKUP_DIR, '03_data.sql');
const POLICIES_FILE = path.join(BACKUP_DIR, '04_policies.sql');
const INDEXES_FILE = path.join(BACKUP_DIR, '05_indexes.sql');
const TRIGGERS_FILE = path.join(BACKUP_DIR, '06_triggers.sql');
const FUNCTIONS_FILE = path.join(BACKUP_DIR, '07_functions.sql');
const ERRORS_FILE = path.join(BACKUP_DIR, '08_errors.json');

const errors = [];
let allTables = [];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// 1. Query all public tables from information_schema
async function getTables() {
  const { data, error } = await supabase
    .rpc('get_tables_list')
    .maybeSingle();

  // If rpc doesn't exist, query information_schema directly via REST
  if (error || !data) {
    console.log('RPC not available, querying information_schema via REST...');
    const { data: cols, error: colsErr } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public');

    if (colsErr) {
      // Try querying information_schema.columns as fallback
      const { data: tabs, error: tabsErr } = await supabase
        .from('information_schema.columns')
        .select('table_name')
        .eq('table_schema', 'public');

      if (tabsErr) {
        throw new Error(`Cannot query information_schema: ${tabsErr.message}`);
      }
      
      const uniqueTables = [...new Set(tabs.map(t => t.table_name))];
      return uniqueTables.map(name => ({ table_name: name, table_type: 'BASE TABLE' }));
    }
    return cols;
  }
  return data;
}

// 2. Query columns for a table
async function getColumns(tableName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position');

  if (error) {
    console.error(`  [ERROR] Cannot get columns for ${tableName}: ${error.message}`);
    return [];
  }
  return data;
}

// 3. Query constraints for a table
async function getConstraints(tableName) {
  const { data, error } = await supabase
    .from('information_schema.table_constraints')
    .select('constraint_name, constraint_type')
    .eq('table_schema', 'public')
    .eq('table_name', tableName);

  if (error) return [];
  return data;
}

// 4. Query table data via REST API (limited to avoid timeout)
async function fetchTableData(tableName) {
  const allData = [];
  let from = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, from + limit - 1)
        .limit(limit);

      if (error) {
        console.error(`  [ERROR] Fetch ${tableName}: ${error.message}`);
        errors.push({ table: tableName, type: 'data_fetch', error: error.message });
        return null;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
        from += limit;
        if (data.length < limit) hasMore = false;
      }
      
      // Small delay to avoid rate limiting
      await sleep(100);
    } catch (e) {
      console.error(`  [ERROR] Fetch ${tableName} exception: ${e.message}`);
      errors.push({ table: tableName, type: 'data_fetch_exception', error: e.message });
      return null;
    }
  }

  return allData;
}

// 5. Generate DDL for a table
function generateCreateTable(tableName, columns, constraints) {
  const lines = [];
  
  // Check for primary key constraints
  const pkConstraints = constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
  
  lines.push(`-- Table: ${tableName}`);
  lines.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (`);
  
  const colDefs = columns.map(col => {
    let def = `  ${col.column_name} ${col.data_type}`;
    if (col.character_maximum_length) {
      def += `(${col.character_maximum_length})`;
    }
    if (col.is_nullable === 'NO') def += ' NOT NULL';
    if (col.column_default) def += ` DEFAULT ${col.column_default}`;
    return def;
  });
  
  lines.push(colDefs.join(',\n'));
  lines.push(');\n');
  
  return lines.join('\n');
}

// 6. Generate INSERT statements
function generateInserts(tableName, data, columns) {
  if (!data || data.length === 0) return '';
  
  const colNames = columns.map(c => c.column_name).join(', ');
  const lines = [];
  lines.push(`-- Data for ${tableName} (${data.length} rows)`);
  
  for (const row of data) {
    const values = columns.map(col => {
      const val = row[col.column_name];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'string') {
        return `'${val.replace(/'/g, "''")}'`;
      }
      if (typeof val === 'object') {
        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      }
      return val;
    });
    lines.push(`INSERT INTO public.${tableName} (${colNames}) VALUES (${values.join(', ')});`);
  }
  
  lines.push('');
  return lines.join('\n');
}

// Main backup function
async function runBackup() {
  console.log('=== Supabase Remote Backup ===');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Output: ${BACKUP_DIR}\n`);

  // Step 1: Get all tables
  console.log('1. Fetching all tables...');
  try {
    allTables = await getTables();
    console.log(`   Found ${allTables.length} tables/views`);
  } catch (e) {
    console.error(`   FATAL: Cannot fetch tables: ${e.message}`);
    errors.push({ type: 'fatal', error: e.message });
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
    return;
  }

  // Filter to BASE TABLE only
  const baseTables = allTables.filter(t => t.table_type === 'BASE TABLE' || !t.table_type);
  console.log(`   Base tables: ${baseTables.length}`);

  const schemaParts = [];
  const dataParts = [];
  let tableCount = 0;

  // Step 2: Process each table
  for (const table of baseTables) {
    const name = table.table_name;
    tableCount++;
    console.log(`\n[${tableCount}/${baseTables.length}] ${name}...`);

    // Get columns
    const cols = await getColumns(name);
    if (cols.length === 0) {
      console.log(`   SKIP (no columns returned)`);
      continue;
    }
    console.log(`   Columns: ${cols.length}`);

    // Get constraints
    const constraints = await getConstraints(name);

    // Generate CREATE TABLE DDL
    const ddl = generateCreateTable(name, cols, constraints);
    schemaParts.push(ddl);
    console.log(`   DDL generated`);

    // Fetch data
    console.log(`   Fetching data...`);
    const tableData = await fetchTableData(name);
    if (tableData) {
      console.log(`   Data rows: ${tableData.length}`);
      const inserts = generateInserts(name, tableData, cols);
      dataParts.push(inserts);
    }

    // Small delay between tables
    await sleep(200);
  }

  // Step 3: Try to get RLS policies
  console.log('\n2. Fetching RLS Policies...');
  try {
    const { data: policies, error: polErr } = await supabase
      .from('information_schema.rls_policies')
      .select('*')
      .eq('schemaname', 'public');

    if (!polErr && policies) {
      const policyParts = [];
      for (const pol of policies) {
        policyParts.push(`-- Policy: ${pol.policyname} on ${pol.tablename}`);
        policyParts.push(`-- Command: ${pol.cmd}`);
        policyParts.push(`-- Using: ${pol.policypermissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
        policyParts.push(`-- ${pol.qual}`);
        policyParts.push(`-- ${pol.with_check}\n`);
      }
      if (policyParts.length > 0) {
        fs.writeFileSync(POLICIES_FILE, policyParts.join('\n'));
        console.log(`   ${policies.length} policies saved`);
      } else {
        console.log(`   No policies found`);
      }
    } else {
      console.log(`   Cannot access RLS policies via REST (${polErr?.message || 'no data'})`);
    }
  } catch (e) {
    console.log(`   Cannot access RLS policies: ${e.message}`);
  }

  // Step 4: Try to get indexes
  console.log('\n3. Fetching Indexes...');
  try {
    const { data: indexes, error: idxErr } = await supabase
      .from('information_schema.statistics')
      .select('*')
      .eq('table_schema', 'public');

    if (!idxErr && indexes && indexes.length > 0) {
      const idxParts = ['-- Indexes\n'];
      for (const idx of indexes) {
        idxParts.push(`-- ${idx.index_name} on ${idx.table_name}`);
      }
      fs.writeFileSync(INDEXES_FILE, idxParts.join('\n'));
      console.log(`   ${indexes.length} indexes`);
    } else {
      console.log(`   Cannot access indexes via REST or none found`);
    }
  } catch (e) {
    console.log(`   Cannot access indexes: ${e.message}`);
  }

  // Step 5: Write output files
  console.log('\n4. Writing output files...');
  
  if (schemaParts.length > 0) {
    const schemaHeader = `-- ============================================\n-- Supabase Schema Backup\n-- Project: ${SUPABASE_URL}\n-- Date: ${new Date().toISOString()}\n-- Tables: ${schemaParts.length}\n-- ============================================\n\n`;
    fs.writeFileSync(SCHEMA_FILE, schemaHeader + schemaParts.join('\n'));
    console.log(`   Schema DDL: ${SCHEMA_FILE}`);
  }

  if (dataParts.length > 0) {
    const dataHeader = `-- ============================================\n-- Supabase Data Backup\n-- Project: ${SUPABASE_URL}\n-- Date: ${new Date().toISOString()}\n-- ============================================\n\nSET session_replication_role = 'replica';\n\n`;
    fs.writeFileSync(DATA_FILE, dataHeader + dataParts.join('\n') + `\nSET session_replication_role = 'origin';\n`);
    console.log(`   Data: ${DATA_FILE}`);
  }

  if (errors.length > 0) {
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
    console.log(`   Errors: ${ERRORS_FILE}`);
  }

  console.log('\n=== Backup Complete ===');
}

runBackup().catch(console.error);
