# 🎬 Movie Booking System

A full-stack movie booking platform built with the **MERN stack** that allows users to browse movies, explore theatres, select seats in real time, book tickets securely, and make online payments.

I built this project to learn how production-level web applications are designed and developed. Instead of creating a simple CRUD application, I focused on solving real engineering problems such as authentication, concurrent seat booking, secure payments, API security, error handling, testing, and scalable backend architecture.

---

## ✨ Features

### User Authentication

* User registration and login
* JWT-based authentication
* HTTP-only authentication cookies
* Password hashing using bcrypt
* Forgot password & reset password
* Role-based authorization (Admin/User)

### Movies

* Browse movies
* Search by title
* Filter by genre and language
* Pagination & sorting
* Movie details page
* Upload movie posters

### Theatres & Screens

* Manage theatres
* Multiple screens per theatre
* Automatic seat generation
* Different seat categories

  * Regular
  * Premium
  * Recliner

### Shows

* Create and manage movie shows
* View available shows
* Filter by movie and date

### Real-Time Seat Booking

One of the most interesting parts of this project is the seat booking system.

Features include:

* Live seat availability
* Temporary seat locking
* Automatic lock expiration
* Optimistic concurrency control
* Real-time updates using Socket.io

This prevents multiple users from booking the same seat simultaneously.

### Payments

* Stripe payment integration
* Payment verification
* Webhook handling
* Booking confirmation after successful payment

### Booking

* Book movie tickets
* View booking history
* Cancel bookings
* Download ticket (planned)

### Reviews

* Add ratings
* Write reviews
* Update reviews
* Delete reviews

### Admin Dashboard

* Manage movies
* Manage theatres
* Manage shows
* View booking statistics
* Monitor revenue

---

# 🛠 Tech Stack

## Frontend

* React.js
* Redux Toolkit
* React Router
* Axios
* Tailwind CSS
* Socket.io Client

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Socket.io
* JWT Authentication
* Cloudinary
* Stripe
* Nodemailer

## Security

* Helmet
* Express Rate Limiter
* Mongo Sanitize
* XSS Protection
* Cookie Parser

## Testing

* Jest
* Supertest
* MongoDB Memory Server


## Caching
* Redis


---

# 📁 Project Structure

```text
movie-booking-system
│
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── scripts/
├── tests/
├── uploads/
├── utils/
├── validators/
│
├── app.js
├── index.js
├── package.json
└── README.md
```

---
## 🏗 Architecture

```text
Client
   │
   ▼
Express API
   │
 ┌─┴─────────────┐
 ▼               ▼
Redis Cache   MongoDB
   │
   ▼
Fast Reads & Seat Locks
```

## 🚀 Redis Caching

Redis is used to improve performance by reducing unnecessary database queries.

### Cached Data

- Movie Listings
- Movie Details
- Theatre Listings
- Show Listings
- Dashboard Statistics

### Cache Invalidation

Cache is automatically cleared whenever:

- A movie is added
- A movie is updated
- A movie is deleted

### Benefits

- Faster API responses
- Reduced MongoDB load
- Better scalability
- Production-ready architecture



# 🚀 Getting Started

Clone the repository

```bash
git clone https://github.com/your-username/movie-booking-system.git
```

Go inside the project

```bash
cd movie-booking-system
```

Install dependencies

```bash
npm install
```

Create a `.env` file and configure the required environment variables.

Run the development server

```bash
npm run dev
```

Run the production server

```bash
npm start
```

---

# 📌 API Modules

The backend is organized into multiple modules:

* Authentication
* Movies
* Theatres
* Screens
* Shows
* Seat Booking
* Payments
* Reviews
* Dashboard
* Users

All APIs follow REST principles and return consistent JSON responses.

---

# 🔒 Security

Security was one of the main priorities while building this project.

Some of the protections implemented include:

* JWT authentication
* Password hashing
* HTTP-only cookies
* Rate limiting
* XSS protection
* NoSQL injection protection
* Input validation
* Centralized error handling

---

# 🧪 Testing

The project includes automated tests for important backend functionality.

Current test coverage includes:

* User authentication
* Registration
* Login
* Protected routes
* Seat locking
* Booking workflow

Run all tests:

```bash
npm test
```

---

# 🐳 Docker

The project is designed to be Docker-friendly.

```bash
docker compose build
```

```bash
docker compose up
```

```bash
docker compose down
```

---
## Redis Caching

- Integrated Redis for high-speed caching
- Cached movie listings and movie details
- Cache invalidation on create/update/delete
- Designed for scalable production deployments



# 📚 What I Learned

Building this project helped me gain practical experience with:

* Designing REST APIs
* MongoDB schema design
* Authentication & authorization
* Secure backend development
* Real-time communication using Socket.io
* Handling concurrent requests
* Payment gateway integration
* Writing clean and maintainable code
* Automated testing
* Docker basics
* Production-ready project structure

---

# 🚀 Future Improvements

Some features I plan to add in future versions:

* Redis caching
* Recommendation system
* QR code ticket generation
* Email ticket delivery
* Google OAuth login
* SMS notifications
* Elasticsearch-based search
* CI/CD pipeline
* Kubernetes deployment

---

# 👨‍💻 About Me

I'm **Souvik Singh**, an Information Technology undergraduate with a strong interest in **Backend Development**, **System Design**, and **Full Stack Development**.

This project is part of my journey to build production-ready applications and prepare for software engineering roles.

---

## ⭐ If you found this project helpful, consider giving it a star.
