# Teacher Feedback System (TFS)

A comprehensive Teacher Feedback System built with a **Django** backend and a **Next.js** frontend. This system allows for efficient collection, management, and analysis of student feedback for teachers.

## Project Structure

The repository is divided into two main components:

- **`Backend/`**: Django-based REST API.
- **`frontend-next/`**: Next.js-based web application.

---

## Tech Stack

### Backend
- **Framework**: Django 5.1+, Django REST Framework (DRF)
- **Database**: PostgreSQL (psycopg 3)
- **Authentication**: JWT (SimpleJWT)
- **Server**: Gunicorn, Whitenoise (for static files)
- **Tools**: python-dotenv, django-cors-headers

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **UI Components**: Radix UI, Lucide Icons
- **Data Fetching**: Axios
- **Charts**: Recharts
- **PDF Generation**: jsPDF, jsPDF-AutoTable

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (or another database configured in Django)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd Backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (create a `.env` file based on `.env.example` if available).
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend-next
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (create a `.env` file).
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Key Features

- **Admin Dashboard**: Comprehensive view for administrators to manage teachers, classes, and feedback.
- **Feedback Submission**: Easy-to-use interface for students to provide feedback.
- **Real-time Reports**: Visual representation of feedback data using charts.
- **Secure Authentication**: JWT-based login for administrators.
- **PDF Export**: Generate and download performance reports in PDF format.
- **Responsive Design**: Works seamlessly across desktop and mobile devices.

---

## License

[Add License Information Here, e.g., MIT]
