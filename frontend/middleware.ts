import { NextRequest, NextResponse } from 'next/server'

// Route configuration
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password'] as const
const PROTECTED_ROUTES = ['/dashboard', '/users', '/admin'] as const
const AUTH_ROUTES = ['/login', '/register'] as const

// Constants
const AUTH_COOKIE_NAME = 'authToken'
const DEFAULT_REDIRECT_PATH = '/dashboard'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check authentication status
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const isAuthenticated = Boolean(authToken)
  
  // Determine route types
  const isAuthRoute = AUTH_ROUTES.includes(pathname as any)
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  
  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL(DEFAULT_REDIRECT_PATH, request.url))
  }
  
  // Redirect unauthenticated users from protected routes to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Allow request to continue
  return NextResponse.next()
}

/**
 * Middleware configuration
 * Excludes API routes, static files, and Next.js internal routes
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}