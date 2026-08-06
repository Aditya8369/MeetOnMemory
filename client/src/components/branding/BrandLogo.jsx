import React from "react";
import logo from "../../assets/logo.svg";
import logoMark from "../../assets/favicon.svg";

/**
 * Canonical MeetOnMemory brand mark.
 *
 * - `full` (default): wordmark asset (`logo.svg`) — auth / standalone branding
 * - `mark`: icon-only asset (`favicon.svg`) — navbar / footer beside HTML wordmark
 *
 * Sizing is left to callers via `className` / `width` / `height` so the
 * component stays reusable without hardcoded dimensions.
 */
const BrandLogo = ({
  variant = "full",
  className = "",
  width,
  height,
  alt = "MeetOnMemory",
  onClick,
  onKeyDown,
  style,
  ...rest
}) => {
  const src = variant === "mark" ? logoMark : logo;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={style}
      className={className}
      {...rest}
    />
  );
};

export default BrandLogo;
