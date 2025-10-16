# Mini Webpage Builder - Server

Backend server for the Mini Webpage Builder application. This Node.js/Express server provides REST API endpoints and real-time WebSocket communication for a collaborative webpage building platform.

## Features

- 🔐 **User Authentication** - JWT-based authentication system
- 📄 **Page Management** - Create, read, update, and delete webpage projects
- 👥 **User Management** - User profiles and account management
- 📤 **File Upload** - Image and asset upload functionality with Multer
- 🔄 **Real-time Collaboration** - WebSocket support via Socket.IO
- 🛡️ **Security** - Helmet.js, CORS, rate limiting, and input validation
- 📊 **Database** - MongoDB with Mongoose ODM
- 🚀 **Performance** - Response compression and optimized middleware

## Tech Stack

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens) with bcrypt
- **Real-time**: Socket.IO
- **Validation**: Joi
- **Security**: Helmet, CORS, express-rate-limit
- **File Upload**: Multer
- **Logging**: Morgan

## Prerequisites

Before running this project, ensure you have the following installed:

- Node.js (v18.0.0 or higher)
- MongoDB (local or remote instance)
- npm or yarn package manager

## Installation

1. Clone the repository and navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp env.example .env
```

4. Edit the `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/mini-webpage-builder
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/mini-webpage-builder` |
| `JWT_SECRET` | Secret key for JWT signing | Required |
| `JWT_EXPIRE` | JWT token expiration time | `7d` |
| `CLIENT_URL` | Frontend application URL (for CORS) | `http://localhost:3000` |
| `MAX_FILE_SIZE` | Maximum upload file size in bytes | `5242880` (5MB) |
| `UPLOAD_PATH` | Directory for uploaded files | `./uploads` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Running Tests
```bash
npm test
```

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### Page Routes (`/api/pages`)
- `GET /api/pages` - Get all pages
- `GET /api/pages/:id` - Get specific page
- `POST /api/pages` - Create new page
- `PUT /api/pages/:id` - Update page
- `DELETE /api/pages/:id` - Delete page

### User Routes (`/api/users`)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Upload Routes (`/api/upload`)
- `POST /api/upload` - Upload file(s)

## Project Structure

```
server/
├── middleware/
│   ├── auth.js           # Authentication middleware
│   ├── errorHandler.js   # Global error handling
│   └── validation.js     # Request validation middleware
├── models/
│   ├── Page.js          # Page model schema
│   └── User.js          # User model schema
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── pages.js         # Page management routes
│   ├── upload.js        # File upload routes
│   └── users.js         # User management routes
├── socket/
│   └── socketHandlers.js # WebSocket event handlers
├── uploads/
│   └── images/          # Uploaded images directory
├── .env                 # Environment variables (create from env.example)
├── env.example          # Example environment configuration
├── index.js             # Application entry point
├── package.json         # Project dependencies
└── README.md           # This file
```

## Middleware

### Authentication (`middleware/auth.js`)
JWT-based authentication middleware that protects routes requiring user authentication.

### Error Handler (`middleware/errorHandler.js`)
Centralized error handling middleware for consistent error responses.

### Validation (`middleware/validation.js`)
Joi-based request validation middleware for input sanitization and validation.

## WebSocket Events

The server supports real-time communication via Socket.IO for collaborative features. Socket handlers are defined in `socket/socketHandlers.js`.

## Security Features

- **Helmet.js**: Secures Express apps by setting various HTTP headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents abuse with configurable rate limits
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Joi schemas for request validation
- **File Upload Limits**: Configurable file size restrictions

## Database Models

### User Model
- User authentication and profile information
- Password hashing with bcrypt
- JWT token generation

### Page Model
- Webpage project data and configuration
- User ownership and permissions
- Content and metadata storage

## Development

### Adding New Routes
1. Create route file in `routes/` directory
2. Implement route handlers
3. Add validation schemas if needed
4. Register routes in `index.js`

### Adding New Models
1. Create model file in `models/` directory
2. Define Mongoose schema
3. Export model for use in routes

### Adding Middleware
1. Create middleware file in `middleware/` directory
2. Implement middleware function
3. Apply to routes as needed

## Error Handling

The application uses a centralized error handling approach:
- Custom error classes for different error types
- Consistent error response format
- Environment-specific error details (development vs production)

## Performance Optimization

- **Compression**: Gzip compression for responses
- **Static File Serving**: Efficient static file delivery
- **Connection Pooling**: MongoDB connection optimization
- **Request Size Limits**: Protection against large payloads

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or contributions, please open an issue in the repository.

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Verify `MONGODB_URI` in `.env` is correct
- Check network connectivity and firewall settings

### Port Already in Use
- Change `PORT` in `.env` file
- Kill the process using the port: `netstat -ano | findstr :5000` (Windows)

### File Upload Errors
- Ensure `uploads/images/` directory exists and has write permissions
- Check `MAX_FILE_SIZE` configuration
- Verify Multer configuration in upload routes

### JWT Authentication Failures
- Ensure `JWT_SECRET` is set in `.env`
- Check token expiration settings
- Verify token is sent in Authorization header

## Future Enhancements

- [ ] Add comprehensive test coverage
- [ ] Implement API documentation (Swagger/OpenAPI)
- [ ] Add database migrations
- [ ] Implement caching layer (Redis)
- [ ] Add background job processing
- [ ] Implement advanced logging and monitoring
- [ ] Add Docker support
- [ ] Set up CI/CD pipeline
