import { submitCareerApplication } from "../services/careerApplicationService.js";
import { sendSuccess } from "../utils/responseHandler.js";

export const createSubmitCareerApplicationHandler = () => {
  return async (req, res, next) => {
    try {
      const result = await submitCareerApplication({
        name: req.body.name,
        email: req.body.email,
        jobId: req.body.jobId,
        portfolio: req.body.portfolio,
        coverLetter: req.body.coverLetter,
        resumeFile: req.file,
      });

      return sendSuccess(
        res,
        { applicationId: result.id },
        "Application submitted successfully.",
        201,
      );
    } catch (error) {
      next(error);
    }
  };
};

export const submitApplication = createSubmitCareerApplicationHandler();

export default submitApplication;
