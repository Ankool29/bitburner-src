import React, { useState } from "react";
import { BottomNavigation, BottomNavigationAction, Paper, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import CodeIcon from "@mui/icons-material/Code";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import MenuIcon from "@mui/icons-material/Menu";
import ComputerIcon from "@mui/icons-material/Computer";
import BugReportIcon from "@mui/icons-material/BugReport";
import ContactsIcon from "@mui/icons-material/Contacts";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import AirplanemodeActiveIcon from "@mui/icons-material/AirplanemodeActive";
import WorkIcon from "@mui/icons-material/Work";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BusinessIcon from "@mui/icons-material/Business";
import SportsMmaIcon from "@mui/icons-material/SportsMma";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import CheckIcon from "@mui/icons-material/Check";
import HelpIcon from "@mui/icons-material/Help";
import SettingsIcon from "@mui/icons-material/Settings";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ShareIcon from "@mui/icons-material/Share";
import BiotechIcon from "@mui/icons-material/Biotech";
import BorderInnerSharpIcon from "@mui/icons-material/BorderInnerSharp";

import { isSimplePage, Page, Router } from "./Router";
import { Player } from "@player";
import { Settings } from "../Settings/Settings";
import { AugmentationName } from "@enums";

interface IProps {
  page: Page;
}

type MenuEntry = {
  label: string;
  page: Page;
  icon: React.ReactElement;
  context?: Record<string, never>;
};

export function MobileNavigation({ page }: IProps): React.ReactElement {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const items = [
    { page: Page.Terminal, label: "Terminal", icon: <TerminalIcon /> },
    { page: Page.ActiveScripts, label: "Scripts", icon: <CodeIcon /> },
    { page: Page.Stats, label: "Stats", icon: <EqualizerIcon /> },
  ];
  const selected = items.findIndex((item) => item.page === page);

  const canOpenFactions = Player.factionInvitations.length > 0 || Player.factions.length > 0 ||
    Player.factionRumors.size > 0 || Player.augmentations.length > 0 ||
    Player.queuedAugmentations.length > 0;
  const canOpenAugmentations = Player.augmentations.length > 0 ||
    Player.queuedAugmentations.length > 0 || Player.exploits.length > 0;
  const entries: { title: string; pages: MenuEntry[] }[] = [
    { title: "HACKING", pages: [
      { label: "Terminal", page: Page.Terminal, icon: <TerminalIcon /> },
      { label: "Éditeur de scripts", page: Page.ScriptEditor, icon: <CodeIcon /> },
      { label: "Scripts actifs", page: Page.ActiveScripts, icon: <ComputerIcon /> },
      { label: "Programmes", page: Page.CreateProgram, icon: <BugReportIcon /> },
      { label: "Erreurs récentes", page: Page.RecentErrors, icon: <BugReportIcon /> },
      { label: "Scripts arrêtés", page: Page.RecentlyKilledScripts, icon: <BugReportIcon /> },
    ]},
    { title: "PERSONNAGE", pages: [
      { label: "Statistiques", page: Page.Stats, icon: <EqualizerIcon /> },
      ...(canOpenFactions ? [{ label: "Factions", page: Page.Factions, icon: <ContactsIcon /> }] : []),
      ...(canOpenAugmentations ? [{ label: "Augmentations", page: Page.Augmentations, icon: <DoubleArrowIcon /> }] : []),
      { label: "Hacknet", page: Page.Hacknet, icon: <AccountTreeIcon /> },
      ...(Player.sleeves.length > 0 ? [{ label: "Sleeves", page: Page.Sleeves, icon: <PeopleAltIcon /> }] : []),
      ...(Player.canAccessGrafting() ? [{ label: "Greffe", page: Page.Grafting, icon: <BiotechIcon /> }] : []),
      ...(Player.augmentations.some((aug) => aug.name === AugmentationName.StaneksGift1)
        ? [{ label: "Cadeau de Stanek", page: Page.StaneksGift, icon: <DoubleArrowIcon /> }] : []),
    ]},
    { title: "MONDE", pages: [
      { label: "Ville", page: Page.City, icon: <LocationCityIcon /> },
      { label: "Voyage", page: Page.Travel, icon: <AirplanemodeActiveIcon /> },
      ...(Object.values(Player.jobs).length > 0 ? [{ label: "Emploi", page: Page.Job, icon: <WorkIcon /> }] : []),
      ...(Player.hasWseAccount ? [{ label: "Bourse", page: Page.StockMarket, icon: <TrendingUpIcon /> }] : []),
      ...(Player.bladeburner ? [{ label: "Bladeburner", page: Page.Bladeburner, icon: <FormatBoldIcon /> }] : []),
      ...(Player.corporation ? [{ label: "Corporation", page: Page.Corporation, icon: <BusinessIcon /> }] : []),
      ...(Player.gang ? [{ label: "Gang", page: Page.Gang, icon: <SportsMmaIcon /> }] : []),
      ...(Player.hasDiscoveredGo ? [{ label: "IPvGO", page: Page.Go, icon: <BorderInnerSharpIcon /> }] : []),
      { label: "Darknet", page: Page.DarkNet, icon: <ShareIcon /> },
    ]},
    { title: "AIDE ET PARAMÈTRES", pages: [
      { label: "Jalons", page: Page.Milestones, icon: <CheckIcon /> },
      { label: "Documentation", page: Page.Documentation, icon: <HelpIcon /> },
      { label: "Succès", page: Page.Achievements, icon: <EmojiEventsIcon /> },
      { label: "Options", page: Page.Options, icon: <SettingsIcon /> },
    ]},
  ];

  const navigate = (entry: MenuEntry): void => {
    setMenuAnchor(null);
    if (entry.page === Page.ScriptEditor) {
      Router.toPage(Page.ScriptEditor, {
        files: new Map(),
        options: { vim: Settings.MonacoDefaultToVim, hostname: Player.currentServer },
      });
    } else if (entry.page === Page.ActiveScripts || entry.page === Page.Options || entry.page === Page.Documentation) {
      Router.toPage(entry.page, {});
    } else if (isSimplePage(entry.page)) {
      Router.toPage(entry.page);
    }
  };

  return (
    <>
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
            if (destination === Page.ActiveScripts) Router.toPage(Page.ActiveScripts, {});
            else if (isSimplePage(destination)) Router.toPage(destination);
          }}
          sx={{
            height: 60,
            backgroundColor: "transparent",
            "& .MuiBottomNavigationAction-root": { minWidth: 0, padding: "6px 0" },
            "& .MuiBottomNavigationAction-label": { fontSize: "0.68rem" },
          }}
        >
          {items.map((item) => <BottomNavigationAction key={item.label} label={item.label} icon={item.icon} />)}
          <BottomNavigationAction
            label="Menu"
            icon={<MenuIcon />}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            value="all-pages"
          />
        </BottomNavigation>
      </Paper>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{ sx: { maxHeight: "75vh", width: "min(92vw, 360px)", mb: 1 } }}
      >
        {entries.map((group, index) => (
          <React.Fragment key={group.title}>
            {index > 0 && <Divider />}
            <MenuItem disabled sx={{ opacity: "1 !important", minHeight: 34 }}>
              <ListItemText primary={group.title} primaryTypographyProps={{ variant: "caption", color: "text.secondary", fontWeight: "bold" }} />
            </MenuItem>
            {group.pages.map((entry) => (
              <MenuItem key={entry.label} selected={page === entry.page} onClick={() => navigate(entry)}>
                <ListItemIcon sx={{ minWidth: 38 }}>{entry.icon}</ListItemIcon>
                <ListItemText primary={entry.label} />
              </MenuItem>
            ))}
          </React.Fragment>
        ))}
      </Menu>
    </>
  );
}
