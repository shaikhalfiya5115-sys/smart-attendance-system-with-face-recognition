const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "supersecretkey";

/* DATABASE CONNECTION */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "lab@cknc",
  database: "smart_attendance"
});

db.connect(err => {
  if (err) {
    console.log("Database connection failed");
  } else {
    console.log("MySQL Connected");
  }
});

/* LOGIN */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, result) => {
      if (err || result.length === 0)
        return res.status(401).json({ msg: "Invalid credentials" });

      const user = result[0];
      const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
        expiresIn: "2h"
      });

      res.json({ token, role: user.role });
    }
  );
});

/* AUTH MIDDLEWARE */
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(403).json({ msg: "No token" });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ msg: "Invalid token" });
    req.user = decoded;
    next();
  });
}

/* MARK ATTENDANCE */
app.post("/attendance", auth, (req, res) => {
  const { roll, subject } = req.body;

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];

  db.query(
    "SELECT id FROM students WHERE roll=?",
    [roll],
    (err, result) => {
      if (err || result.length === 0)
        return res.status(404).json({ msg: "Student not found" });

      const student_id = result[0].id;

      db.query(
        "INSERT INTO attendance (student_id, subject, date, time, status) VALUES (?, ?, ?, ?, 'Present')",
        [student_id, subject, date, time],
        err2 => {
          if (err2)
            return res.status(500).json({ msg: "Attendance failed" });

          res.json({ msg: "Attendance marked successfully" });
        }
      );
    }
  );
});

/* GET ATTENDANCE */
app.get("/attendance", auth, (req, res) => {
  db.query(
    `SELECT students.roll, students.name, attendance.subject, attendance.date, attendance.time, attendance.status
     FROM attendance
     JOIN students ON attendance.student_id = students.id`,
    (err, result) => {
      if (err)
        return res.status(500).json({ msg: "Fetch failed" });

      res.json(result);
    }
  );
});

/* RESET (ADMIN ONLY) */
app.delete("/reset", auth, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ msg: "Only admin can reset" });

  db.query("DELETE FROM attendance", err => {
    if (err)
      return res.status(500).json({ msg: "Reset failed" });

    res.json({ msg: "All data deleted" });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
