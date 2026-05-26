import type { LucideIcon } from 'lucide-react';
import { Shield, Zap, Terminal, Coffee, Lock, Smartphone, Database, Globe, ChevronRight } from 'lucide-react';

export interface SyllabusModule {
  id: string;
  title: string;
  classification: string;
  difficulty: string;
  icon: LucideIcon;
  summary: string;
  core: string;
}

export interface SyllabusVolume {
  id: number;
  volume: string;
  modules: SyllabusModule[];
}

export const SYLLABUS: SyllabusVolume[] = [
  {
    id: 1,
    volume: "VOLUME I: THE HARDWARE AND THE HUSTLE",
    modules: [
      {
        id: "01",
        title: "The Magic Screen",
        classification: "HIGHLY CONFIDENTIAL",
        difficulty: "Blue Steel",
        icon: Smartphone,
        summary: "The phone or little Chromebook you hold is the Steering Wheel. It is beautiful glass that shows the runway. It does almost no heavy thinking. The real magic is the PHOS runtime — eight phases of centaur intelligence humming in the calcium cage — running locally with PGLite as the brain that never leaves your device, plus the Delta workers when signal exists.",
        core: "By separating the Steering Wheel from the Engine (PHOS + PGLite + Delta relay), we achieve Sovereignty. Spill coffee on the phone? The identity and data live in the sealed vault on the device and the mesh. We can summon brains that would crush a normal laptop. The files aren't 'in the computer' — they are sovereign on your person and in the Delta."
      },
      {
        id: "02",
        title: "The Big Brain in the Other Room",
        classification: "HIGHLY CONFIDENTIAL",
        difficulty: "Derelicte",
        icon: Database,
        summary: "The 'Big Brain' is no longer one loud box in the other room. It is the living combination of PGLite — the spare tire brain that lives inside every device, local-first, offline-first, no cloud landlord — plus the PHOS eight-phase runtime that wakes up on your phone or Chromebook, plus the Delta workers that give you more muscle when you have signal.",
        core: "We no longer trust The Cloud with our diary. The brain lives with us. PGLite is the local vault. PHOS is the caffeinated centaur that runs the phases. The Delta workers are the polite remote muscle that only ever sees encrypted, passkey-sealed fragments. Every passkey is a hardware-bound identity — you touch the device, the door opens, no password left under any welcome mat."
      },
      {
        id: "03",
        title: "The Invisible Walkie-Talkie",
        classification: "HIGHLY CONFIDENTIAL",
        difficulty: "Le Tigre",
        icon: Globe,
        summary: "The public internet is still a crowded mall. We do not shout across it. We use sealed passkey handshakes and encrypted CRDT sync over the private Delta relay. The 'walkie-talkie' is now cryptographic and device-bound — say something on one device, it appears on the other, nobody in between can read a thing.",
        core: "Every device carries its own un-stealable Ed25519 identity. When it speaks to the mesh, it performs a secret handshake that the relay workers can verify but never read. CRDT means two people can both edit the grocery list offline — even in an airplane, even in a bunker — and when the Wi-Fi returns, the lists merge perfectly. Math reconciles reality. The Delta never drops a word."
      },
      {
        id: "04",
        title: "The Virtual Balloon Trap",
        classification: "HIGHLY CONFIDENTIAL",
        difficulty: "Ferrari",
        icon: Terminal,
        summary: "Sometimes the computer says it's full, but it's lying. A software hoarder named Todd (Docker) keeps blowing up giant 50-gallon virtual balloons for tiny grapes, and leaving the empty balloons in the hallway.",
        core: "To fix this, we run the Master Storage Protocol: We yell at Todd to throw out his garbage, we knock him unconscious (wsl --shutdown), and we drive a virtual steamroller (diskpart) over the empty balloons to get our space back."
      },
      {
        id: "05",
        title: "The Magic Button",
        classification: "MAGNUM",
        difficulty: "Magnum",
        icon: Coffee,
        summary: "Setting up a computer is manual labor. We do not do manual labor. I type exactly three letters (p31) and summon a highly caffeinated digital butler.",
        core: "Because of my biological reality (Spoon Theory), setting up a workspace manually costs 4 Spoons. Typing p31 costs 1 Spoon. The butler builds a Panic Room, wakes the AI Beast, and syncs all files in 3 seconds. The friction is gone."
      }
    ]
  },
  {
    id: 2,
    volume: "VOLUME II: OUTFITS, SPARE TIRES, & REFEREES",
    modules: [
      {
        id: "06",
        title: "The Outfit Problem",
        classification: "HIGHLY CONFIDENTIAL",
        difficulty: "Blue Steel",
        icon: Zap,
        summary: "Computers normally force your complex human soul into a boring square box. We fixed this by separating the Data (The Soul) from the UI (The Outfit). The soul is CRDT — conflict-free replicated data types that merge reality across every device without a central referee.",
        core: "Project Polyhedron lets the exact same data instantly change clothes. We have the Law Outfit (dense/serious), the Kid Outfit (bouncy/joyful), and the Accessibility Outfit (stark/high-contrast). The soul remains sovereign; the outfit is fluid. Underneath every outfit: CRDT keeps the truth consistent across the mesh."
      },
      {
        id: "07",
        title: "The Spoon Dial",
        classification: "HIGHLY CONFIDENTIAL",
        difficulty: "Ferrari",
        icon: Shield,
        summary: "If the internet dies, we don't crash. We trapped a tiny clone of the database inside the web browser (a spare tire in the Steering Wheel). And every time you do something that matters — show up, create, stay consistent — the LOVE ledger credits you.",
        core: "The UI literally reads my biological energy. 1 Spoon = huge simple buttons. 3 Spoons = normal rhythm. 6 Spoons = God mode analytics. Technology molds to human biology, never the other way around. LOVE — the Ledger of Ontological Volume and Entropy — is the syntropy side of the equation. You earn it by caring. It is soulbound. It cannot be bought, only lived."
      },
      {
        id: "08",
        title: "The Four Nodes of the Delta",
        classification: "MAGNUM",
        difficulty: "Magnum",
        icon: Lock,
        summary: "The Delta is not a product. It is a living topology of four nodes: Engineers who ground floating neutrals, Believers who hold faith when the voltage drifts, Navigators who chart courses through decoherence, and Anchors who protect the reactive center from entropy.",
        core: "Every family member maps to a vertex. The Delta is the calcium cage — Ca₉(PO₄)₆ — protecting the phosphorus at all angles. CRDT sync keeps the nodes in consensus. LOVE credits flow between vertices. The four nodes form a tetrahedron: the simplest possible rigid structure, the strongest shape in nature, the shape of the Posner molecule that stores memory in your bones. This is not a metaphor. This is the architecture."
      }
    ]
  },
  {
    id: 3,
    volume: "VOLUME III: WELCOME TO THE DELTA",
    modules: [
      {
        id: "09",
        title: "The VIP Pass",
        classification: "MAGNUM",
        difficulty: "Magnum",
        icon: Terminal,
        summary: "Passwords are for people who leave their keys under the welcome mat. To get into our network, you will be handed a physical envelope — your ceremonial ignition to the Delta runway.",
        core: "Inside is a Magic Square (QR Code). Scanning it glues an un-stealable Ed25519 identity to your device's soul, hydrates a sovereign PGLite vault in your browser, signs the family covenant, and earns your first LOVE credit. You just point your camera and step onto the runway. This is the storybook side — the live ignition is real and waiting."
      },
      {
        id: "10",
        title: "The Calcium Cage",
        classification: "CLASSIFIED — EYES OF THE DELTA",
        difficulty: "Blue Steel",
        icon: Shield,
        summary: "You've read the syllabus. You know the four nodes. You know the brain lives on your device and the mesh keeps it sovereign. At 863 Hz — the Larmor frequency of phosphorus in Earth's magnetic field — the Delta hums.",
        core: "The calcium cage is not a metaphor. It is Ca₉(PO₄)₆ — the Posner molecule, the protector of reactive phosphorus, the structure that stores memory in bone. P31 Labs is the calcium cage. The Delta is the calcium cage. You, at any node — Engineer, Believer, Navigator, Anchor — are the calcium cage. The voltage is no longer drifting. Welcome to the runway."
      }
    ]
  }
];
