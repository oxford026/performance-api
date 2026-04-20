Automated Web Performance Measurement & Visualization System


📌 Overview

This project converts traditional one-time web performance testing into a continuous, automated process integrated directly into CI/CD pipelines.

Instead of relying on manual testing, the system:

Automatically runs after every code commit
Collects key web performance metrics
Stores results in a structured database
Visualizes performance trends through an interactive dashboard


🎯 Key Features
⚡ Automated Performance Testing using Lighthouse CI
🔄 CI/CD Integration with GitHub Actions / Gitea
📊 Core Metrics Tracking:
First Contentful Paint (FCP)
Largest Contentful Paint (LCP)
Total Blocking Time (TBT)
🗄️ Data Storage:
SQLite (default)
PostgreSQL (scalable option)
📈 Interactive Dashboard built with React + Chart.js
🚨 Performance Budget Alerts (pipeline fails on threshold violations)



🧠 System Architecture
Code Commit
     ↓
CI/CD Pipeline (GitHub Actions)
     ↓
Lighthouse CI
     ↓
JSON Output
     ↓
Backend API
     ↓
Database
     ↓
React Dashboard
     ↓
Charts + Alerts
