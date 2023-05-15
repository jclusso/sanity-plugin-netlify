import axios from 'axios'
import React, { useEffect, useState } from 'react'
import spacetime from 'spacetime'
import useSWR from 'swr'

import {
  ClockIcon,
  EditIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from '@sanity/icons'
import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Dialog,
  Flex,
  Grid,
  Heading,
  Inline,
  Menu,
  MenuButton,
  MenuItem,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  useToast,
} from '@sanity/ui'

import { FormField } from 'sanity'
import DeployHistory from './deploy-history'
import DeployStatus from './deploy-status'
import { useClient } from './hook/useClient'
import type { SanityDeploySchema, StatusType } from './types'

const fetcher = (url: string, accessToken: string, params: any) =>
  axios
    .get(url, {
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      params
    })
    .then((res) => res.data)

const initialDeploy = {
  name: '',
  siteId: '',
  buildHook: '',
  branch: '',
  accessToken: '',
  onlyShowProductionDeploys: true,
  disableDeleteAction: false,
}

interface DeployItemProps extends SanityDeploySchema {}
const DeployItem: React.FC<DeployItemProps> = ({
  _id,
  name,
  siteId,
  buildHook,
  branch,
  accessToken,
  onlyShowProductionDeploys,
  disableDeleteAction,
}) => {
  const client = useClient()

  const [isLoading, setIsLoading] = useState(true)
  const [isDeploying, setDeploying] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const [pendingDeploy, setpendingDeploy] = useState(initialDeploy)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusType>('LOADING')
  const [timestamp, setTimestamp] = useState<string | null>(null)
  const [buildTime, setBuildTime] = useState<string | null>(null)

  const toast = useToast()

  const deploymentDataParam: any = {}
  if (onlyShowProductionDeploys) deploymentDataParam.production = true;
  const { data: deploymentData } = useSWR(
    () => [
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      accessToken,
      deploymentDataParam
    ],
    fetcher,
    {
      errorRetryCount: 3,
      refreshInterval: 1000,
      onError: (err) => {
        setStatus('ERROR')
        setErrorMessage(err.response?.data?.error?.message || err?.message || 'Something went wrong!')
        setIsLoading(false)
      },
    }
  )

  const onDeploy = (_name: string, _url: string) => {
    setStatus('ENQUEUED')
    setDeploying(true)
    setTimestamp(null)
    setBuildTime(null)

    const options: any = {}
    if (branch) options.trigger_branch = branch;

    axios
      .post(_url, options)
      .then(() => {
        toast.push({
          status: 'success',
          title: 'Success!',
          description: `Triggered Deployment: ${_name}`,
        })
      })
      .catch((err) => {
        setDeploying(false)
        toast.push({
          status: 'error',
          title: 'Deploy Failed.',
          description: `${err}`,
        })
      })
  }

  const onCancel = (id: string, token: string) => {
    setIsLoading(true)
    axios
      .post(`https://api.netlify.com/api/v1/deploys/${id}/cancel`, null, {
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((res) => res.data)
      .then((res) => {
        setStatus('CANCELED')
        setDeploying(false)
        setIsLoading(false)
        setBuildTime(null)
        setTimestamp(res.updated_at)
      })
  }

  const onRemove = (_name: string, id: string) => {
    setIsLoading(true)
    client.delete(id).then(() => {
      toast.push({
        status: 'success',
        title: `Successfully deleted deployment: ${_name}`,
      })
    })
  }

  const onEdit = () => {
    setpendingDeploy({
      name,
      siteId,
      buildHook,
      branch,
      accessToken: '',
      onlyShowProductionDeploys,
      disableDeleteAction,
    })
    setIsFormOpen(true)
  }

  const onSubmitEdit = async () => {
    const update: any = {
      name: pendingDeploy.name,
      siteId: pendingDeploy.siteId,
      buildHook: pendingDeploy.buildHook,
      branch: pendingDeploy.branch,
      onlyShowProductionDeploys: pendingDeploy.onlyShowProductionDeploys,
      disableDeleteAction: pendingDeploy.disableDeleteAction,
    }

    if (pendingDeploy.accessToken) {
      update.accessToken = pendingDeploy.accessToken
    }

    client
      .patch(_id)
      .set(update)
      .commit()
      .then(() => {
        toast.push({
          status: 'success',
          title: 'Success!',
          description: `Updated Deployment: ${pendingDeploy.name}`,
        })

        setIsFormOpen(false)
        setIsSubmitting(false)
      })
  }

  // set status when new deployment data comes in
  useEffect(() => {
    let isSubscribed = true

    if (deploymentData && isSubscribed) {
      const latestDeployment = deploymentData[0]

      setStatus(latestDeployment?.state?.toUpperCase() || 'READY')

      if (latestDeployment?.created_at) setTimestamp(latestDeployment?.created_at)

      setIsLoading(false)
    }

    return () => {
      isSubscribed = false
    }
  }, [deploymentData])

  // update deploy state after status is updated
  useEffect(() => {
    let isSubscribed = true

    if (isSubscribed) {
      if (status === 'READY' || status === 'ERROR' || status === 'CANCELED') {
        setDeploying(false)
      } else if (status === 'BUILDING' || status === 'ENQUEUED') {
        setDeploying(true)
      }
    }

    return () => {
      isSubscribed = false
    }
  }, [status])

  // count build time
  const tick = (_timestamp: string | null) => {
    if (_timestamp) {
      setBuildTime(spacetime.now().since(spacetime(_timestamp)).rounded)
    }
  }

  useEffect(() => {
    let isTicking = true
    const timer = setInterval(() => {
      if (isTicking && isDeploying) {
        tick(timestamp)
      }
    }, 1000)

    if (!isDeploying) {
      clearInterval(timer)
    }

    return () => {
      isTicking = false
      clearInterval(timer)
    }
  }, [timestamp, isDeploying])

  return (
    <>
      <Flex
        wrap="wrap"
        direction={['column', 'column', 'row']}
        align={['flex-end', 'flex-end', 'center']}
      >
        <Box flex={[4, 1]} paddingBottom={[4, 4, 1]}>
          <Stack space={3}>
            <Inline space={2}>
              <Heading as="h2" size={1}>
                <Text weight="semibold">{name}</Text>
              </Heading>
                <Badge
                  tone="primary"
                  paddingX={3}
                  paddingY={2}
                  radius={6}
                  fontSize={0}
                >
                  {deploymentData ? deploymentData[0].branch : '–'}
                </Badge>
            </Inline>
            <Code size={1}>
              <Box
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {siteId}
              </Box>
            </Code>
          </Stack>
        </Box>
        <Flex
          wrap="nowrap"
          align="center"
          marginLeft={[0, 0, 4]}
          flex={[1, 'none']}
        >
          <Inline space={2}>
            <Box marginRight={2}>
              <Stack space={2}>
                <DeployStatus status={(deploymentData?.length && deploymentData[0]?.state) || 'LOADING'}
                  errorMessage={errorMessage || (deploymentData?.length && deploymentData[0]?.error_message)}
                  justify="flex-end" />
                <Text align="right" size={1} muted>
                  {isDeploying
                    ? buildTime || '--'
                    : timestamp
                    ? spacetime.now().since(spacetime(timestamp)).rounded
                    : '--'}
                </Text>
              </Stack>
              </Box>

            <Button
              type="button"
              tone="positive"
              disabled={isDeploying || isLoading}
              loading={isDeploying || isLoading}
              onClick={() => onDeploy(name, buildHook)}
              paddingX={[5]}
              paddingY={[4]}
              radius={3}
              text="Deploy"
            />

            {isDeploying && (status === 'BUILDING' || status === 'ENQUEUED' ||
              status == 'PREPARING' || status === 'PROCESSING') && (
              <Button
                type="button"
                tone="critical"
                onClick={() => {
                  onCancel(deploymentData[0].id, accessToken)
                }}
                paddingX={[5]}
                paddingY={[4]}
                radius={3}
                text="Cancel"
              />
            )}

            <MenuButton
              id={_id}
              button={
                <Button
                  mode="bleed"
                  icon={EllipsisVerticalIcon}
                  disabled={isLoading}
                />
              }
              popover={{ portal: true, placement: 'bottom-end' }}
              menu={
                <Menu>
                  <MenuItem
                    text="History"
                    icon={ClockIcon}
                    onClick={() => setIsHistoryOpen(true)}
                    disabled={!deploymentData?.length}
                  />
                  <MenuItem
                    text="Edit"
                    icon={EditIcon}
                    tone="primary"
                    onClick={() => onEdit()}
                  />

                  {!disableDeleteAction && (
                    <MenuItem
                      text="Delete"
                      icon={TrashIcon}
                      tone="critical"
                      onClick={() => onRemove(name, _id)}
                    />
                  )}
                </Menu>
              }
            />
          </Inline>
        </Flex>
      </Flex>

      {isFormOpen && (
        <Dialog
          header="Edit Project Deployment"
          id="update-webhook"
          width={1}
          onClickOutside={() => setIsFormOpen(false)}
          onClose={() => setIsFormOpen(false)}
          footer={
            <Box padding={3}>
              <Grid columns={2} gap={3}>
                <Button
                  padding={4}
                  mode="ghost"
                  text="Cancel"
                  onClick={() => setIsFormOpen(false)}
                />
                <Button
                  padding={4}
                  text="Update"
                  tone="primary"
                  loading={isSubmitting}
                  onClick={() => onSubmitEdit()}
                  disabled={
                    isSubmitting ||
                    !pendingDeploy.name ||
                    !pendingDeploy.siteId ||
                    !pendingDeploy.buildHook
                  }
                />
              </Grid>
            </Box>
          }
        >
          <Box padding={4}>
            <Stack space={4}>
              <FormField
                title="Site Name"
                description="This should be the name of the site you're deploying."
              >
                <TextInput
                  type="text"
                  value={pendingDeploy.name}
                  onChange={(e) => {
                    e.persist()
                    const name = (e.target as HTMLInputElement).value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ name },
                    }))
                  }}
                />
              </FormField>

              <FormField
                title="Site ID"
                description='Site Settings → General → Site details → "Site ID"'
              >
                <TextInput
                  type="text"
                  value={pendingDeploy.siteId}
                  onChange={(e) => {
                    e.persist()
                    const siteId = (e.target as HTMLInputElement).value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ siteId },
                    }))
                  }}
                />
              </FormField>

              <FormField
                title="Build Hook"
                description="Site Settings → Build & deploy → Build hooks"
              >
                <TextInput
                  type="text"
                  inputMode="url"
                  value={pendingDeploy.buildHook}
                  onChange={(e) => {
                    e.persist()
                    const buildHook = (e.target as HTMLInputElement).value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ buildHook },
                    }))
                  }}
                />
              </FormField>

              <FormField
                title="Branch"
                description="Overrides the default branch for your Build Hook (optional)"
              >
                <TextInput
                  type="text"
                  inputMode="url"
                  value={pendingDeploy.branch}
                  onChange={(e) => {
                    e.persist()
                    const branch = (e.target as HTMLInputElement).value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ branch },
                    }))
                  }}
                />
              </FormField>

              <FormField
                title="Access Token"
                description={
                  <>
                    User dropdown → User settings → Applications →&nbsp;
                    <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank">
                      Personal access tokens
                    </a>
                  </>
                }
              >
                <TextInput
                  type="text"
                  value={pendingDeploy.accessToken}
                  onChange={(e) => {
                    e.persist()
                    const accessToken = (e.target as HTMLInputElement).value
                    setpendingDeploy((prevState) => ({
                      ...prevState,
                      ...{ accessToken },
                    }))
                  }}
                />
              </FormField>

              <FormField>
                <Card paddingY={3}>
                  <Flex align="center">
                    <Switch
                      id="onlyShowProductionDeploys"
                      style={{ display: 'block' }}
                      onChange={(e) => {
                        e.persist()
                        const isChecked = (e.target as HTMLInputElement)
                          .checked

                        setpendingDeploy((prevState) => ({
                          ...prevState,
                          ...{ onlyShowProductionDeploys: isChecked },
                        }))
                      }}
                      checked={pendingDeploy.onlyShowProductionDeploys}
                    />
                    <Box flex={1} paddingLeft={3}>
                      <Text>
                        <label htmlFor="onlyShowProductionDeploys">
                          Only include Production deploys?
                        </label>
                      </Text>
                    </Box>
                  </Flex>
                </Card>
              </FormField>

              <FormField>
                <Card paddingY={3}>
                  <Flex align="center">
                    <Switch
                      id="disableDeleteAction"
                      style={{ display: 'block' }}
                      onChange={(e) => {
                        e.persist()
                        const isChecked = (e.target as HTMLInputElement)
                          .checked

                        setpendingDeploy((prevState) => ({
                          ...prevState,
                          ...{ disableDeleteAction: isChecked },
                        }))
                      }}
                      checked={pendingDeploy.disableDeleteAction}
                    />
                    <Box flex={1} paddingLeft={3}>
                      <Text>
                        <label htmlFor="disableDeleteAction">
                          Disable the "Delete" action for this item in
                          production?
                        </label>
                      </Text>
                    </Box>
                  </Flex>
                </Card>
              </FormField>
            </Stack>
          </Box>
        </Dialog>
      )}

      {isHistoryOpen && (
        <Dialog
          id="deploy-history"
          header={`Deployment History: ${name}`}
          onClickOutside={() => setIsHistoryOpen(false)}
          onClose={() => setIsHistoryOpen(false)}
          width={2}
        >
          <DeployHistory
            siteId={siteId}
            accessToken={accessToken}
            onlyShowProductionDeploys={onlyShowProductionDeploys}
          />
        </Dialog>
      )}
    </>
  )
}

export default DeployItem
