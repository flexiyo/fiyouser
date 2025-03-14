import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import authService from "./services/auth.service.js";
import userService from "./services/user.service.js";
import connectionService from "./services/connection.service.js";
import { GrpcResponse } from "./utils/GrpcResponse.js";

dotenv.config();

const PORT = process.env.PORT || 8001;

const PROTO_DIR = path.resolve("./src/proto");
const BASE_URL = "https://fiyoproto.vercel.app/fiyouser";
const GRPC_SECRET = process.env.GRPC_SECRET;

const loadProto = async (name) => {
  try {
    const filePath = path.join(PROTO_DIR, name);
    await fs.mkdir(PROTO_DIR, { recursive: true });
    const { data } = await axios.get(`${BASE_URL}/${name}`);
    await fs.writeFile(filePath, data);

    return grpc.loadPackageDefinition(
      await protoLoader.load(filePath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      })
    );
  } catch (error) {
    console.error(`❌ Error loading proto file '${name}':`, error);
    throw error;
  }
};

const authenticateInterceptor = (call, callback, next) => {
  const token = call.metadata.get("authorization")?.[0];
  if (token === GRPC_SECRET) return next();
  callback(null, GrpcResponse.error("Unauthorized request to 'fiyouser'."));
};

const wrapService = (service) =>
  Object.fromEntries(
    Object.entries(service).map(([method, handler]) => [
      method,
      (call, callback) =>
        authenticateInterceptor(call, callback, () => handler(call, callback)),
    ])
  );

const startServer = async () => {
  try {
    await loadProto("common.proto");
    const [authProto, userProto, connectionProto] = await Promise.all(
      ["auth.proto", "user.proto", "connection.proto"].map(loadProto)
    );

    const server = new grpc.Server();
    server.addService(
      authProto.auth.AuthService.service,
      wrapService(authService)
    );
    server.addService(
      userProto.user.UserService.service,
      wrapService(userService)
    );
    server.addService(
      connectionProto.connection.ConnectionService.service,
      wrapService(connectionService)
    );

    const credentials = grpc.ServerCredentials.createInsecure();

    server.bindAsync(`0.0.0.0:${PORT}`, credentials, (err, boundPort) => {
      if (err) {
        console.error("❌ gRPC binding error:", err);
        process.exit(1);
      }

      console.log(`🚀 gRPC Server running on port ${boundPort}`);
    });

    connectDB()
      .then(startServer)
      .catch((err) => {
        console.error("❌ Database connection error:", err);
        process.exit(1);
      });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
};
