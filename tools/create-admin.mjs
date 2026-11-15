#!/usr/bin/env node
/**
 * Creates (or updates) an editorial account in whatever database `DATABASE_URL` points at.
 * Used once per deployment because the production seed intentionally creates no users.
 *
 * Usage:
 *   node tools/create-admin.mjs --email admin@example.com --name "Archive Admin" \
 *     --password '...' --role ADMIN [--tribe zulu] [--force]
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromApi = createRequire(path.join(ROOT, 'apps/api/package.json'));
const requireFromDb = createRequire(path.join(ROOT, 'packages/db/package.json'));
const { PrismaClient } = requireFromDb('@prisma/client');
const { hash: argon2Hash, Algorithm } = requireFromApi('@node-rs/argon2');

const args = process.argv.slice(2);
function arg(name, fallback = undefined) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
const flag = (name) => args.includes(`--${name}`);

const email = arg('email');
const name = arg('name', 'Archive Admin');
const password = arg('password');
const role = arg('role', 'ADMIN');
const tribeSlug = arg('tribe');

if (!email || !password) {
  console.error('Usage: node tools/create-admin.mjs --email <email> --password <password> [--name <name>] [--role ADMIN|EDITOR] [--tribe <slug>] [--force]');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Password must be at least 12 characters for an editorial account.');
  process.exit(1);
}
if (!['ADMIN', 'EDITOR'].includes(role)) {
  console.error('Role must be ADMIN or EDITOR.');
  process.exit(1);
}

// argon2id parameters from the production plan (mirrors PasswordService).
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const prisma = new PrismaClient();
try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !flag('force')) {
    console.error(`An account already exists for ${email}. Pass --force to reset its password.`);
    process.exit(1);
  }
  const tribe = tribeSlug ? await prisma.tribe.findUnique({ where: { slug: tribeSlug } }) : null;
  if (tribeSlug && !tribe) {
    console.error(`Unknown tribe slug: ${tribeSlug}`);
    process.exit(1);
  }
  const passwordHash = await argon2Hash(password, ARGON2_OPTIONS);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      displayName: name,
      passwordHash,
      systemRole: role,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      onboardedAt: new Date(),
      ...(tribe ? { tribeId: tribe.id, lineageLabel: tribe.name } : {}),
      stats: { create: {} },
    },
    update: {
      displayName: name,
      passwordHash,
      systemRole: role,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      ...(tribe ? { tribeId: tribe.id, lineageLabel: tribe.name } : {}),
    },
  });
  console.log(`✓ ${role} ready: ${user.email} (${user.displayName})`);
} finally {
  await prisma.$disconnect();
}
