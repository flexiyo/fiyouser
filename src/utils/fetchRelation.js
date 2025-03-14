import { sql } from "../db/index.js";

export const fetchRelation = async (req_user_id, user_id) => {
  if (!req_user_id || !user_id)
    return {
      follow: {
        is_following: null,
        is_followed: null,
      },
      mate: {
        are_mates: null,
      },
    };

  const [relation] = await sql`
    SELECT 
      f1.is_following AS is_following,
      f2.is_following AS is_followed,
      m.are_mates
    FROM 
      (SELECT is_following FROM followers WHERE follower_id = ${req_user_id} AND followee_id = ${user_id}) f1
    FULL JOIN 
      (SELECT is_following FROM followers WHERE follower_id = ${user_id} AND followee_id = ${req_user_id}) f2
    ON TRUE
    FULL JOIN 
      (SELECT are_mates FROM mates WHERE (mater_id = ${req_user_id} AND matee_id = ${user_id}) 
          OR (mater_id = ${user_id} AND matee_id = ${req_user_id})) m
    ON TRUE
  `;

  return {
    follow: {
      is_following: relation?.is_following ?? null,
      is_followed: relation?.is_followed ?? null,
    },
    mate: {
      are_mates: relation?.are_mates ?? null,
    },
  };
};
