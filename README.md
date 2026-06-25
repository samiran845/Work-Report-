# Lalbaba Engineering Ltd — Maintenance Job Handling System

A highly polished, clean, and modern full-stack web application designed for **Lalbaba Engineering Ltd** to handle maintenance job reports, planning, and shift handovers seamlessly. 

Our primary focus is ensuring that pending or neglected work is brought forward automatically, so shift engineers never forget or neglect minor maintenance tasks that can develop into major operational failures.

---

## 📅 Project Agenda & Core Focus

1. **Prevent Neglect & Failure**: Ensure "Pending" or "Running" tasks from previous days are automatically carried forward with a clear tracking trail (e.g., *"1st Carried Forward from: 2026-06-24"*).
2. **Seamless Shift Transitions**: Shift engineers can access daily job queues and record results, notes, and spare parts easily from any device without excessive clerical overhead.
3. **No Database setup burden**: Powered by **Google Sheets** for database persistence and **Google Drive** for visual maintenance report attachments via a custom Google Apps Script.
4. **Optimized for speed**: Performs bulk uploads and direct editing in a local responsive web application, then syncs asynchronously to avoid Google Sheets API latency.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19 (TypeScript), Tailwind CSS v4, Lucide React (Icons), and Framer Motion.
- **Backend Server**: Node.js Express server to handle local offline-safe caching in `data/db.json` and proxying Google Sheets.
- **Database/Storage**: Google Sheets & Google Drive (via Google Apps Script Web App).

---

## 🚀 Setup & Integration Guide

### Step 1: Set Up the Google Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com) and create a **blank Spreadsheet**.
2. Give it a name, e.g., `Lalbaba Maintenance DB`.

### Step 2: Set Up Google Apps Script
1. Inside your new Google Spreadsheet, go to the top menu and select **Extensions** -> **Apps Script**.
2. Delete any default code in the editor.
3. Open the **`code.js`** file from this project, copy its entire contents, and paste it into the Google Apps Script editor.
4. Click the **Save** (Disk) icon in the toolbar.

### Step 3: Deploy as a Web App
1. Click the blue **Deploy** button at the top-right and select **New deployment**.
2. Click the gear/cog icon next to "Select type" and select **Web app**.
3. Configure the deployment:
   - **Description**: `Lalbaba Maintenance Backend`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial: This enables the App server to exchange sync requests!)*
4. Click **Deploy**.
5. You will see a prompt asking to **Authorize access**. Click **Authorize Access**, select your Google account, click **Advanced**, and then click **Go to Untitled project (unsafe)**. Grant the required permissions.
6. Once deployed, copy the **Web App URL** shown on the screen (it looks like: `https://script.google.com/macros/s/AAAAA-BBBBB-CCCCC/exec`).

### Step 4: Paste Web App URL in settings
1. Open our Lalbaba Engineering Maintenance System app.
2. Go to the **Setting** tab.
3. Scroll down to the **Google Integration** section, paste the copied Web App URL, and click **Save Settings**.
4. Click **Pull from Google Sheets** to pull down the sheets structures, or click **Push to Google Sheets** to upload the base system BOM, engineers, and jobs list to the Google Sheets!

---

## 📖 Module Descriptions

### 1. All Plan Work Page
- **Bulk Job Creation**: Add multiple daily or shutdown tasks simultaneously by filling out rows and hitting "Submit Bulk".
- **Auto Date Roll & Carry Forward**: If any daily or shutdown task is not completed (`Done`) by its Plan Date, the system automatically rolls its date to the current date and appends a carry forward note (e.g., `1st Carried Forward from: 2026-06-24`).
- **WhatsApp Dispatcher**: With a single click, prepare formatted text containing tomorrow's jobs or shutdown plans ready to copy or share directly to worker groups.

### 2. Shift Handover Page
- **Shift A, B, and C Selector**: Engineers select their active shift, view active workloads, and quickly update job status, spare parts used, and technical notes.
- **Extra Work Recorder**: Log unexpected problems encountered during the shift in bulk, so they are logged with standard IDs and linked to engineers.
- **WhatsApp Shift Summary**: Generate a clean handover summary to share in the department group.

### 3. Setting Page
- **Bill of Materials (BOM) Editor**: Edit locations, machines, and equipments in a modern, easy-to-manage grid.
- **Personnel Editor**: Keep lists of active Shift Engineers and Workers up-to-date.
- **Cloud Sync Panel**: Check connection status with Google Apps Script, pull active databases, or backup local states manually.
