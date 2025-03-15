import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

let sql;

const connectDB = async () => {
  if (!sql) {
    try {
      sql = postgres(process.env.FIYOPGDB_URI);
      console.log("Database connected successfully");
    } catch (error) {
      throw new Error("Failed to connect to the database", error);
    }
  }
  return sql;
};

export { sql, connectDB };
