import { useContext } from "react";
import { PreferencesContext } from "./PreferencesContext.jsx";

const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};

export default usePreferences;
