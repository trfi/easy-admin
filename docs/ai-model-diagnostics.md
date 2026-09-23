# AI Model Diagnostics & Failure Tracking

This document outlines the failure tracking, circuit breaker diagnostics, and live validation system for AI models managed via Hepi and Easy-Admin.

## Overview

When an AI provider model fails repeatedly (e.g. hitting rate limits, authentication failures, network timeouts, or quota limits), the circuit breaker automatically disables the model once the failure threshold (3 consecutive failures within 10 minutes) is reached.

Previously, disabling the model caused `disabledReason` (e.g. `failure_threshold_exceeded`) to overwrite or mask the actual error message in the admin interface, preventing operators from diagnosing what broke. Additionally, historical errors leading up to the shutdown were not persisted.

Option B solves this with end-to-end failure telemetry and a dedicated diagnostics workflow.

## Backend Architecture & Persistence

### 1. Sliding Window Error Log (Hepi)
- **Model**: `AiProviderModelStatus` in Hepi (`server/src/models/ai-provider-status.model.ts`) maintains a sliding window of the last 10 errors in `recentFailures: IAiProviderModelFailureRecord[]`.
- **Schema**:
  ```ts
  interface IAiProviderModelFailureRecord {
    code: string       // e.g. 'AI_PROVIDER_MODEL_RATE_LIMIT', 'AI_PROVIDER_MODEL_QUOTA_EXCEEDED'
    message: string    // Technical error description (truncated to 1000 characters)
    timestamp: Date    // Exact UTC timestamp of the failure
    comboId?: string   // ID of the combo candidate that triggered the failure
  }
  ```
- **Update Mechanism**: During `incrementFailure`, new records are appended using MongoDB `$push` with `$slice: -10`.
- **First Failure Timestamp**: Persists `firstFailureAt` alongside `lastFailureAt` to track error storm duration.

### 2. BFF Gateway (`bff`)
- Passes `firstFailureAt` and `recentFailures: AiModelFailureRecordView[]` through `AiModelStatusView`.
- Exposes `POST /api/ai/status/reset-failures` to allow clearing failure counters without deactivating models.
- Strictly read-only against Mongo; proxies mutations and resets to Hepi `/ai-models/*`.

## Frontend Diagnostics Interface (`web`)

### 1. Unshadowed Detail Column
In `StatusRow.tsx`, the `Detail` cell displays:
- **Disabled Reason**: Tagged with a badge (`failure_threshold_exceeded`, `manual_deactivation`).
- **Technical Error Details**: Displays `[errorCode] errorMessage` with full text accessible via tooltip and click-to-diagnose.

### 2. Model Diagnostics Dialog (`ModelDiagnosticsDialog.tsx`)
Accessible via the **Activity** icon in the Status table or by clicking on an error/failure count:
- **Telemetry Cards**:
  - `Failures`: Consecutive failure count versus the 3-failure threshold.
  - `First Failure`, `Last Failure`, and `Last Success` timestamps.
- **Recent Failures Timeline**:
  - Displays all logged errors in reverse chronological order (newest first).
  - Categorized error code badges (`AI_PROVIDER_MODEL_RATE_LIMIT`, `AI_PROVIDER_MODEL_QUOTA_EXCEEDED`, `AI_PROVIDER_MODEL_AUTH_ERROR`, etc.).
  - Combo origin tag if triggered during a fallback combo run.
  - Selectable monospace error messages for inspection and copy-pasting.
- **Live Model Test**:
  - Form allowing operators to fire test queries (prompt, mode: `stream` / `generate` / `auto`) directly through the provider to verify model recovery in real time.
  - Interactive latency and generation outcome display via `TestResult`.
- **Operator Actions**:
  - "Reset failure counter" button.
  - "Reactivate Model" button when disabled.
