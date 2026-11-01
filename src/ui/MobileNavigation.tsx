import React from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import CodeIcon from "@mui/icons-material/Code";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import PublicIcon from "@mui/icons-material/Public";
import SettingsIcon from "@mui/icons-material/Settings";

import { Page } from "./Router";
import { Router } from "./Router";

interface IProps {
  page: Page;
}

/**
 * Touch-friendly primary navigation for narrow screens.
 * The full sidebar remains available on tablet and desktop layouts.
 */
export function MobileNavigation({ page }: IProps): React.ReactElement {
  const items = [
    { page: Page.Terminal, label: "Terminal", icon: <TerminalIcon /> },
    { page: Page.ActiveScripts, label: "Scripts", icon: <CodeIcon /> },
    { page: Page.Stats, label: "Stats", icon: <EqualizerIcon /> },
    { page: Page.City, label: "World", icon: <PublicIcon /> },
    { page: Page.Options, label: "Options", icon: <SettingsIcon /> },
  ];
  const selected = items.findIndex((item) => item.page === page);

  return (
    <Paper
      elevation={8}
      sx={{
        display: { xs: "block", sm: "none" },
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        paddingBottom: "env(safe-area-inset-bottom)",
        backgroundColor: "background.paper",
      }}
    >
      <BottomNavigation
        showLabels
        value={selected < 0 ? false : selected}
        onChange={(_event, value: number) => {
          const destination = items[value].page;
          if (destination === Page.ActiveScripts) {
            Router.toPage(Page.ActiveScripts, {});
          } else if (destination === Page.Options) {
            Router.toPage(Page.Options, {});
          } else {
            Router.toPage(destination);
          }
        }}
        sx={{
          height: 60,
          backgroundColor: "transparent",
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            padding: "6px 0",
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.68rem",
          },
        }}
      >
        {items.map((item) => (
          <BottomNavigationAction key={item.label} label={item.label} icon={item.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
