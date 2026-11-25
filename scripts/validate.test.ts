// Run: npm run test:validate
import assert from 'node:assert/strict';

import { buildPrompt, isOwnOriginal, isRoomType, isStyle } from '../src/lib/catalog.ts';

assert.ok(isRoomType('bedroom') && !isRoomType('garage') && !isRoomType(undefined) && !isRoomType({}));
assert.ok(isStyle('japandi') && !isStyle('JAPANDI') && !isStyle(42));

assert.ok(isOwnOriginal('/users/u1/originals/room_abc.jpg', 'u1'));
assert.ok(!isOwnOriginal('/users/u2/originals/room.jpg', 'u1'), "another user's photo");
assert.ok(!isOwnOriginal('/users/u1/results/room.jpg', 'u1'), 'only originals');
assert.ok(!isOwnOriginal('/users/u1/originals/../../u2/originals/x.jpg', 'u1'), 'path traversal');
assert.ok(!isOwnOriginal('/users/u1/originals/%2e%2e/%2E%2E/u2/originals/x.jpg', 'u1'), 'encoded traversal');
assert.ok(!isOwnOriginal('/users/u1/originals/sub/x.jpg', 'u1'), 'nested path');
assert.ok(isOwnOriginal('/users/u1/originals/room.jpg', 'u1'));
assert.ok(!isOwnOriginal('/users/u10/originals/x.jpg', 'u1'), 'id prefix');
assert.ok(!isOwnOriginal(null, 'u1'));

const p = buildPrompt('home-office', 'coastal');
assert.match(p, /^Redesign this home office .* Coastal style: white slipcovered/);
assert.match(p, /same camera angle/);

console.log('validate: all assertions passed');
