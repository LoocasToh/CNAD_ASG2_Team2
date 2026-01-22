const jwt = require("jsonwebtoken");

function verifyJWT(req, res, next) {
    // console.log('Verifying JWT for path:', req.path); // Log the path being accessed

    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: "Missing token" });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            console.log('Token verification failed:', err.message);
            return res.status(403).json({ message: "Invalid token" });
        }
        
        req.user = decoded; // Attach decoded user information to the request object
        next();
    });
}

module.exports = verifyJWT;