import RedactionAudit from "../models/redactionAuditModel.js";

/**
 * Service providing streaming regex and NLP entity pattern detection,
 * reversible tokenized masking, and DLP compliance audit recording.
 */
class PiiRedactionService {
  constructor() {
    this.patterns = [
      {
        type: "API_KEY",
        regex:
          /(?:api[_-]?key|secret|token)[\s:=]+(['"])?([a-zA-Z0-9_\-]{20,})(['"])?/gi,
      },
      {
        type: "JWT_TOKEN",
        regex:
          /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]+/g,
      },
      {
        type: "CREDIT_CARD",
        regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
      },
      {
        type: "SSN",
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      },
      {
        type: "EMAIL",
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      },
      {
        type: "PHONE",
        regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      },
    ];
  }

  /**
   * Scan and mask raw text with tokenized placeholders
   */
  async scanAndRedact({
    organizationId,
    meetingId,
    text,
    persistAudit = true,
  }) {
    if (!text || typeof text !== "string") {
      return { redactedText: text, findings: [] };
    }

    let redactedText = text;
    const findings = [];
    let counter = 1;

    for (const pattern of this.patterns) {
      const matches = [...text.matchAll(pattern.regex)];

      for (const match of matches) {
        const rawEntity = match[0];
        const startIndex = match.index;
        const endIndex = startIndex + rawEntity.length;
        const token = `[REDACTED_${pattern.type}_${counter++}]`;

        const startContext = Math.max(0, startIndex - 20);
        const endContext = Math.min(text.length, endIndex + 20);
        const snippet = text.substring(startContext, endContext);

        redactedText = redactedText.replace(rawEntity, token);

        const finding = {
          organizationId,
          meetingId,
          entityType: pattern.type,
          maskedToken: token,
          charIndexStart: startIndex,
          charIndexEnd: endIndex,
          contextSnippet: snippet,
        };

        findings.push(finding);
      }
    }

    if (persistAudit && findings.length > 0 && organizationId && meetingId) {
      await RedactionAudit.insertMany(findings);
    }

    return {
      redactedText,
      findingsCount: findings.length,
      findings,
    };
  }

  /**
   * Get compliance audit logs for an organization
   */
  async getAuditLogs(organizationId, meetingId = null) {
    const query = { organizationId };
    if (meetingId) query.meetingId = meetingId;

    return await RedactionAudit.find(query)
      .sort({ createdAt: -1 })
      .populate("meetingId", "title scheduledStartTime")
      .populate("unmaskRequests.requestedBy", "name email")
      .lean();
  }
}

export default new PiiRedactionService();
