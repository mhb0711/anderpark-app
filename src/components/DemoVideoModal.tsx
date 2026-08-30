import demoVideo from '../assets/demo.mp4';

interface Props {
  onClose: () => void;
}

export function DemoVideoModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pb-1 pt-6">
          <h2 className="text-xl font-bold text-emerald-900">Demo Video</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>
        <p className="px-6 pb-4 text-xs text-emerald-500">A quick walkthrough of AnderPark, start to finish.</p>
        <video controls playsInline preload="metadata" className="w-full bg-black">
          <source src={demoVideo} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
