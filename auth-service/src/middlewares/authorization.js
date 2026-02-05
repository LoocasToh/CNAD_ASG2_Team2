const jwt = require("jsonwebtoken");

// Use the same variable name as your controller
const JWT_SECRET = process.env.JWT_SECRET || 'change_me'; 

function verifyJWT(req, res, next) {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Missing token" });
    }

    // Use JWT_SECRET here
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        
        req.user = decoded; 
        next();
    });
}

module.exports = verifyJWT;