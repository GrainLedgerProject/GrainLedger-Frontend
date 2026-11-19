import { Link, type LinkProps } from "react-router-dom";
import { exportActionFromPath, useExportAction } from "../model/exportActions";

/** Preserve real deep links while ordinary feature actions stay in the current workspace. */
export function ExportActionLink({
  to,
  onClick,
  children,
  ...props
}: LinkProps) {
  const open = useExportAction();
  return (
    <Link
      {...props}
      to={to}
      onClick={(event) => {
        onClick?.(event);
        if (
          !open ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank" ||
          typeof to !== "string"
        )
          return;
        const action = exportActionFromPath(to);
        if (action) {
          event.preventDefault();
          open(action);
        }
      }}
    >
      {children}
    </Link>
  );
}
