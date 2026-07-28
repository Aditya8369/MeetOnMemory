import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAssistant from "../context/useAssistant";

/**
 * Legacy /assistant route — opens the floating workspace and leaves the page.
 */
const AiAssistant = () => {
  const navigate = useNavigate();
  const { openAssistant } = useAssistant();

  useEffect(() => {
    openAssistant();
    navigate("/meetings", { replace: true });
  }, [openAssistant, navigate]);

  return null;
};

export default AiAssistant;
