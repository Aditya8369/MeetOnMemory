import { useContext } from "react";
import PwaContext from "./PwaContext.jsx";

export const usePwa = () => useContext(PwaContext);

export default usePwa;
