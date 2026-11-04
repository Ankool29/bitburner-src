import { Selection, editor } from "monaco-editor";

/** Use normal model edits so onChange, diagnostics, RAM and undo keep their existing paths. */
export function insertMobileText(
  codeEditor: editor.IStandaloneCodeEditor,
  text: string,
  selectionStart = text.length,
  selectionEnd = selectionStart,
): void {
  const model = codeEditor.getModel();
  const selections = codeEditor.getSelections();
  if (!model || !selections || codeEditor.getOption(editor.EditorOption.readOnly)) return;

  codeEditor.focus();
  codeEditor.pushUndoStop();
  codeEditor.executeEdits(
    "mobile-script-tools",
    selections.map((range) => ({ range, text, forceMoveMarkers: true })),
    (edits) =>
      edits.map(({ range }) => {
        const offset = model.getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn });
        const start = model.getPositionAt(offset + selectionStart);
        const end = model.getPositionAt(offset + selectionEnd);
        return new Selection(start.lineNumber, start.column, end.lineNumber, end.column);
      }),
  );
  codeEditor.pushUndoStop();
  const position = codeEditor.getPosition();
  if (position) codeEditor.revealPositionInCenterIfOutsideViewport(position);
}
