import test from 'node:test'
import assert from 'node:assert/strict'
import { revokeRefreshTokenFamily } from '../controller/authController.js'

test('logout revokes all refresh tokens in the same family', async () => {
  const updates = []
  const fakeModel = {
    updateMany: async (filter, update) => {
      updates.push({ filter, update })
      return { acknowledged: true }
    }
  }

  await revokeRefreshTokenFamily({
    familyId: 'family-123',
    role: 'user',
    model: fakeModel
  })

  assert.equal(updates.length, 1)
  assert.deepEqual(updates[0].filter, { familyId: 'family-123', role: 'user', revokedAt: null })
  assert.ok(updates[0].update.revokedAt instanceof Date)
})
