# PG Pilot: Smart PG & Hostel Management System 🚀

A comprehensive, full-stack management solution designed for PG owners and hostel managers to streamline tenant onboarding, billing, and operational workflows.


## 🌟 Key Features

- **📊 Comprehensive Dashboard**: Real-time overview of occupancy, total collections, and pending dues.
- **🏠 Room Management**: Track room availability, bed assignments, and maintenance status.
- **👥 Tenant Onboarding**: Seamless registration flow, including document uploads (ID proof) via Cloudinary.
- **💸 Automated Billing**: 
  - Monthly rent calculation.
  - Precise electricity bill generation with meter reading tracking.
  - Professional receipt generation.
- **🗓️ Today's Dues**: A dedicated view to track and manage collections for the current day.
- **📄 Advanced Reporting**: Detailed financial and operational reports for better decision-making.
- **🔒 Secure Authentication**: Multi-role access (Admin/Staff) powered by Firebase Auth.
- **⚙️ Property Settings**: Configure multiple PG branches, pricing models, and business details.

## 🛠️ Technology Stack

- **Frontend**: [React.js](https://reactjs.org/) (Hooks, Context API)
- **Styling**: Vanilla CSS (Custom UI Design) / Modern Responsive Layouts
- **Backend/Database**: [Firebase](https://firebase.google.com/) (Firestore NoSQL)
- **Authentication**: Firebase Authentication
- **Media Storage**: [Cloudinary](https://cloudinary.com/) (Tenant documents & ID proofs)
- **Deployment**: Firebase Hosting

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Janbuselvan2006/pg-management.git
   cd pg-management
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase and Cloudinary credentials (see `.env.example`).

4. **Start the development server:**
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📁 Project Structure

```text
src/
├── components/   # Reusable UI components
├── pages/        # Main application views (Dashboard, Tenants, etc.)
├── hooks/        # Custom React hooks for data fetching
├── firebase.js   # Firebase configuration and initialization
└── App.js        # Main routing and layout
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Developed by [Janbuselvan](https://github.com/Janbuselvan2006)*
