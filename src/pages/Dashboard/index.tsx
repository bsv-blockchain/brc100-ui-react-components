import { useState, useContext, useRef, useCallback, useMemo, forwardRef, useEffect } from 'react';
import { useBreakpoint } from '../../utils/useBreakpoints';
import { Switch, Route, Redirect } from 'react-router-dom';
import style from '../../navigation/style';
import { makeStyles } from '@mui/styles';
import {
  Typography,
  IconButton,
  Toolbar,
  Button,
  DialogActions,
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PageLoading from '../../components/PageLoading';
import Menu from '../../navigation/Menu';
import { Menu as MenuIcon } from '@mui/icons-material';
import MyIdentity from './MyIdentity'; // Assuming index.tsx or similar
import Trust from './Trust'; // Assuming index.tsx or similar
import Apps from './Apps';
import AppCatalog from './AppCatalog';
import App from './App/Index'; // Assuming index.tsx or similar
import Settings from './Settings'; // Assuming index.tsx or similar
import Security from './Security'; // Assuming index.tsx or similar
import { UserContext } from '../../UserContext';
import Transfer from './Transfer';
// Import the components for the new routes
// Note: These might still be .jsx files and need refactoring later
import AppAccess from './AppAccess'; // Assuming index.jsx or similar
import BasketAccess from './BasketAccess'; // Assuming index.jsx or similar
import ProtocolAccess from './ProtocolAccess'; // Assuming index.jsx or similar
import CounterpartyAccess from './CounterpartyAccess'; // Assuming index.jsx or similar
import CertificateAccess from './CertificateAccess'; // Assuming index.jsx or similar
import { WalletContext } from '../../WalletContext';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Slide, toast } from 'react-toastify';
// @ts-expect-error - Type issues with makeStyles
const useStyles = makeStyles(style, {
  name: 'Dashboard'
});

/**
 * Renders the Dashboard layout with routing for sub-pages.
 */
export default function Dashboard() {
  const { pageLoaded } = useContext(UserContext);
  const { activeProfile } = useContext(WalletContext)
  const breakpoints = useBreakpoint();
  const classes = useStyles({ breakpoints });
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(true);
  // TODO: Fetch actual identity key instead of hardcoding 'self'
  const profileKey = String(activeProfile?.id ?? activeProfile?.name ?? 'none')
  const [myIdentityKey] = useState('self');
  const [redirectOpen, setRedirectOpen] = useState(false)
  type RedirectAppInfo = { name: string; Originator: string; custom_message?: string }
  const [redirectApp, setRedirectApp] = useState<RedirectAppInfo | null>(null)
  const getMargin = () => {
    if (menuOpen && !breakpoints.sm) {
      // Adjust margin based on Menu width if needed
      return '320px'; // Example width, match Menu component
    }
    return '0px';
  };

  if (!pageLoaded) {
    return <PageLoading />;
  }
  const redirectDomain = useMemo(() => {
    if (!redirectApp?.Originator) return ''
    try {
      return new URL(redirectApp.Originator).host
    } catch {
      return redirectApp.Originator
    }
  }, [redirectApp])
  
  useEffect(() => {
    try{
      const appinfo = sessionStorage.getItem('appinfo')
      if (!appinfo) return
      const parsed = JSON.parse(appinfo)
      setRedirectApp(parsed)
      setRedirectOpen(true)
    }
    catch{}
    finally{
      sessionStorage.removeItem('appinfo')
    }
  }, [])
  

  // continue handler
  const handleRedirectContinue = useCallback(() => {
    const url = redirectApp?.Originator
    // Close any open modals/dialogs immediately
    setRedirectOpen(false)
    if (!url) return

    // Defer opening the URL until after the dialog has unmounted to avoid any overlay/focus issues
    setTimeout(() => {
      try {
        openUrl(url)
      } catch {
        toast.error('Failed to open app')
      }
    }, 0)
  }, [redirectApp])

  return (
    <div key={profileKey} className={classes.content_wrap} style={{ marginLeft: getMargin(), transition: 'margin 0.3s ease' }}>
      <div style={{
        marginLeft: 0,
        width: menuOpen ? `calc(100vw - ${getMargin()})` : '100vw',
        transition: 'width 0.3s ease, margin 0.3s ease'
      }}>
        {redirectOpen && (
        <Dialog
          open
          onClose={() => { try { sessionStorage.removeItem('appinfo') } catch {}; setRedirectOpen(false) }}
          fullWidth
          maxWidth="sm"
          disableEnforceFocus
          disableScrollLock
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            Continue to {redirectApp?.name}?
          </DialogTitle>

          <DialogContent dividers>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
              {/* Optional: show the app tile if you want */}
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  flexShrink: 0,
                }}
              >
              {redirectDomain ? (
                <img
                  src={`https://${redirectDomain}/favicon.ico`}
                  alt={`${redirectApp?.name} icon`}
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : null}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {redirectApp?.name}
              </Typography>

              {redirectApp?.custom_message && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {redirectApp.custom_message}
                </Typography>
              )}

              {redirectDomain && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {redirectDomain}
                </Typography>
              )}
            </Box>
          </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => { try { sessionStorage.removeItem('appinfo') } catch {}; setRedirectOpen(false) }} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleRedirectContinue}
              variant="contained"
              endIcon={<OpenInNewIcon />}
            >
              Continue
            </Button>
          </DialogActions>
        </Dialog>
              )}
        {breakpoints.sm &&
          <div style={{ padding: '0.5em 0 0 0.5em' }} ref={menuRef}>
            <Toolbar>
              <IconButton
                edge='start'
                onClick={() => setMenuOpen(menuOpen => !menuOpen)}
                aria-label='menu'
                sx={{
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </div>}
      </div>
      <Menu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef} />
      <div className={classes.page_container}>
        <Switch>
          {/* Existing Redirects */}
          <Redirect from='/dashboard/counterparty/self' to={`/dashboard/counterparty/${myIdentityKey}`} />
          <Redirect from='/dashboard/counterparty/anyone' to='/dashboard/counterparty/0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798' />

          {/* Existing Routes */}
          <Route
            path='/dashboard/settings'
            component={Settings}
          />
          <Route
            path='/dashboard/transfer'
            component={Transfer}
          />
          <Route
            path='/dashboard/identity'
            component={MyIdentity}
          />
          <Route
            path='/dashboard/trust'
            component={Trust}
          />
          <Route
            path='/dashboard/security'
            component={Security}
          />
          <Route
            path='/dashboard/apps'
            component={AppCatalog}
          />
          <Redirect from='/dashboard/app-catalog' to='/dashboard/apps' />
          <Route
            path='/dashboard/recent-apps'
            component={Apps}
          />
          <Route
            path='/dashboard/app' // Consider if this needs /:app parameter
            component={App}
          />
          <Route
            path='/dashboard/manage-app/:originator'
            component={AppAccess}
          />
          <Route
            path='/dashboard/basket/:basketId'
            component={BasketAccess}
          />
          <Route
            path='/dashboard/protocol/:protocolId/:securityLevel'
            component={ProtocolAccess}
          />
          <Route
            path='/dashboard/counterparty/:counterparty'
            component={CounterpartyAccess}
          />
          <Route
            path='/dashboard/certificate/:certType'
            component={CertificateAccess}
          />

          {/* Default Fallback Route */}
          <Route
            component={() => {
              return (
                <div className={(classes as any).full_width} style={{ padding: '1em' }}>
                  <br />
                  <br />
                  <Typography align='center' color='textPrimary'>Use the menu to select a page</Typography>
                </div>
              );
            }}
          />
        </Switch>
      </div>
    </div>
  );
}
