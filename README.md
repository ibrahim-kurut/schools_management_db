# 🏫 System for Managing Schools (Schools Management System)

A sophisticated back-and-forth project for managing school, students, and financial installments, built using **Node.js** and **PostgreSQL**.

## 🛠 Technologies Used
- **Backend:** Node.js (Express)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **DevOps:** Docker & Docker Compose

## 🚀 How to Run (Local Development)

### 1. Run the Database (Docker)
```bash
 docker-compose up -d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Application
```bash
npm run dev
```

### 4. Access the Application
Open your browser and navigate to `http://localhost:8000` to access the application.

## 🛠 Technologies Used
* **Runtime:** Node.js (JavaScript)
* **Framework:** Express.js
* **Database:** PostgreSQL (Containerized via Docker)
* **ORM:** Prisma
* **Utilities:** Slugify (for converting names to search-friendly links)

## 🏗 Project Architecture
We follow an organized pattern for dividing the code:
- `src/controllers`: Handling requests and responses.
- `src/services`: Business Logic and database interactions.
- `src/routes`: Defining routes.
- `src/utils`: Helper utilities.

## 🚀 Local Setup

### 1. Requirements
Make sure you have **Docker** and **Node.js** installed on your device.

### 2. Run Services (Docker)
Run PostgreSQL container:
```bash
docker-compose up -d