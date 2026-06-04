# Railway Management System - Interactive Frontend

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** (v12 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v5.7 or higher) - [Download](https://www.mysql.com/downloads/)
- Railway Management System Database (SQLCode.sql)

### Installation Steps

#### 1️⃣ Setup the Database

```bash
# Create database and import SQLCode.sql
mysql -u root -p < SQLCode.sql

# Verify connection
mysql -u root -p
mysql> USE railway_system;
mysql> SELECT COUNT(*) FROM station;
```

#### 2️⃣ Install Node.js Dependencies

```bash
cd frontend
npm install
```

Expected output:

```
added 50 packages
```

#### 3️⃣ Configure Database Connection

Edit `config.js` with your MySQL credentials:

```javascript
const pool = mysql.createPool({
  host: "localhost", // Your MySQL host
  user: "root", // Your MySQL username
  password: "your_password", // Your MySQL password
  database: "railway_system",
});
```

#### 4️⃣ Start the Server

```bash
npm start
```

Expected output:

```
╔════════════════════════════════════════════════════════╗
║  🚂 Railway Management System - Interactive Frontend   ║
║  ✅ Server running on http://localhost:3000           ║
║  📊 Open in browser to access dashboard               ║
╚════════════════════════════════════════════════════════╝
```

#### 5️⃣ Open in Browser

Visit: **http://localhost:3000**

---

## 📋 Features Overview

### 1. 📊 Dashboard

- **Table Statistics**: View record count for all 12 tables
- **Quick Access**: Click any stat card to view data
- **Real-time Updates**: Data refreshes as you make changes

### 2. 📋 Tables Browse

- **View All Data**: Select any table and view all records
- **Table Structure**: See columns, types, keys, and constraints
- **Formatted Display**: Data displayed in readable tables

### 3. 🔨 Query Builder

**SELECT Operations**

- Choose table and enter optional WHERE conditions
- Example: `SELECT * FROM ticket WHERE train_no = 18046`

**INSERT Operations**

- Add new records to any table
- Dynamic form fields based on table structure
- Example: Add new passengers, tickets, payments

**UPDATE Operations**

- Modify existing records
- Full SQL control
- Example: `UPDATE passenger SET status = 'CNF' WHERE pnr = 5122543278`

**DELETE Operations**

- Remove records with confirmation dialog
- Requires WHERE condition for safety
- Example: `DELETE FROM inwaiting WHERE waiting_no = 1`

### 4. 💻 SQL Editor

- **Execute ANY SQL Query**: Full SQL command execution
- **Query History**: Run complex multi-table queries
- **Results Display**: Tabular format with column headers
- **Security**: Input validation and error handling

### 5. 📈 Reports & Analytics

- **Passengers by Status**: Group by confirmation status
- **Tickets by Train**: Count tickets per train
- **Payment Summary**: Payment methods breakdown
- **Train Schedule**: View complete route for any train

---

## 🔧 API Endpoints

### Core Endpoints

| Method | Endpoint                     | Purpose                           |
| ------ | ---------------------------- | --------------------------------- |
| GET    | `/api/query?sql=SELECT...`   | Execute SELECT query              |
| POST   | `/api/query`                 | Execute INSERT/UPDATE/DELETE      |
| GET    | `/api/tables`                | Get all tables with record counts |
| GET    | `/api/table-structure/:name` | Get table columns and types       |

### Table-Specific Endpoints

| Endpoint             | Methods   | Purpose                    |
| -------------------- | --------- | -------------------------- |
| `/api/station`       | GET, POST | Station table operations   |
| `/api/train`         | GET, POST | Train table operations     |
| `/api/ticket`        | GET, POST | Ticket table operations    |
| `/api/passenger`     | GET, POST | Passenger table operations |
| `/api/payment`       | GET, POST | Payment table operations   |
| `/api/login-details` | GET, POST | User management            |
| `/api/route`         | GET       | Route information          |
| `/api/class-info`    | GET       | Class information          |
| `/api/coach`         | GET       | Coach details              |
| `/api/train-fare`    | GET       | Fare information           |
| `/api/booked-seat`   | GET       | Seat booking info          |
| `/api/inwaiting`     | GET       | Waiting list               |

### Advanced Endpoints

| Endpoint                       | Method | Purpose                     |
| ------------------------------ | ------ | --------------------------- |
| `/api/calculate-fare`          | POST   | Calculate ticket fare       |
| `/api/train-schedule/:trainNo` | GET    | Get complete train schedule |

---

## 📝 Usage Examples

### Example 1: View All Passengers

1. Go to **Tables** tab
2. Select **Passenger** from dropdown
3. Click **Load Table**
4. See all passengers with IDs and details

### Example 2: Add New Passenger

1. Go to **Query Builder** tab
2. Click **INSERT** tab
3. Select **Passenger** table
4. Fill fields:
   - passenger_id: 14
   - pnr: 5122543289
   - name: John Doe
   - age: 30
   - gender: M
   - mobile_no: 9876543210
   - status: CNF
5. Click **Execute INSERT**

### Example 3: Find High-Value Tickets

1. Go to **SQL Editor** tab
2. Paste query:

```sql
SELECT
    t.pnr,
    t.date_of_travel,
    tr.train_name,
    t.class_id,
    (tf.fixed_charge + (tf.distance_charge * 1000)) AS fare
FROM ticket t
JOIN train tr ON t.train_no = tr.train_no
JOIN train_fare tf ON t.train_no = tf.train_no AND t.class_id = tf.class_id
WHERE tf.fixed_charge > 300
ORDER BY fare DESC;
```

3. Click **Execute Query**
4. View results

### Example 4: Generate Passenger Report

1. Go to **Reports** tab
2. Click **Load Report** on **Passengers by Status**
3. See count of CNF and WL passengers

### Example 5: View Train 18046 Schedule

1. Go to **Reports** tab
2. Enter train number: 18046
3. Click **Show Schedule**
4. See all stops with times and distances

---

## 🔐 Security Notes

### Best Practices

1. **Password Protection**
   - Change default MySQL password immediately
   - Use strong passwords for users

2. **SQL Injection Prevention**
   - Application uses parameterized queries
   - User input is validated

3. **Access Control**
   - Restrict database user permissions
   - Use READ_ONLY accounts for viewers

4. **Data Backup**
   - Regular database backups recommended
   - Export data before major changes

### Production Deployment

For production, update `config.js`:

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST || "prod-db.example.com",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // Use environment variables
  database: process.env.DB_NAME,
  connectionLimit: 20,
  enableKeepAlive: true,
});
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'mysql2'"

**Solution:**

```bash
npm install mysql2
```

### Error: "ECONNREFUSED - Connection refused"

**Problem:** MySQL is not running
**Solution:**

```bash
# Windows
net start MySQL
# Mac
brew services start mysql-server
# Linux
sudo systemctl start mysql
```

### Error: "ER_ACCESS_DENIED_FOR_USER"

**Problem:** Wrong MySQL credentials
**Solution:** Update `config.js` with correct username/password

### Error: "ER_NO_DB_ERROR"

**Problem:** Database not created
**Solution:**

```bash
mysql -u root -p < SQLCode.sql
```

### Frontend shows "Disconnected"

**Problem:** Backend not running
**Solution:**

```bash
npm start
```

### Blank page on localhost:3000

**Problem:** Check browser console for errors
**Solution:**

- Open DevTools (F12)
- Check Console tab for error messages
- Verify API endpoint is accessible

---

## 📦 File Structure

```
frontend/
├── package.json              # Project dependencies
├── config.js                 # Database configuration
├── server.js                 # Express server
├── routes/
│   └── api.js               # API endpoints
└── public/
    ├── index.html           # Main dashboard
    ├── style.css            # Styling
    └── script.js            # Frontend logic
```

---

## 🚀 Performance Tips

1. **Use Indexes**: Database uses proper keys for fast queries
2. **Limit Results**: Use WHERE conditions to filter data
3. **Batch Operations**: Insert multiple records efficiently
4. **Cache Data**: Frontend caches table structures

---

## 📞 Support

### Common Issues Checklist

- [ ] MySQL is running
- [ ] Database is created with SQLCode.sql
- [ ] config.js has correct credentials
- [ ] Node.js version is 12+
- [ ] Port 3000 is not in use
- [ ] No firewall blocking connections

### Debug Mode

Enable detailed logging:

```javascript
// In config.js
pool.on("error", (err) => {
  console.error("Pool error:", err);
});
```

---

## 📚 Related Documentation

- **Database Implementation**: See `SQLCode.sql` and `IMPLEMENTATION_GUIDE.sql`
- **3NF Compliance**: See `3NF_COMPLIANCE_REPORT.md`
- **Database Schema**: See `3NF_COMPLIANCE_IMPLEMENTATION_SUMMARY.md`
- **Migration Guide**: See `MIGRATION_GUIDE.md`

---

## 🎯 Next Steps

1. ✅ Setup complete
2. 📊 Explore dashboard with sample data
3. 🔨 Try Query Builder on different tables
4. 💻 Write custom SQL in Editor
5. 📈 Generate reports

---

**Happy Database Management! 🚂**

For questions, refer to the documentation files in the parent directory.
