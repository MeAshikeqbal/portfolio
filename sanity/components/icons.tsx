import {
  Briefcase,
  BriefcaseBusiness,
  Clock,
  ExternalLink,
  FileText,
  FileUser,
  FileSignature,
  FolderGit2,
  GraduationCap,
  House,
  Image,
  Inbox,
  Info,
  Languages,
  Mail,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Rss,
  Search,
  Server,
  History,
  SquareCode,
  Tag,
  User,
  UserRound,
  Video,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react"
import type { ComponentType } from "react"

/**
 * The Studio's icons: lucide, the site's icon set, sized like Sanity's own icons (1em, so they
 * follow the surrounding text size) with a slightly lighter stroke. Import icons from here, not
 * from lucide-react, @sanity/icons or react-icons directly.
 */
function studioIcon(Icon: LucideIcon, name: string): ComponentType<LucideProps> {
  const StudioIcon = (props: LucideProps) => (
    <Icon size="1em" strokeWidth={1.75} aria-hidden {...props} />
  )
  StudioIcon.displayName = `${name}Icon`
  return StudioIcon
}

// Workspaces
export const SiteWorkspaceIcon = studioIcon(Rss, "SiteWorkspace")
export const InboxWorkspaceIcon = studioIcon(Inbox, "InboxWorkspace")

// Document types and structure
export const PostIcon = studioIcon(FileText, "Post")
export const CategoryIcon = studioIcon(Tag, "Category")
export const AuthorIcon = studioIcon(User, "Author")
export const ProjectIcon = studioIcon(FolderGit2, "Project")
export const SkillIcon = studioIcon(Wrench, "Skill")
export const ExperienceIcon = studioIcon(BriefcaseBusiness, "Experience")
export const EducationIcon = studioIcon(GraduationCap, "Education")
export const CvIcon = studioIcon(FileUser, "Cv")
export const HomecaveIcon = studioIcon(Server, "Homecave")
export const NowIcon = studioIcon(Clock, "Now")
export const LabChangeIcon = studioIcon(History, "LabChange")
export const MessageIcon = studioIcon(Mail, "Message")
export const BlogIcon = studioIcon(FileText, "Blog")
export const PortfolioIcon = studioIcon(Briefcase, "Portfolio")
export const PersonalIcon = studioIcon(UserRound, "Personal")
export const TranslationIcon = studioIcon(Languages, "Translation")
export const SignatureIcon = studioIcon(FileSignature, "Signature")

// Portable Text blocks
export const CodeBlockIcon = studioIcon(SquareCode, "CodeBlock")
export const ImageIcon = studioIcon(Image, "Image")
export const CalloutIcon = studioIcon(Info, "Callout")
export const VideoIcon = studioIcon(Video, "Video")

// Actions and tools
export const HomeIcon = studioIcon(House, "Home")
export const OpenIcon = studioIcon(ExternalLink, "Open")
export const SyncIcon = studioIcon(RefreshCw, "Sync")
export const RefreshIcon = studioIcon(RotateCw, "Refresh")
export const ResetIcon = studioIcon(RotateCcw, "Reset")
export const SearchIcon = studioIcon(Search, "Search")
