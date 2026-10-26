# Hackathon Info

Welcome to the Hackathon! This document will guide you through setting up your project, connecting to databases, and preparing for a smooth project handover.

---

## 🚀 Before We Start

### 1. Set Up Your Project
- Ensure all team members have access. If access issues arise, contact [**Dave Balderstone**](mailto:dave@poteris.co.uk).

### 2. Connect to the Database

You have a postgres environment available: 

- **URL**:  
  `lwpdataexplore.cuwl94jqxbq0.eu-west-2.rds.amazonaws.com:5432/ighackdata`

- **Username**:  
  `ighackday`

- **Password**:  
  `ighackday`

> **Note**: Please keep these credentials secure and only share them with authorized team members.


#### Using IntelliJ:
1. Add a new data source and select **PostgreSQL**
2. Download the PostgreSQL driver in the **Drivers** tab.
3. Input the host, user credentials, port, and database. See below for guidance:  
   ![Data Source Connection in IntelliJ](DataSourceConnectionIntelliJ.png)

#### Using SQL Developer:
1. Download and add the **JDBC connection library** to the **Third Party JDBC Drivers**.
2. Follow the steps in this guide for connecting when the username does not match the database name:  
   [Using SQL Developer with PostgreSQL](https://tsmx.net/using-sqldeveloper-with-postgresql/#:~:text=To%20enable%20SQL%20Developer%20to,able%20to%20read%20the%20file.)

---

## 🛠 During the Hackathon

- If possible, add a `README.md` file to your project that will help ensure a smooth handover to the charity after the Hackathon concludes. Consider adding a **Current Status** section to your project.
- Document any **remaining tasks** or **potential improvements**.

---

## ✅ After Hackathon

Please erase all the local copies of the data you obtained during the Hackathon.





