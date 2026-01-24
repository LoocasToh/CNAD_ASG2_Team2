require("dotenv").config();
const express = require("express");
const cors = require("cors");
const taskRoutes = require("./routes/tasks");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send({ ok: true, service: "task" }));
app.use("/", taskRoutes);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`Task service listening on ${PORT}`));
