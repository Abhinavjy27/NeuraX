import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Play, Pause, Mail, ArrowRight, Menu, ChevronDown, Sun, Moon, Volume2, VolumeX } from 'lucide-react';

interface NavbarHeroProps {
  brandName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroDescription?: string;
  videoUrl?: string;
  bgVideoUrl?: string;
  emailPlaceholder?: string;
}

const NavbarHero: React.FC<NavbarHeroProps> = ({
  brandName = "NeuraX",
  heroTitle = "Innovation Meets Simplicity",
  heroDescription = "Discover cutting-edge solutions designed for the modern digital landscape.",
  videoUrl = "/bg-video.mp4",
  bgVideoUrl = "/bg-video.mp4",
  emailPlaceholder = "enter@email.com"
}) => {
  const [email, setEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEmailSubmit = () => {
    console.log('Email submitted:', email);
  };

  const toggleDropdown = (dropdownName: string) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const toggleVideoPlayback = () => {
    if (bgVideoRef.current) {
      if (isVideoPlaying) {
        bgVideoRef.current.pause();
        setIsVideoPlaying(false);
      } else {
        bgVideoRef.current.play();
        setIsVideoPlaying(true);
      }
    }
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (bgVideoRef.current) {
      bgVideoRef.current.muted = !isVideoMuted;
    }
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
    }
    setIsVideoMuted(!isVideoMuted);
  };

  const themeToggle = !mounted ? (
    <div className="w-10 h-10" />
  ) : (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="bg-muted/80 backdrop-blur-md hover:bg-border flex-shrink-0 p-2.5 rounded-full transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon className="h-5 w-5 text-foreground" /> : <Sun className="h-5 w-5 text-foreground" />}
    </button>
  );

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background/80">
      {/* --- Background Video Layer (Pushed to back, uncropped with object-contain) --- */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-black/95 flex items-center justify-center pointer-events-none">
        <video
          ref={bgVideoRef}
          src={bgVideoUrl}
          autoPlay
          loop
          muted={isVideoMuted}
          playsInline
          className="w-full h-full object-contain"
        />
        {/* Semi-transparent backdrop overlay for readability */}
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px]" />
      </div>

      {/* --- Foreground UI Layer --- */}
      <main className="relative z-10 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* --- Navbar --- */}
        <div className="py-2 relative z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a href="#" className="font-bold text-2xl pb-1 text-foreground cursor-pointer flex-shrink-0">
              {brandName}
            </a>
            <nav className="hidden lg:flex text-muted-foreground font-medium">
              <ul className="flex items-center space-x-2">
                <li><a href="#" className="hover:text-foreground px-3 py-2 text-sm transition-colors rounded-lg">About</a></li>
                <li className="relative">
                  <button onClick={() => toggleDropdown('desktop-resources')} className="flex items-center hover:text-foreground px-3 py-2 text-sm transition-colors rounded-lg">
                    Resources<ChevronDown className={`h-4 w-4 ml-1 transition-transform ${openDropdown === 'desktop-resources' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'desktop-resources' && (
                    <ul className="absolute top-full left-0 mt-2 p-2 bg-card/90 backdrop-blur-lg border border-border shadow-lg rounded-xl z-20 w-48">
                      <li><a href="#" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">Submenu 1</a></li>
                      <li><a href="#" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">Submenu 2</a></li>
                    </ul>
                  )}
                </li>
                <li><a href="#" className="hover:text-foreground px-3 py-2 text-sm transition-colors rounded-lg">Blog</a></li>
                <li className="relative">
                  <button onClick={() => toggleDropdown('desktop-pricing')} className="flex items-center hover:text-foreground px-3 py-2 text-sm transition-colors rounded-lg">
                    Plans & Pricing<ChevronDown className={`h-4 w-4 ml-1 transition-transform ${openDropdown === 'desktop-pricing' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'desktop-pricing' && (
                    <ul className="absolute top-full left-0 mt-2 p-2 bg-card/90 backdrop-blur-lg border border-border shadow-lg rounded-xl z-20 w-48">
                      <li><a href="#" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">Plan A</a></li>
                      <li><a href="#" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">Plan B</a></li>
                    </ul>
                  )}
                </li>
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3">
              <a href="#" className="text-foreground hover:text-muted-foreground cursor-pointer py-2 px-4 text-sm capitalize font-medium transition-colors rounded-xl">Login</a>
              <button className="bg-foreground hover:bg-muted-foreground text-background py-2.5 px-5 text-sm rounded-xl capitalize font-medium transition-colors flex items-center gap-2">
                Get Started<ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {themeToggle}
            <div className="lg:hidden relative">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="bg-transparent hover:bg-muted border-none p-2 rounded-xl transition-colors">
                <Menu className="h-6 w-6" />
              </button>
              {isMobileMenuOpen && (
                <ul className="absolute top-full right-0 mt-2 p-2 shadow-lg bg-card/90 backdrop-blur-lg border border-border rounded-xl w-56 z-30">
                  <li><a href="#" className="block px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">About</a></li>
                  <li><button onClick={() => toggleDropdown('mobile-resources')} className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">
                      Resources<ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'mobile-resources' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'mobile-resources' && (<ul className="ml-4 mt-1 border-l border-border pl-3">
                      <li><a href="#" className="block px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg">Submenu 1</a></li>
                      <li><a href="#" className="block px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg">Submenu 2</a></li>
                  </ul>)}</li>
                  <li><a href="#" className="block px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">Blog</a></li>
                  <li><button onClick={() => toggleDropdown('mobile-pricing')} className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">
                      Plans & Pricing<ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'mobile-pricing' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'mobile-pricing' && (<ul className="ml-4 mt-1 border-l border-border pl-3">
                      <li><a href="#" className="block px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg">Plan A</a></li>
                      <li><a href="#" className="block px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg">Plan B</a></li>
                  </ul>)}</li>
                  <li className="border-t border-border mt-2 pt-2 space-y-2">
                    <a href="#" className="block w-full text-center px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">Login</a>
                    <button className="w-full bg-foreground text-background hover:bg-muted-foreground px-3 py-2.5 text-sm rounded-lg flex items-center justify-center gap-2 font-medium">
                      Get Started<ArrowRight className="h-4 w-4" />
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* --- Hero Section --- */}
        <div className="pt-4 pb-10 sm:pt-6 sm:pb-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-5xl text-foreground font-bold tracking-tight">{heroTitle}</h1>
            <p className="mt-6 text-lg text-muted-foreground">{heroDescription}</p>
            <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <input type="email" placeholder={emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full max-w-xs bg-muted/80 backdrop-blur-md border border-border text-foreground placeholder-muted-foreground font-medium pl-10 pr-4 py-2 text-sm sm:pl-11 sm:py-3 sm:text-base rounded-full focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button onClick={handleEmailSubmit} className="bg-foreground hover:bg-muted-foreground text-background px-5 py-2 text-sm sm:px-6 sm:py-3 sm:text-base rounded-full normal-case font-medium transition-colors flex items-center gap-2 shadow-md">
                Join Now<ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* --- Video Showcase Container (Uncropped MP4 display) --- */}
        <header className="relative w-full aspect-video rounded-3xl overflow-hidden border border-border/40 shadow-2xl bg-black/60 backdrop-blur-md flex items-center justify-center">
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            loop
            muted={isVideoMuted}
            playsInline
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-5 right-5 z-20 flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all duration-200 shadow-lg text-white"
              title={isVideoMuted ? "Unmute" : "Mute"}
            >
              {isVideoMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleVideoPlayback}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all duration-200 shadow-lg text-white"
              title={isVideoPlaying ? "Pause Video" : "Play Video"}
            >
              {isVideoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
          </div>
        </header>
      </main>
    </div>
  );
};

export { NavbarHero };

