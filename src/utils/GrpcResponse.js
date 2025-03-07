export default class GrpcResponse {
  constructor(success, message) {
    this.status = { success, message };
  }

  static success(message) {
    return new GrpcResponse(true, message);
  }

  static error(message) {
    throw new Error(message);
  }
}
