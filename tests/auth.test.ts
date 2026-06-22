import assert from 'node:assert/strict'
import test from 'node:test'
import { checkPin } from '../src/lib/auth.ts'

test('checkPin validates LOGIN_PIN', () => {
  process.env.LOGIN_PIN = '123456'
  delete process.env.LOGIN_PASSWORD

  assert.equal(checkPin('123456'), true)
  assert.equal(checkPin('12345'), false)
})

test('checkPin falls back to LOGIN_PASSWORD during migration', () => {
  delete process.env.LOGIN_PIN
  process.env.LOGIN_PASSWORD = '9876'

  assert.equal(checkPin('9876'), true)
})
