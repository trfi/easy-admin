import { describe, expect, it, vi } from 'vitest'
import type { Collection, Document } from 'mongodb'
import { guardCollection, WriteNotAllowedError, WRITABLE_COLLECTIONS } from './client'

function fakeCollection(): Collection<Document> {
  return {
    insertOne: vi.fn(),
    insertMany: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    replaceOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndReplace: vi.fn(),
    findOneAndDelete: vi.fn(),
    bulkWrite: vi.fn(),
    drop: vi.fn(),
    rename: vi.fn(),
    find: vi.fn(() => ({ toArray: vi.fn() })),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(() => ({ toArray: vi.fn() })),
  } as unknown as Collection<Document>
}

const READ_ONLY = 'users'
const WRITABLE = WRITABLE_COLLECTIONS[0]

describe('guardCollection — R5 write allowlist', () => {
  it('blocks every write op on a non-allowlisted collection', () => {
    const guarded = guardCollection(fakeCollection(), READ_ONLY)
    const writeOps = [
      'insertOne',
      'insertMany',
      'updateOne',
      'updateMany',
      'replaceOne',
      'deleteOne',
      'deleteMany',
      'findOneAndUpdate',
      'findOneAndReplace',
      'findOneAndDelete',
      'bulkWrite',
      'drop',
      'rename',
    ] as const

    for (const op of writeOps) {
      expect(() => (guarded as unknown as Record<string, unknown>)[op]).toThrow(WriteNotAllowedError)
    }
  })

  it('allows read ops on a non-allowlisted collection', () => {
    const guarded = guardCollection(fakeCollection(), READ_ONLY)
    expect(() => guarded.find({})).not.toThrow()
    expect(() => guarded.findOne({})).not.toThrow()
    expect(() => guarded.aggregate([])).not.toThrow()
    expect(() => guarded.countDocuments({})).not.toThrow()
  })

  it('allows write ops on an allowlisted collection', () => {
    const guarded = guardCollection(fakeCollection(), WRITABLE)
    expect(() => guarded.updateOne).not.toThrow()
    expect(() => guarded.findOneAndUpdate).not.toThrow()
  })
})
