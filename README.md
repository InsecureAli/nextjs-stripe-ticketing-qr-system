<div align="center">

# 🎵 ConcertTix

### Secure Full-Stack Concert Ticketing System with QR Code Entry Validation

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple?style=for-the-badge&logo=stripe)](https://stripe.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

<br />

![ConcertTix Preview](https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=400&fit=crop)

<br />

**Browse concerts → Buy tickets securely via Stripe → Get unique QR codes → Scan at venue gate**

[View Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 📋 Table of Contents

- [About The Project](#-about-the-project)
- [Core Security Principle](#-core-security-principle)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Project](#-running-the-project)
- [Running With ngrok (Phone Scanner)](#-running-with-ngrok-phone-scanner)
- [How It Works](#-how-it-works)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Admin Guide](#-admin-guide)
- [Testing Payments](#-testing-payments)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About The Project

ConcertTix is a secure full-stack concert ticket booking and QR-based venue entry validation platform. Customers browse upcoming concerts, purchase tickets securely through Stripe, and receive unique QR codes instantly after payment confirmation. Door staff use any smartphone to scan QR codes and validate entry in real time.

### The Problem It Solves

| Problem | Solution |
|---|---|
| Ticket fraud (fake PDFs) | UUIDv4 tokens with 122 bits of randomness |
| Duplicate entry (shared QR) | Atomic VALID → USED status update |
| Manual paper checking | Digital smartphone scanner |
| Overselling | Atomic MongoDB inventory decrement |
| Multi-ticket confusion | One QR code per seat (5 tickets = 5 QR codes) |
| Delayed ticket delivery | QR generated within seconds of payment |

---

## 🔐 Core Security Principle
