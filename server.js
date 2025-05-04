const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;
const mysql = require("mysql2");
const { log } = require('console');
const session = require('express-session');


app.use(session({
  secret: '4f7d8e6c5b2a1c0d9e8f7b6a5c4d3e2f1b0a9d8c7e6f5a4b3c2d1e0f9a8b7c6d', // Change this to a secure secret
  resave: false,
  saveUninitialized: true
}));
// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Serve static files (like index.html)
app.use(express.static(path.join(__dirname, 'public')));


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "my_games"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});
let queueData = [];


var result=[]
const getUsers = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM users", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

app.post('/queue/info', async (req, res) => {
  try {

    const { name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay } = req.body;

    queueData.push({ name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay });


    res.redirect('/registration2.html'); // Redirect after processing
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get('/getUserData', (req, res) => {
  const query = "SELECT * FROM users"; // Fetch all users
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.json(results); // Send the retrieved user data
  });
});





// Handle form submission
app.post('/submit', (req, res) => {
  // console.log('req.body');
  // console.log(req.body);

  
  const { event1, partner1, event2, partner2 } = req.body;
  queueData.push({ event1, partner1, event2, partner2 });
  const mergedData = Object.assign({}, ...queueData);

console.log(mergedData);


const query = `INSERT INTO users 
  (name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay, event1, partner1, event2, partner2, created_at) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

db.query(query, [
  mergedData.name, mergedData.whatsapp, mergedData.dob, mergedData.city, 
  mergedData.tshirt_size, mergedData.shorts_size, mergedData.food_pref, mergedData.stay, 
  mergedData.event1, mergedData.partner1, mergedData.event2, mergedData.partner2
], (err, result) => {
  if (err) {
    console.error("Error inserting data:", err);
    return res.status(500).json({ message: "Database error" });
  }
  res.redirect('/index.html');
  // res.status(201).json({ message: "User added successfully", id: result.insertId });

});


});



// API route to store user data
app.post("/api/users", (req, res) => {
  const { name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay } = req.body;

  if (!name || !whatsapp) {
    return res.status(400).json({ message: "Name and WhatsApp are required" });
  }


  const query = "INSERT INTO users (name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";

  db.query(query, [name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay], (err, result) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(201).json({ message: "User added successfully", id: result.insertId });
    app.get("/user/dashboard",  (req, res) => {
      res.redirect('/games.html'); // Redirect after processing
    });
  });
});




// Login API
app.post("/login",async  (req, res) => {
  const { whatsapp, dob } = req.body;

  // Validate input
  if (!whatsapp || !dob) {
    req.session.error = "WhatsApp number and DOB are required!";
    return res.redirect("/user-login.html");

  }
  const sql = "SELECT * FROM users WHERE whatsapp = ? AND dob = ?";
  db.query(sql, [whatsapp, dob], (err, results) => {
      if (err) {
        req.session.error = err;
        return res.redirect("/user-login.html");
      }
      if (results.length > 0) {
        res.redirect('/user/dashboard'); // Redirect after processing
      } else {
        req.session.error = "Invalid WhatsApp number or DOB!";
        return res.redirect("/user-login.html");
      }
  });

});

app.get("/user/dashboard",  (req, res) => {
  res.redirect('/games.html'); // Redirect after processing
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
app.get("/get-error-message", (req, res) => {
  const errorMessage = req.session.error || null;
  req.session.error = null; // Clear error message after displaying
  res.json({ error: errorMessage });
});

app.get("/admin/login", (req, res) => {
  return res.redirect("/admin-login.html");
});

// Admin Login API
app.post("/login", (req, res) => {
  const { whatsapp, dob } = req.body;

  if (!whatsapp || !dob) {
      req.session.error = "WhatsApp number and DOB are required!";
      return res.redirect("/admin/login"); // Redirect back to login
  }

  const sql = "SELECT * FROM users WHERE whatsapp = ? AND dob = ?";
  db.query(sql, [whatsapp, dob], (err, results) => {
      if (err) {
          req.session.error = "Database error!";
          return res.redirect("/admin/login");
      }

      if (results.length === 0) {
          req.session.error = "Invalid WhatsApp number or DOB!";
          return res.redirect("admin/login");
      }

      // Clear the session error on successful login
      req.session.error = null;
      res.redirect("/dashboard"); // Redirect to dashboard after success
  });
});
// Admin Login API
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM admins WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, results) => {
      if (err) {
          return res.status(500).json({ message: "Database error!" });
      }
      if (results.length > 0) {
          req.session.admin = username; // Store session
          res.redirect("/admin_dashboard.html");  // Redirect to dashboard
      } else {
          req.session.error = "Invalid username or password!";
          res.redirect("/admin-login.html");
      }
  });
});
app.get("/admin/users", (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ message: "Unauthorized access!" });
  }

  const query = "SELECT whatsapp, dob, name, city, tshirt_size, shorts_size, food_pref, stay, event1, event2, partner1, partner2 FROM users"; // ✅ Removed extra comma
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error!" });
    }
    res.json(results); // Send user data to frontend
  });
});











// CREATE TABLE admins (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   username VARCHAR(50) NOT NULL UNIQUE,
//   password VARCHAR(255) NOT NULL
// );










