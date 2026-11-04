import type { NS } from "../NetscriptDefinitions";

interface MobileInstruction {
  name: keyof NS;
  category: string;
  description: string;
  code: string;
  parameter?: string;
}

/** Small, UI-only starter catalogue. These examples never call the game API. */
export const mobileInstructions: readonly MobileInstruction[] = [
  {
    name: "hack",
    category: "Piratage",
    description:
      "Tente de voler de l’argent sur un serveur. Nécessite un accès root et un niveau de hacking suffisant.",
    code: 'await ns.hack("n00dles");',
    parameter: "n00dles",
  },
  {
    name: "grow",
    category: "Piratage",
    description: "Augmente l’argent disponible sur le serveur cible. Nécessite un accès root.",
    code: 'await ns.grow("n00dles");',
    parameter: "n00dles",
  },
  {
    name: "weaken",
    category: "Piratage",
    description: "Réduit la sécurité du serveur cible. Nécessite un accès root.",
    code: 'await ns.weaken("n00dles");',
    parameter: "n00dles",
  },
  {
    name: "sleep",
    category: "Utilitaires",
    description: "Suspend le script pendant une durée exprimée en millisecondes : 1000 ms = 1 seconde.",
    code: "await ns.sleep(1000);",
    parameter: "1000",
  },
  {
    name: "tprint",
    category: "Utilitaires",
    description: "Affiche un message dans le terminal. Utilisez ns.print pour écrire dans le journal du script.",
    code: 'ns.tprint("message");',
    parameter: "message",
  },
  {
    name: "scan",
    category: "Réseau",
    description:
      "Renvoie la liste des serveurs directement connectés à la cible. Vous pouvez affecter le résultat à une variable.",
    code: 'ns.scan("home");',
    parameter: "home",
  },
];
