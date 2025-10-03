# E-sign Backend API

A comprehensive backend API for E-sign, a digital document signing platform built with Node.js, Express, and Prisma.

## 🚀 Features

- **User Authentication & Authorization**

  - Email/password authentication
  - OAuth integration (Google, Apple)
  - JWT-based session management
  - Password reset functionality

- **Document Management**

  - PDF document upload and processing
  - Digital signature placement
  - Document status tracking
  - Audit trail generation

- **Payment Integration**

  - Stripe subscription management
  - PRO plan handling ($9.98/month)
  - Webhook processing for payment events

- **Communication Services**

  - Email notifications via AWS SES
  - SMS verification via Twilio/Telnyx
  - HTML email templates

- **Admin Dashboard**

  - User management
  - Analytics and reporting
  - Blog content management
  - System monitoring

- **Security Features**
  - Input validation and sanitization
  - Rate limiting and CORS
  - Secure cookie handling
  - Environment-based configuration

## 🛠 Tech Stack

- **Runtime**: Node.js with ES6 modules
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Passport.js
- **File Storage**: Cloudinary
- **Payment**: Stripe
- **Email**: AWS SES
- **SMS**: Twilio/Telnyx
- **Deployment**: Docker + Nginx

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v18 or higher)
- PostgreSQL database
- Docker (optional, for containerized deployment)
- AWS account (for SES email service)
- Stripe account (for payments)
- Twilio/Telnyx account (for SMS)

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Database setup**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate dev

   # (Optional) Seed the database
   node prisma/seeders/seedUsers.js
   ```

## ⚙️ Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/e-sign"

# Server
PORT=5000
NODE_ENV="DEVELOPMENT"
CLIENT_URL="http://localhost:3000"
API_URL="http://localhost:5000"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="10d"
COOKIE_EXPIRES_IN="10d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APPLE_CLIENT_ID="com.e-sign.web"
APPLE_TEAM_ID="your-apple-team-id"
APPLE_KEY_ID="your-key-id"
APPLE_KEY_PATH="./AuthKey_XXXXXX.p8"

# Email (AWS SES)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
SES_FROM_EMAIL="noreply@e-sign.com"
FROM_NAME="E-sign"

# SMS (Twilio)
TELNYX_API_KEY="your-telnyx-api-key"
TELNYX_MESSAGING_PROFILE_ID="your-profile-id"
TELNYX_FROM_NUMBER="+1234567890"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_MONTHLY_PRICE_ID="price_..."
```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Docker Deployment

```bash
# Build the image
docker build -t e-sign-api .

# Run with docker-compose
docker-compose up -d
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token

### Document Endpoints

- `POST /api/v1/document/upload` - Upload document
- `GET /api/v1/document/:id` - Get document details
- `POST /api/v1/document/:id/sign` - Sign document

### Payment Endpoints

- `POST /api/v1/payment/create-session` - Create Stripe checkout session
- `POST /api/v1/payment/webhook` - Stripe webhook handler
- `GET /api/v1/payment/subscription` - Get subscription details

### Admin Endpoints

- `GET /api/v1/admin/users` - Get all users
- `GET /api/v1/admin/dashboard` - Get dashboard statistics
- `GET /api/v1/admin/blogs` - Get all blog posts

## 📁 Project Structure

```
server/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seeders/               # Database seeders
├── src/
│   ├── config/                # Configuration files
│   │   ├── dbConnection.js    # Database connection
│   │   ├── passport.js        # OAuth configuration
│   │   └── sesClient.js       # AWS SES client
│   ├── constants/             # Application constants
│   ├── controllers/           # Route controllers
│   ├── lib/                   # External service integrations
│   │   ├── cloudinary.js      # File upload service
│   │   ├── emailService.js    # Email service
│   │   └── smsService.js      # SMS service
│   ├── middlewares/           # Express middlewares
│   ├── routes/                # API route definitions
│   ├── utils/                 # Utility functions
│   └── validators/            # Input validation schemas
├── app.js                     # Express app configuration
├── server.js                  # Server entry point
├── package.json
├── .env.example               # Environment variables template
└── README.md
```

## 🔒 Security Features

- **Authentication**: JWT tokens with secure cookie storage
- **Authorization**: Role-based access control (USER/ADMIN)
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Built-in protection against abuse
- **CORS**: Configured for secure cross-origin requests
- **Environment Security**: Sensitive data stored in environment variables

## 📊 Monitoring & Maintenance

The application includes automated maintenance tasks:

- **Health Check**: Self-ping every 10 minutes to prevent server sleep
- **Document Cleanup**: Automatic deletion of expired FREE user documents daily at 3:00 AM
- **Error Handling**: Comprehensive error logging and handling
- **Audit Trail**: Document signing activities are logged for compliance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Abdul Rehman**

- Email: abdulrehman.code1@gmail.com
- GitHub: [abdulrehmanwaseem](https://github.com/abdulrehmanwaseem)

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [Prisma](https://prisma.io/) - Database ORM
- [Stripe](https://stripe.com/) - Payment processing
- [AWS SES](https://aws.amazon.com/ses/) - Email service
- [Cloudinary](https://cloudinary.com/) - Media management
