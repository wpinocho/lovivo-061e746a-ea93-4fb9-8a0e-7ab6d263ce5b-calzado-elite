import { useSettings } from '@/contexts/SettingsContext'
import { resolvePlatform } from '@/lib/social-icons'

interface SocialLink {
  url: string
  platform: string
}

export const SocialLinks = () => {
  const { socialLinks } = useSettings()

  if (!socialLinks || !Array.isArray(socialLinks) || socialLinks.length === 0) {
    return null
  }

  const validLinks = socialLinks
    .filter((link: SocialLink) => link.url && link.platform)
    .map((link: SocialLink) => ({
      ...link,
      icon: resolvePlatform(link.platform)
    }))
    .filter(link => link.icon) // Only keep links with valid icons

  if (validLinks.length === 0) {
    return null
  }

  return (
    <div className="flex space-x-4">
      {validLinks.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow us on ${link.icon.label}`}
          title={`Follow us on ${link.icon.label}`}
          className="opacity-70 hover:opacity-100 transition-opacity duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50 rounded p-1"
        >
          <img
            src={link.icon.src}
            alt={link.icon.label}
            className="h-5 w-5 filter brightness-0 invert"
          />
        </a>
      ))}
    </div>
  )
}