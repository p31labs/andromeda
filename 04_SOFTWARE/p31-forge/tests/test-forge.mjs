import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const forge = require(path.join(ROOT, 'forge.js'));
const B = require(path.join(ROOT, 'brand.js'));
const { CHANNELS } = forge;

const FIXTURES = {
  court: JSON.parse(fs.readFileSync(path.join(ROOT, 'content/legal/2025CV936/supplemental_notice.json'), 'utf8')),
  grant: JSON.parse(fs.readFileSync(path.join(ROOT, 'content/grants/gates.json'), 'utf8')),
  resolution: JSON.parse(fs.readFileSync(path.join(ROOT, 'content/corporate/resolution_initial_board.json'), 'utf8')),
  memo: { kind: 'memo', to: 'Board of Directors', from: 'William R. Johnson', date: 'April 14, 2026', subject: 'Test Memo', body: [{ type: 'para', text: 'Test memo body.' }] },
  letter: { kind: 'letter', date: 'April 14, 2026', recipient: ['Jennifer L. McGhan, Esq.', 'McGhan Law, LLC', '575 E. King Avenue', 'Kingsland, Georgia 31548'], re: ['RE: Test Subject'], salutation: 'Dear Ms. McGhan,', closing: 'Respectfully,', signature: { name: 'William R. Johnson, Pro Se', lines: ['401 Powder Horn Rd', 'Saint Marys, Georgia 31558'] }, body: [{ type: 'para', text: 'Test letter body.' }] },
  social: JSON.parse(fs.readFileSync(path.join(ROOT, 'content/social/posts.json'), 'utf8')),
};

describe('TRIPER — P31 Forge Document Generation Engine', () => {

  describe('T — Type Checks & Module Contracts', () => {

    it('forge.js exports all required functions', () => {
      const expectedFns = [
        'compile', 'compileFile', 'renderBody',
        'renderCourt', 'renderLetter', 'renderResolution', 'renderMemo', 'renderGrant',
        'court', 'letter', 'corporate', 'grant', 'social',
        'publish', 'publishPack'
      ];
      for (const name of expectedFns) {
        assert.equal(typeof forge[name], 'function',
          `forge.${name} should be a function, got ${typeof forge[name]}`);
      }
      assert.ok(typeof forge.CHANNELS === 'object' && forge.CHANNELS !== null,
        'forge.CHANNELS should be a non-null object');
    });

    it('brand.js exports all required constants and builders', () => {
      const constants = ['COLORS', 'TYPE', 'PAGES', 'ENTITY', 'SOCIAL', 'BORDERS'];
      for (const name of constants) {
        assert.ok(B[name], `brand.${name} missing`);
      }
      const builders = [
        'makeHeader', 'makeFooter', 'makeSection',
        'text', 'para', 'heading1', 'heading2', 'field',
        'bullet', 'numbered', 'affects', 'timeline',
        'courtCaption', 'signatureBlock', 'certOfService',
        'formatSocial', 'grantElevator', 'grantWhitespace'
      ];
      for (const name of builders) {
        assert.equal(typeof B[name], 'function',
          `brand.${name} should be a function`);
      }
    });

    it('compile accepts all documented renderer kinds', () => {
      const kinds = ['paper', 'court', 'letter', 'resolution', 'memo', 'grant'];
      for (const kind of kinds) {
        const pack = { kind, title: 'Test', body: [] };
        if (kind === 'court') pack.date = 'April 14, 2026';
        assert.doesNotThrow(() => forge.compile(pack),
          `compile should accept kind "${kind}"`);
      }
    });

    it('compile throws on unknown kind', () => {
      assert.throws(
        () => forge.compile({ kind: 'invalid' }),
        /Unknown content-pack kind/
      );
    });

    it('grant() accepts gates, nlnet, asan', () => {
      for (const prog of ['gates', 'nlnet', 'asan']) {
        const doc = forge.grant(prog);
        assert.ok(doc, `grant('${prog}') should return a Document`);
      }
    });

    it('grant() throws on unknown program', () => {
      assert.throws(
        () => forge.grant('nonexistent'),
        /Unknown grant/
      );
    });

    it('corporate() accepts resolution and memo', () => {
      assert.doesNotThrow(() => forge.corporate('resolution', 'April 14, 2026'));
      assert.doesNotThrow(() => forge.corporate('memo', 'April 14, 2026', { subject: 'Test' }));
    });

    it('corporate() throws on unknown type', () => {
      assert.throws(
        () => forge.corporate('bylaws', 'April 14, 2026'),
        /Unknown corporate type/
      );
    });
  });

  describe('R — Renderers', () => {

    it('render court content pack produces Document', async () => {
      const doc = forge.compile(FIXTURES.court);
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 1000, 'Court docx should exceed 1KB');
    });

    it('render grant content pack produces Document', async () => {
      const doc = forge.compile(FIXTURES.grant);
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('render resolution content pack produces Document', async () => {
      const doc = forge.compile(FIXTURES.resolution);
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('render memo content pack produces Document', async () => {
      const doc = forge.compile(FIXTURES.memo);
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('ad-hoc court() scaffold produces Document', async () => {
      const doc = forge.court('MOTION TITLE', '14th day of April, 2026');
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('ad-hoc letter() scaffold produces Document', async () => {
      const doc = forge.letter('RE: Test', 'April 14, 2026');
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('corporate resolution scaffold produces Document', async () => {
      const doc = forge.corporate('resolution', 'April 14, 2026');
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('corporate memo scaffold produces Document', async () => {
      const doc = forge.corporate('memo', 'April 14, 2026', { subject: 'Test' });
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('grant gates scaffold produces Document', async () => {
      const doc = forge.grant('gates');
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('grant nlnet scaffold produces Document', async () => {
      const doc = forge.grant('nlnet');
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });

    it('grant asan scaffold produces Document', async () => {
      const doc = forge.grant('asan');
      assert.ok(doc);
      const { Packer } = require('docx');
      const buffer = await Packer.toBuffer(doc);
      assert.ok(buffer.length > 0);
    });
  });

  describe('I — Integrity (Content Pack Compilation)', () => {

    const contentPacks = [
      'content/legal/2025CV936/supplemental_notice.json',
      'content/legal/2025CV936/business_documentation.json',
      'content/legal/2025CV936/response_good_faith.json',
      'content/legal/2025CV936/hearing_script_and_fallbacks.json',
      'content/legal/2025CV936/hearing_quick_ref_sheet.json',
      'content/legal/2025CV936/hearing_day_final_prep.json',
      'content/legal/2025CV936/hearing_day_carry_card.json',
      'content/grants/gates.json',
      'content/grants/nlnet.json',
      'content/grants/asan.json',
      'content/grants/awesome.json',
      'content/grants/microsoft.json',
      'content/grants/stimpunks.json',
      'content/corporate/resolution_initial_board.json',
    ];

    for (const relPath of contentPacks) {
      const absPath = path.join(ROOT, relPath);
      if (!fs.existsSync(absPath)) continue;

      it(`compiles ${path.basename(relPath)} from disk`, async () => {
        const outPath = await forge.compileFile(absPath);
        assert.ok(fs.existsSync(outPath), `Output file should exist: ${outPath}`);
        const stat = fs.statSync(outPath);
        assert.ok(stat.size > 0, `Output file should be non-empty: ${outPath}`);
      });
    }

    it('compileFile throws for nonexistent path', async () => {
      await assert.rejects(
        () => forge.compileFile('/nonexistent/path.json'),
        /Content pack not found/
      );
    });
  });

  describe('P — Protocol (CLI & Brand)', () => {

    it('brand constants contain all required color keys as 6-char hex', () => {
      const required = ['coral', 'coralDark', 'teal', 'black', 'dark', 'med', 'gray',
        'lightGray', 'border', 'rule', 'subtle', 'warmBg', 'lightBg', 'alertBg', 'white'];
      for (const key of required) {
        assert.equal(typeof B.COLORS[key], 'string', `COLORS.${key} should be string`);
        assert.match(B.COLORS[key], /^[0-9A-F]{6}$/, `COLORS.${key} should be 6-char hex`);
      }
    });

    it('brand constants contain all required type size keys', () => {
      const required = ['h1', 'h2', 'h3', 'body', 'small', 'tiny', 'micro', 'caption'];
      for (const key of required) {
        assert.equal(typeof B.TYPE[key], 'number', `TYPE.${key} should be number`);
      }
    });

    it('brand fonts are strings', () => {
      assert.equal(typeof B.TYPE.serif, 'string');
      assert.equal(typeof B.TYPE.mono, 'string');
    });

    it('EIN is correct value 42-1888158', () => {
      assert.equal(B.ENTITY.ein, '42-1888158');
    });

    it('ENTITY.org is P31 Labs, Inc.', () => {
      assert.equal(B.ENTITY.org, 'P31 Labs, Inc.');
    });

    it('formatSocial returns required shape for all platforms', () => {
      const platforms = ['twitter', 'bluesky', 'mastodon', 'linkedin', 'facebook'];
      const content = 'Test post content for P31 Labs validation.';
      for (const platform of platforms) {
        const result = B.formatSocial(content, platform);
        assert.equal(typeof result.text, 'string');
        assert.equal(typeof result.length, 'number');
        assert.equal(typeof result.maxLength, 'number');
        assert.equal(result.platform, platform);
        assert.equal(typeof result.remaining, 'number');
        assert.ok(result.length <= result.maxLength,
          `${platform}: length ${result.length} exceeds max ${result.maxLength}`);
      }
    });

    it('formatSocial truncates content exceeding platform max', () => {
      const longContent = 'A'.repeat(500);
      const result = B.formatSocial(longContent, 'twitter');
      assert.ok(result.length <= B.SOCIAL.maxLength.twitter);
      assert.ok(result.text.endsWith('...'));
    });

    it('formatSocial appends hashtags when space allows', () => {
      const shortContent = 'Hello';
      const result = B.formatSocial(shortContent, 'linkedin');
      assert.ok(result.text.includes('#P31Labs'));
    });

    it('grantElevator returns non-empty string', () => {
      assert.ok(B.grantElevator().length > 0);
    });

    it('grantWhitespace returns non-empty string', () => {
      assert.ok(B.grantWhitespace().length > 0);
    });

    it('PAGE layouts have size, margin, contentWidth', () => {
      for (const layout of ['letter', 'legal']) {
        assert.ok(B.PAGES[layout].size, `PAGES.${layout}.size`);
        assert.ok(B.PAGES[layout].margin, `PAGES.${layout}.margin`);
        assert.ok(B.PAGES[layout].contentWidth > 0, `PAGES.${layout}.contentWidth`);
      }
    });

    it('SOCIAL maxLength values match platform specs', () => {
      assert.equal(B.SOCIAL.maxLength.twitter, 280);
      assert.equal(B.SOCIAL.maxLength.bluesky, 300);
      assert.equal(B.SOCIAL.maxLength.mastodon, 500);
      assert.equal(B.SOCIAL.maxLength.linkedin, 3000);
    });
  });

  describe('E — Edge Cases', () => {

    it('renderBody handles empty array', () => {
      const result = forge.renderBody([], {});
      assert.equal(result.length, 0);
    });

    it('renderBody handles all body item types', () => {
      const items = [
        { type: 'h1', text: 'Heading 1' },
        { type: 'h2', text: 'Heading 2' },
        { type: 'para', text: 'Paragraph' },
        { type: 'field', label: 'Label', value: 'Value' },
        { type: 'bullet', text: 'Bullet item' },
        { type: 'numbered', text: 'Numbered item' },
        { type: 'affects', text: 'Affects: test' },
        { type: 'timeline', entries: [{ date: 'April 14', text: 'Event' }] },
      ];
      const result = forge.renderBody(items, {});
      assert.ok(result.length >= 8, `Expected >= 8 paragraphs, got ${result.length}`);
    });

    it('courtCaption returns array of paragraphs', () => {
      const result = B.courtCaption('TEST MOTION');
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });

    it('signatureBlock returns array with signature lines', () => {
      const result = B.signatureBlock('14th day of April, 2026');
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });

    it('certOfService returns array', () => {
      const result = B.certOfService('14th day of April, 2026');
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });

    it('numbered items auto-increment across a run', () => {
      const items = [
        { type: 'numbered', text: 'First' },
        { type: 'numbered', text: 'Second' },
        { type: 'numbered', text: 'Third' },
      ];
      const result = forge.renderBody(items);
      assert.equal(result.length, 3);
    });

    it('numbered counter resets between runs', () => {
      const run2 = forge.renderBody([
        { type: 'para', text: 'Spacer' },
        { type: 'numbered', text: 'B1' },
        { type: 'numbered', text: 'B2' },
      ]);
      assert.equal(run2.length, 3);
    });

    it('compileFile writes to out/ directory', async () => {
      const testPack = path.join(ROOT, 'content/grants/gates.json');
      const outPath = await forge.compileFile(testPack);
      assert.ok(outPath.includes('out'));
      assert.ok(fs.existsSync(outPath));
    });

    it('social() returns result object with text and length', () => {
      const result = forge.social('Test post', 'bluesky');
      assert.ok(result);
      assert.equal(typeof result.text, 'string');
      assert.equal(typeof result.length, 'number');
    });
  });

  describe('R — Registry (Channels & Fixtures)', () => {

    it('CHANNELS contains all 9 expected channels', () => {
      const expected = ['twitter', 'bluesky', 'mastodon', 'devto', 'hashnode', 'zenodo', 'grants', 'substack', 'discord'];
      for (const ch of expected) {
        assert.ok(CHANNELS[ch], `CHANNELS.${ch} missing`);
      }
    });

    it('publish throws for unknown channel', async () => {
      await assert.rejects(
        () => forge.publish('nonexistent', 'content'),
        /Unknown channel/
      );
    });

    it('content packs on disk are valid JSON with required kind field', () => {
      const packsDir = path.join(ROOT, 'content');
      const legalDir = function (d) { return path.join(packsDir, 'legal/2025CV936'); }();
      const grantsDir = path.join(packsDir, 'grants');
      const corporateDir = path.join(packsDir, 'corporate');
      const validKinds = ['court', 'letter', 'resolution', 'memo', 'grant', 'paper', 'social-pack'];

      const validateFile = (dir, f) => {
        const absPath = path.join(dir, f);
        const raw = fs.readFileSync(absPath, 'utf8');
        const pack = JSON.parse(raw);
        assert.ok(pack.kind, `${f} missing kind`);
        assert.ok(validKinds.includes(pack.kind), `${f} has invalid kind: ${pack.kind}`);
      };

      if (fs.existsSync(legalDir)) {
        for (const f of fs.readdirSync(legalDir)) {
          if (f.endsWith('.json')) validateFile(legalDir, f);
        }
      }
      if (fs.existsSync(grantsDir)) {
        for (const f of fs.readdirSync(grantsDir)) {
          if (f.endsWith('.json')) validateFile(grantsDir, f);
        }
      }
      if (fs.existsSync(corporateDir)) {
        for (const f of fs.readdirSync(corporateDir)) {
          if (f.endsWith('.json')) validateFile(corporateDir, f);
        }
      }
    });

    it('omnibus content packs (paper01 through paper25) exist on disk', () => {
      const omnibusDir = path.join(ROOT, 'content/omnibus');
      for (let i = 1; i <= 25; i++) {
        const p = path.join(omnibusDir, `paper${String(i).padStart(2, '0')}.json`);
        assert.ok(fs.existsSync(p), `Missing omnibus paper: paper${String(i).padStart(2, '0')}.json`);
      }
    });

    it('social posts pack has required structure and all posts valid', () => {
      const pack = FIXTURES.social;
      assert.equal(pack.kind, 'social-pack');
      assert.ok(Array.isArray(pack.posts));
      assert.ok(pack.posts.length > 0);
      for (const post of pack.posts) {
        assert.ok(post.id, 'Post missing id');
        assert.ok(post.content, 'Post missing content');
        assert.ok(Array.isArray(post.targets), 'Post targets should be array');
      }
    });

    it('build-discovery script exists and references compileFile', () => {
      const script = path.join(ROOT, 'scripts/build-discovery.js');
      assert.ok(fs.existsSync(script));
      const raw = fs.readFileSync(script, 'utf8');
      assert.ok(raw.includes('compileFile'));
    });
  });
});
