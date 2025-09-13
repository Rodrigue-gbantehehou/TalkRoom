# Overview

This is a peer-to-peer (P2P) ephemeral messaging application built with a full-stack TypeScript architecture. The application enables real-time communication between users in temporary chat rooms with end-to-end encryption and message compression. Messages are ephemeral and disappear when users disconnect, ensuring privacy and temporary communication. The system supports both regular users and administrators, with features like room creation, participant management, and conversation export.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/UI components built on Radix UI primitives with Tailwind CSS for styling
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context API with useReducer for chat state management
- **Real-time Communication**: Dual approach using WebRTC for P2P messaging and WebSockets for signaling and room coordination

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **WebSocket Server**: Built-in WebSocket server for real-time signaling and room management
- **Storage Strategy**: Memory-based storage for ephemeral data with interface abstraction for potential database integration
- **API Design**: RESTful endpoints for room creation and management with WebSocket events for real-time features

## Data Storage Solutions
- **Primary Storage**: In-memory storage using Map objects for users, rooms, and participants
- **Database Schema**: Drizzle ORM schema defined for PostgreSQL with tables for users, rooms, and room participants
- **Session Management**: PostgreSQL session store (connect-pg-simple) configured for production scalability
- **Migration System**: Drizzle Kit for database schema migrations and management

## Security and Privacy Features
- **Encryption**: AES-GCM client-side encryption with PBKDF2 key derivation from room codes
- **P2P Communication**: WebRTC data channels for direct peer-to-peer messaging without server storage
- **Message Compression**: Client-side message compression using browser CompressionStream API with fallback
- **Ephemeral Design**: No persistent message storage, all communication is temporary and memory-based

## Real-time Communication Stack
- **WebRTC**: Peer-to-peer data channels for encrypted message exchange between clients
- **WebSocket Signaling**: Central signaling server for WebRTC handshake, room coordination, and user presence
- **Connection Management**: Automatic reconnection with exponential backoff for WebSocket connections
- **Typing Indicators**: Real-time typing status updates through WebSocket events

## Development and Build System
- **Build Tool**: Vite with React plugin for fast development and optimized production builds
- **TypeScript**: Strict type checking across client, server, and shared code
- **Development Server**: Vite dev server with HMR and Express API routes in development mode
- **Path Aliases**: Configured aliases for clean imports (@/, @shared/, @assets/)

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for database connectivity
- **drizzle-orm**: TypeScript ORM for database operations with PostgreSQL dialect
- **express**: Node.js web framework for API server
- **ws**: WebSocket library for real-time server communication

## Frontend Libraries
- **@tanstack/react-query**: Server state management and caching for API calls
- **@radix-ui/***: Comprehensive UI primitive components for accessible interface elements
- **tailwindcss**: Utility-first CSS framework for responsive design
- **wouter**: Lightweight routing library for single-page application navigation

## Development Tools
- **drizzle-kit**: Database migration and schema management tool
- **tsx**: TypeScript execution engine for development server
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error handling plugin

## WebRTC and Real-time Features
- **Built-in WebRTC APIs**: Browser native WebRTC implementation for P2P connections
- **Built-in WebSocket APIs**: Native WebSocket support for signaling server
- **Built-in Compression APIs**: Browser CompressionStream and DecompressionStream for message optimization
- **Built-in Crypto APIs**: Web Crypto API for AES-GCM encryption and PBKDF2 key derivation