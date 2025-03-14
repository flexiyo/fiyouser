const validFields = new Set([
  "id",
  "full_name",
  "username",
  "account_type",
  "dob",
  "gender",
  "profession",
  "bio",
  "avatar",
  "banner",
  "posts_count",
  "followers_count",
  "following_count",
  "relation",
]);

export const getFields = (req_fields) => {
  const defaultFields = "u.id, u.full_name, u.username, u.avatar";

  if (!req_fields || !req_fields.length) return defaultFields;

  req_fields = req_fields.filter(field => field !== "relation");

  const safeFields = req_fields
    .filter((field) => validFields.has(field))
    .map((field) => `u.${field}`)
    .join(", ");

  return safeFields || defaultFields;
};
