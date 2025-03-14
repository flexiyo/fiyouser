import { sql } from "../db/index.js";
import { GrpcResponse } from "../utils/GrpcResponse.js";
import { getFields } from "../utils/getFields.js";
import { fetchRelation } from "../utils/fetchRelation.js";

const connectionService = {
  GetUserFollowers: async (call, callback) => {
    const { req_user_id, user_id, offset = 0, req_fields } = call.request;
    const fields = getFields(req_fields);

    const users = await sql`
      SELECT ${sql.unsafe(fields)},
      FROM followers f
      JOIN users u ON f.follower_id = u.id
      WHERE f.followee_id = ${user_id} AND f.is_following = true
      OFFSET ${offset} LIMIT 10;
    `;

    if (req_fields.includes("relation")) {
      for (const user of users) {
        user.relation = await fetchRelation(req_user_id, user.id);
      }
    }

    return callback(
      null,
      users.length > 0
        ? { ...GrpcResponse.success("Followers found."), users }
        : GrpcResponse.error("No users found.")
    );
  },

  GetUserFollowing: async (call, callback) => {
    const { req_user_id, user_id, offset = 0, req_fields } = call.request;
    const fields = getFields(req_fields);

    const users = await sql`
      SELECT ${sql.unsafe(fields)}
      FROM followers f
      JOIN users u ON f.followee_id = u.id
      WHERE f.follower_id = ${user_id} AND f.is_following = true
      OFFSET ${offset} LIMIT 10;
    `;

    if (req_fields.includes("relation")) {
      for (const user of users) {
        user.relation = await fetchRelation(req_user_id, user.id);
      }
    }

    return callback(
      null,
      users.length > 0
        ? { ...GrpcResponse.success("Following users found."), users }
        : GrpcResponse.error("No users found.")
    );
  },

  GetPendingFollowRequests: async (call, callback) => {
    const { req_user_id, offset = 0, req_fields } = call.request;
    const fields = getFields(req_fields);

    const users = await sql`
      SELECT ${sql.unsafe(fields)}
      FROM users u
      JOIN followers f ON f.follower_id = u.id
      WHERE f.followee_id = ${req_user_id} 
        AND f.is_following = false
      OFFSET ${offset} LIMIT 10;
    `;

    return callback(
      null,
      users.length > 0
        ? { ...GrpcResponse.success("Follow requests found."), users }
        : GrpcResponse.error("No users found.")
    );
  },

  SendFollowRequest: async (call, callback) => {
    const { req_user_id, user_id } = call.request;

    const result = await sql`
      INSERT INTO followers (follower_id, followee_id)
      VALUES (${req_user_id}, ${user_id})
      ON CONFLICT (follower_id, followee_id) 
      DO UPDATE SET is_following = false
      RETURNING *;
    `;

    return callback(
      null,
      result.length > 0
        ? GrpcResponse.success("Follow request sent.")
        : GrpcResponse.error("Already following this user.")
    );
  },

  UnsendFollowRequest: async (call, callback) => {
    const { req_user_id, user_id } = call.request;

    const result = await sql`
      DELETE FROM followers
      WHERE follower_id = ${req_user_id} AND followee_id = ${user_id}
      RETURNING *;
    `;

    return callback(
      null,
      result.length > 0
        ? GrpcResponse.success("Follow request unsent.")
        : GrpcResponse.error("No pending request found.")
    );
  },

  AcceptFollowRequest: async (call, callback) => {
    const { req_user_id, user_id } = call.request;

    const result = await sql`
      UPDATE followers SET is_following = true
      WHERE follower_id = ${user_id} AND followee_id = ${req_user_id} AND is_following = false
      RETURNING *;
    `;

    return callback(
      null,
      result.length > 0
        ? GrpcResponse.success("Follow request accepted.")
        : GrpcResponse.error("No follow request found.")
    );
  },

  RejectFollowRequest: async (call, callback) => {
    const { req_user_id, user_id } = call.request;

    const result = await sql`
      DELETE FROM followers
      WHERE follower_id = ${user_id} AND followee_id = ${req_user_id} AND is_following = false
      RETURNING *;
    `;

    return callback(
      null,
      result.length > 0
        ? GrpcResponse.success("Follow request rejected.")
        : GrpcResponse.error("No pending request found.")
    );
  },

  GetUserMates: async (call, callback) => {
    const { req_user_id, offset = 0, req_fields } = call.request;
    const fields = getFields(req_fields);

    const users = await sql`
      SELECT ${sql.unsafe(fields)}
      FROM mates m
      JOIN users u ON u.id = (CASE WHEN m.mater_id = ${req_user_id} THEN m.matee_id ELSE m.mater_id END)
      WHERE ${req_user_id} IN (m.mater_id, m.matee_id) 
      AND m.are_mates = true
      OFFSET ${offset} LIMIT 10;
    `;

    return callback(
      null,
      users.length > 0
        ? { ...GrpcResponse.success("Mates found."), users }
        : GrpcResponse.error("No users found.")
    );
  },

  GetPendingMateRequests: async (call, callback) => {
    const { req_user_id, offset = 0, req_fields } = call.request;
    const fields = getFields(req_fields);

    const users = await sql`
      SELECT ${sql.unsafe(fields)}
      FROM mates m
      JOIN users u ON m.mater_id = u.id
      WHERE m.matee_id = ${req_user_id} AND m.are_mates = false
      OFFSET ${offset} LIMIT 10;
    `;

    callback(
      null,
      users.length > 0
        ? { ...GrpcResponse.success("Mate requests found."), users }
        : GrpcResponse.success("No users found.")
    );
  },

  SendMateRequest: async (call, callback) => {
    const { req_user_id, user_id } = call.request;

    const result = await sql`
      INSERT INTO mates (mater_id, matee_id)
      VALUES (${req_user_id}, ${user_id})
      ON CONFLICT (mater_id, matee_id) 
      DO UPDATE SET are_mates = false
      RETURNING *;
    `;

    return callback(
      null,
      result.length > 0
        ? GrpcResponse.success("Mate request sent.")
        : GrpcResponse.error("Already mates.")
    );
  },

  UnsendMateRequest: async (call, callback) => {
    const { req_user_id, user_id } = call.request;

    const result = await sql`
      DELETE FROM mates
      WHERE mater_id = ${req_user_id} AND matee_id = ${user_id}
      OR mater_id = ${user_id} AND matee_id = ${req_user_id}
      RETURNING *;
    `;

    return callback(
      null,
      result.length > 0
        ? GrpcResponse.success("Mate request unsent.")
        : GrpcResponse.error("No pending request found.")
    );
  },

  AcceptMateRequest: async (call, callback) => {
    const { req_user_id, user_id } = call.request;

    const result = await sql`
      UPDATE mates SET are_mates = true
      WHERE mater_id = ${user_id} AND matee_id = ${req_user_id} AND are_mates = false
      RETURNING *;
    `;

    return callback(
      null,
      result.length > 0
        ? GrpcResponse.success("Mate request accepted.")
        : GrpcResponse.error("No mate request found.")
    );
  },

  RejectMateRequest: async (call, callback) => {
    const { req_user_id, user_id } = call.request;

    const result = await sql`
      DELETE FROM mates
      WHERE mater_id = ${user_id} AND matee_id = ${req_user_id} AND are_mates = false
      RETURNING *;
    `;

    return callback(
      null,
      result.length > 0
        ? GrpcResponse.success("Mate request rejected.")
        : GrpcResponse.error("No pending request found.")
    );
  },
};

export default connectionService;
