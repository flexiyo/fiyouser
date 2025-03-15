import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { sql } from "../db/index.js";
import { GrpcResponse } from "../utils/GrpcResponse.js";
import { getFields } from "../utils/getFields.js";

const authService = {
  RegisterUser: async (call, callback) => {
    try {
      const { full_name, username, account_type, dob, password, req_fields } =
        call.request;
      const fields = getFields(req_fields);

      const [{ count }] =
        await sql`SELECT COUNT(*) FROM users WHERE username = ${username};`;
      if (count > 0)
        return callback(null, GrpcResponse.error("Username is already taken."));

      const id = uuidv4();
      const avatar =
        "https://cdnfiyo.github.io/img/user/avatars/default-avatar.jpg";
      const hashedPassword = await bcrypt.hash(password, 10);

      const sanitizedFields = fields.replace(/\bu\./g, "");

      const [user] = await sql`
        INSERT INTO users (id, full_name, username, account_type, dob, password, avatar)
        VALUES (${id}, ${full_name}, ${username}, ${account_type}, ${dob}, ${hashedPassword}, ${avatar})
        RETURNING ${sql.unsafe(sanitizedFields)};
      `;

      return callback(null, {
        ...GrpcResponse.success("User registered successfully."),
        user,
      });
    } catch (error) {
      console.error("Error in RegisterUser:", error);
      return callback(null, GrpcResponse.error("Error in RegisterUser"));
    }
  },

  LoginUser: async (call, callback) => {
    try {
      const { username, password, req_fields } = call.request;
      const fields = getFields(req_fields);

      const [user] = await sql`
        SELECT ${sql.unsafe(
          fields
        )}, password FROM users u WHERE username = ${username} LIMIT 1;
      `;
      if (!user)
        return callback(
          null,
          GrpcResponse.error(`User '${username}' not found.`)
        );

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid)
        return callback(null, GrpcResponse.error("Incorrect password."));

      delete user.password;

      return callback(null, {
        ...GrpcResponse.success("User logged in successfully."),
        user,
      });
    } catch (error) {
      console.error("Error in LoginUser:", error);
      return callback(null, GrpcResponse.error("Error in LoginUser"));
    }
  },
};

export default authService;
