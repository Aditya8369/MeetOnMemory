import GuestAccessToken from "./guestAccessTokenModel.js";

/**
 * Re-export the existing GuestAccessToken model as GuestToken to fulfill
 * platform specifications while preserving upstream schema/data storage mappings.
 */
const GuestToken = GuestAccessToken;
export default GuestToken;
