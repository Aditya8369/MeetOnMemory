# Request Correlation IDs

MeetOnMemory assigns a correlation ID to every Express request. This reference
connects browser error reports with structured backend logs without exposing
stack traces or sensitive request data.

## Header contract

Clients may send a valid `X-Request-ID` header. Valid IDs:

- Are 1–128 characters long
- Start with an alphanumeric character
- Contain only letters, digits, `.`, `_`, `:`, or `-`
- Do not contain whitespace or control characters

Invalid, missing, or oversized IDs are replaced with a cryptographically secure
UUID. Every response includes the final value in `X-Request-ID`.

## Error response

Global validation, authorization, not-found, CSRF, and unexpected error paths
include the same ID:

```json
{
  "success": false,
  "message": "Internal Server Error",
  "requestId": "7e4de5f1-1234-4567-8901-abcdefabcdef"
}
```

Production 500 responses never include stack traces or internal error messages.

## Logging

The request-scoped logger includes `requestId` in request completion and error
records. Metadata is recursively sanitized. Keys matching authorization,
cookies, passwords, tokens, secrets, API keys, files, and uploads are redacted.

Controllers and services can use:

```js
req.log.info("Meeting updated", { meetingId });
req.log.error("Calendar provider failed", error, { provider: "google" });
```

Do not log entire request bodies, headers, uploaded files, or provider payloads.

## Client display

The Axios error interceptor preserves the full `requestId` in
`error.response.data.requestId`. For unexpected 5xx responses, the user-facing
message includes the first 12 characters:

```text
Server unavailable. Please try again later. Reference: 7e4de5f1-123
```
