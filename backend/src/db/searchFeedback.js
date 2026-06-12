import { withClient } from './pool.js'

export async function saveSearchFeedback({ userId, queryAuditId, chunkId, rating }) {
  const result = await withClient(client => client.query(
    `with allowed as (
       select $1::text as user_id, $2::bigint as query_audit_id, $3::bigint as chunk_id, $4::text as rating
       where exists (
         select 1 from query_audit_logs
         where id = $2::bigint and user_id = $1
       )
       and exists (
         select 1
         from document_chunks dc
         join documents d on d.id = dc.document_id
         where dc.id = $3::bigint and dc.user_id = $1 and d.user_id = $1
       )
     )
     insert into search_feedback (user_id, query_audit_id, chunk_id, rating)
     select user_id, query_audit_id, chunk_id, rating from allowed
     on conflict (user_id, query_audit_id, chunk_id) do update
       set rating = excluded.rating,
         created_at = now()
     returning id, user_id as "userId", query_audit_id as "queryAuditId",
       chunk_id as "chunkId", rating, created_at as "createdAt"`,
    [userId, queryAuditId, chunkId, rating]
  ))

  if (!result.rows[0]) {
    const error = new Error('Search result not found')
    error.status = 404
    throw error
  }

  return result.rows[0]
}
