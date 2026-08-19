import { submitContactMessage } from "../services/contactService.js";
import { sendSuccess } from "../utils/responseHandler.js";

export const createSubmitContactHandler = () => {
  return async (req, res, next) => {
    try {
      const result = await submitContactMessage({
        name: req.body.name,
        email: req.body.email,
        organization: req.body.organization,
        department: req.body.department,
        subject: req.body.subject,
        message: req.body.message,
      });

      return sendSuccess(
        res,
        {
          ticketId: result.ticketId,
          department: result.department,
          sla: result.sla,
          status: "Open / Queued",
        },
        "Support ticket created successfully.",
        201,
      );
    } catch (error) {
      next(error);
    }
  };
};

export const submitContact = createSubmitContactHandler();

export default submitContact;
