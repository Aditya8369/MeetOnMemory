import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import { EventEmitter } from "events";

import {
  FALLBACK_DOWNLOAD_FILENAME,
  getContentDispositionHeader,
  sanitizeFilenameForHeader,
} from "../utils/fileUtils.js";

vi.mock("../models/attachmentModel.js", () => ({
  default: { findOne: vi.fn() },
}));
vi.mock("../models/meetingModel.js", () => ({
  default: { findById: vi.fn() },
}));

const Attachment = (await import("../models/attachmentModel.js")).default;
const { downloadAttachment } =
  await import("../controllers/attachmentController.js");

/**
 * Issue #1454 — `downloadAttachment` built its Content-Disposition by
 * interpolating the stored filename:
 *
 *     `attachment; filename="${attachment.fileName}"`
 *
 * `attachment.fileName` is `req.file.originalname`, stored verbatim at upload,
 * so a quote terminated the quoted-string early, CRLF went through unfiltered,
 * and non-ASCII names arrived as mojibake for want of a `filename*` parameter.
 *
 * Content-Length came from `attachment.fileSize` in Mongo while the body
 * streamed from disk, and `pipe()` had no error handler.
 *
 * Every other exporter in the codebase already routes through
 * `getContentDispositionHeader`; this call site just predated it.
 */

/** Collects headers the way a real response would, for assertion. */
const createResponse = () => {
  const emitter = new EventEmitter();
  const res = Object.assign(emitter, {
    headers: {},
    statusCode: null,
    body: null,
    headersSent: false,
    piped: null,
    destroyedWith: null,
    setHeader: vi.fn(function (name, value) {
      this.headers[name] = value;
    }),
    status: vi.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (payload) {
      this.body = payload;
      return this;
    }),
    destroy: vi.fn(function (error) {
      this.destroyedWith = error;
    }),
  });
  return res;
};

/** Minimal readable stand-in for `fs.createReadStream`. */
const createFileStream = () => {
  const stream = new EventEmitter();
  stream.pipe = vi.fn((destination) => {
    destination.piped = stream;
    return destination;
  });
  stream.destroy = vi.fn();
  return stream;
};

const ATTACHMENT_DEFAULTS = {
  fileName: "quarterly-report.pdf",
  filePath: "/srv/uploads/attachments/abc123.pdf",
  mimeType: "application/pdf",
  fileSize: 2048,
};

describe("getContentDispositionHeader (#1454)", () => {
  it("emits both the ASCII and the RFC 8187 parameter", () => {
    expect(getContentDispositionHeader("report.pdf")).toBe(
      "attachment; filename=\"report.pdf\"; filename*=UTF-8''report.pdf",
    );
  });

  it("survives a filename containing a double quote", () => {
    // The regression: `filename="quarterly".pdf"` closed the quoted-string
    // early, so browsers fell back to the URL path segment.
    const header = getContentDispositionHeader('quarterly".pdf');

    expect(header).toContain('filename="quarterly.pdf"');
    expect(header.match(/"/g)).toHaveLength(2);
  });

  it("strips CR and LF so the header cannot be split", () => {
    const header = getContentDispositionHeader(
      "evil\r\nX-Injected: yes\r\n.pdf",
    );

    expect(header).not.toMatch(/[\r\n]/);
  });

  it("percent-encodes a non-ASCII name instead of garbling it", () => {
    const header = getContentDispositionHeader("स्थिति-रिपोर्ट.pdf");

    expect(header).toContain(
      `filename*=UTF-8''${encodeURIComponent("स्थिति-रिपोर्ट.pdf")}`,
    );
    // Round-trips back to the original for any RFC 8187 client.
    const encoded = header.split("filename*=UTF-8''")[1];
    expect(decodeURIComponent(encoded)).toBe("स्थिति-रिपोर्ट.pdf");
  });

  it("falls back when the name sanitizes down to nothing", () => {
    // `"""` and a lone CRLF both reduce to "". `filename=""` would send the
    // browser back to the URL path segment, which here is an ObjectId.
    for (const name of ['"""', "\r\n", "   ", "\\\\"]) {
      expect(getContentDispositionHeader(name)).toContain(
        `filename="${FALLBACK_DOWNLOAD_FILENAME}"`,
      );
    }
  });

  it("handles a missing or non-string filename", () => {
    for (const value of [undefined, null, 42, {}]) {
      const header = getContentDispositionHeader(value);
      expect(header).toContain(`filename="${FALLBACK_DOWNLOAD_FILENAME}"`);
      expect(header).not.toMatch(/undefined|null|NaN|object Object/);
    }
  });

  it("accepts a caller-supplied fallback", () => {
    expect(
      getContentDispositionHeader('"', { fallback: "notes.txt" }),
    ).toContain('filename="notes.txt"');
  });

  it("leaves ordinary names untouched", () => {
    // Guards against over-sanitizing: spaces, dots, dashes and parentheses are
    // all legal in a quoted-string.
    expect(sanitizeFilenameForHeader("Q3 report (final) v2.pdf")).toBe(
      "Q3 report (final) v2.pdf",
    );
  });
});

describe("downloadAttachment (#1454)", () => {
  let statSpy;
  let createReadStreamSpy;
  let fileStream;

  beforeEach(() => {
    vi.clearAllMocks();

    fileStream = createFileStream();
    statSpy = vi
      .spyOn(fs.promises, "stat")
      .mockResolvedValue({ isFile: () => true, size: 4096 });
    createReadStreamSpy = vi
      .spyOn(fs, "createReadStream")
      .mockReturnValue(fileStream);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const invoke = async (overrides = {}) => {
    Attachment.findOne.mockResolvedValue({
      ...ATTACHMENT_DEFAULTS,
      ...overrides,
    });

    const req = { params: { meetingId: "m1", id: "a1" } };
    const res = createResponse();
    await downloadAttachment(req, res);
    return res;
  };

  it("sends a sanitized, RFC 8187 Content-Disposition", async () => {
    const res = await invoke({ fileName: 'quarterly".pdf' });

    const header = res.headers["Content-Disposition"];
    expect(header).toContain('filename="quarterly.pdf"');
    expect(header).toContain("filename*=UTF-8''");
    expect(header).not.toMatch(/[\r\n]/);
  });

  it("keeps a non-ASCII filename intact", async () => {
    const res = await invoke({ fileName: "स्थिति-रिपोर्ट.pdf" });

    const encoded =
      res.headers["Content-Disposition"].split("filename*=UTF-8''")[1];
    expect(decodeURIComponent(encoded)).toBe("स्थिति-रिपोर्ट.pdf");
  });

  it("takes Content-Length from the file on disk, not from the DB row", async () => {
    // `fileSize` says 2048; the file is 4096. Sending 2048 would truncate the
    // download; sending more than exists would hang the client.
    const res = await invoke({ fileSize: 2048 });

    expect(res.headers["Content-Length"]).toBe(4096);
  });

  it("passes an allow-listed mime type through", async () => {
    const res = await invoke({ mimeType: "image/png" });

    expect(res.headers["Content-Type"]).toBe("image/png");
  });

  it("degrades an unrecognised mime type to octet-stream", async () => {
    for (const stored of [
      "text/html",
      "application/javascript",
      "image/svg+xml",
      undefined,
      "",
    ]) {
      const res = await invoke({ mimeType: stored });
      expect(res.headers["Content-Type"]).toBe("application/octet-stream");
    }
  });

  it("sends nosniff", async () => {
    const res = await invoke();

    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("streams the file once the headers are set", async () => {
    const res = await invoke();

    expect(createReadStreamSpy).toHaveBeenCalledWith(
      expect.stringContaining("abc123.pdf"),
    );
    expect(res.piped).toBe(fileStream);
  });

  it("404s when the attachment row does not exist", async () => {
    Attachment.findOne.mockResolvedValue(null);
    const res = createResponse();

    await downloadAttachment({ params: { meetingId: "m1", id: "a1" } }, res);

    expect(res.statusCode).toBe(404);
    expect(createReadStreamSpy).not.toHaveBeenCalled();
  });

  it("404s when the file is missing from disk", async () => {
    statSpy.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
    const res = await invoke();

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("File not found on server");
    expect(createReadStreamSpy).not.toHaveBeenCalled();
  });

  it("404s when the path resolves to a directory", async () => {
    statSpy.mockResolvedValue({ isFile: () => false, size: 0 });
    const res = await invoke();

    expect(res.statusCode).toBe(404);
    expect(createReadStreamSpy).not.toHaveBeenCalled();
  });

  it("answers 500 when the stream fails before headers are flushed", async () => {
    const res = await invoke();
    res.headersSent = false;

    fileStream.emit("error", new Error("EIO"));

    expect(res.statusCode).toBe(500);
    expect(res.destroy).not.toHaveBeenCalled();
  });

  it("destroys the response when the stream fails mid-transfer", async () => {
    const res = await invoke();
    res.headersSent = true;

    const failure = new Error("EIO");
    fileStream.emit("error", failure);

    // The status line is already on the wire, so an incomplete response is the
    // only honest signal left. Previously this threw an unhandled error event.
    expect(res.destroy).toHaveBeenCalledWith(failure);
  });

  it("stops reading from disk when the client disconnects", async () => {
    const res = await invoke();

    res.emit("close");

    expect(fileStream.destroy).toHaveBeenCalled();
  });
});
