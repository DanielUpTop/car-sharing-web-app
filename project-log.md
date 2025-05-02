# Car Sharing Web Application - Project Log

## Project Overview
A full-stack car-sharing web application built with React, Node.js, and MySQL, enabling users to book vehicles and administrators to manage the fleet. The platform includes user authentication, vehicle management, booking system, payment processing, admin dashboard, insurance management, and customer support functionality.

## Technology Stack
- Frontend: React, TypeScript, HTML5, CSS3, Material-UI
- Backend: Node.js with Express.js
- Database: MySQL
- Authentication: JWT (JSON Web Tokens)
- Payment Processing: Stripe API
- Maps Integration: Google Maps API
- Email Notifications: EmailJS
- Real-time Communication: Socket.IO

## Development Phases

### Phase 1: Project Setup and Basic Structure
- [x] Initialize project repository
- [x] Set up React frontend using Create React App
- [x] Configure Node.js backend with Express
- [x] Establish basic project structure
- [x] Create initial README documentation

### Phase 2: User Authentication System
- [x] Implement user registration
- [x] Create login system
- [x] Set up JWT authentication
- [x] Design and implement user profiles
- [x] Add middleware for route protection

### Phase 3: Vehicle Management System
- [x] Create vehicle listing components
- [x] Implement vehicle search functionality
- [x] Add vehicle details view
- [x] Integrate Google Maps API
- [x] Add vehicle availability calendar

### Phase 4: Booking System
- [x] Develop booking interface
- [x] Implement date/time selection
- [x] Create booking confirmation system
- [x] Add email notification system
- [x] Implement booking history view

### Phase 5: Payment Integration
- [x] Integrate Stripe payment gateway
- [x] Create secure checkout process
- [x] Implement payment verification
- [x] Add payment success/failure handling
- [x] Develop booking receipt generation

### Phase 6: Admin Dashboard
- [x] Create admin interface
- [x] Implement fleet management tools
- [x] Add user management capabilities
- [x] Create analytics dashboard
- [x] Build booking approval workflow

### Phase 7: Insurance System
- [x] Design insurance policy structure
- [x] Implement policy selection interface
- [x] Create claims processing system
- [x] Add policy management for admins
- [x] Integrate with booking workflow

### Phase 8: Membership System
- [x] Design membership tiers
- [x] Implement membership purchase/renewal
- [x] Create member benefits system
- [x] Add membership status indicators
- [x] Integrate with user profiles

### Phase 9: Help Center and Support
- [x] Create Help Center interface
- [x] Implement FAQ system
- [x] Develop support ticket system
- [x] Create admin support message functionality
- [x] Add real-time chat support

### Phase 10: Database Integration
- [x] Design database schema
- [x] Set up MySQL database
- [x] Create necessary tables
- [x] Implement data access layer
- [x] Optimize query performance

### Phase 11: Testing and Optimization
- [x] Implement unit testing
- [x] Perform integration testing
- [x] Optimize performance
- [x] Security audit
- [x] Cross-browser compatibility testing

## Daily Progress Log

### Initial Setup - Project Framework
- Created initial project log
- Defined development phases
- Established project structure

#### Backend Setup
- Initialized Node.js backend project structure
- Installed core dependencies:
  - express: Web application framework
  - cors: Cross-Origin Resource Sharing middleware
  - dotenv: Environment variables management
  - mysql2: MySQL database driver
  - bcryptjs: Password hashing
  - jsonwebtoken: JWT authentication
  - stripe: Payment processing
  - socket.io: Real-time communication
- Created basic server configuration
- Set up initial project structure with modular organization
- Implemented environment configuration for different deployment environments

#### Technical Decisions:
- Chose Express.js for its robust middleware system and extensive community support
- Implemented modular folder structure for better code organization and maintainability
- Used environment variables for secure configuration management
- Used MySQL connection pooling for better performance
- Implemented password hashing for security
- Created reusable database configuration

### Authentication System Implementation
- Designed and implemented comprehensive user authentication:
  - User registration with email verification
  - Login system with JWT token generation
  - Password hashing with bcrypt
  - Middleware for protected routes
  - Role-based authorization (user/admin)
- Created authentication routes and controllers:
  - POST `/api/auth/register`: User registration
  - POST `/api/auth/login`: User login
  - GET `/api/auth/verify`: Token verification
  - POST `/api/auth/refresh`: Token refresh
- Added security features:
  - Token expiration and refresh mechanism
  - Email verification for new accounts
  - Password strength validation
  - Rate limiting for auth endpoints

#### Authentication Implementation Progress
- Set up JWT-based authentication system
- Implemented secure user authentication routes
- Added security measures:
  - Password hashing with bcrypt
  - JWT token generation for session management
  - Secure JWT secret configuration
  - Email uniqueness validation

#### Authentication Technical Decisions
- Used JWT for stateless authentication
- Implemented token expiration (1 hour) for security
- Return minimal user data in responses
- Structured error responses for better client handling

### Database Setup and Implementation
- Designed comprehensive database schema for car sharing application
- Created and initialized key tables:
  - users: User account information
  - vehicles: Car fleet details
  - bookings: Reservation information
  - payments: Payment transaction records
  - insurance_policies: Insurance coverage details
  - memberships: User membership plans
  - support_tickets: Customer support requests
- Implemented database connection pooling for performance optimization
- Created database initialization scripts for development and production
- Added foreign key constraints for data integrity
- Implemented error handling for database operations

#### Database Implementation Progress
- Successfully connected to MySQL database
- Created and initialized all required tables
- Implemented connection pooling for better performance
- Resolved initial connection issues by properly configuring environment variables
- Added database migration capabilities for schema updates

### Frontend Framework Implementation
- Set up React application using Create React App with TypeScript
- Implemented Material-UI components for consistent design
- Created responsive layouts for all device sizes
- Established component hierarchy and global state management
- Implemented routing with React Router
- Added form validation with Formik and Yup
- Created custom hooks for API communication and state management
- Implemented loading indicators and error handling

#### Frontend Technical Implementation
- Installed essential frontend dependencies:
  - axios: For HTTP requests to backend
  - react-router-dom: For client-side routing
  - Material-UI: For responsive design components
  - formik: Form management
  - yup: Schema validation
  - react-query: Data fetching and caching
  - date-fns: Date manipulation
  - stripe/react-stripe-js: Payment integration

#### Frontend Structure
- Organized component hierarchy for maintainability:
  ```
  frontend/
  ├── src/
  │   ├── components/
  │   │   ├── auth/
  │   │   │   ├── Login.tsx
  │   │   │   └── Register.tsx
  │   │   ├── layout/
  │   │   │   ├── Navbar.tsx
  │   │   │   └── Footer.tsx
  │   │   ├── vehicles/
  │   │   ├── bookings/
  │   │   ├── payments/
  │   │   ├── admin/
  │   │   ├── help/
  │   │   └── common/
  │   ├── services/
  │   │   └── api.ts
  │   ├── contexts/
  │   │   └── AuthContext.tsx
  │   └── types/
  │       └── index.ts
  ```

### Vehicle Management System
- Created comprehensive vehicle management system:
  - Vehicle listing with filtering and sorting
  - Detailed vehicle view with specifications
  - Vehicle availability calendar
  - Image gallery for each vehicle
  - Vehicle location map integration
- Implemented admin vehicle management:
  - Add/edit/delete vehicle functionality
  - Vehicle status management (active, maintenance, unavailable)
  - Vehicle usage statistics
- Added Google Maps integration for vehicle locations
- Created search functionality with multiple filter options:
  - Location-based search
  - Date range availability
  - Vehicle type/category
  - Price range
  - Features/amenities

### Booking System Implementation
- Developed complete booking flow:
  - Date and time selection with availability checking
  - Booking details form with validation
  - Insurance selection options
  - Price calculation with discounts
  - Booking confirmation
- Created user booking management:
  - View upcoming/past bookings
  - Cancel/modify booking functionality
  - Booking details view with receipt
  - Rebooking from past reservations
- Implemented admin booking approval workflow:
  - Booking review interface
  - Approval/rejection with comments
  - Booking status management
  - Fleet availability management

### Payment System Integration
- Integrated Stripe payment gateway:
  - Secure credit card processing
  - Payment intent creation and confirmation
  - Webhook handling for payment events
  - Receipt generation
- Implemented payment flow:
  - Calculate booking total with fees and taxes
  - Process payment with Stripe Elements
  - Handle successful/failed payments
  - Store payment records in database
- Created payment history view for users
- Added invoice generation for completed bookings
- Implemented refund processing for cancelled bookings

#### Payment System Technical Implementation
- Created secure payment processing using Stripe API:
  - Frontend Elements integration for card input
  - Backend payment intent creation
  - Webhook handling for payment events
  - Error handling and recovery paths
- Fixed multiple issues with payment flow:
  - Resolved redirect after payment completion
  - Added proper loading states during payment processing
  - Implemented better error handling for failed payments
  - Fixed price calculation and formatting issues

### March 12, 2024
#### Admin Dashboard Implementation
- Created comprehensive admin dashboard:
  - Overview statistics with key metrics
  - User management interface
  - Vehicle fleet management
  - Booking approval workflow
  - Revenue and usage charts
- Implemented analytics visualization:
  - Booking trends over time
  - Vehicle utilization rates
  - Revenue breakdown by vehicle/category
  - User acquisition metrics
- Added user management capabilities:
  - View/edit user details
  - Manage user permissions
  - Suspend/activate accounts
  - View user booking history

#### Admin Dashboard Challenges Resolved
- Fixed middleware authentication issues preventing admin access
- Resolved data loading performance problems
- Implemented proper role-based access control
- Enhanced data visualization for better decision making
- Added export functionality for reports

### March 18, 2024
#### Insurance System Implementation
- Developed complete insurance management system:
  - Policy creation and management
  - Coverage level selection during booking
  - Claims processing workflow
  - Policy document generation
- Created database tables and models:
  - insurance_policies: Policy metadata and pricing
  - policy_coverages: Coverage details for each policy
  - claims: Insurance claim records
- Implemented frontend components:
  - Policy selection during booking process
  - Coverage details display
  - Claim submission form
  - Claim status tracking
- Added admin insurance management:
  - Policy creation/editing
  - Claim review and processing
  - Coverage level management
  - Insurance reports and statistics

#### Insurance Model Implementation
- Created comprehensive InsuranceModel with methods:
  - getPolicies: Fetch available insurance policies
  - getPolicy: Get specific policy details
  - createPolicy: Add new insurance policy
  - updatePolicy: Modify existing policy
  - deletePolicy: Remove insurance policy
  - submitClaim: Process new insurance claim
  - getClaims: Retrieve claims for user or admin
  - updateClaimStatus: Change claim processing status

### March 25, 2024
#### Membership System Development
- Implemented complete membership system:
  - Membership tier structure (Basic, Premium, Platinum)
  - Benefits management for each tier
  - Membership purchase and renewal flow
  - Automatic discounts based on membership level
- Created MembershipController with endpoints:
  - GET `/api/memberships`: Fetch available membership plans
  - GET `/api/memberships/:id`: Get specific membership details
  - POST `/api/memberships/purchase`: Process new membership purchase
  - GET `/api/memberships/user`: Get current user's membership
  - PUT `/api/memberships/renew`: Renew existing membership
- Added frontend membership components:
  - Membership selection interface
  - Benefits comparison table
  - Purchase/renewal workflow
  - Membership status indicator in user profile
- Integrated membership benefits throughout application:
  - Automatic discounts during booking
  - Special vehicle access for premium members
  - Reduced insurance rates
  - Priority booking capabilities

#### Membership Technical Implementation
- Fixed issues with middleware import paths in membershipRoutes.js
- Resolved server startup errors related to routes and controllers
- Added proper error handling for membership operations
- Implemented membership expiration notifications

### April 1, 2024
#### Live Chat Implementation
- Developed real-time chat support system:
  - User-to-admin messaging
  - Message history persistence
  - Unread message indicators
  - Chat notification system
- Implemented Socket.IO for real-time communication:
  - Chat message events
  - Typing indicators
  - Online status tracking
  - Message delivery confirmation
- Created chat interface components:
  - Chat window with message history
  - Message input with emoji support
  - User list for admins
  - Chat notification badges
- Added admin chat dashboard:
  - Multi-conversation management
  - Quick response templates
  - Chat transfer between admins
  - Chat history search

#### Chat System Technical Implementation
- Fixed Socket.IO configuration in server.js
- Resolved TypeScript errors in ChatMessage interfaces
- Fixed chat history loading issues
- Implemented proper authentication for chat sessions
- Enhanced error handling for message delivery failures

### April 7, 2024
#### Email Confirmation System
- Enhanced booking confirmation email system:
  - Fixed return date display in confirmation emails
  - Improved booking workflow by moving email confirmation to admin approval
  - Enhanced error handling and logging in email service
  - Updated template parameters to match EmailJS template

#### Technical Implementation:
- Modified `emailService.ts`:
  - Improved date handling for start and end dates
  - Added validation for email parameters
  - Enhanced error logging and debugging
  - Fixed total price formatting issues
- Updated `BookingDialog.tsx`:
  - Removed immediate email sending on booking creation
  - Streamlined booking process
  - Improved user feedback

#### Challenges Resolved:
1. Return Date Display:
   - Fixed missing return date in confirmation emails
   - Implemented proper date string parsing
   - Added fallback handling for missing dates

2. Email Workflow:
   - Eliminated duplicate emails by removing send from booking creation
   - Centralized email sending to admin confirmation only
   - Improved user experience with clearer status updates

3. Technical Issues:
   - Resolved price formatting with proper number conversion
   - Enhanced error handling with detailed logging
   - Fixed template parameter mapping

### April 10, 2024
#### Payment Redirect Fix
- Resolved critical issue with user redirection after successful payment:
  - Fixed redirect logic in PaymentForm.tsx
  - Added proper state management during payment processing
  - Implemented better loading indicators during transitions
  - Ensured consistent user experience across payment flow

#### Technical Implementation:
- Modified handlePaymentSuccess function to properly handle redirects
- Removed unnecessary setTimeout causing redirect delays
- Fixed type errors related to paymentIntent properties
- Added proper error handling for failed payments
- Ensured booking confirmation display before navigation

#### Issues Resolved:
- Users no longer redirected to login page after payment
- Booking confirmation displayed immediately after successful payment
- Payment loading state properly managed throughout process
- Consistent error messages for payment failures

### April 14, 2024
#### Help Center and Support Ticket System Implementation

##### Support Ticket System Creation
- Built comprehensive support ticket system:
  - Implemented user support ticket creation interface
  - Created ticket listing and detail views
  - Added status management (open, in progress, resolved, closed)
  - Implemented priority levels (low, medium, high)
  - Developed admin response system for tickets

##### Database Implementation
- Created database tables:
  - `support_tickets`: Stores ticket metadata (id, subject, description, etc.)
  - `ticket_messages`: Handles communication between users and admins

##### Backend API Development
- Created RESTful endpoints:
  - GET `/api/help/tickets`: Fetch user tickets
  - POST `/api/help/tickets`: Create new support tickets
  - GET `/api/help/tickets/:ticketId`: Get specific ticket details
  - PUT `/api/help/tickets/:ticketId`: Update ticket status
  - GET `/api/help/tickets/:ticketId/messages`: Retrieve ticket messages
  - POST `/api/help/tickets/:ticketId/messages`: Add admin responses

##### Frontend Implementation
- Developed `HelpCenter.tsx` component with:
  - Toggle-able FAQ and ticket sections
  - Ticket creation dialog with subject, description, and priority inputs
  - Ticket listing with status indicators and filter options
  - Ticket detail dialog showing conversation history

##### Debugging and Troubleshooting
- Implemented robust debugging tools:
  - Created debugging endpoints to verify database table structure
  - Developed web-based debug tool (`debug.html`) for testing ticket APIs
  - Added database initialization endpoint for ticket messages
  - Fixed TypeScript type errors in status handling

##### Technical Challenges Resolved
1. Database Connectivity:
   - Ensured ticket tables existed and were properly structured
   - Fixed SQL query issues for ticket retrieval
   - Implemented proper foreign key relationships

2. Message Visibility:
   - Resolved admin message display issues
   - Added styled message container for admin responses
   - Implemented direct message rendering for consistent UX

3. TypeScript Integration:
   - Fixed type errors in conditional logic
   - Implemented proper type assertions for status values
   - Ensured type safety across component interactions

### April 20, 2024
#### Dashboard Analytics Enhancement
- Implemented comprehensive dashboard statistics:
  - Added `getDashboardStats` method to UserModel
  - Created visualizations for booking trends
  - Added revenue analytics with filtering options
  - Implemented vehicle utilization metrics
  - Created user activity tracking
- Modified database queries for efficient data aggregation:
  - Optimized JOIN operations for performance
  - Added data caching for frequently accessed statistics
  - Implemented date range filtering for analytics
- Enhanced admin dashboard UI:
  - Added interactive charts and graphs
  - Implemented data export functionality
  - Created customizable dashboard layouts
  - Added real-time data updates

#### MapView Optimization
- Enhanced vehicle location display:
  - Fixed TypeScript interface definitions
  - Improved map marker clustering for performance
  - Added location search functionality
  - Implemented better info windows for vehicle details
- Resolved multiple TypeScript errors:
  - Fixed interface type definitions
  - Added proper type assertions
  - Improved error handling with type guards
  - Implemented better TypeScript configuration

### April 25, 2024
#### Final Testing and Optimization
- Conducted comprehensive application testing:
  - Unit tests for core functionality
  - Integration tests for system workflows
  - End-to-end tests for user journeys
  - Performance testing under load
- Implemented performance optimizations:
  - Added React component memoization
  - Optimized database queries
  - Implemented frontend caching strategies
  - Reduced bundle size with code splitting
  - Added lazy loading for components
- Enhanced security features:
  - Conducted security audit
  - Implemented CSRF protection
  - Enhanced input validation
  - Added rate limiting for sensitive endpoints
  - Updated dependencies to address vulnerabilities

### April 26, 2024
#### Bugs, Final Implementations, and Authentication Fixes
Fixed token verification issues in admin login
Updated AuthContext.tsx to properly handle and verify JWT tokens
Improved error handling for authentication failures
Enhanced protected route functionality for admin-specific pages
Fixed critical membership cancellation process (resolved "route not found" errors)
Implemented proper auto-renew functionality with toggle controls
Fixed "Membership ID and type are required" errors
Created comprehensive admin tier management system with CRUD operations
Added non-member tier display in tier management table
Implemented upcoming renewals tracking dashboard
Color-coded membership status indicators
Enhanced UI elements including heading colors for better visibility
Fixed "Submit Claim" button functionality in InsuranceView.tsx
Created initial admin insurance claims processing framework
Implemented claim status management workflow (pending, approved, denied)
Added foundation for insurance analytics reporting
Prepared components for claim details review and approval
Fixed critical WebSocket connection issues preventing live chat functionality
Updated Content Security Policy to properly allow WebSocket connections
Added system message handling to improve user experience
Enhanced admin-user chat communication interface
Improved chat message display and organization
Fixed error handling for disconnections
Changed outline colors for membership overview boxes for better visual hierarchy
Updated admin dashboard layout for improved information display
Enhanced navigation for better admin workflow
Improved color scheme consistency across the application
Fixed text colors for better readability throughout the admin interface
Updated booking overview and management interface
Improved booking status tracking and filtering
Enhanced booking data visualization
Updated routing for membership and insurance endpoints
Improved WebSocket handling in chatHandler.js
Enhanced error handling and logging throughout the application
Updated SQL schema for better data relationships

### 26th April, 2024
#### Insurance Claim Submission Bug Fixes
- Fixed critical bug in insurance claim submission functionality causing "Policy ID is required" errors
- Modified the claim submission process to use JSON data format instead of FormData in API requests
- Restructured how policy ID is captured and transmitted to the backend:
  - Updated hidden input field handling for policy data
  - Ensured proper numeric formatting of policy ID values
  - Added proper validation checks before form submission
- Added disable condition to claim submission button when no policy is selected
- Enhanced error handling in claim submission process
- Improved user experience by providing clearer feedback during the claim submission process
- Maintained support for document uploads while fixing the core claim data submission
- The changes ensure insurance claims now process correctly through the backend API

### 27th April, 2024
#### Insurance Management System Fixes and Enhancements
- Fixed critical issues in the insurance management system:
  - Resolved authentication middleware issue in `adminInsuranceRoutes.js`:
    - Fixed incorrect import of `requireAdmin` by using the correct `authorizeAdmin` function
    - Updated middleware configuration to use proper admin authentication
  - Fixed TypeScript errors in `InsuranceManagement.tsx` component:
    - Added robust `formatCurrency` helper function to safely handle claim amounts
    - Implemented safe type checking for `claim_amount` and `coverage_amount` fields
    - Prevented TypeErrors when dealing with string values from database responses
  - Enhanced insurance claim progress visualization:
    - Implemented color-coded progress indicators based on claim status
    - Added red indicators for rejected claims (showing rejection at approval stage)
    - Used orange indicators for pending and processing claims
    - Implemented green indicators for approved and paid claims with appropriate stages
    - Improved visual clarity of claim status for better user experience
  - Improved error handling in insurance-related components
  - Ensured backward compatibility with existing API responses

### April 28, 2024
- **Booking Dialog Z-Index:** Resolved an issue where the date picker calendar was appearing behind the booking modal (`BookingDialog.tsx`) by significantly increasing the `zIndex` of the DateTimePicker's Popper component.
- **Map View Icon:** Restored the missing "Use current location" icon (`MyLocationIcon`) in the Map View component (`MapView.tsx`).
- **Live Chat System Message & Persistence:**
    - **Initial Problem:** The system message ("The admin team will get back to you...") wasn't appearing after a user sent a message, and messages weren't persisting correctly.
    - **Component Identification:** Determined the active chat component was `EnhancedChat.tsx`, not `Chat.tsx`.
    - **Backend Logic:** Modified the backend WebSocket handler (`chatHandler.js`) to automatically save the system message in the database (`messages` table with `sender_id = NULL` and `is_system = TRUE`) immediately after saving the user's message. Ensured the WebSocket only sends the *user's* message back as confirmation, not the system message.
    - **Database Schema:** Updated the `initChatTables` function in `chatHandler.js` to:
        - Add `is_admin` column check/alter to `messages` table.
        - Modify `sender_id` column in `messages` table to allow `NULL` values (using `ALTER TABLE` if necessary).
        - Add `rating` and `rated_at` columns check/alter to `conversations` table.
    - **Frontend Logic:** Removed the local addition of the system message from `EnhancedChat.tsx`'s `handleSendMessage` function, relying on the backend to provide it.
    - **Message Fetching:** Updated the backend route (`chatRoutes.js`) for fetching messages to use `LEFT JOIN` on the `users` table, ensuring messages with `sender_id = NULL` (like system messages) are included.
    - **Frontend Rendering:** Modified the message rendering logic in `EnhancedChat.tsx` to identify system messages by checking for `message.is_system === true` OR `message.sender_id === null`.
- **Live Chat Duplicate Message/Key Warnings:**
    - **Duplicate System Message:** Addressed the issue of the system message appearing twice by ensuring the backend didn't send it via WebSocket and the frontend ignored system messages arriving via WebSocket.
    - **React Key Warning:** Prevented potential React key collisions by changing temporary optimistic message IDs in `EnhancedChat.tsx` to use negative timestamps (`-Date.now()`). Standardized component type to `FC`.
- **Live Chat Rating & Closing:**
    - **Rating Submission Error:** Fixed a 500 error during rating submission by ensuring the `rating` and `rated_at` columns exist in the `conversations` database table.
    - **Rating Message Style:** Modified the backend rating submission route (`chatRoutes.js`) to save the rating confirmation message with `sender_id = NULL` and `is_system = TRUE`, so it appears as a system message.
    - **Rating Display:** Updated the frontend `submitRating` function in `EnhancedChat.tsx` to refetch messages after successful submission, ensuring the rating message appears.
    - **Chat Input Disabling:** Added logic to `EnhancedChat.tsx` to disable the message input field and send button when the selected conversation's status is 'closed'.
- **Backend Stability:** Resolved multiple `EADDRINUSE` errors on backend startup by identifying and terminating lingering node processes occupying port 5001.


### April 28th, 2024.
   Membership System Enhancements & Fixes
- Fixed issue where switching membership plans did not update the user's current membership by correcting the API endpoint call in `MembershipView.tsx` to use `/api/memberships/upgrade`.
- Resolved a CSS `z-index` issue where the date picker component was appearing behind the booking modal dialog.

### 29th April, 2024
- **Admin Panel UI/UX & Functionality Fixes:** Focused on resolving display issues and broken actions in the Admin panel.
    - **Live Chat Archive:**
        - **Problem:** System messages (auto-replies, ratings) were incorrectly displayed as admin messages ("null null").
        - **Investigation:** Identified `ChatArchive.tsx` and `EnhancedChat.tsx` logic difference. Found backend (`adminChatController.js`) SQL query didn't correctly assign `sender_role` based on `is_system` flag.
        - **Fixes:**
            - Modified backend SQL in `adminChatController.js` to use `CASE` statement for `sender_role` based on `is_system`.
            - Updated `ChatArchive.tsx` to hide sender/timestamp for system messages and apply styling (centering, background, padding) matching the user-side chat.
    - **Analytics Dashboard (`Analytics.tsx`):**
        - **Problem 1:** "Total Revenue" card showed `+null%`.
        - **Problem 2:** Charts/legends were cut off or poorly spaced.
        - **Investigation (Problem 1):** Found frontend `StatCard` in `Analytics.tsx` lacked robust checks. Identified potential backend SQL division-by-zero in `adminAnalyticsRoutes.js` when calculating growth with zero previous revenue.
        - **Fixes (Problem 1):**
            - Modified backend SQL to return `NULL` for growth on division by zero.
            - Updated backend Node.js logic to convert `NULL` growth to `0`.
            - Modified frontend `StatCard` usage in `Analytics.tsx` to check `typeof === 'number'` for growth values before formatting.
        - **Fixes (Problem 2 - Spacing/Cutoff):**
            - Added overall padding and adjusted Grid spacing in `Analytics.tsx`.
            - Increased internal padding in chart `Paper` components.
            - Added margins below titles ("Analytics Dashboard", "Popular Cars Performance").
            - Added margin-top to `subtext` in `StatCard`.
            - Increased chart container `height` to `500`.
            - Moved chart `Legend`s to `verticalAlign="top"`.
            - Adjusted internal chart `margin` props (bottom, left) to prevent label cutoff.
    - **User Management (`UserManagement.tsx`):**
        - **Problem:** Edit, Block/Unblock, and Delete action buttons were non-functional.
        - **Investigation:** Found frontend sent wrong status value ('inactive' vs 'blocked'). Checked backend `adminRoutes.js` and confirmed `PUT /users/:id/status` existed but `DELETE /users/:id` was missing.
        - **Fixes:**
            - Corrected frontend `handleToggleStatus` to send `'blocked'`.
            - Implemented the missing `DELETE /api/admin/users/:id` route handler in `backend/src/routes/adminRoutes.js`
      - **New Map Style Implementation :**
        - Implemented a new map style and adjustments to make it more professional and UX friendly. 
        - Integrated membership requirement checks directly into the 'Select car' button handlers for both the map markers and the list view. The buttons now dynamically change color (blue, orange, or light blue) and text ('Select car' or 'Requires [Membership]') based on user membership sufficiency, while remaining clickable. Clicking triggers either the booking dialog or a 'Membership Required' dialog managed centrally in MapView. Additionally, adjusted the layout of the car list items to improve readability, allowing text like car names and addresses to wrap and preventing elements from appearing squashed.

### April 30th, 2024.
   Membership Payment System Implemented
- Used Stripe to implement payment methods in order to purchase a membership for users
- When the user succesfully makes the payment and it's accepted, they are granted the membership, giving them access to it with the power in their hands to cancel if they like.
-Overall fixed bugs and enhanced the website for better UX features. 

### May 1st, 2024.
   User Management Fix & Improvements
- The Admin is able to deactivate counts, which a deactivated user can't log in and gets a system message
- The Admin can delete accounts for good. 
- The Admin can change the User details when required and make edits, and changes to them.

### May 2nd, 2024.
   Rewards Management Implementation & Final fixes
- Users get a reward system for every booking they make which gives them discounts on their fares as a complimentary success gift for interactive with Car Share. 
- Admin can manage Rewards management by distributing these points on their will if required
- Overall bug fixes with Rewards Management implementation.
- Overall bug fixes and code clean-up.



## Technical Architecture Overview
The Car Sharing Web Application follows a modern full-stack architecture:

### Frontend Architecture
- React SPA with TypeScript for type safety
- Component-based architecture with reusable UI elements
- Context API and hooks for state management
- Material-UI for consistent styling and responsive design
- React Router for client-side routing
- Axios for API communication with interceptors
- Form validation with Formik and Yup
- JWT authentication with secure token storage

### Backend Architecture
- Node.js with Express for RESTful API endpoints
- Modular architecture with controllers, routes, and models
- MySQL database with connection pooling
- JWT authentication for stateless security
- Role-based access control
- Error handling middleware
- Input validation and sanitization
- Logging and monitoring
- Environment-based configuration

### Database Schema
- Relational database design with MySQL
- Normalized table structure
- Foreign key constraints for data integrity
- Indexes for query optimization
- Transactions for data consistency

### Security Measures
- Password hashing with bcrypt
- JWT with secure storage and refresh mechanism
- HTTPS for all communications
- Input validation and sanitization
- Rate limiting for sensitive endpoints
- SQL injection protection
- XSS and CSRF prevention

## Notes
- Regular code reviews and pair programming for critical features
- Continuous integration with automated testing
- Documentation of API endpoints and key workflows
- Regular security audits and dependency updates