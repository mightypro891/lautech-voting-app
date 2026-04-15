function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
    </div>
  );
}

export default LoadingSpinner;
