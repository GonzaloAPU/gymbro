import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { config } from '../src/config.js';
import { sequelize } from '../src/db.js';
import { User } from '../src/models/index.js';

test('compressed profile photos larger than 100 KB reach the profile handler', async t => {
  const originals = [User.findByPk, sequelize.transaction];
  let savedPhoto;
  const user = { id: 'photo-owner', async update(input) { savedPhoto = input.photoUrl; }, toJSON: () => ({id:'photo-owner',photoUrl:savedPhoto}) };
  User.findByPk = async () => user;
  sequelize.transaction = async callback => callback({LOCK:{UPDATE:'UPDATE'}});
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  t.after(() => { [User.findByPk, sequelize.transaction] = originals; server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/auth/me`;
  const headers = {'content-type':'application/json',Authorization:`Bearer ${jwt.sign({sub:'photo-owner'},config.jwtSecret)}`};
  const photoUrl = 'data:image/jpeg;base64,' + 'A'.repeat(640000);
  const response = await fetch(url,{method:'PATCH',headers,body:JSON.stringify({photoUrl})});
  assert.equal(response.status,200);
  assert.equal(savedPhoto,photoUrl);
  assert.equal((await response.json()).photoUrl,photoUrl);
  const oversized = await fetch(url,{method:'PATCH',headers,body:JSON.stringify({photoUrl:'A'.repeat(1100000)})});
  assert.equal(oversized.status,413);
});
