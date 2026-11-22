import React, { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Button, useMediaQuery } from "@mui/material";
import { mobileQuery, useAvailableViewport, type AvailableViewport } from "./ResponsiveLayout";
import { EventEmitter } from "../../utils/EventEmitter";
import { RunningScript } from "../../Script/RunningScript";
import { killWorkerScriptByPid } from "../../Netscript/killWorkerScript";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import Draggable, { DraggableEvent } from "react-draggable";
import { ResizableBox, ResizeCallbackData } from "react-resizable";
import IconButton from "@mui/material/IconButton";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { workerScripts } from "../../Netscript/WorkerScripts";
import { startWorkerScript } from "../../NetscriptWorker";
import { GetServer } from "../../Server/AllServers";
import { findRunningScriptByPid } from "../../Script/ScriptHelpers";
import { debounce } from "lodash";
import { Settings } from "../../Settings/Settings";
import { ANSIITypography } from "./ANSIITypography";
import { useRerender } from "./hooks";
import { dialogBoxCreate } from "./DialogBox";
import { makeStyles } from "tss-react/mui";
import { logBoxBaseZIndex } from "./Constants";
import { clampNumber } from "../../utils/helpers/clampNumber";
import { helpers } from "../../Netscript/NetscriptHelpers";

let layerCounter = 0;

export const LogBoxEvents = new EventEmitter<[RunningScript]>();
export const LogBoxCloserEvents = new EventEmitter<[number]>();
export const LogBoxClearEvents = new EventEmitter<[]>();

// Min width/height of a log window
const minWindowSize: [number, number] = [150, 33];

// Dynamic properties (size, position) bound to a specific rendered instance of a LogBox
export class LogBoxProperties {
  x = window.innerWidth * 0.4;
  y = window.innerHeight * 0.3;
  width = 500;
  height = 500;
  fontSize: number | undefined = undefined;
  minimized = false;

  rerender: () => void;
  rootRef: React.RefObject<Draggable>;

  constructor(rerender: () => void, rootRef: React.RefObject<Draggable>) {
    this.rerender = rerender;
    this.rootRef = rootRef;
  }

  updateDOM(): void {
    if (!this.rootRef.current) return;
    const state = this.rootRef.current.state as { x: number; y: number };
    state.x = this.x;
    state.y = this.y;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.updateDOM();
    this.rerender();
  }

  setSize(width: number, height: number): void {
    this.width = clampNumber(width, minWindowSize[0]);
    this.height = clampNumber(height, minWindowSize[1]);
    this.rerender();
  }

  setFontSize(size?: number): void {
    this.fontSize = size;
    this.rerender();
  }

  setMinimized(minimized: boolean): void {
    this.minimized = minimized;
    this.rerender();
  }

  isVisible(): boolean {
    return this.rootRef.current !== null;
  }
}

interface Log {
  id: number; // The PID of the script *when the window was first opened*
  script: RunningScript;
}

let logs: Log[] = [];

export function LogBoxManager({ hidden }: { hidden: boolean }): React.ReactElement {
  const rerender = useRerender();
  const mobile = useMediaQuery(mobileQuery);
  const viewport = useAvailableViewport();
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = logs.find((log) => log.id === activeId) ?? logs[logs.length - 1];

  //Close tail windows by their pid.
  const closePid = useCallback(
    (pid: number) => {
      logs = logs.filter((log) => log.script.pid !== pid);
      rerender();
    },
    [rerender],
  );

  useEffect(
    () =>
      LogBoxEvents.subscribe((script: RunningScript) => {
        const existing = logs.find((log) => log.script.pid === script.pid);
        if (existing) {
          setActiveId(existing.id);
          return;
        }
        logs.push({
          id: script.pid,
          script,
        });
        setActiveId(script.pid);
        rerender();
      }),
    [rerender],
  );

  //Event used by ns.closeTail to close tail windows
  useEffect(
    () =>
      LogBoxCloserEvents.subscribe((pid: number) => {
        closePid(pid);
      }),
    [closePid],
  );

  useEffect(
    () =>
      LogBoxClearEvents.subscribe(() => {
        logs = [];
        rerender();
      }),
    [rerender],
  );

  //Close tail windows by their id
  function close(id: number): void {
    logs = logs.filter((l) => l.id !== id);
    rerender();
  }

  return (
    <>
      {logs.map((log) => (
        <LogWindow
          hidden={hidden || (mobile && active?.id !== log.id)}
          key={log.id}
          script={log.script}
          onClose={() => close(log.id)}
          mobile={mobile}
          viewport={viewport}
        />
      ))}
      {mobile && !hidden && logs.length > 0 && (
        <Box
          role="toolbar"
          aria-label="Script log windows"
          className="bb-scroll-region"
          sx={{
            position: "fixed",
            left: viewport.left + 8,
            top: viewport.top + 8,
            width: viewport.width - 16,
            display: "flex",
            overflowX: "auto",
            bgcolor: "background.paper",
            zIndex: 1500,
          }}
        >
          {logs.map((log) => (
            <Button
              key={log.id}
              aria-pressed={active?.id === log.id}
              onClick={() => setActiveId(log.id)}
              sx={{ flexShrink: 0 }}
            >
              {log.script.filename} #{log.id}
            </Button>
          ))}
        </Box>
      )}
    </>
  );
}

interface LogWindowProps {
  script: RunningScript;
  onClose: () => void;
  hidden: boolean;
  mobile: boolean;
  viewport: AvailableViewport;
}

const useStyles = makeStyles()({
  logs: {
    overflowY: "scroll",
    overflowX: "hidden",
    scrollbarWidth: "auto",
    flexDirection: "column-reverse",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    borderWidth: "0 1px 1px 1px",
  },
  titleButton: {
    borderWidth: "0 0 0 1px",
    borderColor: Settings.theme.welllight,
    borderStyle: "solid",
    borderRadius: "0",
    padding: "0",
    height: "100%",
  },
});

function LogWindow({ hidden, script, onClose, mobile, viewport }: LogWindowProps): React.ReactElement {
  const draggableRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Draggable>(null);
  const { classes } = useStyles();
  const container = useRef<HTMLDivElement>(null);
  const textArea = useRef<HTMLDivElement>(null);
  const rerender = useRerender(Settings.TailRenderInterval);
  const propsRef = useRef(new LogBoxProperties(rerender, rootRef));
  script.tailProps = propsRef.current;

  const textAreaKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "a") {
      if (!textArea.current) return; //Should never happen
      const r = new Range();
      r.setStartBefore(textArea.current);
      r.setEndAfter(textArea.current);
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(r);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onResize = (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    propsRef.current.setSize(size.width, size.height);
  };

  const updateLayer = useCallback(() => {
    const c = container.current;
    if (c === null) return;
    c.style.zIndex = logBoxBaseZIndex + (mobile ? layerCounter % 1000 : layerCounter) + "";
    layerCounter++;
    rerender();
  }, [rerender, mobile]);

  useEffect(() => {
    propsRef.current.updateDOM();
    updateLayer();
  }, [updateLayer]);

  function kill(): void {
    killWorkerScriptByPid(script.pid);
    rerender();
  }

  function run(): void {
    const server = GetServer(script.server);
    if (server === null) return;
    const s = findRunningScriptByPid(script.pid);
    if (s === null) {
      const baseScript = server.scripts.get(script.filename);
      if (!baseScript) {
        return dialogBoxCreate(
          `Could not launch script. The script ${script.filename} no longer exists on the server ${server.hostname}.`,
        );
      }
      const ramUsage = baseScript.getRamUsage(server.scripts);
      if (!ramUsage) {
        return dialogBoxCreate(`Could not calculate ram usage for ${script.filename} on ${server.hostname}.`);
      }
      // Reset some things, because we're reusing the RunningScript instance
      script.ramUsage = ramUsage;
      script.dataMap = new Map();
      script.onlineExpGained = 0;
      script.onlineMoneyMade = 0;
      script.onlineRunningTime = 0.01;

      startWorkerScript(script, server);
      rerender();
    } else {
      console.warn(`Tried to rerun pid ${script.pid} that was already running!`);
    }
  }

  function title(): React.ReactElement {
    const displayTitle = script.title;
    const titleText = typeof displayTitle === "string" ? displayTitle : script.getDefaultTitle();
    return (
      <Typography
        variant="h6"
        sx={{ marginRight: "auto", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}
        title={titleText}
      >
        {displayTitle}
      </Typography>
    );
  }

  function minimize(): void {
    propsRef.current.setMinimized(!propsRef.current.minimized);
  }

  const onWindowResize = useMemo(
    () =>
      debounce((): void => {
        const node = draggableRef.current;
        if (!node) return;

        if (!isOnScreen(node)) {
          propsRef.current.setPosition(0, 0);
        }
      }, 100),
    [],
  );

  // And trigger fakeDrag when the window is resized
  useEffect(() => {
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, [onWindowResize]);

  const isOnScreen = (node: HTMLDivElement): boolean => {
    const bounds = node.getBoundingClientRect();

    return !(bounds.right < 0 || bounds.bottom < 0 || bounds.left > innerWidth || bounds.top > innerHeight);
  };

  /**
   * The returned type of onDrag is a bit weird here. The Draggable component expects an onDrag that returns "void | false".
   * In that component's internal code, it checks for the explicit "false" value. If onDrag returns false, the component
   * cancels the dragging.
   *
   * That's why they use "void | false" as the returned type. However, in TypeScript, "void" is not supposed to be used
   * like that. ESLint will complain "void is not valid as a constituent in a union type". Please check its documentation
   * for the reason. In order to solve this problem, I changed the returned type to "undefined | false".
   */
  const onDrag = (e: DraggableEvent): undefined | false => {
    e.preventDefault();
    // bound to body
    if (
      e instanceof MouseEvent &&
      (e.clientX < 0 || e.clientY < 0 || e.clientX > innerWidth || e.clientY > innerHeight)
    ) {
      return false;
    }
    if (rootRef.current) {
      // We can set x,y directly. Calling setPosition will make unnecessary calls of updateDOM and rerender.
      const currentState = rootRef.current.state as { x: number; y: number };
      propsRef.current.x = currentState.x;
      propsRef.current.y = currentState.y;
    }
  };

  return (
    <Draggable
      handle=".drag"
      cancel="button"
      disabled={mobile}
      position={mobile ? { x: 0, y: 0 } : undefined}
      onDrag={onDrag}
      ref={rootRef}
      onMouseDown={updateLayer}
    >
      <Box
        role="region"
        aria-label={`Script log ${script.pid}`}
        display={hidden ? "none" : "flex"}
        sx={{
          flexFlow: "column",
          position: "fixed",
          zIndex: 1400,
          minWidth: `${minWindowSize[0]}px`,
          minHeight: `${minWindowSize[1]}px`,
          ...(mobile && { left: viewport.left + 8, top: viewport.top + 56, maxWidth: viewport.width - 16 }),
          ...(!mobile &&
            propsRef.current.minimized && {
              border: "none",
              margin: 0,
              maxHeight: 0,
              padding: 0,
            }),
        }}
        ref={container}
      >
        <ResizableBox
          width={mobile ? Math.max(150, viewport.width - 16) : propsRef.current.width}
          height={
            mobile ? (propsRef.current.minimized ? 48 : Math.max(48, viewport.height - 192)) : propsRef.current.height
          }
          resizeHandles={mobile ? [] : ["se"]}
          onResize={onResize}
          minConstraints={minWindowSize}
          handle={
            mobile ? undefined : (
              <span
                style={{
                  position: "absolute",
                  right: "-10px",
                  bottom: "-16px",
                  cursor: "nw-resize",
                  display: propsRef.current.minimized ? "none" : "inline-block",
                }}
              >
                <ArrowForwardIosIcon color="primary" style={{ transform: "rotate(45deg)", fontSize: "1.75rem" }} />
              </span>
            )
          }
        >
          <>
            <Paper
              className="drag"
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: mobile ? "default" : "grab",
                height: mobile ? 48 : undefined,
              }}
              ref={draggableRef}
            >
              {title()}

              <span style={{ minWidth: "fit-content", height: mobile ? 48 : minWindowSize[1], display: "flex" }}>
                {!workerScripts.has(script.pid) ? (
                  <IconButton
                    title="Re-run script"
                    aria-label="Re-run script"
                    className={classes.titleButton}
                    onClick={run}
                  >
                    <PlayCircleIcon />
                  </IconButton>
                ) : (
                  <IconButton
                    title="Stop script"
                    aria-label="Stop script"
                    className={classes.titleButton}
                    onClick={kill}
                  >
                    <StopCircleIcon color="error" />
                  </IconButton>
                )}
                <IconButton
                  title={propsRef.current.minimized ? "Expand" : "Minimize"}
                  aria-label={propsRef.current.minimized ? "Expand log" : "Minimize log"}
                  className={classes.titleButton}
                  onClick={minimize}
                >
                  {propsRef.current.minimized ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                </IconButton>
                <IconButton
                  title="Close window"
                  aria-label="Close log window"
                  className={classes.titleButton}
                  onClick={onClose}
                >
                  <CloseIcon />
                </IconButton>
              </span>
            </Paper>

            <Paper
              className={`${classes.logs} bb-scroll-region`}
              style={{
                height: `calc(100% - ${mobile ? 48 : minWindowSize[1]}px)`,
                display: propsRef.current.minimized ? "none" : "flex",
              }}
              tabIndex={-1}
              ref={textArea}
              onKeyDown={textAreaKeyDown}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                {script.logs.map(
                  (line: React.ReactNode, i: number): React.ReactNode =>
                    typeof line !== "string" ? (
                      line
                    ) : (
                      <ANSIITypography
                        key={i}
                        text={line}
                        color={helpers.getTextColor(line)}
                        styles={{
                          fontSize: mobile
                            ? Math.max(14, propsRef.current.fontSize ?? Settings.styles.tailFontSize)
                            : propsRef.current.fontSize ?? Settings.styles.tailFontSize,
                        }}
                      />
                    ),
                )}
              </div>
            </Paper>
          </>
        </ResizableBox>
      </Box>
    </Draggable>
  );
}
