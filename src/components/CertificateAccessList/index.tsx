import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react'
import {
  List,
  ListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  Button,
  IconButton,
  Paper,
  ListSubheader
} from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import style from './style'
import { withRouter, RouteComponentProps } from 'react-router-dom'
import { formatDistance } from 'date-fns'
import CloseIcon from '@mui/icons-material/Close'
import { WalletContext } from '../../WalletContext'

// Simple cache for certificate permissions
const CERT_CACHE = new Map<string, GrantItem[]>();
import CertificateChip from '../CertificateChip'
import AppChip from '../AppChip'
import sortPermissions from './sortPermissions'
import { toast } from 'react-toastify'
import { PermissionToken } from '@bsv/wallet-toolbox-client'

// // Define interfaces for individual permission and app grant items.
// interface Permission {
//   type: string
//   lastAccessed: number
//   expiry: number
//   issuer: string
//   verifier: string
//   onIssuerClick?: (event: React.MouseEvent) => void
//   onVerifierClick?: (event: React.MouseEvent) => void
//   onClick?: (event: React.MouseEvent) => void
//   fields: { [key: string]: any }
//   clickable: boolean
//   permissionGrant?: any
// }

interface AppGrant {
  originator: string
  permissions: PermissionToken[]
}

// When the list is not displayed as apps, we assume that the grant is simply a Permission.
type GrantItem = AppGrant | PermissionToken

// Props for the CertificateAccessList component.
interface CertificateAccessListProps extends RouteComponentProps {
  app: string
  itemsDisplayed: string
  counterparty: string
  type: string
  limit: number
  displayCount?: boolean
  listHeaderTitle?: string
  showEmptyList?: boolean
  canRevoke?: boolean
  onEmptyList?: () => void
}

const useStyles = makeStyles(style, {
  name: 'CertificateAccessList'
})

const CertificateAccessList: React.FC<CertificateAccessListProps> = ({
  app,
  itemsDisplayed = 'certificates',
  counterparty = '',
  type = 'certificate',
  limit,
  displayCount = true,
  listHeaderTitle,
  showEmptyList = false,
  canRevoke = false,
  onEmptyList = () => { },
  history
}) => {
  // Build stable query key
  const queryKey = useMemo(() => JSON.stringify({ app, itemsDisplayed, counterparty, type, limit }), [app, itemsDisplayed, counterparty, type, limit]);

  const [grants, setGrants] = useState<GrantItem[]>([])
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [currentAccessGrant, setCurrentAccessGrant] = useState<PermissionToken | null>(null)
  const [currentApp, setCurrentApp] = useState<AppGrant | null>(null)
  const [dialogLoading, setDialogLoading] = useState<boolean>(false)
  const classes = useStyles()
  const { managers, adminOriginator } = useContext(WalletContext)

  const refreshGrants = useCallback(async () => {
    // Return cached
    if (CERT_CACHE.has(queryKey)) {
      setGrants(CERT_CACHE.get(queryKey)!);
      return;
    }
    try {
      if (!managers?.permissionsManager) {
        return
      }

      const permissions: PermissionToken[] = await managers.permissionsManager.listCertificateAccess({
        originator: app,
        privileged: false, //?
        certType: type,
        // verifier: 'anyone' // ?
      })

      if (itemsDisplayed === 'apps') {
        const results = sortPermissions(permissions)
        setGrants(results)
        CERT_CACHE.set(queryKey, results)
      } else {
        setGrants(permissions)
        CERT_CACHE.set(queryKey, permissions)
      }

      if (permissions.length === 0) {
        onEmptyList()
      }
    } catch (error) {
      console.error(error)
    }
  }, [app, counterparty, type, limit, itemsDisplayed, onEmptyList])

  const revokeAccess = async (grant: PermissionToken) => {
    setCurrentAccessGrant(grant)
    setDialogOpen(true)
  }

  const revokeAllAccess = async (appGrant: AppGrant) => {
    setCurrentApp(appGrant)
    setDialogOpen(true)
  }

  // Handle revoke dialog confirmation
  const handleConfirm = async () => {
    try {
      setDialogLoading(true)
      if (currentAccessGrant) {
        await managers.permissionsManager.revokePermission(currentAccessGrant)
      } else {
        if (!currentApp || !currentApp.permissions) {
          throw new Error('Unable to revoke permissions!')
        }
        for (const permission of currentApp.permissions) {
          try {
            await managers.permissionsManager.revokePermission(permission)
          } catch (error) {
            console.error(error)
          }
        }
        setCurrentApp(null)
      }
      setCurrentAccessGrant(null)
      setDialogOpen(false)
      setDialogLoading(false)
      refreshGrants()
    } catch (e: any) {
      toast.error('Certificate access grant may not have been revoked: ' + e.message)
      refreshGrants()
      setCurrentAccessGrant(null)
      setDialogOpen(false)
      setDialogLoading(false)
    }
  }

  const handleDialogClose = () => {
    setCurrentAccessGrant(null)
    setDialogOpen(false)
  }

  useEffect(() => {
    refreshGrants()
  }, [refreshGrants])

  // Only render the list if there are items to display.
  if (grants.length === 0 && !showEmptyList) {
    return <></>
  }

  return (
    <>
      <Dialog open={dialogOpen}>
        <DialogTitle>Revoke Access?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You can re-authorize this certificate access grant next time you use this app.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="primary" disabled={dialogLoading} onClick={handleDialogClose}>
            Cancel
          </Button>
          <Button color="primary" disabled={dialogLoading} onClick={handleConfirm}>
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
      <List>
        {listHeaderTitle && <ListSubheader>{listHeaderTitle}</ListSubheader>}
        {grants.map((grant, i) => (
          <React.Fragment key={i}>
            {itemsDisplayed === 'apps' ? (
              <div className={(classes as any).appList}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingRight: '1em',
                    alignItems: 'center'
                  }}
                >
                  {/* Type assertion: grant is an AppGrant */}
                  <AppChip
                    label={(grant as AppGrant).originator}
                    showDomain
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      history.push({
                        pathname: `/dashboard/app/${encodeURIComponent((grant as AppGrant).originator)}`,
                        state: { domain: (grant as AppGrant).originator }
                      })
                    }}
                  />
                  {canRevoke && (
                    <>
                      {(grant as AppGrant).permissions.length > 0 && (grant as AppGrant).originator ? (
                        <Button
                          onClick={() => revokeAllAccess(grant as AppGrant)}
                          color="secondary"
                          className={(classes as any).revokeButton}
                        >
                          Revoke All
                        </Button>
                      ) : (
                        <IconButton
                          edge="end"
                          onClick={() => revokeAccess((grant as AppGrant).permissions[0])}
                          size="large"
                        >
                          <CloseIcon />
                        </IconButton>
                      )}
                    </>
                  )}
                </div>
                <Paper elevation={4}>
                  <ListItem>
                    <div className={classes.counterpartyContainer}>
                      {(grant as AppGrant).permissions.map((permission, idx) => (
                        <div className={classes.gridItem} key={idx}>
                          <h1>{permission.certType}</h1>
                          {/* <CertificateChip
                            certType={permission.certType}
                            lastAccessed={String(permission.lastAccessed)}
                            certifier={permission.issuer}
                            onIssuerClick={permission.onIssuerClick}
                            serialNumber={permission.verifier}
                            onVerifierClick={permission.onVerifierClick}
                            onClick={permission.onClick}
                            fieldsToDisplay={Object.keys(permission.fields)}
                            clickable={permission.clickable}
                            size={1.3}
                            expires={formatDistance(new Date(permission.expiry * 1000), new Date(), {
                              addSuffix: true
                            })}
                            onCloseClick={() => revokeAccess(permission)}
                            canRevoke={canRevoke}
                          /> */}
                        </div>
                      ))}
                    </div>
                  </ListItem>
                </Paper>
              </div>
            ) : (
              <Paper elevation={4}>
                <ListItem className={(classes as any).action_card}>
                  {/*
                    When itemsDisplayed is not 'apps', we assume each grant is a Permission.
                  */}
                  {/* <CertificateChip
                    certType={(grant as Permission).type}
                    lastAccessed={String((grant as Permission).lastAccessed)}
                    certifier={(grant as Permission).issuer}
                    onIssuerClick={(grant as Permission).onIssuerClick}
                    serialNumber={(grant as Permission).verifier}
                    onVerifierClick={(grant as Permission).onVerifierClick}
                    onClick={(grant as Permission).onClick}
                    fieldsToDisplay={Object.keys((grant as Permission).fields)}
                    clickable={(grant as Permission).clickable}
                    size={1.3}
                    expires={formatDistance(
                      new Date((grant as Permission).expiry * 1000),
                      new Date(),
                      { addSuffix: true }
                    )}
                    onCloseClick={() => revokeAccess(grant as Permission)}
                    canRevoke={canRevoke}
                  /> */}
                </ListItem>
              </Paper>
            )}
          </React.Fragment>
        ))}
      </List>

      {displayCount && (
        <center>
          <Typography color="textSecondary">
            <i>Total Certificate Access Grants: {grants.length}</i>
          </Typography>
        </center>
      )}
    </>
  )
}

export default withRouter(CertificateAccessList)
