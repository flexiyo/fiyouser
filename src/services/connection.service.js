import { sql } from "../db/index.js";
import { GrpcResponse } from "../utils/GrpcResponse.js";
import { getFields } from "../utils/getFields.js";
import { fetchRelation } from "../utils/fetchRelation.js";

const connectionService = {
  GetUserFollowers: async (call, callback) => {
    try {
      const { req_user_id, user_id, offset = 0, req_fields } = call.request;
      const fields = getFields(req_fields);

      const users = await sql`
        SELECT ${sql.unsafe(fields)}
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
    } catch (error) {
      console.error("Error in GetUserFollowers:", error);
      return callback(null, GrpcResponse.error("Error in GetUserFollowers"));
    }
  },

  GetUserFollowing: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in GetUserFollowing:", error);
      return callback(null, GrpcResponse.error("Error in GetUserFollowing"));
    }
  },

  GetPendingFollowRequests: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in GetPendingFollowRequests:", error);
      return callback(
        null,
        GrpcResponse.error("Error in GetPendingFollowRequests")
      );
    }
  },

  SendFollowRequest: async (call, callback) => {
    try {
      const { req_user_id, user_id } = call.request;

      const result = await sql`
        INSERT INTO followers (follower_id, followee_id)
        VALUES (${req_user_id}, ${user_id})
        ON CONFLICT DO NOTHING
        RETURNING *;
      `;

      return callback(
        null,
        result.length > 0
          ? GrpcResponse.success("Follow request sent.")
          : GrpcResponse.error("Already following this user.")
      );
    } catch (error) {
      console.error("Error in SendFollowRequest:", error);
      return callback(null, GrpcResponse.error("Error in SendFollowRequest"));
    }
  },

  UnsendFollowRequest: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in UnsendFollowRequest:", error);
      return callback(null, GrpcResponse.error("Error in UnsendFollowRequest"));
    }
  },

  AcceptFollowRequest: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in AcceptFollowRequest:", error);
      return callback(null, GrpcResponse.error("Error in AcceptFollowRequest"));
    }
  },

  RejectFollowRequest: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in RejectFollowRequest:", error);
      return callback(null, GrpcResponse.error("Error in RejectFollowRequest"));
    }
  },

  GetUserMates: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in GetUserMates:", error);
      return callback(null, GrpcResponse.error("Error in GetUserMates"));
    }
  },

  GetPendingMateRequests: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in GetPendingMateRequests:", error);
      return callback(
        null,
        GrpcResponse.error("Error in GetPendingMateRequests")
      );
    }
  },

  SendMateRequest: async (call, callback) => {
    try {
      const { req_user_id, user_id } = call.request;

      const result = await sql`
        INSERT INTO mates (mater_id, matee_id)
        VALUES (${req_user_id}, ${user_id})
        ON CONFLICT DO NOTHING
        RETURNING *;
      `;

      return callback(
        null,
        result.length > 0
          ? GrpcResponse.success("Mate request sent.")
          : GrpcResponse.error("Already mates.")
      );
    } catch (error) {
      console.error("Error in SendMateRequest:", error);
      return callback(null, GrpcResponse.error("Error in SendMateRequest"));
    }
  },

  UnsendMateRequest: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in UnsendMateRequest:", error);
      return callback(null, GrpcResponse.error("Error in UnsendMateRequest"));
    }
  },

  AcceptMateRequest: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in AcceptMateRequest:", error);
      return callback(null, GrpcResponse.error("Error in AcceptMateRequest"));
    }
  },

  RejectMateRequest: async (call, callback) => {
    try {
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
    } catch (error) {
      console.error("Error in RejectMateRequest:", error);
      return callback(null, GrpcResponse.error("Error in RejectMateRequest"));
    }
  },
};

export default connectionService;
