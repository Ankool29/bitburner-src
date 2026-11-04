import React, { useEffect, useState } from "react";
import { Box, Button, Collapse, Typography } from "@mui/material";
import type { editor } from "monaco-editor";
import { openDocumentationPopUp } from "../../Documentation/root";
import { defaultNsApiPage } from "../../ui/React/Documentation";
import { hasScriptExtension, isLegacyScript } from "../../Paths/ScriptFilePath";
import { insertMobileText } from "./mobileEditorActions";
import { mobileInstructions } from "./mobileInstructions";

interface Props {
  editor: editor.IStandaloneCodeEditor | null;
  onSave: () => Promise<void>;
  onRun: () => Promise<void>;
  showMore: boolean;
  onToggleMore: () => void;
}

const shortcuts = ["Tab", "()", "{}", "[]", ";", "ns.", "await"] as const;

export function MobileScriptTools({ editor, onSave, onRun, showMore, onToggleMore }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(mobileInstructions[0]);
  const [composing, setComposing] = useState(false);
  const [script, setScript] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const updateModel = () => {
      const path = editor.getModel()?.uri.path ?? "";
      setScript(hasScriptExtension(path) && !isLegacyScript(path));
      setComposing(false);
    };
    updateModel();
    const subscriptions = [
      editor.onDidChangeModel(updateModel),
      editor.onDidCompositionStart(() => setComposing(true)),
      editor.onDidCompositionEnd(() => setComposing(false)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.dispose());
  }, [editor]);

  const disabled = !editor || composing;
  // Prevent pointer actions from blurring Monaco and closing the Android keyboard.
  // Keyboard activation still uses the native button focus and click behavior.
  const keepEditorFocus = (event: React.PointerEvent) => event.preventDefault();
  const insertShortcut = (shortcut: (typeof shortcuts)[number]) => {
    if (!editor || composing) return;
    if (shortcut === "Tab") {
      editor.focus();
      editor.trigger("mobile-script-tools", "tab", null);
    } else if (["()", "{}", "[]"].includes(shortcut)) {
      insertMobileText(editor, shortcut, 1);
    } else {
      insertMobileText(editor, shortcut === "await" ? "await " : shortcut);
    }
  };

  return (
    <Box
      aria-label="Outils tactiles de l’éditeur"
      sx={{
        flexShrink: 0,
        borderTop: 1,
        borderColor: "primary.main",
        bgcolor: "background.paper",
        "& .MuiButton-root": { minHeight: 44, flexShrink: 0 },
      }}
    >
      <Box role="toolbar" aria-label="Raccourcis de saisie" sx={{ display: "flex", overflowX: "auto" }}>
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut}
            disabled={disabled || ((shortcut === "ns." || shortcut === "await") && !script)}
            onPointerDown={keepEditorFocus}
            onClick={() => insertShortcut(shortcut)}
            aria-label={shortcut === "Tab" ? "Indenter" : `Insérer ${shortcut}`}
          >
            {shortcut}
          </Button>
        ))}
      </Box>
      <Box sx={{ display: "flex", overflowX: "auto" }}>
        <Button
          aria-expanded={open}
          aria-controls="mobile-netscript-guide"
          onPointerDown={keepEditorFocus}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Masquer le guide" : "Instructions"}
        </Button>
        <Button onClick={() => void onSave().catch(console.error)}>Sauver</Button>
        <Button disabled={!script} onClick={() => void onRun().catch(console.error)}>
          Exécuter
        </Button>
        <Button onClick={() => openDocumentationPopUp(defaultNsApiPage)}>Documentation</Button>
        <Button aria-expanded={showMore} aria-controls="mobile-editor-more" onClick={onToggleMore}>
          Autres outils
        </Button>
      </Box>
      <Collapse in={open}>
        <Box id="mobile-netscript-guide" sx={{ maxHeight: "min(28dvh, 210px)", overflowY: "auto", px: 1 }}>
          <Box sx={{ display: "flex", overflowX: "auto" }} aria-label="Instructions Netscript courantes">
            {mobileInstructions.map((instruction) => (
              <Button
                key={instruction.name}
                aria-pressed={selected.name === instruction.name}
                variant={selected.name === instruction.name ? "outlined" : "text"}
                onPointerDown={keepEditorFocus}
                onClick={() => setSelected(instruction)}
              >
                {instruction.name}()
              </Button>
            ))}
          </Box>
          <Typography variant="body2" role="status">
            {selected.category} — {selected.description}
          </Typography>
          <Box component="pre" sx={{ my: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {selected.code}
          </Box>
          <Typography variant="caption" display="block">
            Exemple pour NS2 avec un objet nommé ns. Placez les appels await dans une fonction async. L’insertion
            remplace la sélection ; adaptez le paramètre sélectionné.
          </Typography>
          <Button
            disabled={disabled || !script}
            onPointerDown={keepEditorFocus}
            onClick={() => {
              if (!editor || composing) return;
              const start = selected.parameter ? selected.code.indexOf(selected.parameter) : selected.code.length;
              insertMobileText(editor, selected.code, start, start + (selected.parameter?.length ?? 0));
            }}
          >
            Insérer {selected.name}()
          </Button>
          <Button onClick={() => openDocumentationPopUp(`nsDoc/bitburner.ns.${selected.name}.md`)}>
            Aide complète
          </Button>
          {!script && (
            <Typography variant="caption">L’insertion Netscript nécessite un fichier JS ou TS moderne.</Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
