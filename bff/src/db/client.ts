import { MongoClient, type Db, type Collection, type Document } from 'mongodb'

// Mongoose default-pluralized collection names — see readModels.ts COLLECTIONS.
export const WRITABLE_COLLECTIONS = ['aiproviderconfigs', 'aimodelcomboconfigs'] as const

export type WritableCollection = (typeof WRITABLE_COLLECTIONS)[number]

export class WriteNotAllowedError extends Error {
  constructor(collection: string) {
    super(
      `Write to collection "${collection}" is not allowed. The BFF may only write to: ${WRITABLE_COLLECTIONS.join(
        ', '
      )}. All money/points writes must proxy to EasyQuiz.`
    )
    this.name = 'WriteNotAllowedError'
  }
}

const WRITE_OPS = new Set([
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
])

export function guardCollection<T extends Document>(
  coll: Collection<T>,
  name: string
): Collection<T> {
  if (WRITABLE_COLLECTIONS.includes(name as WritableCollection)) {
    return coll
  }
  return new Proxy(coll, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && WRITE_OPS.has(prop)) {
        throw new WriteNotAllowedError(name)
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

export interface DbHandle {
  db: Db
  collection: <T extends Document = Document>(name: string) => Collection<T>
  close: () => Promise<void>
}

export async function connect(uri: string): Promise<DbHandle> {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()
  return {
    db,
    collection: <T extends Document = Document>(name: string) =>
      guardCollection<T>(db.collection<T>(name), name),
    close: () => client.close(),
  }
}
