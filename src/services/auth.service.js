import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { sql } from "../db/index.js";
import GrpcResponse from "../utils/GrpcResponse.js";

const authService = {
  RegisterUser: async (call, callback) => {
    const { full_name, username, account_type, dob, password } = call.request;

    const userExists = await sql`
      SELECT COUNT(*) FROM users WHERE username = ${username};
    `;

    if (userExists[0].count > 0) {
      return callback(null, GrpcResponse.error("Username is already taken."));
    }

    const id = uuidv4();
    const avatar =
      "https://cdnfiyo.github.io/img/user/avatars/default-avatar.jpg";
    const hashedPassword = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO users (id, full_name, username, account_type, dob, password, avatar)
      VALUES (${id}, ${full_name}, ${username}, ${account_type}, ${dob}, ${hashedPassword}, ${avatar});
    `;

    const user = {
      id,
      username,
      avatar,
    };

    return callback(null, {
      ...GrpcResponse.success("User registered successfully."),
      user,
    });
  },

  LoginUser: async (call, callback) => {
    const { username, password } = call.request;

    const [result] = await sql`
      SELECT id, username, password, avatar FROM users WHERE username = ${username} LIMIT 1;
    `;

    if (!result) {
      return callback(
        null,
        GrpcResponse.error(`User '${username}' not found.`)
      );
    }

    const isPasswordValid = await bcrypt.compare(password, result.password);
    if (!isPasswordValid) {
      return callback(null, GrpcResponse.error("Incorrect password."));
    }

    const user = {
      id: result.id,
      username: result.username,
      avatar: result.avatar,
    };

    return callback(null, {
      ...GrpcResponse.success("User logged in successfully."),
      user,
    });
  },
};

export default authService;
