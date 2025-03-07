import { sql } from "../db/index.js";
import GrpcResponse from "../utils/GrpcResponse.js";

const userService = {
  GetUsers: async (call, callback) => {
    const { user_ids, offset } = call.request;

    let users;

    if (user_ids.length > 0) {
      users = await sql`
      SELECT id, username, full_name, avatar FROM users WHERE id = ANY(${user_ids});
    `;
    } else {
      users = await sql`
      SELECT id, username, full_name, avatar FROM users OFFSET ${offset} LIMIT 10;
    `;
    }

    return callback(null, {
      ...GrpcResponse.success("Users found successfully."),
      users,
    });
  },

  GetUser: async (call, callback) => {
    const { username, req_user_id } = call.request;

    const [user] = await sql`
      SELECT
        u.id,
        u.full_name,
        u.username,
        u.bio,
        u.account_type,
        u.dob,
        u.gender,
        u.profession,
        u.avatar,
        u.banner,
        COALESCE(COUNT(DISTINCT f1.follower_id), 0) AS followers_count,
        COALESCE(COUNT(DISTINCT f2.following_id), 0) AS following_count,
        COALESCE(COUNT(DISTINCT p.user_id), 0) AS posts_count
      FROM users u
      LEFT JOIN followers f1
        ON f1.following_id = u.id
        AND f1.follow_status = 'accepted'
      LEFT JOIN followers f2
        ON f2.follower_id = u.id
        AND f2.follow_status = 'accepted'
      LEFT JOIN posts p
        ON p.user_id = u.id
      WHERE u.username = ${username}
      GROUP BY u.id
      LIMIT 1;
    `;

    if (!user) {
      return callback(
        null,
        GrpcResponse.error(`User '${username}' not found.`)
      );
    }

    if (!req_user_id) {
      return callback(null, {
        ...GrpcResponse.success("User found successfully."),
        user,
      });
    }

    const [relation] = await sql`
      SELECT 
        f.follower_id, f.following_id, f.follow_status, 
        m.initiator_id, m.mate_id, m.mate_status
      FROM followers f
      LEFT JOIN mates m 
        ON (m.initiator_id = ${req_user_id} AND m.mate_id = ${user.id}) 
        OR (m.initiator_id = ${user.id} AND m.mate_id = ${req_user_id})
      WHERE (f.follower_id = ${req_user_id} AND f.following_id = ${user.id})
         OR (f.follower_id = ${user.id} AND f.following_id = ${req_user_id})
      LIMIT 1;
    `;

    if (relation) {
      user.relation = {
        follow: {
          follow_status:
            relation.follower_id === req_user_id
              ? relation.follow_status
              : null,
          is_followed:
            relation.following_id === req_user_id &&
            relation.follow_status === "accepted",
        },
        mate: {
          mate_status: relation.mate_status || null,
        },
      };
    }

    return callback(null, {
      ...GrpcResponse.success("User found successfully."),
      user,
    });
  },

  UpdateUser: (call, callback) => {
    const { user_id, updated_fields } = call.request;

    let user = Array.from(users.values()).find((u) => u.user_id === user_id);
    if (!user) {
      return callback(
        null,
        GrpcResponse.error(`User with id '${user_id}' not found`)
      );
    }

    user = { ...user, ...updated_fields };
    users.set(user.username, user);

    callback(null, { status: { success: true, message: "User updated" } });
  },

  DeleteUser: (call, callback) => {
    const { user_id } = call.request;
    for (const [key, user] of users.entries()) {
      if (user.user_id === user_id) {
        users.delete(key);
        return callback(null, {
          status: { success: true, message: "User deleted" },
        });
      }
    }
    callback(null, { status: { success: false, message: "User not found" } });
  },
};

export default userService;
