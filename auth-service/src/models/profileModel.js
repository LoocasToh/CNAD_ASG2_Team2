const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "auth-db",
  user: process.env.MYSQL_USER || "authuser",
  password: process.env.MYSQL_PASSWORD || "authpass",
  database: process.env.MYSQL_DB || "authdb",
  waitForConnections: true,
  connectionLimit: 10,
});

async function getProfile(userId) {
  const [rows] = await pool.execute(`SELECT * FROM user_profiles WHERE userId=?`, [userId]);
  return rows[0] || null;
}

async function upsertProfile(userId, fields) {
  const {
    full_name = null,
    dob = null,
    gender = null,
    phone = null,
    address = null,
  } = fields;

  await pool.execute(
    `INSERT INTO user_profiles (userId, full_name, dob, gender, phone, address)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       full_name=VALUES(full_name),
       dob=VALUES(dob),
       gender=VALUES(gender),
       phone=VALUES(phone),
       address=VALUES(address)`,
    [userId, full_name, dob, gender, phone, address]
  );

  return getProfile(userId);
}

async function getContacts(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM emergency_contacts WHERE userId=? ORDER BY isPrimary DESC, id DESC`,
    [userId]
  );
  return rows;
}


async function addContact(userId, c) {
  const primary = Number(c.is_primary ?? c.isPrimary ?? 0) === 1 ? 1 : 0;

  // if setting primary, unset others
if (primary === 1) {
  await pool.execute(`UPDATE emergency_contacts SET isPrimary=0 WHERE userId=?`, [userId]);
}

const [r] = await pool.execute(
  `INSERT INTO emergency_contacts (userId, name, relationship, phone, notes, isPrimary)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [userId, c.name, c.relationship || null, c.phone, c.notes || null, primary]
);



  const [rows] = await pool.execute(`SELECT * FROM emergency_contacts WHERE id=?`, [r.insertId]);
  return rows[0];
}

async function patchContact(userId, contactId, c) {
  const allowed = ["name", "relationship", "phone", "notes", "is_primary", "isPrimary"];
  const sets = [];
  const vals = [];

  // normalize primary
  if (c.is_primary !== undefined || c.isPrimary !== undefined) {
    const primary = Number(c.is_primary ?? c.isPrimary ?? 0) === 1 ? 1 : 0;

    // if setting primary, unset others
    if (primary === 1) {
      await pool.execute(`UPDATE emergency_contacts SET isPrimary=0 WHERE userId=?`, [userId]);
    }

    sets.push(`isPrimary=?`);
    vals.push(primary);
  }

  // other fields
  for (const k of ["name", "relationship", "phone", "notes"]) {
    if (c[k] !== undefined) {
      sets.push(`${k}=?`);
      vals.push(c[k]);
    }
  }

  if (!sets.length) return null;

  vals.push(userId, contactId);
  await pool.execute(
    `UPDATE emergency_contacts SET ${sets.join(", ")} WHERE userId=? AND id=?`,
    vals
  );

  const [rows] = await pool.execute(
    `SELECT * FROM emergency_contacts WHERE userId=? AND id=?`,
    [userId, contactId]
  );
  return rows[0] || null;
}


async function deleteContact(userId, contactId) {
  await pool.execute(`DELETE FROM emergency_contacts WHERE userId=? AND id=?`, [userId, contactId]);
  return true;
}

async function getHealth(userId) {
  const [rows] = await pool.execute(`SELECT * FROM health_profiles WHERE userId=?`, [userId]);
  return rows[0] || null;
}

async function upsertHealth(userId, fields) {
  const {
    blood_type = null,
    allergies = null,
    conditions = null,
    medical_notes = null,
  } = fields;

  await pool.execute(
    `INSERT INTO health_profiles (userId, blood_type, allergies, conditions, medical_notes)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       blood_type=VALUES(blood_type),
       allergies=VALUES(allergies),
       conditions=VALUES(conditions),
       medical_notes=VALUES(medical_notes)`,
    [userId, blood_type, allergies, conditions, medical_notes]
  );

  return getHealth(userId);
}

module.exports = {
  getProfile,
  upsertProfile,
  getContacts,
  addContact,
  patchContact,
  deleteContact,
  getHealth,
  upsertHealth,
};
