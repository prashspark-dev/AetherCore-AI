/**
 * Centralized Cloud API Endpoint Configuration for AetherCore-AI Desktop Client.
 * Reads VITE_CLOUD_API_URL from .env / .env.production during build time,
 * falling back cleanly to local development server on Port 5000.
 */
const rawUrl = import.meta.env.VITE_CLOUD_API_URL || "http://localhost:5000/api";
export const API_BASE = rawUrl.replace(/\/+$/, "");