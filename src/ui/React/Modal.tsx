import React, { type CSSProperties, useEffect, useState } from "react";
import { Theme } from "@mui/material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Fade from "@mui/material/Fade";
import M from "@mui/material/Modal";
import { makeStyles } from "tss-react/mui";
import { SxProps } from "@mui/system";
import CloseIcon from "@mui/icons-material/Close";
import { useMediaQuery } from "@mui/material";
import { mobileQuery } from "./ResponsiveLayout";

const useStyles = makeStyles()((theme: Theme) => ({
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  paper: {
    position: "relative",
    backgroundColor: theme.palette.background.default,
    border: "2px solid " + theme.palette.primary.main,
    boxShadow: `0px 3px 5px -1px ${theme.palette.primary.dark},0px 5px 8px 0px ${theme.palette.primary.dark},0px 1px 14px 0px ${theme.palette.primary.dark}`,
    padding: 2,
    maxWidth: "80%",
    maxHeight: "80%",
    overflow: "auto",
    "&::-webkit-scrollbar": {
      // webkit
      display: "none",
    },
    scrollbarWidth: "none", // firefox
  },
  closeButton: {
    position: "absolute",
    right: 3,
    top: 3,
    width: 20,
    height: 20,
  },
}));

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  wrapperRef?: React.RefObject<HTMLDivElement>;
  wrapperStyles?: CSSProperties;
  removeFocus?: boolean;
  // If it's true, the player can dismiss the modal by pressing the Esc button or clicking on the backdrop.
  canBeDismissedEasily?: boolean;
}

export const Modal = ({
  open,
  onClose,
  children,
  sx,
  wrapperRef,
  wrapperStyles,
  removeFocus = true,
  canBeDismissedEasily = true,
}: ModalProps): React.ReactElement => {
  const { classes } = useStyles();
  const mobile = useMediaQuery(mobileQuery);
  const [content, setContent] = useState(children);
  useEffect(() => {
    if (!open) return;
    setContent(children);
  }, [children, open]);

  return (
    <M
      disableRestoreFocus={!mobile && removeFocus}
      disableScrollLock={!mobile}
      disableEnforceFocus={!mobile}
      disableAutoFocus={!mobile && removeFocus}
      open={open}
      onClose={() => {
        if (!canBeDismissedEasily) {
          return;
        }
        onClose();
      }}
      closeAfterTransition
      className={classes.modal}
      sx={sx}
      style={
        mobile
          ? {
              top: "var(--bb-ui-top, 0px)",
              left: "var(--bb-ui-left, 0px)",
              width: "var(--bb-ui-width, 100vw)",
              height: "var(--bb-ui-height, 100dvh)",
              bottom: "auto",
              right: "auto",
              zIndex: 20000,
            }
          : undefined
      }
    >
      <Fade in={open}>
        <div
          ref={mobile ? undefined : wrapperRef}
          role="dialog"
          aria-modal="true"
          aria-label="Game dialog"
          tabIndex={-1}
          className={classes.paper}
          style={
            mobile
              ? {
                  ...wrapperStyles,
                  display: "flex",
                  flexDirection: "column",
                  boxSizing: "border-box",
                  width: "calc(100% - 16px)",
                  maxWidth: 720,
                  minWidth: 0,
                  minHeight: 0,
                  maxHeight:
                    "calc(var(--bb-ui-height, 100dvh) - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
                  margin: 8,
                  padding: 0,
                  overflow: "hidden",
                }
              : wrapperStyles
          }
          //@ts-expect-error inert is not supported by react types yet, this is a workaround until then. https://github.com/facebook/react/pull/24730
          inert={open ? null : ""}
        >
          <IconButton
            aria-label="Close dialog"
            className={mobile ? undefined : classes.closeButton}
            sx={mobile ? { alignSelf: "flex-end", flexShrink: 0, width: 44, height: 44 } : undefined}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
          <Box
            className="bb-modal-content"
            ref={mobile ? wrapperRef : undefined}
            sx={
              mobile
                ? { px: 2, pb: 2, minHeight: 0, overflowY: "auto", overflowX: "hidden", flex: "1 1 auto" }
                : { m: 2 }
            }
          >
            {content}
          </Box>
        </div>
      </Fade>
    </M>
  );
};
