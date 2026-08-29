import beaverImg from '../assets/pets/beaver.png';
import octopusImg from '../assets/pets/octopus.png';
import owlImg from '../assets/pets/owl.png';
import { placeholderImage } from './placeholderArt';

export interface AppearanceOption {
  id: string;
  name: string;
  image: string;
  tagline: string;
  // CSS filter applied to the (grayscale) art in color mode — a tint, not real
  // recolored artwork, since we don't have a way to regenerate the source PNGs.
  colorFilter: string;
  // True until a real pixel-art PNG replaces the placeholder emoji card.
  placeholderArt?: boolean;
}

// Purely cosmetic — picked once at character creation, unrelated to needs/goals.
export const APPEARANCES: AppearanceOption[] = [
  {
    id: 'octopus',
    name: 'Octopus',
    image: octopusImg,
    tagline: 'Juggles a dozen things without dropping one.',
    colorFilter: 'sepia(1) saturate(4) hue-rotate(165deg) brightness(0.95)',
  },
  {
    id: 'beaver',
    name: 'Beaver',
    image: beaverImg,
    tagline: 'Always building something.',
    colorFilter: 'sepia(1) saturate(3) hue-rotate(-10deg) brightness(0.95)',
  },
  {
    id: 'owl',
    name: 'Owl',
    image: owlImg,
    tagline: 'Never skips the reading.',
    colorFilter: 'sepia(1) saturate(3) hue-rotate(20deg) brightness(1)',
  },
  {
    id: 'lion-cub',
    name: 'Lion Cub',
    image: placeholderImage('🦁'),
    tagline: 'Practicing their roar for later.',
    colorFilter: 'sepia(1) saturate(3) hue-rotate(5deg) brightness(1.05)',
    placeholderArt: true,
  },
  {
    id: 'wolf',
    name: 'Wolf',
    image: placeholderImage('🐺'),
    tagline: 'Runs with the pack, thinks alone.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(200deg) brightness(0.9)',
    placeholderArt: true,
  },
  {
    id: 'dog',
    name: 'Golden Retriever',
    image: placeholderImage('🐕'),
    tagline: "Everyone's best friend, instantly.",
    colorFilter: 'sepia(1) saturate(3) hue-rotate(30deg) brightness(1.05)',
    placeholderArt: true,
  },
  {
    id: 'cat',
    name: 'Cat',
    image: placeholderImage('🐱'),
    tagline: 'Supervises everything, helps with nothing.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(15deg) brightness(1)',
    placeholderArt: true,
  },
  {
    id: 'tiger',
    name: 'Tiger',
    image: placeholderImage('🐯'),
    tagline: "Quiet until it isn't.",
    colorFilter: 'sepia(1) saturate(3.5) hue-rotate(10deg) brightness(1)',
    placeholderArt: true,
  },
  {
    id: 'bear-cub',
    name: 'Bear Cub',
    image: placeholderImage('🐻'),
    tagline: 'Naps hard, plays harder.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(-10deg) brightness(0.95)',
    placeholderArt: true,
  },
  {
    id: 'parrot',
    name: 'Parrot',
    image: placeholderImage('🦜'),
    tagline: 'Repeats your pep talks back to you.',
    colorFilter: 'sepia(1) saturate(3.5) hue-rotate(100deg) brightness(1.05)',
    placeholderArt: true,
  },
  {
    id: 'mouse',
    name: 'Mouse',
    image: placeholderImage('🐭'),
    tagline: 'Small, quick, surprisingly organized.',
    colorFilter: 'sepia(1) saturate(2) hue-rotate(-5deg) brightness(1.05)',
    placeholderArt: true,
  },
  {
    id: 'turtle',
    name: 'Turtle',
    image: placeholderImage('🐢'),
    tagline: 'Slow start, never stops.',
    colorFilter: 'sepia(1) saturate(3) hue-rotate(90deg) brightness(0.95)',
    placeholderArt: true,
  },
  {
    id: 'monkey',
    name: 'Monkey',
    image: placeholderImage('🐒'),
    tagline: 'Into everything, curious about all of it.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(-15deg) brightness(1)',
    placeholderArt: true,
  },
  {
    id: 'penguin',
    name: 'Penguin',
    image: placeholderImage('🐧'),
    tagline: 'Waddles in, somehow still on time.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(210deg) brightness(0.95)',
    placeholderArt: true,
  },
  {
    id: 'cow',
    name: 'Cow',
    image: placeholderImage('🐮'),
    tagline: 'Unbothered, and steady about it.',
    colorFilter: 'sepia(1) saturate(2) hue-rotate(-20deg) brightness(1)',
    placeholderArt: true,
  },
  {
    id: 'panda',
    name: 'Panda',
    image: placeholderImage('🐼'),
    tagline: 'Chews on problems slowly, gets there.',
    colorFilter: 'sepia(1) saturate(1.5) hue-rotate(0deg) brightness(1)',
    placeholderArt: true,
  },
  {
    id: 'otter',
    name: 'Otter',
    image: placeholderImage('🦦'),
    tagline: 'Makes even chores look like play.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(-8deg) brightness(1)',
    placeholderArt: true,
  },
  {
    id: 'fox',
    name: 'Fox',
    image: placeholderImage('🦊'),
    tagline: 'Clever enough to find a shortcut.',
    colorFilter: 'sepia(1) saturate(3.5) hue-rotate(5deg) brightness(1.05)',
    placeholderArt: true,
  },
];

export function getAppearance(id: string): AppearanceOption {
  const appearance = APPEARANCES.find((a) => a.id === id);
  if (!appearance) throw new Error(`Unknown appearance: ${id}`);
  return appearance;
}
