export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">OH</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Orozco Homes</h1>
            <p className="text-xs text-gray-500 leading-none mt-0.5">Remodel Planner</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 hidden sm:block">
          Ferguson · Home Depot · Floor &amp; Decor · and more
        </span>
      </div>
    </header>
  );
}
