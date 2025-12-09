export const BrandLogoLeft = () => {
  return (
    <a href="/" aria-label="Home" className="ml-2 flex items-center">
      {/* TEMPLATE: Replace /logo.svg with your brand logo */}
      <img 
        src="/logo.svg" 
        alt="Logo"
        className="h-8 w-auto object-contain" 
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.innerHTML = '<span class="text-xl font-bold text-black">YourBrand</span>';
        }}
      />
    </a>
  )
}
