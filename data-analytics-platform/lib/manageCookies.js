import JSCookie from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from 'lwp-shared/constants'

const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 'localhost'

const isSecureCookie = () => process.env.NEXT_PUBLIC_LWP_ENV !== 'local'

// Use Lax so cookies are sent on top-level GET navigations (e.g., links from email clients).
const defaultCookieOptions = {
  expires: 90,
  sameSite: 'Lax',
  secure: isSecureCookie(),
  path: '/',
  domain,
}

function removeCookie(key, options) {
  return JSCookie.remove(key, { ...defaultCookieOptions, ...options })
}

function clearCookiesOnly() {
  removeCookie(ACCESS_TOKEN_COOKIE)
  removeCookie(REFRESH_TOKEN_COOKIE)
}

function getJwtDecoded(token) {
  try {
    return jwtDecode(token)
  } catch (error) {
    return null
  }
}

function isTokenExpired(expiration) {
  return Date.now() >= expiration * 1000
}

function setCookie(key, value, options) {
  const opts = { ...defaultCookieOptions, ...options }

  return JSCookie.set(key, value, opts)
}

function getCookie(key) {
  return JSCookie.get(key)
}

export {
  clearCookiesOnly,
  isTokenExpired,
  getJwtDecoded,
  setCookie,
  getCookie,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
}
