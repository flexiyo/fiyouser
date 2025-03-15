import { sql } from "../db/index.js";
import { GrpcResponse } from "../utils/GrpcResponse.js";
import { getFields } from "../utils/getFields.js";
import { fetchRelation } from "../utils/fetchRelation.js";

const userService = {
  GetUsers: async (call, callback) => {
    try {
      const { req_user_id, user_ids, offset, req_fields } = call.request;
      const fields = getFields(req_fields);

      let users;

      if (user_ids.length > 0) {
        users = await sql`
        SELECT ${sql.unsafe(fields)} FROM users u WHERE id = ANY(${user_ids});
      `;
      } else {
        users = await sql`
        SELECT ${sql.unsafe(fields)} FROM users u OFFSET ${offset} LIMIT 10;
      `;
      }

      if (req_fields.includes("relation")) {
        for (const user of users) {
          user.relation = await fetchRelation(req_user_id, user.id);
        }
      }

      return callback(
        null,
        users.length > 0
          ? { ...GrpcResponse.success("Users found."), users }
          : GrpcResponse.error("No users found.")
      );
    } catch (error) {
      console.error("Error in GetUsers:", error);
      return callback(null, GrpcResponse.error("Error in GetUsers"));
    }
  },

  SearchUsers: async (call, callback) => {
    try {
      const { req_user_id, query, offset, req_fields } = call.request;
      const fields = getFields(req_fields);

      const users = await sql`
        SELECT ${sql.unsafe(fields)}
        FROM users u
        WHERE full_name ILIKE ${query + "%"}
          OR username ILIKE ${query + "%"}
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
          ? { ...GrpcResponse.success("Users found."), users }
          : GrpcResponse.error("No users found.")
      );
    } catch (error) {
      console.error("Error in SearchUsers:", error);
      return callback(null, GrpcResponse.error("Error in SearchUsers"));
    }
  },

  GetUser: async (call, callback) => {
    try {
      const { req_user_id, username, req_fields } = call.request;
      const fields = getFields(req_fields);

      const [user] = await sql`
        SELECT ${sql.unsafe(fields)}
        FROM users u
        WHERE u.username = ${username}
        LIMIT 1;
      `;

      if (!user)
        return callback(
          null,
          GrpcResponse.error(`User '${username}' not found.`)
        );

      user.relation = await fetchRelation(req_user_id, user.id);

      return callback(null, { ...GrpcResponse.success("User found."), user });
    } catch (error) {
      console.error("Error in GetUser:", error);
      return callback(null, GrpcResponse.error("Error in GetUser"));
    }
  },

  UpdateUser: async (call, callback) => {
    try {
      const { req_user_id, updated_fields } = call.request;
      const parsedFields = JSON.parse(updated_fields);

      const [updatedFields] = await sql`
        UPDATE users SET ${sql({
          ...parsedFields,
          updated_at: new Date().toISOString(),
        })} 
        WHERE id = ${req_user_id} RETURNING ${sql(Object.keys(parsedFields))};
      `;

      return callback(
        null,
        updatedFields
          ? {
              ...GrpcResponse.success("User updated."),
              updated_fields: updatedFields,
            }
          : GrpcResponse.error("User not updated.")
      );
    } catch (error) {
      console.error("Error in UpdateUser:", error);
      return callback(null, GrpcResponse.error("Error in UpdateUser"));
    }
  },

  DeleteUser: async (call, callback) => {
    try {
      const { req_user_id } = call.request;
      const result = await sql`DELETE FROM users WHERE id = ${req_user_id};`;

      const response =
        result.count > 0
          ? GrpcResponse.success("User deleted.")
          : GrpcResponse.error("User not found or already deleted.");

      return callback(null, response);
    } catch (error) {
      console.error("Error in DeleteUser:", error);
      return callback(null, GrpcResponse.error("Error in DeleteUser"));
    }
  },
};

export default userService;
