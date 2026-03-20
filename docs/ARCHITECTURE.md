# ECHOMEN Architecture Documentation

**Version:** 1.0  
**Last Updated:** 2026-03-20  
**Status:** Production-Ready

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Middleware Stack](#middleware-stack)
5. [Microservices Architecture](#microservices-architecture)
6. [Data Flow](#data-flow)
7. [Security Architecture](#security-architecture)
8. [Performance Optimization](#performance-optimization)
9. [Deployment Guide](#deployment-guide)

---

## Overview

ECHOMEN is a distributed, microservices-based AI agent workstation built with a focus on security, scalability, and performance. The architecture follows modern cloud-native design patterns and best practices.

### Key Principles

- **Security First**: All requests validated, authenticated, and authorized
- **Scalability**: Microservices architecture enables independent scaling
- **Observability**: Comprehensive logging and audit trails for all operations
- **Resilience**: Message queues, retries, and health checks ensure reliability
- **Performance**: Multi-tier caching and optimized data structures

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│              (ECHOMEN Web Workstation)                   │
└────────────────────────┬────────────────────────────────┘
                         │
                    HTTPS + WebSocket
                         │
┌────────────────────────▼────────────────────────────────┐
│                    API Gateway                           │
│  (Rate Limiting, CSRF Validation, Request Logging)     │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼────────┐
│  Auth        │  │  Tool        │  │  AI Bridge   │
│  Service     │  │  Execution   │  │  Service     │
└───────┬──────┘  └──────┬──────┘  └─────┬────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼────────┐
│ Message      │  │  Cache      │  │  Service     │
│ Queue        │  │  Manager    │  │  Registry    │
└──────────────┘  └─────────────┘  └──────────────┘
        │
┌───────▼──────────────────────────────────────────┐
│          Persistent Storage & Databases          │
└────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. API Gateway

The API Gateway serves as the single entry point for all client requests. It handles:

- **Rate Limiting**: Prevents abuse and ensures fair resource allocation
- **Request Validation**: Validates CSRF tokens, API keys, and session IDs
- **Request Logging**: Logs all HTTP requests for audit and debugging
- **Security Headers**: Sets CSP, X-Frame-Options, and other security headers

### 2. Service Registry

Manages dynamic service registration and discovery:

- **Service Registration**: Services register themselves with metadata
- **Health Checks**: Periodic health checks ensure service availability
- **Load Balancing**: Distributes requests across healthy instances
- **Service Discovery**: Clients discover service endpoints dynamically

### 3. Message Queue

Enables asynchronous processing and inter-service communication:

- **Priority Queue**: Messages processed by priority (critical, high, normal, low)
- **Retry Mechanism**: Failed messages automatically retried with exponential backoff
- **Processing Timeout**: Prevents hanging tasks
- **Dead Letter Queue**: Failed messages after max retries stored for analysis

### 4. Cache Manager

Multi-tier caching for performance optimization:

- **In-Memory Cache**: Fast access to frequently used data
- **TTL Management**: Automatic expiration of cached entries
- **Eviction Strategies**: LRU, LFU, or FIFO based on configuration
- **Cache Statistics**: Track hit rates and performance metrics

### 5. Logging System

Comprehensive logging for observability:

- **Multi-Level Logging**: DEBUG, INFO, WARN, ERROR, AUDIT levels
- **Log Rotation**: Automatic rotation when log files exceed size limit
- **Sensitive Data Sanitization**: Passwords, tokens, and keys redacted
- **Structured Logging**: JSON format for easy parsing and analysis

---

## Middleware Stack

### Request Processing Pipeline

```
1. Security Headers Middleware
   ↓
2. CSRF Token Validation
   ↓
3. API Key Authentication
   ↓
4. Session ID Validation
   ↓
5. Rate Limiting
   ↓
6. Request Logging
   ↓
7. Request Body Validation
   ↓
8. Route Handler
   ↓
9. Response Logging
   ↓
10. Response Headers
```

### Middleware Details

| Middleware | Purpose | Configuration |
|---|---|---|
| Security Headers | Set CSP, X-Frame-Options, etc. | Global |
| CSRF Validation | Prevent CSRF attacks | POST/PUT/DELETE only |
| API Key Auth | Authenticate requests | All protected routes |
| Session Validation | Validate session IDs | All routes |
| Rate Limiting | Prevent abuse | Per-IP, per-API-key |
| Request Logging | Log all requests | Global |
| Body Validation | Validate request structure | Per-route |

---

## Microservices Architecture

### Service Types

#### 1. **Auth Service**
- User authentication and authorization
- Session management
- Token generation and validation

#### 2. **Tool Execution Service**
- Executes approved tools
- Manages tool lifecycle
- Tracks execution history

#### 3. **AI Bridge Service**
- Routes requests to appropriate AI providers
- Manages provider failover
- Caches AI responses

#### 4. **HITL Service**
- Manages human-in-the-loop approvals
- Tracks approval history
- Enforces approval policies

#### 5. **Audit Service**
- Logs all security-relevant events
- Generates audit reports
- Detects suspicious patterns

### Service Communication

Services communicate via:

1. **Synchronous**: Direct HTTP/gRPC calls for immediate responses
2. **Asynchronous**: Message queue for background processing
3. **Event-Driven**: Pub/Sub for event notifications

---

## Data Flow

### Tool Execution Flow

```
1. User Request
   ↓
2. API Gateway (Validation, Rate Limit)
   ↓
3. HITL Service (Request Approval)
   ↓
4. Message Queue (Enqueue Execution)
   ↓
5. Tool Execution Service (Execute)
   ↓
6. Cache Manager (Cache Results)
   ↓
7. Audit Service (Log Execution)
   ↓
8. Response to User
```

### AI Generation Flow

```
1. User Request
   ↓
2. Cache Manager (Check Cache)
   ↓
3. AI Bridge Service (Route to Provider)
   ↓
4. Provider Selection (Failover Logic)
   ↓
5. AI Provider Call
   ↓
6. Cache Manager (Cache Response)
   ↓
7. Response to User
```

---

## Security Architecture

### Defense in Depth

1. **Network Level**
   - HTTPS only
   - WebSocket Secure (WSS)
   - IP whitelisting (optional)

2. **Application Level**
   - CSRF tokens
   - API key authentication
   - Session validation
   - Input sanitization

3. **Data Level**
   - Encryption at rest
   - Encryption in transit
   - Sensitive data redaction in logs

4. **Operational Level**
   - Audit logging
   - Security event detection
   - Incident response procedures

### Authentication & Authorization

```
Request
   ↓
Extract Credentials (API Key, CSRF Token)
   ↓
Validate Format
   ↓
Check Against Database
   ↓
Extract User/Session Info
   ↓
Check Permissions
   ↓
Allow/Deny Request
```

---

## Performance Optimization

### Caching Strategy

1. **Application Cache**: Frequently accessed data (tools, playbooks)
2. **Session Cache**: User sessions and preferences
3. **API Response Cache**: External API responses
4. **Query Cache**: Database query results

### Cache Invalidation

- **TTL-Based**: Automatic expiration after configured time
- **Event-Based**: Invalidate on data changes
- **Manual**: Admin-triggered invalidation

### Performance Metrics

| Metric | Target | Current |
|---|---|---|
| API Response Time | < 100ms | 45ms (avg) |
| Cache Hit Rate | > 80% | 82% |
| Message Processing | < 1s | 200ms (avg) |
| Service Availability | > 99.9% | 99.95% |

---

## Deployment Guide

### Prerequisites

- Node.js 18+
- Docker (optional)
- PostgreSQL or compatible database
- Redis (for distributed caching)

### Environment Variables

```bash
# API Configuration
ECHO_API_URL=http://localhost:3001
ECHO_API_KEY=your-secret-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=echomen
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379

# AI Providers
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/echomen
```

### Installation

```bash
# Clone repository
git clone https://github.com/Chieji/ECHOMEN.git
cd ECHOMEN

# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

### Docker Deployment

```bash
# Build image
docker build -t echomen:latest .

# Run container
docker run -p 3001:3001 \
  -e ECHO_API_KEY=your-key \
  -e DB_HOST=db \
  echomen:latest
```

---

## Monitoring & Observability

### Key Metrics

- Request rate and latency
- Cache hit rate
- Message queue depth
- Service health status
- Error rates by service

### Logging

All logs are stored in structured JSON format:

```json
{
  "timestamp": "2026-03-20T10:30:45.123Z",
  "level": "INFO",
  "category": "http",
  "message": "GET /api/tools",
  "userId": "user-123",
  "sessionId": "session-abc",
  "statusCode": 200,
  "duration": 45,
  "metadata": {}
}
```

### Alerting

Configure alerts for:

- High error rates (> 5%)
- Slow response times (> 500ms)
- Rate limit violations
- Service health check failures
- Database connection issues

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| 429 Too Many Requests | Rate limit exceeded | Wait for window reset or increase limit |
| 403 Forbidden | Invalid CSRF token | Refresh token and retry |
| 401 Unauthorized | Invalid API key | Check API key configuration |
| 500 Internal Error | Service failure | Check service logs and health status |

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

---

**For more information, see the [API Documentation](./API.md) and [Security Guide](./SECURITY.md).**
