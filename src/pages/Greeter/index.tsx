import { useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  Skeleton,
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton,
  Paper,
  Box,
  Container,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material'
import {
  SettingsPhone as PhoneIcon,
  PermPhoneMsg as SMSIcon,
  Lock as LockIcon,
  Restore as RestoreIcon,
  VpnKey as KeyIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  ChevronLeft,
  ChevronRight,
  Close as CloseIcon,
} from '@mui/icons-material'
import PhoneEntry from '../../components/PhoneEntry.js'
import AppLogo from '../../components/AppLogo'
import { toast } from 'react-toastify'
import { WalletContext } from '../../WalletContext'
import { UserContext } from '../../UserContext'
import PageLoading from '../../components/PageLoading.js'
import { Utils } from '@bsv/sdk'
import { Link as RouterLink } from 'react-router-dom'
import WalletConfig from '../../components/WalletConfig.js'
import { getAppCatalogApps } from '../../utils/appCatalogCache'
import type { PublishedApp } from '../../utils/appCatalogCache'
import MetanetApp from '../../components/MetanetApp'

// Phone form component to reduce cognitive complexity
const PhoneForm = ({ phone, setPhone, loading, handleSubmitPhone, phoneFieldRef }) => {
  const theme = useTheme();
  return (
    <form onSubmit={handleSubmitPhone}>
      <PhoneEntry
        value={phone}
        onChange={setPhone}
        ref={phoneFieldRef}
        sx={{ width: '100%', mb: 2 }}
      />
      <Button
        variant='contained'
        type='submit'
        disabled={loading || !phone || phone.length < 10}
        fullWidth
        sx={{ mt: 2, borderRadius: theme.shape.borderRadius, textTransform: 'none', py: 1.2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Continue'}
      </Button>
    </form>
  );
};

// Code verification form component
const CodeForm = ({ code, setCode, loading, handleSubmitCode, handleResendCode, codeFieldRef }) => {
  const theme = useTheme();
  return (
    <>
      <form onSubmit={handleSubmitCode}>
        <TextField
          label="6-digit code"
          onChange={(e) => setCode(e.target.value)}
          variant="outlined"
          fullWidth
          disabled={loading}
          slotProps={{
            input: {
              ref: codeFieldRef,
              endAdornment: (
                <InputAdornment position="end">
                  {code.length === 6 && <CheckCircleIcon color='success' />}
                </InputAdornment>
              ),
            }
          }}
          sx={{ 
            mb: 2   
          }}
        />
        <Button
          variant='contained'
          type='submit'
          disabled={loading || code.length !== 6}
          fullWidth
          sx={{ 
            mt: 2,
            borderRadius: theme.shape.borderRadius,
            textTransform: 'none',
            py: 1.2
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Verify Code'}
        </Button>
      </form>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          disabled={loading}
          onClick={handleResendCode}
          size="small"
          color="secondary"
          sx={{ textTransform: 'none' }}
        >
          Resend Code
        </Button>
      </Box>
    </>
  );
};

// Presentation key form component
const PresentationKeyForm = ({ presentationKey, setPresentationKey, loading, handleSubmitPresentationKey, presentationKeyFieldRef }) => {
  const theme = useTheme();
  return (
    <form onSubmit={handleSubmitPresentationKey}>
      <TextField
        label="Presentation Key"
        value={presentationKey}
        onChange={(e) => setPresentationKey(e.target.value)}
        variant="outlined"
        fullWidth
        disabled={loading}
        slotProps={{
          input: { ref: presentationKeyFieldRef }
        }}
        sx={{ mb: 2 }}
      />
      <Button
        variant='contained'
        type='submit'
        disabled={loading || !presentationKey}
        fullWidth
        sx={{
          mt: 2,
          borderRadius: theme.shape.borderRadius,
          textTransform: 'none',
          py: 1.2
        }}
      >
        {loading ? <CircularProgress size={24} /> : 'Continue'}
      </Button>
    </form>
  );
};

// Password form component
const PasswordForm = ({ password, setPassword, confirmPassword, setConfirmPassword, showPassword, setShowPassword, loading, handleSubmitPassword, accountStatus, passwordFieldRef }) => {
  const theme = useTheme();
  return (
    <form onSubmit={handleSubmitPassword}>
      <TextField
        label="Password"
        onChange={(e) => setPassword(e.target.value)}
        type={showPassword ? 'text' : 'password'}
        variant="outlined"
        fullWidth
        disabled={loading}
        slotProps={{
          input: {
            ref: passwordFieldRef,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }
        }}
        sx={{ 
          mb: 2
        }}
      />

      {accountStatus === 'new-user' && (
        <TextField
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type={showPassword ? 'text' : 'password'}
          variant="outlined"
          fullWidth
          disabled={loading}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }
          }}
          sx={{ mb: 2 }}
        />
      )}

      <Button
        variant='contained'
        type='submit'
        disabled={loading || !password || (accountStatus === 'new-user' && !confirmPassword)}
        fullWidth
        sx={{ borderRadius: theme.shape.borderRadius, mt: 2, textTransform: 'none', py: 1.2 }}
      >
        {loading ? <CircularProgress size={24} /> : (accountStatus === 'new-user' ? 'Create Account' : 'Login')}
      </Button>
    </form>
  );
};

// Main Greeter component with reduced complexity
const Greeter: React.FC<any> = ({ history }) => {
  const { managers, configStatus, useWab } = useContext(WalletContext)
  const { appVersion, appName, pageLoaded } = useContext(UserContext)
  const theme = useTheme()

  // Banner/new user state
  const [welcomeUser, setWelcomeUser] = useState(false)
  const [appInfo, setAppinfo] = useState<any | null>(null)
  const [recommendedApps, setRecommendedApps] = useState<PublishedApp[]>([])
  const [recommendedLoading, setRecommendedLoading] = useState<boolean>(false)
  const [devSimulateApp, setDevSimulateApp] = useState<boolean>(false)

  // --- Slider refs/state (auto-rotate + controls) ---
  const railRef = useRef<HTMLDivElement | null>(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const setPausedBoth = useCallback((v: boolean) => { pausedRef.current = v; setPaused(v) }, [])
  const BELT_SPEED_PX_PER_SEC = 100; // belt speed
  const segWidthRef = useRef(0);
  const rAFRef = useRef<number | null>(null);
  const scrollByAmount = useCallback((dir: 'left' | 'right') => {
    const el = railRef.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    const tile = first?.offsetWidth ?? 110
    const gap = 16
    const step = tile + gap
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' })
  }, [])
  const beltItems = useMemo(() => {
    if (!recommendedApps?.length) return [];
    return [...recommendedApps, ...recommendedApps];
  }, [recommendedApps]);
  
useEffect(() => {
  if (appInfo) return; // only run on explore view
  const el = railRef.current;
  if (!el) return;

  // measure one segment (the width of the first half = original list)
  const measure = () => {
    const children = Array.from(el.children) as HTMLElement[];
    const half = Math.floor(children.length / 2);
    if (!half) return;
    const first = children[0];
    const last = children[half - 1];
    segWidthRef.current = (last.offsetLeft + last.offsetWidth) - first.offsetLeft;
  };

  // measure once the DOM is ready
  const id = requestAnimationFrame(measure);

  let last = performance.now();
  const step = (ts: number) => {
    if (!railRef.current) return;
    const dt = Math.min(0.05, (ts - last) / 1000); // clamp dt for stability
    last = ts;

    if (!pausedRef.current && segWidthRef.current > 0) {
      el.scrollLeft += BELT_SPEED_PX_PER_SEC * dt;

      // wrap seamlessly when we pass one segment
      const seg = segWidthRef.current;
      if (el.scrollLeft >= seg) {
        // jump back by exactly one segment with no animation
        const prev = el.style.scrollBehavior;
        el.style.scrollBehavior = 'auto';
        el.scrollLeft -= seg;
        el.style.scrollBehavior = prev || '';
      }
    }
    rAFRef.current = requestAnimationFrame(step);
  };

  rAFRef.current = requestAnimationFrame(step);

  // keep wrapping when user drags/scrolls manually too
  const onScroll = () => {
    const seg = segWidthRef.current;
    if (!seg) return;
    if (el.scrollLeft >= seg) {
      const prev = el.style.scrollBehavior;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft -= seg;
      el.style.scrollBehavior = prev || '';
    } else if (el.scrollLeft < 0) {
      const prev = el.style.scrollBehavior;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft += seg;
      el.style.scrollBehavior = prev || '';
    }
  };
  el.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    cancelAnimationFrame(id);
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    rAFRef.current = null;
    el.removeEventListener('scroll', onScroll);
  };
}, [appInfo, beltItems.length]);

  // Check sessionStorage for 'appinfo' once on mount
  const loadRecommendedApps = useCallback(async () => {
    try {
      setRecommendedLoading(true)
      const apps = await getAppCatalogApps()
      setRecommendedApps(apps) // let the slider overflow naturally
    } catch (err) {
      // ignore errors quietly for greeter suggestions
    } finally {
      setRecommendedLoading(false)
    }
  }, [])

  useEffect(() => {
    try {
      const appinfo = sessionStorage.getItem('appinfo')
      if (appinfo) {
        setWelcomeUser(true)
        setAppinfo(JSON.parse(appinfo))
      } else {
        loadRecommendedApps()
      }
    } catch (err) {
      loadRecommendedApps()
    }
  }, [loadRecommendedApps])

  // Derive selected app display info (domain, icon) for header
  const selectedApp = useMemo(() => {
    const src = (appInfo as any)?.Originator || (appInfo as any)?.redirected_from
    let domain = ''
    if (typeof src === 'string') {
      try { domain = new URL(src).host } catch { domain = '' }
    }
    const name = (appInfo as any)?.name || domain
    const icon = typeof src === 'string' ? src.replace(/\/$/, '') + '/favicon.ico' : undefined
    return { domain: domain || name || '', name, icon }
  }, [appInfo])

  const viewToStepIndex = useWab ? { phone: 0, code: 1, password: 2 } : { presentation: 0, password: 1 }
  const steps = useWab
    ? [
        { label: 'Phone Number', icon: <PhoneIcon />, description: 'Enter your phone number for verification' },
        { label: 'Verification Code', icon: <SMSIcon />, description: 'Enter the code you received via SMS' },
        { label: 'Password', icon: <LockIcon />, description: 'Enter your password' }
      ]
    : [
        { label: 'Presentation Key', icon: <KeyIcon />, description: 'Paste your presentation key' },
        { label: 'Password', icon: <LockIcon />, description: 'Enter your password' }
      ]

  const [step, setStep] = useState(useWab ? 'phone' : 'presentation')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [presentationKey, setPresentationKey] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountStatus, setAccountStatus] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const phoneFieldRef = useRef(null)
  const codeFieldRef = useRef(null)
  const presentationKeyFieldRef = useRef(null)
  const passwordFieldRef = useRef(null)

  const walletManager = managers?.walletManager

  useEffect(() => {
    setStep(useWab ? 'phone' : 'presentation')
  }, [useWab])

  // Step 1: The user enters a phone number, we call manager.startAuth(...)
  const handleSubmitPhone = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletManager) {
      toast.error("Wallet Manager not ready yet.")
      return
    }
    try {
      setLoading(true)
      await walletManager?.startAuth({ phoneNumber: phone })
      setStep('code')
      toast.success('A code has been sent to your phone.')
      // Move focus to code field
      if (codeFieldRef.current) {
        codeFieldRef.current.focus()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to send code")
    } finally {
      setLoading(false)
    }
  }, [walletManager, phone])

  // Step 2: The user enters the OTP code, we call manager.completeAuth(...)
  const handleSubmitCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletManager) {
      toast.error("Wallet Manager not ready yet.")
      return
    }
    try {
      setLoading(true)
      await walletManager.completeAuth({ phoneNumber: phone, otp: code })

      if (walletManager.authenticationFlow === 'new-user') {
        setAccountStatus('new-user')
      } else {
        setAccountStatus('existing-user')
      }

      setStep('password')
      if (passwordFieldRef.current) {
        passwordFieldRef.current.focus()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to verify code")
    } finally {
      setLoading(false)
    }
  }, [walletManager, phone, code])

  // Optional "resend code" that just calls startAuth again
  const handleResendCode = useCallback(async () => {
    if (!walletManager) return
    try {
      setLoading(true)
      await walletManager.startAuth({ phoneNumber: phone })
      toast.success('A new code has been sent to your phone.')
    } catch (e: any) {
      console.error(e)
      toast.error(e.message)
    } finally {
      // small delay to avoid spam
      await new Promise(resolve => setTimeout(resolve, 2000))
      setLoading(false)
    }
  }, [walletManager, phone])

  // Step for manually providing presentation key when not using WAB
  const handleSubmitPresentationKey = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletManager) {
      toast.error('Wallet Manager not ready yet.')
      return
    }
    try {
      setLoading(true)
      await walletManager.providePresentationKey(Utils.toArray(presentationKey, 'hex'))
      if (walletManager.authenticationFlow === 'new-user') {
        setAccountStatus('new-user')
      } else {
        setAccountStatus('existing-user')
      }
      setStep('password')
      if (passwordFieldRef.current) {
        passwordFieldRef.current.focus()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to set presentation key')
    } finally {
      setLoading(false)
    }
  }, [walletManager, presentationKey])

  // Step 3: Provide a password for the final step.
  const handleSubmitPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletManager) {
      toast.error("Wallet Manager not ready yet.")
      return
    }

    setLoading(true)
    try {
      await walletManager.providePassword(password)

      if (walletManager.authenticated) {
        // Save snapshot to local storage
        localStorage.snap = Utils.toBase64(walletManager.saveSnapshot())
        toast.success("Authenticated successfully!")
        history.push('/dashboard/apps')
      } else {
        throw new Error('Authentication failed, maybe password is incorrect?')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [walletManager, password, confirmPassword, accountStatus, history])

  if (!pageLoaded) {
    return <PageLoading />
  }

  // Common tile size based on the 15vh banner height (prevents vertical overflow)
  const tileSize = 'min(1000px, calc(15vh - 16px))'

  return (
    <>
      {/* === APP BAR with auto-rotating movie slider (no overlap with right side) === */}
      <AppBar position="fixed" color="primary" elevation={0} sx={{ height: '15vh' }}>
        <Toolbar disableGutters sx={{ height: '15vh', px: 2, overflow: 'hidden', '--banner-h': '15vh', }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '10fr auto', // main content | right button
              alignItems: 'center',
              columnGap: 5,
              width: '100%',
              height: '100%',
              minWidth: 0
            }}
          >
            {/* MAIN CONTENT */}
            {appInfo ? (
              // appInfo exists: single tile + title/message (LEFT-ALIGNED, VERT-CENTERED)
              <Box
                sx={{
                  display: 'grid',
                  gridAutoFlow: 'column',
                  gridAutoColumns: 'auto 1fr',
                  alignItems: 'center',
                  columnGap: 2,
                  minWidth: 0,
                  height: '100%',
                }}
              >
                {/* Tile to match explore vibe */}
                <Box
                  sx={{
                    width: tileSize,
                    height: tileSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                    overflow: 'hidden',
                    '& img, & svg': { display: 'block', maxHeight: '100%', width: 'auto', objectFit: 'contain' }
                  }}
                >
                  <MetanetApp
                    appName={''}
                    domain={''}
                    iconImageUrl={selectedApp.icon || (selectedApp.domain ? `https://${selectedApp.domain}/favicon.ico` : undefined)}
                    clickable={false}
                  />
                </Box>

                {/* Title + message */}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                  variant="h4"
                  sx={{
                    color: 'inherit',
                    fontWeight: 700,
                    // min 1.1rem, fluid center = 18% of banner height, max 1.9rem
                    fontSize: 'clamp(1.1rem, calc(var(--banner-h) * 0.18), 1.9rem)',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'left',
                  }}
                  >
                  {appInfo?.name}
                  </Typography>

                  {(appInfo?.message || (appInfo as any)?.custom_message) && (
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'inherit',
                        opacity: 0.9,
                        // min 0.9rem, fluid center = 12% of banner height, max 1.2rem
                        fontSize: 'clamp(0.9rem, calc(var(--banner-h) * 0.12), 1.2rem)',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3, // show up to 3 lines in the 15vh banner
                        overflow: 'hidden',
                        textAlign: 'left',
                      }}
                    >
                      {appInfo?.message || (appInfo as any)?.custom_message}
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              // no appInfo: MOVIE SLIDER (scroll-snap, auto-rotate, touch/trackpad friendly)
              <Box
              sx={{
                height: '100%',
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0,1fr) auto', // [left btn] [rail] [right btn]
                alignItems: 'center',
                columnGap: 1,
                minWidth: 0,
                zIndex: 0,
              }}
              onMouseEnter={() => setPausedBoth?.(true)}
              onMouseLeave={() => setPausedBoth?.(false)}
              onTouchStart={() => setPausedBoth?.(true)}
              onTouchEnd={() => setTimeout(() => setPausedBoth?.(false), 800)}
              onFocusCapture={() => setPausedBoth?.(true)}
              onBlurCapture={() => setPausedBoth?.(false)}
            >
              {/* LEFT chevron (outside the rail) */}
              <IconButton
                size="small"
                onClick={() => scrollByAmount('left')}
                sx={{
                  justifySelf: 'start',
                  ml: -0.5,                       // optional outward nudge; remove if you want flush
                  background: 'rgba(0,0,0,0.15)',
                }}
              >
                <ChevronLeft />
              </IconButton>

              {/* Scrollable rail */}
              <Box
                  ref={railRef}
                  sx={{
                    width: '100%',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                    display: 'grid',
                    gridAutoFlow: 'column',
                    gridAutoColumns: tileSize,
                    columnGap: 10,          // 16px
                    alignItems: 'center',
                    px: 4,
                    height: '100%',
                    // IMPORTANT: no scrollSnapType for continuous belt
                  }}
                >
                  {recommendedLoading
                    ? Array.from({ length: Math.max(10, beltItems.length) }).map((_, i) => (
                        <Skeleton
                          key={`s-${i}`}
                          variant="rounded"
                          sx={{
                            width: tileSize,
                            height: tileSize,
                            bgcolor: 'rgba(255,255,255,0.15)',
                            borderRadius: 2,
                          }}
                        />
                      ))
                    : beltItems.map((ra, idx) => (
                        <Box key={`${ra.token?.txid ?? ra.metadata?.name}-${idx}`}>
                          <MetanetApp
                            appName={ra.metadata.name}
                            domain={ra.metadata.domain || ra.metadata.name}
                            iconImageUrl={ra.metadata.icon || (ra.metadata.domain ? `https://${ra.metadata.domain}/favicon.ico` : undefined)}
                            clickable
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const name = ra.metadata.name;
                              const domain = ra.metadata.domain;
                              const origin = domain ? `https://${domain}` : undefined;
                              const sim = {
                                name,
                                ...(origin ? { Originator: origin } : {}),
                                custom_message: `${ra.metadata.description}`
                              } as any;
                              try {
                                sessionStorage.removeItem('appinfo_handled')
                                sessionStorage.setItem('appinfo', JSON.stringify(sim))
                              } catch {}
                              setAppinfo(sim);
                              setWelcomeUser(true);
                              setPausedBoth(true);
                            }}
                          />
                        </Box>
                      ))}
                </Box>
              {/* RIGHT chevron (outside the rail) */}
              <IconButton
                size="small"
                onClick={() => scrollByAmount('right')}
                sx={{
                  justifySelf: 'end',
                  mr: -0.5,                       // symmetric outward nudge
                  background: 'rgba(0,0,0,0.15)',
                }}
              >
                <ChevronRight />
              </IconButton>
            </Box>
            )}

            {/* RIGHT COLUMN: Clear (X) button when an app is selected */}
            {appInfo ? (
              <Box sx={{ justifySelf: 'end' }}>
                <IconButton
                  aria-label="Clear selected app"
                  color="inherit"
                  size="small"
                  onClick={() => {
                    try { sessionStorage.removeItem('appinfo') } catch {}
                    setAppinfo(null)
                    setWelcomeUser(false)
                    setPausedBoth(false)
                    loadRecommendedApps()
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            ) : (
              <Box />
            )}

          </Box>
        </Toolbar>
      </AppBar>
      {/* === END APP BAR === */}

      <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', pt: '15vh' }}>
        <Paper elevation={4} sx={{ p: 4, borderRadius: 2, bgcolor: 'background.paper', boxShadow: theme.shadows[3] }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ mb: 2, width: '100px', height: '100px' }}>
              <AppLogo rotate size="100px" color="#2196F3" />
            </Box>
            <Typography
              variant='h2'
              fontFamily='Helvetica'
              fontSize='2em'
              textAlign='center'
              sx={{
                mb: 1,
                fontWeight: 'bold',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(90deg, #FFFFFF 0%, #F5F5F5 100%)'
                  : 'linear-gradient(90deg, #2196F3 0%, #4569E5 100%)',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {appInfo?.name ? (
                <>
                  Continue to {appInfo.name} on the 
                  <br />
                  {appName}
                </>
              ) : (
                <>Explore apps on the 
                  <br />
                  {appName}</>
              )}
            </Typography>
          </Box>

          <WalletConfig />

          {/* Authentication Stepper */}
          {configStatus === 'configured' && (
            <Stepper activeStep={viewToStepIndex[step]} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    icon={step.icon}
                    optional={<Typography variant="caption" color="text.secondary">{step.description}</Typography>}
                  >
                    <Typography variant="body2" fontWeight={500}>{step.label}</Typography>
                  </StepLabel>
                  <StepContent>
                    {index === 0 && (
                      useWab ? (
                        <PhoneForm
                          phone={phone}
                          setPhone={setPhone}
                          loading={loading}
                          handleSubmitPhone={handleSubmitPhone}
                          phoneFieldRef={phoneFieldRef}
                        />
                      ) : (
                        <PresentationKeyForm
                          presentationKey={presentationKey}
                          setPresentationKey={setPresentationKey}
                          loading={loading}
                          handleSubmitPresentationKey={handleSubmitPresentationKey}
                          presentationKeyFieldRef={presentationKeyFieldRef}
                        />
                      )
                    )}

                    {useWab && index === 1 && (
                      <CodeForm
                        code={code}
                        setCode={setCode}
                        loading={loading}
                        handleSubmitCode={handleSubmitCode}
                        handleResendCode={handleResendCode}
                        codeFieldRef={codeFieldRef}
                      />
                    )}

                    {(useWab ? index === 2 : index === 1) && (
                      <PasswordForm
                        password={password}
                        setPassword={setPassword}
                        confirmPassword={confirmPassword}
                        setConfirmPassword={setConfirmPassword}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        loading={loading}
                        handleSubmitPassword={handleSubmitPassword}
                        accountStatus={accountStatus}
                        passwordFieldRef={passwordFieldRef}
                      />
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
            <RouterLink to='/recovery' style={{ textDecoration: 'none' }}>
              <Button variant="text" color='secondary' size="small" startIcon={<RestoreIcon />}>
                Account Recovery
              </Button>
            </RouterLink>
          </Box>
          <Typography
            variant='caption'
            color='textSecondary'
            align='center'
            sx={{ display: 'block', mt: 3, mb: 1, fontSize: '0.75rem', opacity: 0.7 }}
          >
            By using this software, you acknowledge that you have read, understood and accepted the terms of the{' '}
            <a
              href='https://github.com/bitcoin-sv/metanet-desktop/blob/master/LICENSE.txt'
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => {
                e.preventDefault()
                window.open('https://github.com/bitcoin-sv/metanet-desktop/blob/master/LICENSE.txt', '_blank', 'noopener,noreferrer')
              }}
              style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
            >
              Software License
            </a>.
          </Typography>
        </Paper>
      </Container>
    </>
  )
}

export default Greeter
