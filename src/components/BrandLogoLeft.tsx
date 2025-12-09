export const BrandLogoLeft = () => {
  return (
    <a href="/" aria-label="Home" className="ml-2 flex items-center group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center group-hover:bg-primary transition-colors">
          <span className="text-primary group-hover:text-primary-foreground font-bold text-xl transition-colors">P</span>
        </div>
        <span className="text-2xl font-bold text-foreground tracking-tight">PEREGRINO</span>
      </div>
    </a>
  )
}