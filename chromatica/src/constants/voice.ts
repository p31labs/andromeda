/**
 * Voice Command Constants
 */

export interface VoiceCommandConfig {
  phrases: string[];
  action: string;
  requiresConfirmation: boolean;
  frequency: number;
  category: 'creative' | 'system' | 'health';
  description: string;
}

export const VOICE_COMMANDS: VoiceCommandConfig[] = [
  {
    phrases: ['create new', 'new project', 'start new'],
    action: 'CREATE_PROJECT',
    requiresConfirmation: false,
    frequency: 440,
    category: 'creative',
    description: 'Create a new project'
  },
  {
    phrases: ['add color', 'pick color', 'new color'],
    action: 'OPEN_COLOR_PICKER',
    requiresConfirmation: false,
    frequency: 349,
    category: 'creative',
    description: 'Open the color picker'
  },
  {
    phrases: ['save project', 'save work', 'save now'],
    action: 'SAVE_PROJECT',
    requiresConfirmation: false,
    frequency: 523,
    category: 'system',
    description: 'Save current project'
  },
  {
    phrases: ['open recent', 'recent projects', 'show recent'],
    action: 'SHOW_RECENT',
    requiresConfirmation: false,
    frequency: 330,
    category: 'system',
    description: 'Show recent projects'
  },
  {
    phrases: ['duplicate', 'copy this', 'make copy'],
    action: 'DUPLICATE_PROJECT',
    requiresConfirmation: true,
    frequency: 294,
    category: 'creative',
    description: 'Duplicate current project'
  },
  {
    phrases: ['delete this', 'remove this', 'delete project'],
    action: 'DELETE_PROJECT',
    requiresConfirmation: true,
    frequency: 200,
    category: 'system',
    description: 'Delete current project'
  },
  {
    phrases: ['rest now', 'take break', 'start rest'],
    action: 'START_REST',
    requiresConfirmation: false,
    frequency: 262,
    category: 'health',
    description: 'Start a rest break'
  },
  {
    phrases: ['voice help', 'help me', 'what commands'],
    action: 'SHOW_HELP',
    requiresConfirmation: false,
    frequency: 392,
    category: 'system',
    description: 'List all voice commands'
  },
  {
    phrases: ['bigger text', 'increase text', 'larger text'],
    action: 'INCREASE_TEXT',
    requiresConfirmation: false,
    frequency: 466,
    category: 'system',
    description: 'Increase font size'
  },
  {
    phrases: ['high contrast', 'dark mode', 'contrast mode'],
    action: 'TOGGLE_CONTRAST',
    requiresConfirmation: false,
    frequency: 311,
    category: 'system',
    description: 'Toggle high contrast mode'
  },
  {
    phrases: ['export png', 'save as image', 'download image'],
    action: 'EXPORT_PNG',
    requiresConfirmation: false,
    frequency: 277,
    category: 'creative',
    description: 'Export as PNG image'
  },
  {
    phrases: ['share project', 'send project', 'get link'],
    action: 'SHARE_PROJECT',
    requiresConfirmation: false,
    frequency: 370,
    category: 'system',
    description: 'Generate share link'
  },
  {
    phrases: ['what color', 'current color', 'say color'],
    action: 'READ_COLOR',
    requiresConfirmation: false,
    frequency: 415,
    category: 'creative',
    description: 'Read current color name'
  },
  {
    phrases: ['undo', 'go back', 'reverse'],
    action: 'UNDO',
    requiresConfirmation: false,
    frequency: 220,
    category: 'system',
    description: 'Undo last action'
  },
  {
    phrases: ['redo', 'go forward', 'restore'],
    action: 'REDO',
    requiresConfirmation: false,
    frequency: 880,
    category: 'system',
    description: 'Redo last action'
  },
  {
    phrases: ['fullscreen', 'full screen', 'expand'],
    action: 'TOGGLE_FULLSCREEN',
    requiresConfirmation: false,
    frequency: 185,
    category: 'system',
    description: 'Toggle fullscreen mode'
  },
  {
    phrases: ['zoom in', 'closer', 'enlarge'],
    action: 'ZOOM_IN',
    requiresConfirmation: false,
    frequency: 554,
    category: 'creative',
    description: 'Zoom in'
  },
  {
    phrases: ['zoom out', 'farther', 'shrink'],
    action: 'ZOOM_OUT',
    requiresConfirmation: false,
    frequency: 138,
    category: 'creative',
    description: 'Zoom out'
  },
  {
    phrases: ['close app', 'exit', 'quit'],
    action: 'CLOSE_APP',
    requiresConfirmation: true,
    frequency: 150,
    category: 'system',
    description: 'Close the application'
  }
];

export const VOICE_RESPONSES: Record<string, string> = {
  CREATE_PROJECT: 'New project created.',
  SAVE_PROJECT: 'Project saved securely.',
  START_REST: 'Rest break started. Stretch gently.',
  EXPORT_PNG: 'Exporting image.',
  UNDO: 'Undo completed.',
  REDO: 'Redo completed.'
};

export const AUDIO_DURATIONS = {
  short: 150,
  medium: 300,
  long: 500
} as const;
