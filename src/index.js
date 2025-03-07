import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { connectDB } from "./db/index.js";
import authService from "./services/auth.service.js";
import userService from "./services/user.service.js";

const PROTO_DIR = path.resolve("./src/proto");
const BASE_URL = "https://fiyoproto.vercel.app/fiyouser";

const loadProto = async (name) => {
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
};

const startServer = async () => {
  const authProto = await loadProto("auth.proto");
  const userProto = await loadProto("user.proto");

  const server = new grpc.Server();
  server.addService(authProto?.auth?.AuthService?.service, authService);
  server.addService(userProto?.user?.UserService?.service, userService);

  const address = process.env.FIYOUSER_SERVICE_URL || "localhost:8001";
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), () =>
    console.log(`🚀 gRPC Server running at ${address}`)
  );
};

connectDB()
  .then(() =>
    startServer().catch(
      (err) => (console.error("Server error:", err), process.exit(1))
    )
  )
  .catch((err) => console.error("Database connection error:", err));
