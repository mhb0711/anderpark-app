import img01Onboarding from '../assets/tutorial/01-onboarding.png';
import img02NeedsGoals from '../assets/tutorial/02-needs-goals.png';
import img03LogTask from '../assets/tutorial/03-log-task.png';
import img04Reward from '../assets/tutorial/04-reward.png';
import img05Shop from '../assets/tutorial/05-shop.png';
import img06Settings from '../assets/tutorial/06-settings.png';
import img07ActivityLog from '../assets/tutorial/07-activity-log.png';
import img08TaskBoard from '../assets/tutorial/08-task-board.png';
import img09Friends from '../assets/tutorial/09-friends.png';
import img10Games from '../assets/tutorial/10-games.png';
import img11Restart from '../assets/tutorial/11-restart.png';

interface Props {
  onClose: () => void;
}

interface Section {
  title: string;
  body: string;
  image: string;
  alt: string;
}

// Screenshots of the actual app, not mockups — recapture them (see
// scratchpad workflow in past sessions, or just retake with Playwright)
// whenever a screen here changes shape, so this never goes stale.
const SECTIONS: Section[] = [
  {
    title: '1. Adopt your pet',
    body: "Pick one of 24 species and give them a name. This is the one character you'll be keeping alive — no swapping later.",
    image: img01Onboarding,
    alt: 'Character creation screen with a grid of pet species to choose from',
  },
  {
    title: '2. Needs & goals',
    body: 'Each need — Food, Water, Shelter, Weather, Rest, Health — is tied to a goal you set at setup, with tasks that restore it when you complete them.',
    image: img02NeedsGoals,
    alt: "A character's detail view showing need bars, goals, and tasks",
  },
  {
    title: '3. Log a task',
    body: 'Tap the + next to a task. If task notes are turned on in Settings, you\'ll be asked what you actually did before it counts.',
    image: img03LogTask,
    alt: 'A task expanded into a note field asking what you actually did',
  },
  {
    title: '4. Streak, coins & XP',
    body: "Logging a task updates your daily streak, earns park coins, and adds XP toward your pet's next level — all visible immediately.",
    image: img04Reward,
    alt: 'The detail view right after logging a task, showing an updated streak and XP bar',
  },
  {
    title: '5. The Shop',
    body: 'Spend coins on housing, comfort items, and more to decorate the park. Higher tiers of each line are upgraded from inside the park.',
    image: img05Shop,
    alt: 'The Shop screen listing housing and comfort items with coin prices',
  },
  {
    title: '6. Settings',
    body: 'Sound effects and music volume, Mono/Color mode, whether task notes are required, and quick links to everything else in this list.',
    image: img06Settings,
    alt: 'The Settings dropdown panel with sound, music, and color mode controls',
  },
  {
    title: '7. Activity Log',
    body: "Every task you've ever logged, grouped by day, with the note you wrote and the reward it earned.",
    image: img07ActivityLog,
    alt: 'The Activity Log showing a logged task with its note and timestamp',
  },
  {
    title: '8. Task Board',
    body: 'Publish one of your own tasks so others can copy it, or grab one someone else already shared straight into your goals.',
    image: img08TaskBoard,
    alt: 'The Task Board showing shareable tasks grouped by need',
  },
  {
    title: '9. Friends',
    body: 'Claim a username, add friends by theirs, and see a shared leaderboard by level and streak.',
    image: img09Friends,
    alt: 'The Friends screen prompting to claim a username',
  },
  {
    title: '10. Minigames',
    body: 'Hyena Defense and Berry Berry Chase, both reachable from the 🎮 button — full coin reward the first play each day, a smaller top-up after.',
    image: img10Games,
    alt: 'The Games menu listing Hyena Defense and Berry Berry Chase',
  },
  {
    title: '11. Restart AnderPark',
    body: 'A full reset, tucked at the bottom of Settings — deletes your pet, park, and all progress, with a confirmation first so it can\'t happen by accident.',
    image: img11Restart,
    alt: 'A confirmation dialog before restarting the app',
  },
];

export function TutorialModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold text-emerald-900">Tutorial</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>
        <p className="mb-5 text-xs text-emerald-500">
          Everything AnderPark can do right now, with real screenshots from the app itself.
        </p>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-1.5 text-sm font-bold text-emerald-900">{section.title}</h3>
              <p className="mb-2 text-sm text-emerald-700">{section.body}</p>
              <img
                src={section.image}
                alt={section.alt}
                className="w-full rounded-xl border border-emerald-100"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
