const M = require("../models/profileModel");

function getUserId(req) {
  // JWT payload uses userId (see signToken)
  return req.user?.userId;
}

async function getMyProfile(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorised" });

    const p = await M.getProfile(userId);
    return res.json(p || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
}

async function patchMyProfile(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorised" });

    const updated = await M.upsertProfile(userId, req.body || {});
    return res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
}

async function getMyContacts(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorised" });

    const rows = await M.getContacts(userId);
    return res.json({ contacts: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
}

async function addMyContact(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorised" });

    // Normalize/whitelist (prevents DB column mismatch)
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();

    if (!name || !phone) {
      return res.status(400).json({ error: "name and phone required" });
    }

    // accept either isPrimary or is_primary, always convert to 0/1
    const is_primary =
      body.is_primary !== undefined
        ? (body.is_primary ? 1 : 0)
        : body.isPrimary !== undefined
          ? (body.isPrimary ? 1 : 0)
          : 0;

    const relationship = body.relationship ? String(body.relationship).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    const payload = { name, phone, relationship, notes, is_primary };

    const created = await M.addContact(userId, payload);
    return res.status(201).json(created);
  } catch (e) {
    console.error("addMyContact error:", e);
    return res.status(500).json({ error: "server error" });
  }
}

async function patchMyContact(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorised" });

    const id = Number(req.params.id);
    const body = req.body || {};

    // Only allow these fields
    const patch = {};
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.phone !== undefined) patch.phone = String(body.phone).trim();
    if (body.relationship !== undefined) patch.relationship = body.relationship ? String(body.relationship).trim() : null;
    if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).trim() : null;

    // normalize primary flag
    if (body.is_primary !== undefined) patch.is_primary = body.is_primary ? 1 : 0;
    if (body.isPrimary !== undefined) patch.is_primary = body.isPrimary ? 1 : 0;

    const updated = await M.patchContact(userId, id, patch);
    if (!updated) return res.status(404).json({ error: "contact not found / no fields" });
    return res.json(updated);
  } catch (e) {
    console.error("patchMyContact error:", e);
    return res.status(500).json({ error: "server error" });
  }
}

async function deleteMyContact(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorised" });

    const id = Number(req.params.id);
    await M.deleteContact(userId, id);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
}

async function getMyHealth(req, res) {
   return res.json({}); // health later
}

async function patchMyHealth(req, res) {
   return res.json({}); // health later
}




module.exports = {
  getMyProfile,
  patchMyProfile,
  getMyContacts,
  addMyContact,
  patchMyContact,
  deleteMyContact,
  getMyHealth,
  patchMyHealth,
};
