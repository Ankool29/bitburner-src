import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { Modal } from "../../../src/ui/React/Modal";
import {
  observeViewport,
  readViewport,
  revealFocusedControl,
  ResponsiveLayout,
} from "../../../src/ui/React/ResponsiveLayout";

jest.mock("@mui/material", () => ({
  ...jest.requireActual<typeof import("@mui/material")>("@mui/material"),
  useMediaQuery: () => true,
}));

describe("Responsive windows", () => {
  let host: HTMLDivElement;
  let viewport: EventTarget & { width: number; height: number; offsetTop: number; offsetLeft: number };
  const originalViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");

  beforeEach(() => {
    jest.useFakeTimers();
    viewport = Object.assign(new EventTarget(), { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(host);
    });
    host.remove();
    if (originalViewport) Object.defineProperty(window, "visualViewport", originalViewport);
    else Reflect.deleteProperty(window, "visualViewport");
    jest.useRealTimers();
  });

  it("reads the visible viewport and falls back when the API is absent", () => {
    expect(readViewport()).toEqual({ width: 390, height: 844, top: 0, left: 0 });
    Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true });
    expect(readViewport()).toEqual({ width: window.innerWidth, height: window.innerHeight, top: 0, left: 0 });
  });

  it("coalesces keyboard and panning updates and removes its listeners", () => {
    const update = jest.fn();
    const stop = observeViewport(update);
    viewport.height = 400;
    viewport.offsetTop = 24;
    viewport.dispatchEvent(new Event("resize"));
    viewport.dispatchEvent(new Event("scroll"));
    jest.advanceTimersByTime(20);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenLastCalledWith({ width: 390, height: 400, top: 24, left: 0 });
    viewport.dispatchEvent(new Event("resize"));
    stop();
    window.dispatchEvent(new Event("resize"));
    jest.advanceTimersByTime(20);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("updates shared geometry without remounting the dialog or losing a draft", () => {
    act(() => {
      ReactDOM.render(
        <>
          <ResponsiveLayout />
          <Modal open onClose={jest.fn()}>
            <input aria-label="Draft" defaultValue="initial" />
          </Modal>
        </>,
        host,
      );
    });
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Draft"]');
    if (!input) throw new Error("Input missing");
    input.value = "unsaved draft";
    act(() => {
      viewport.width = 844;
      viewport.height = 390;
      viewport.dispatchEvent(new Event("resize"));
      jest.advanceTimersByTime(20);
    });
    expect(document.documentElement.style.getPropertyValue("--bb-ui-height")).toBe("390px");
    expect(document.querySelector('input[aria-label="Draft"]')).toBe(input);
    expect(input.value).toBe("unsaved draft");
  });

  it("exposes a named close button and calls the existing handler once", () => {
    const close = jest.fn();
    act(() => {
      ReactDOM.render(
        <Modal open onClose={close}>
          <p>Confirmation</p>
        </Modal>,
        host,
      );
    });
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]');
    if (!button) throw new Error("Close button missing");
    act(() => button.click());
    expect(close).toHaveBeenCalledTimes(1);
    expect(button.style.width).not.toBe("20px");
  });

  it("scrolls only the dialog body to reveal the focused form control", () => {
    host.className = "bb-modal-content";
    const input = document.createElement("input");
    host.appendChild(input);
    input.focus();
    jest.spyOn(host, "getBoundingClientRect").mockReturnValue({ top: 50, bottom: 200 } as DOMRect);
    jest.spyOn(input, "getBoundingClientRect").mockReturnValue({ top: 220, bottom: 260 } as DOMRect);
    revealFocusedControl();
    expect(host.scrollTop).toBe(68);
    input.blur();
    revealFocusedControl();
    expect(host.scrollTop).toBe(68);
  });
});
