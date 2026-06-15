"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Menu, X, User, LogOut, Shield, Users, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, isAdmin, isApprovedMember, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  const navLinks = [
    { href: '/what-we-believe', label: 'What We Believe' },
    { href: '/events', label: 'Events' },
    { href: '/leadership', label: 'Leadership' },
    { href: '/sermons', label: 'Sermons' },
    { href: '/building-project', label: 'Building Project' },
    { href: '/youth-ministry', label: 'Youth' },
    { href: '/missions', label: 'Missions' },
    { href: '/visit', label: 'Visitors Info' },
  ];

  const isLoggedIn = !!user;
  const showMemberLinks = isApprovedMember;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="bg-white border-b border-[var(--color-gold)]/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-4">
          {/* Logo + Church Name */}
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-full bg-[var(--color-navy)] flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--color-gold)] text-3xl font-serif">✝</span>
            </div>
            <div className="flex flex-col justify-center leading-none">
              <div className="font-semibold text-[var(--color-navy)] text-[19px] tracking-[-0.3px]">First Baptist Church</div>
              <div className="text-[11px] text-[var(--color-stone-light)] mt-1">Pinedale, Wyoming</div>
              <div className="text-[10px] text-[var(--color-gold-dark)] tracking-wider mt-1">The Bible as it is, for men as they are</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium" suppressHydrationWarning>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link text-[var(--color-stone)] hover:text-[var(--color-navy)]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3 ml-4 lg:ml-8" suppressHydrationWarning>
            {/* Give Button - prominent */}
            <Link
              href="/give"
              className="hidden sm:block px-5 py-2.5 bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white rounded-full text-sm font-semibold transition-colors"
            >
              Give
            </Link>

            {/* Auth area - safe for hydration: render same on server/client until mounted.
               On initial render (mounted=false) we always show the public login button so
               server HTML exactly matches the first client render. After mount we reveal
               the real user menu / admin links if the user is authenticated. */}
            {mounted ? (
              isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-gold)]/40 hover:bg-[var(--color-cream)] transition"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:inline max-w-[120px] truncate">
                      {profile?.full_name?.split(' ')[0] || 'Account'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[var(--color-gold)]/20 py-1 text-sm"
                      >
                        <div className="px-4 py-3 border-b">
                          <div className="font-semibold text-[var(--color-navy)]">{profile?.full_name}</div>
                          <div className="text-xs text-[var(--color-stone-light)]">{profile?.email}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-gold-dark)]">
                            {profile?.role === 'admin' ? 'Pastor / Admin' : profile?.role === 'approved' ? 'Member' : 'Pending Approval'}
                          </div>
                        </div>

                        {showMemberLinks && (
                          <>
                            <Link href="/members/directory" className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-cream)]" onClick={() => setShowUserMenu(false)}>
                              <Users className="w-4 h-4" /> Member Directory
                            </Link>
                            <Link href="/prayer-bulletin" className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-cream)]" onClick={() => setShowUserMenu(false)}>
                              <BookOpen className="w-4 h-4" /> Prayer Bulletin
                            </Link>
                            <Link href="/nursery-schedule" className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-cream)]" onClick={() => setShowUserMenu(false)}>
                              Nursery Schedule
                            </Link>
                          </>
                        )}

                        {isAdmin && (
                          <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-cream)] text-[var(--color-navy)]" onClick={() => setShowUserMenu(false)}>
                            <Shield className="w-4 h-4" /> Admin Dashboard
                          </Link>
                        )}

                        <button
                          onClick={async () => {
                            await signOut();
                            setShowUserMenu(false);
                            // Use router for clean navigation if possible, but window.location is fine for full reset
                            window.location.href = '/';
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-red-50 text-red-700 border-t mt-1"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-5 py-2 text-sm font-medium border border-[var(--color-navy)] text-[var(--color-navy)] rounded-full hover:bg-[var(--color-navy)] hover:text-white transition"
                >
                  Member Login
                </Link>
              )
            ) : (
              /* Pre-mount / SSR fallback — identical to the logged-out case so hydration matches */
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-medium border border-[var(--color-navy)] text-[var(--color-navy)] rounded-full hover:bg-[var(--color-navy)] hover:text-white transition"
              >
                Member Login
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-[var(--color-navy)]"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-t bg-white"
          >
            <div className="px-4 py-6 flex flex-col gap-1 text-base">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="py-3 px-2 hover:bg-[var(--color-cream)] rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {showMemberLinks && (
                <>
                  <Link href="/members/directory" className="py-3 px-2 hover:bg-[var(--color-cream)] rounded-lg" onClick={() => setMobileOpen(false)}>Member Directory</Link>
                  <Link href="/prayer-bulletin" className="py-3 px-2 hover:bg-[var(--color-cream)] rounded-lg" onClick={() => setMobileOpen(false)}>
                    Prayer Bulletin
                  </Link>
                  <Link href="/nursery-schedule" className="py-3 px-2 hover:bg-[var(--color-cream)] rounded-lg" onClick={() => setMobileOpen(false)}>
                    Nursery Schedule
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link href="/admin" className="py-3 px-2 text-[var(--color-gold-dark)] font-medium" onClick={() => setMobileOpen(false)}>Admin Dashboard</Link>
              )}

              <div className="pt-3 mt-2 border-t">
                <Link href="/give" className="block w-full text-center py-3 bg-[var(--color-gold)] text-white rounded-full font-semibold" onClick={() => setMobileOpen(false)}>
                  Give Online
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
