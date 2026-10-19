import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { config } from '../src/config.js';
import { TrainingSession, BodyWeightHistory, StrengthRecord } from '../src/models/index.js';

test('profile summary uses lifetime totals independently of recent sessions', async t => {
  const originals = [TrainingSession.findAll, TrainingSession.sum, TrainingSession.count, BodyWeightHistory.findAll, StrengthRecord.findAll];
  TrainingSession.findAll = async options => { assert.equal(options.limit, 12); return [{ calories: 100 }]; };
  TrainingSession.sum = async (field, { where }) => { assert.equal(field, 'calories'); assert.equal(where.userId, 'profile-owner'); assert.equal(where.status, 'COMPLETED'); return '8979.20'; };
  TrainingSession.count = async () => 27;
  BodyWeightHistory.findAll = async () => [];
  StrengthRecord.findAll = async () => [];
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => {
    [TrainingSession.findAll, TrainingSession.sum, TrainingSession.count, BodyWeightHistory.findAll, StrengthRecord.findAll] = originals;
    server.close();
  });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/progress/summary`, { headers: { Authorization: `Bearer ${jwt.sign({ sub: 'profile-owner' }, config.jwtSecret)}` } });
  assert.equal(response.status, 200);
  const summary = await response.json();
  assert.equal(summary.totalCalories, 8979.2);
  assert.equal(summary.completedSessions, 27);
  assert.equal(summary.sessions.length, 1);
});
