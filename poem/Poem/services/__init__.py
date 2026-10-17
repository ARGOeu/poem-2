"""Server-side services for WEB-API access.

This package owns every outbound HTTP request to the ARGO WEB-API. The React
frontend must never construct ``x-api-key`` requests; it calls same-origin
Django endpoints that delegate to the modules in this package.
"""
