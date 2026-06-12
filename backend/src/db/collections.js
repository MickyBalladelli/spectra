import { randomUUID } from 'crypto'
import { withClient } from './pool.js'

const collectionColumns = `c.id, c.name, c.owner_user_id as "ownerUserId", c.created_at as "createdAt",
  (c.owner_user_id = $1) as "isOwner",
  case
    when c.owner_user_id = $1 then 'owner'
    else (
      select cs.role from collection_shares cs
      where cs.collection_id = c.id and cs.user_id = $1
      limit 1
    )
  end as "userRole",
  (select count(*)::int from collection_documents cd where cd.collection_id = c.id) as "documentCount",
  coalesce((
    select json_agg(json_build_object('userId', cs.user_id, 'role', cs.role) order by cs.user_id)
    from collection_shares cs
    where cs.collection_id = c.id
  ), '[]'::json) as shares`

export async function listCollections({ userId }) {
  const result = await withClient(client => client.query(
    `select ${collectionColumns}
     from collections c
     where c.owner_user_id = $1
        or exists (
          select 1 from collection_shares cs
          where cs.collection_id = c.id and cs.user_id = $1
        )
     order by c.created_at desc`,
    [userId]
  ))

  return result.rows
}

export async function createCollection({ userId, name }) {
  const id = randomUUID()
  const result = await withClient(client => client.query(
    `insert into collections (id, owner_user_id, name)
     values ($1, $2, $3)
     returning id, name, owner_user_id as "ownerUserId", created_at as "createdAt",
       true as "isOwner", 'owner' as "userRole", 0 as "documentCount", '[]'::json as shares`,
    [id, userId, name]
  ))

  return result.rows[0]
}

export async function listCollectionDocuments({ userId, collectionId }) {
  const result = await withClient(client => client.query(
    `select d.id, d.title, d.source_type as "sourceType", d.created_at as "createdAt", d.metadata
     from collection_documents cd
     join collections c on c.id = cd.collection_id
     join documents d on d.id = cd.document_id
     where cd.collection_id = $1
       and (
         c.owner_user_id = $2
         or exists (
           select 1 from collection_shares cs
           where cs.collection_id = c.id and cs.user_id = $2
         )
       )
     order by d.created_at desc`,
    [collectionId, userId]
  ))

  return result.rows
}

export async function addDocumentToCollection({ userId, collectionId, documentId }) {
  const result = await withClient(client => client.query(
    `insert into collection_documents (collection_id, document_id, added_by)
     select c.id, d.id, $1
     from collections c
     join documents d on d.id = $3 and d.user_id = $1
     where c.id = $2
       and (
         c.owner_user_id = $1
         or exists (
           select 1 from collection_shares cs
           where cs.collection_id = c.id and cs.user_id = $1 and cs.role = 'editor'
         )
       )
     on conflict do nothing
     returning collection_id as "collectionId", document_id as "documentId"`,
    [userId, collectionId, documentId]
  ))

  return result.rows[0] || null
}

export async function removeDocumentFromCollection({ userId, collectionId, documentId }) {
  const result = await withClient(client => client.query(
    `delete from collection_documents cd
     using collections c
     where c.id = cd.collection_id
       and cd.collection_id = $1
       and cd.document_id = $2
       and (
         c.owner_user_id = $3
         or exists (
           select 1 from collection_shares cs
           where cs.collection_id = c.id and cs.user_id = $3 and cs.role = 'editor'
         )
       )
     returning cd.collection_id as "collectionId", cd.document_id as "documentId"`,
    [collectionId, documentId, userId]
  ))

  return result.rows[0] || null
}

export async function shareCollection({ userId, collectionId, targetUserId, role = 'viewer' }) {
  const result = await withClient(client => client.query(
    `insert into collection_shares (collection_id, user_id, role)
     select c.id, u.username, $4
     from collections c
     join users u on u.username = $3
     where c.id = $2
       and c.owner_user_id = $1
       and u.username <> c.owner_user_id
     on conflict (collection_id, user_id) do update
       set role = excluded.role
     returning collection_id as "collectionId", user_id as "userId", role`,
    [userId, collectionId, targetUserId, role]
  ))

  return result.rows[0] || null
}

export async function userCanAccessCollection({ userId, collectionId }) {
  const result = await withClient(client => client.query(
    `select 1
     from collections c
     where c.id = $1
       and (
         c.owner_user_id = $2
         or exists (
           select 1 from collection_shares cs
           where cs.collection_id = c.id and cs.user_id = $2
         )
       )
     limit 1`,
    [collectionId, userId]
  ))

  return result.rowCount > 0
}
