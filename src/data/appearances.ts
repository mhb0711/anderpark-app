import beaverImg from '../assets/pets/beaver.png';
import octopusImg from '../assets/pets/octopus.png';
import owlImg from '../assets/pets/owl.png';
import lionCubImg from '../assets/pets/lion-cub.png';
import wolfImg from '../assets/pets/wolf.png';
import dogImg from '../assets/pets/dog.png';
import catImg from '../assets/pets/cat.png';
import tigerImg from '../assets/pets/tiger.png';
import bearCubImg from '../assets/pets/bear-cub.png';
import mouseImg from '../assets/pets/mouse.png';
import turtleImg from '../assets/pets/turtle.png';
import cowImg from '../assets/pets/cow.png';
import pandaImg from '../assets/pets/panda.png';
import foxImg from '../assets/pets/fox.png';
import crabImg from '../assets/pets/crab.png';
import ponyImg from '../assets/pets/pony.png';
import ferretImg from '../assets/pets/ferret.png';
import crocImg from '../assets/pets/croc.png';
import hamsterImg from '../assets/pets/hamster.png';
import deerImg from '../assets/pets/deer.png';
import zebraImg from '../assets/pets/zebra.png';
import hippoImg from '../assets/pets/hippo.png';
import giraffeImg from '../assets/pets/giraffe.png';
import pigImg from '../assets/pets/pig.png';
import duckImg from '../assets/pets/duck.png';

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
    image: lionCubImg,
    tagline: 'Practicing their roar for later.',
    colorFilter: 'sepia(1) saturate(3) hue-rotate(5deg) brightness(1.05)',
  },
  {
    id: 'wolf',
    name: 'Wolf',
    image: wolfImg,
    tagline: 'Runs with the pack, thinks alone.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(200deg) brightness(0.9)',
  },
  {
    id: 'dog',
    name: 'Golden Retriever',
    image: dogImg,
    tagline: "Everyone's best friend, instantly.",
    colorFilter: 'sepia(1) saturate(3) hue-rotate(30deg) brightness(1.05)',
  },
  {
    id: 'cat',
    name: 'Cat',
    image: catImg,
    tagline: 'Supervises everything, helps with nothing.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(15deg) brightness(1)',
  },
  {
    id: 'tiger',
    name: 'Tiger',
    image: tigerImg,
    tagline: "Quiet until it isn't.",
    colorFilter: 'sepia(1) saturate(3.5) hue-rotate(10deg) brightness(1)',
  },
  {
    id: 'bear-cub',
    name: 'Bear Cub',
    image: bearCubImg,
    tagline: 'Naps hard, plays harder.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(-10deg) brightness(0.95)',
  },
  {
    id: 'mouse',
    name: 'Mouse',
    image: mouseImg,
    tagline: 'Small, quick, surprisingly organized.',
    colorFilter: 'sepia(1) saturate(2) hue-rotate(-5deg) brightness(1.05)',
  },
  {
    id: 'turtle',
    name: 'Turtle',
    image: turtleImg,
    tagline: 'Slow start, never stops.',
    colorFilter: 'sepia(1) saturate(3) hue-rotate(90deg) brightness(0.95)',
  },
  {
    id: 'cow',
    name: 'Cow',
    image: cowImg,
    tagline: 'Unbothered, and steady about it.',
    colorFilter: 'sepia(1) saturate(2) hue-rotate(-20deg) brightness(1)',
  },
  {
    id: 'panda',
    name: 'Panda',
    image: pandaImg,
    tagline: 'Chews on problems slowly, gets there.',
    colorFilter: 'sepia(1) saturate(1.5) hue-rotate(0deg) brightness(1)',
  },
  {
    id: 'fox',
    name: 'Fox',
    image: foxImg,
    tagline: 'Clever enough to find a shortcut.',
    colorFilter: 'sepia(1) saturate(3.5) hue-rotate(5deg) brightness(1.05)',
  },
  {
    id: 'crab',
    name: 'Crab',
    image: crabImg,
    tagline: 'Sidesteps drama, still gets it done.',
    colorFilter: 'sepia(1) saturate(3) hue-rotate(-30deg) brightness(1)',
  },
  {
    id: 'pony',
    name: 'Pony',
    image: ponyImg,
    tagline: 'Trots along at their own steady pace.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(260deg) brightness(1)',
  },
  {
    id: 'ferret',
    name: 'Ferret',
    image: ferretImg,
    tagline: 'Wriggles into every open task.',
    colorFilter: 'sepia(1) saturate(2) hue-rotate(-15deg) brightness(0.95)',
  },
  {
    id: 'croc',
    name: 'Crocodile',
    image: crocImg,
    tagline: 'Cool, patient, always gets there.',
    colorFilter: 'sepia(1) saturate(3) hue-rotate(90deg) brightness(0.9)',
  },
  {
    id: 'hamster',
    name: 'Hamster',
    image: hamsterImg,
    tagline: 'Stashes little wins for later.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(10deg) brightness(1.05)',
  },
  {
    id: 'deer',
    name: 'Deer',
    image: deerImg,
    tagline: 'Alert, graceful, quick on their feet.',
    colorFilter: 'sepia(1) saturate(2) hue-rotate(-5deg) brightness(1)',
  },
  {
    id: 'zebra',
    name: 'Zebra',
    image: zebraImg,
    tagline: 'Stands out in a crowd, on purpose.',
    colorFilter: 'sepia(1) saturate(1.5) hue-rotate(0deg) brightness(1)',
  },
  {
    id: 'hippo',
    name: 'Hippo',
    image: hippoImg,
    tagline: 'Bigger plans than they let on.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(180deg) brightness(0.9)',
  },
  {
    id: 'giraffe',
    name: 'Giraffe',
    image: giraffeImg,
    tagline: 'Keeps an eye on the bigger picture.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(35deg) brightness(1.05)',
  },
  {
    id: 'pig',
    name: 'Pig',
    image: pigImg,
    tagline: 'Rolls up their sleeves, no complaints.',
    colorFilter: 'sepia(1) saturate(2) hue-rotate(300deg) brightness(1.05)',
  },
  {
    id: 'duck',
    name: 'Duck',
    image: duckImg,
    tagline: 'Calm on the surface, paddling hard underneath.',
    colorFilter: 'sepia(1) saturate(2.5) hue-rotate(15deg) brightness(1)',
  },
];

export function getAppearance(id: string): AppearanceOption {
  const appearance = APPEARANCES.find((a) => a.id === id);
  if (!appearance) throw new Error(`Unknown appearance: ${id}`);
  return appearance;
}
