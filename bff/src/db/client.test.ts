import { describe, expect, it, vi } from 'vitest'
import type { Collection, Document } from 'mongodb'
import { guardCollection, WriteNotAllowedError } from './client'

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

describe('guardCollection — R5 read-only guard', () => {
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

  it('allows read ops on any collection', () => {
    const guarded = guardCollection(fakeCollection(), READ_ONLY)
    expect(() => guarded.find({})).not.toThrow()
    expect(() => guarded.findOne({})).not.toThrow()
    expect(() => guarded.aggregate([])).not.toThrow()
    expect(() => guarded.countDocuments({})).not.toThrow()
  })
})
