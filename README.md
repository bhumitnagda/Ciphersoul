# CipherSoul

CipherSoul is a secure personal notes and writing application designed for users to create, manage, and organize their private notes. It provides user authentication, encrypted note storage, categories, Markdown editing, and writing analytics.

Users can register and log in to their accounts, create and edit notes, organize notes using categories and tags, pin important notes, and manage their account settings. The application also provides writing statistics such as word count, reading time, writing streaks, and activity tracking.

## Tech stack

- **Language:** JavaScript
- **Frontend:** React.js
- **Backend:** Node.js and Express.js
- **Database:** MongoDB
- **Authentication:** JWT and bcrypt
- **Encryption:** CryptoJS
- **Charts and analytics:** Chart.js and react-chartjs-2
- **HTTP requests:** Axios
- **Other libraries:** React Router, React Markdown, PrismJS, React Icons, React Toastify, date-fns, remark-gfm, and remark-breaks

## Architecture

The project follows a React frontend and Node.js/Express backend structure:

- `server.js` contains the Express server setup, MongoDB connection, middleware configuration, and API routes.
- `models/` contains the MongoDB models for users, notes, categories, and user settings.
- `routes/` contains API routes for authentication, notes, categories, and analytics.
- `middleware/` contains authentication and statistics tracking middleware.
- `src/` contains the React frontend application.
- `src/components/` contains the main application components such as login, registration, dashboard, note editors, category management, account settings, and analytics.
- `src/context/` contains React contexts for authentication and theme management.
- `src/services/` contains the API service used by the frontend to communicate with the backend.
- `src/utils/` contains utility functions including note encryption and word counting.
- `public/` contains the public files used by the React application.

The frontend communicates with the Express backend through API requests. The backend handles authentication, notes, categories, and analytics and stores application data in MongoDB.

### Note encryption

CipherSoul encrypts note content before it is stored in the database. The frontend uses CryptoJS AES encryption, with a key derived from the user's password and username.

The server stores the encrypted note content instead of the original plain text. When the user opens a note, the frontend decrypts the content so it can be displayed and edited.

The encryption functionality is implemented in `src/utils/crypto.js`.

**Disclaimer:** The encryption used in this project is part of the project's implementation and should not be considered a replacement for a professionally audited end-to-end encryption system.

### User authentication

Users can register and log in using a username and password. Passwords are hashed using bcrypt before being stored in the database.

After successful login, the backend generates a JSON Web Token (JWT). The token is used to authenticate requests to protected routes such as notes and analytics.

Authentication-related routes are implemented in `routes/authRoutes.js`, while authentication middleware is present in `middleware/auth.js`.

### Writing analytics

CipherSoul tracks writing activity and provides statistics to help users understand their writing habits.

The analytics section includes:

- Total number of notes
- Total word count
- Reading time
- Daily writing activity
- Current writing streak
- Best writing streak
- Writing activity heatmap
- Writing achievements
- Recent writing statistics

Analytics-related API operations are implemented in `routes/analyticsRoutes.js`, while the frontend analytics interface is implemented in `src/components/Analytics.js`.

## Prerequisites

- Node.js and npm
- MongoDB
- Git, if cloning the repository
- A modern web browser

## Setup

Open a terminal in the project root directory.

### 1. Clone the repository

```bash
git clone <repository-url>
cd Ciphersoul
```

### 2. Install dependencies

Install the project dependencies using:

```bash
npm install
```

### 3. Environment configuration

Create a `.env` file in the project root directory, alongside `server.js`.

Add the required configuration:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

Replace the placeholder values with your own configuration.

Do not upload the `.env` file to GitHub because it may contain database credentials or other secret information.

## Run the project

The project contains both a React frontend and a Node.js backend.

### Start the backend

Run:

```bash
node server.js
```

The backend server runs on:

```text
http://localhost:5000
```

### Start the frontend

Open another terminal in the project directory and run:

```bash
npm start
```

The React application normally opens at:

```text
http://localhost:3000
```

## Main features

### User Authentication

- User registration
- User login
- JWT-based authentication
- Password hashing using bcrypt
- Protected API routes

### Note Management

- Create notes
- Edit notes
- Delete notes
- Pin notes
- Add categories and tags
- Track note versions
- Markdown-based editing

### Writing Statistics

- Word count
- Reading time
- Edit tracking
- Daily writing activity
- Current and best writing streak
- Writing heatmap
- Writing achievements

### Security and Privacy

- Password hashing
- Authentication middleware
- Encrypted note content
- Note access tracking
- Privacy score calculation
- Encryption strength calculation
- Modification and access history

### User Interface

- Dashboard
- Account settings
- Category management
- Dark and light theme
- Markdown editor
- Writing analytics

## Project Structure

```text
Ciphersoul/
│
├── middleware/
│   ├── auth.js
│   └── statsTracker.js
│
├── models/
│   ├── Category.js
│   ├── Note.js
│   ├── User.js
│   └── UserSettings.js
│
├── routes/
│   ├── analyticsRoutes.js
│   ├── authRoutes.js
│   ├── categoryRoutes.js
│   └── noteRoutes.js
│
├── public/
│
├── src/
│   ├── components/
│   ├── context/
│   ├── services/
│   └── utils/
│
├── server.js
├── package.json
├── package-lock.json
└── README.md
```

## Testing

The project includes a React test file and can be tested using:

```bash
npm test
```

A production build can be created using:

```bash
npm run build
```

## Future Improvements

- Password recovery
- Improved encryption and key management
- Cloud deployment
- Better note search and filtering
- Secure note sharing
- More advanced analytics
- Improved backup and recovery options

## Contributors

- Bhumit Nagda
- Taher Saterdawala
- Eshant Palkar
- Gautham Seshapalli

## License

This project is licensed under the MIT License.
