const express = require('express');
const path = require('path');

const app = express();
const PORT = 8000;
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
  password: "Djpmtw@123!",
  database: "myapp"
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
    const { name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay,user_id } = req.body;
    queueData.push({ name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay,user_id });
    if(user_id == null ){
      res.redirect('/registration2.html');
    }else{
      res.redirect(`/registration2.html?id=${user_id}`); 
    }
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get(`/getUserData/:isEditSection?`, (req, res) => {
  
    query1 = `SELECT * FROM users u
    WHERE u.id NOT IN (
      SELECT opponent_id FROM Partner_1
    );`;

  query2 = `SELECT * FROM users u
    WHERE u.id NOT IN (
      SELECT opponent_id FROM Partner_2
    );`;

    query3 = `SELECT * FROM users ;`;

  db.query(query1, (err1, results1) => {
    if (err1) {
      console.error("Database error (query1):", err1);
      return res.status(500).json({ message: "Database error (Partner_1)" });
    }

  db.query(query2, (err2, results2) => {
    if (err2) {
      console.error("Database error (query2):", err2);
      return res.status(500).json({ message: "Database error (Partner_2)" });
    }

    db.query(query3, (err2, results3) => {
      if (err2) {
        console.error("Database error (query2):", err2);
        return res.status(500).json({ message: "Database error (Partner_2)" });
      }

    res.json({
      notInPartner1: results1,
      notInPartner2: results2,
      allUsers: results3
    });
    });
  });

  });
});





// Handle form submission
app.post('/submit', (req, res) => {
  console.log('req.body',req.body);
  
 
  const { event1, partner1, event2, partner2,user_id } = req.body;

  queueData.push({ event1, partner1, event2, partner2,user_id });
  

  const mergedData = Object.assign({}, ...queueData);

  console.log('queueData',queueData);
  
  if(mergedData.user_id){
     upddateUser(queueData);
    return res.redirect('/index.html');
  }
  const userInsertQuery = `
    INSERT INTO users 
    (name, whatsapp, dob, city, tshirt_size, shorts_size, food_pref, stay, event1, partner1, event2, partner2, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;


  const userValues = [
    mergedData.name, mergedData.whatsapp, mergedData.dob, mergedData.city, 
    mergedData.tshirt_size, mergedData.shorts_size, mergedData.food_pref, mergedData.stay, 
    mergedData.event1, mergedData.partner1, mergedData.event2, mergedData.partner2
  ];

  db.query(userInsertQuery, userValues, (err, result) => {
    if (err) {
      console.error("Error inserting user:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const userId = result.insertId;

    // Insert into Partner_1
    const partner1Query = `INSERT INTO Partner_1 (user_id, opponent_id, event_name) VALUES (?, ?, ?)`;
    db.query(partner1Query, [userId, partner1, event1], (err1) => {
      if (err1) {
        console.error("Error inserting into Partner_1:", err1);
        return res.status(500).json({ message: "Error inserting into Partner_1" });
      }

      // Insert into Partner_2
      const partner2Query = `INSERT INTO Partner_2 (user_id, opponent_id, event_name) VALUES (?, ?, ?)`;
      db.query(partner2Query, [userId, partner2, event2], (err2) => {
        if (err2) {
          console.error("Error inserting into Partner_2:", err2);
          return res.status(500).json({ message: "Error inserting into Partner_2" });
        }

        res.redirect('/index.html');
        // res.status(201).json({ message: "User and partners added successfully" });
      });
    });
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
        req.session.user = results[0];
        res.redirect('/user/dashboard'); // Redirect after processing
      } else {
        req.session.error = "Invalid WhatsApp number or DOB!";
        return res.redirect("/user-login.html");
      }
  });

});

//edit profile
app.get("/edit-profile/:id", (req, res) => {
  const userId = req.params.id;

  const sql = `
    SELECT u.*,p1.user_id as p1_user , p1.event_name as p1_event ,p1.opponent_id as p1_opponent_id , p2.opponent_id as p2_opponent_id , p2.event_name as p2_event , p2.user_id as p2_user_id FROM users u
    LEFT JOIN Partner_1 p1 ON p1.user_id = u.id
    LEFT JOIN Partner_2 p2 ON p2.user_id = u.id
    WHERE u.id = ?`;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user: results[0] });
  });
});


app.get("/user/dashboard",  (req, res) => {
  const user = req.session.user;

  res.redirect(`/games.html?id=${user.id}`); // Redirect after processing
});

// Start the server
app.listen(PORT,'0.0.0.0', () => {
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
      // res.redirect("/dashboard"); // Redirect to dashboard after success
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

  const query = `SELECT 
  u.*,
  p1.event_name AS event_name_p1,
  u_p1.name AS opponent_name_p1,

  p2.event_name AS event_name_p2,
  u_p2.name AS opponent_name_p2

FROM users u

LEFT JOIN Partner_1 p1 ON u.id = p1.user_id
LEFT JOIN users u_p1 ON p1.opponent_id = u_p1.id

LEFT JOIN Partner_2 p2 ON u.id = p2.user_id
LEFT JOIN users u_p2 ON p2.opponent_id = u_p2.id;
`; // ✅ Removed extra comma
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error!" });
    }
    res.json(results); // Send user data to frontend
  });
});


app.get('/api/clear-database', (req, res) => {
  // List all tables to clear except `admins`
  const tablesToClear = ['users', 'Partner_1', 'Partner_2'];
  
  // Use a transaction to ensure all deletions happen atomically
  db.beginTransaction(err => {
    if (err) {
      console.error('Transaction error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    const deletePromises = tablesToClear.map(table => {
      return new Promise((resolve, reject) => {
        db.query(`DELETE FROM ${table}`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    Promise.all(deletePromises)
      .then(() => {
        db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error('Commit error:', err);
              res.status(500).json({ message: 'Database commit error' });
            });
          }
          res.json({ message: 'Database cleared except admins table' });
        });
      })
      .catch(err => {
        db.rollback(() => {
          console.error('Error clearing tables:', err);
          res.status(500).json({ message: 'Error clearing tables' });
        });
      });
  });
});
function upddateUser(queueData) {

  const mergedData = Object.assign({}, ...queueData);
console.log('mergedData',mergedData);

  const updateUserQuery = `
      UPDATE users SET 
          name = ?, 
          whatsapp = ?, 
          dob = ?, 
          city = ?, 
          tshirt_size = ?, 
          shorts_size = ?, 
          food_pref = ?, 
          stay = ?, 
          event1 = ?, 
          partner1 = ?, 
          event2 = ?, 
          partner2 = ? 
      WHERE id = ?
  `;

  const userValues = [
      mergedData.name,
      mergedData.whatsapp,
      mergedData.dob,
      mergedData.city,
      mergedData.tshirt_size,
      mergedData.shorts_size,
      mergedData.food_pref,
      mergedData.stay,
      mergedData.event1,
      mergedData.partner1,
      mergedData.event2,
      mergedData.partner2,
      mergedData.user_id
  ];

  return new Promise((resolve, reject) => {
      db.query(updateUserQuery, userValues, (err) => {
          if (err) {
              console.error("Error updating user:", err);
              return reject(false);
          }
console.log('1');

          // Delete Partner_1
          db.query(`DELETE FROM Partner_1 WHERE user_id = ?`, [mergedData.user_id], (err2) => {
              if (err2) {
                  console.error("Error deleting Partner_1:", err2);
                  return reject(false);
              }
              console.log('2');

              // Delete Partner_2
              db.query(`DELETE FROM Partner_2 WHERE user_id = ?`, [mergedData.user_id], (err3) => {
                  if (err3) {
                      console.error("Error deleting Partner_2:", err3);
                      return reject(false);
                  }
              console.log('4');


                  // Insert new Partner_1
                  const insertP1 = `
                      INSERT INTO Partner_1 (user_id, opponent_id, event_name)
                      VALUES (?, ?, ?)
                  `;
                  db.query(insertP1, [mergedData.user_id, mergedData.partner1, mergedData.event1], (err4) => {
                      if (err4) {
                          console.error("Error inserting Partner_1:", err4);
                          return reject(false);
                      }

              console.log('5');

                      // Insert new Partner_2
                      const insertP2 = `
                          INSERT INTO Partner_2 (user_id, opponent_id, event_name)
                          VALUES (?, ?, ?)
                      `;
                      db.query(insertP2, [mergedData.user_id, mergedData.partner2, mergedData.event2], (err5) => {
                          if (err5) {
                              console.error("Error inserting Partner_2:", err5);
                              return reject(false);
                          }
              console.log('6');


                          resolve(true);
                      });
                  });
              });
          });
      });
  });
}












// CREATE TABLE admins (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   username VARCHAR(50) NOT NULL UNIQUE,
//   password VARCHAR(255) NOT NULL
// );










