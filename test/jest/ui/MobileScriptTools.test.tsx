import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import type { editor } from "monaco-editor";
import { MobileScriptTools } from "../../../src/ScriptEditor/ui/MobileScriptTools";
import { insertMobileText } from "../../../src/ScriptEditor/ui/mobileEditorActions";
import { openDocumentationPopUp } from "../../../src/Documentation/root";

jest.mock("../../../src/ScriptEditor/ui/mobileEditorActions", () => ({ insertMobileText: jest.fn() }));
jest.mock("../../../src/Documentation/root", () => ({ openDocumentationPopUp: jest.fn() }));
jest.mock("../../../src/ui/React/Documentation", () => ({ defaultNsApiPage: "nsDoc/bitburner.ns.md" }));

describe("Mobile script tools", () => {
  let container: HTMLDivElement;
  let path: string;
  let changeModel: () => void;
  let startComposition: () => void;
  let endComposition: () => void;
  let codeEditor: editor.IStandaloneCodeEditor;
  const save = jest.fn(() => Promise.resolve());
  const run = jest.fn(() => Promise.resolve());
  const trigger = jest.fn();
  const dispose = jest.fn();

  const button = (text: string) => {
    const result = Array.from(container.querySelectorAll("button")).find((node) => node.textContent === text);
    if (!result) throw new Error(`Button ${text} not found`);
    return result;
  };
  const click = (text: string) => act(() => button(text).click());

  beforeEach(() => {
    jest.clearAllMocks();
    path = "/home/test.js";
    codeEditor = {
      getModel: () => ({ uri: { path } }),
      onDidChangeModel: (listener: () => void) => {
        changeModel = listener;
        return { dispose };
      },
      onDidCompositionStart: (listener: () => void) => {
        startComposition = listener;
        return { dispose };
      },
      onDidCompositionEnd: (listener: () => void) => {
        endComposition = listener;
        return { dispose };
      },
      focus: jest.fn(),
      trigger,
    } as unknown as editor.IStandaloneCodeEditor;
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      ReactDOM.render(
        <MobileScriptTools editor={codeEditor} onSave={save} onRun={run} showMore={false} onToggleMore={jest.fn()} />,
        container,
      );
    });
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
  });

  it("keeps pointer focus and places the cursor inside pairs", () => {
    const pointer = new Event("pointerdown", { bubbles: true, cancelable: true });
    button("()").dispatchEvent(pointer);
    expect(pointer.defaultPrevented).toBe(true);
    click("()");
    expect(insertMobileText).toHaveBeenCalledWith(codeEditor, "()", 1);
    click("Tab");
    expect(trigger).toHaveBeenCalledWith("mobile-script-tools", "tab", null);
  });

  it("shows help before explicit insertion and selects the example parameter", () => {
    click("Instructions");
    click("sleep()");
    expect(container.textContent).toContain("1000 ms = 1 seconde");
    expect(insertMobileText).not.toHaveBeenCalled();
    click("Insérer sleep()");
    expect(insertMobileText).toHaveBeenCalledWith(codeEditor, "await ns.sleep(1000);", 15, 19);
    click("Aide complète");
    expect(openDocumentationPopUp).toHaveBeenCalledWith("nsDoc/bitburner.ns.sleep.md");
  });

  it("does not insert during IME composition and resumes afterwards", () => {
    act(() => startComposition());
    expect(button("ns.").disabled).toBe(true);
    click("ns.");
    expect(insertMobileText).not.toHaveBeenCalled();
    act(() => endComposition());
    click("ns.");
    expect(insertMobileText).toHaveBeenCalledWith(codeEditor, "ns.");
  });

  it.each(["/home/data.json", "/home/old.script", "/home/style.css"])(
    "disables modern Netscript examples after switching to %s",
    (filePath) => {
      path = filePath;
      act(() => changeModel());
      expect(button("ns.").disabled).toBe(true);
      expect(button("Exécuter").disabled).toBe(true);
      expect(button(";").disabled).toBe(false);
      path = "/home/new.ts";
      act(() => changeModel());
      expect(button("ns.").disabled).toBe(false);
    },
  );

  it("uses existing save/run handlers and internal documentation", () => {
    click("Sauver");
    click("Exécuter");
    click("Documentation");
    expect(save).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(openDocumentationPopUp).toHaveBeenCalledWith("nsDoc/bitburner.ns.md");
  });
});
