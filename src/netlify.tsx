import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import { type Subscription } from 'rxjs'

import {
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Grid,
  Spinner,
  Stack,
  studioTheme,
  Switch,
  Text,
  TextInput,
  ThemeProvider,
  ToastProvider,
  useToast,
} from '@sanity/ui'
import { FormField, useColorScheme } from 'sanity'

import DeployItem from './deploy-item'
import { useClient } from './hook/useClient'
import type { SanityDeploySchema } from './types'
import deployIcon from './netlify-icon'

const initialDeploy = {
  name: '',
  siteId: '',
  buildHook: '',
  branch: '',
  accessToken: '',
  onlyShowProductionDeploys: true,
  disableDeleteAction: false,
}

const NetlifyDeploy = () => {
  const WEBHOOK_TYPE = 'webhook_deploy'
  const WEBHOOK_QUERY = `*[_type == "${WEBHOOK_TYPE}"] | order(_createdAt)`
  const client = useClient()
  const { scheme } = useColorScheme()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deploys, setDeploys] = useState<SanityDeploySchema[]>([])
  const [pendingDeploy, setpendingDeploy] = useState(initialDeploy)
  const toast = useToast()

  const onSubmit = async () => {
    client
      .create({
        // Explicitly define an _id inside the netlify path to make sure it's not publicly accessible
        // This will protect users' tokens & project info. Read more: https://www.sanity.io/docs/ids
        _id: `netlify.${nanoid()}`,
        _type: WEBHOOK_TYPE,
        name: pendingDeploy.name,
        siteId: pendingDeploy.siteId,
        buildHook: pendingDeploy.buildHook,
        branch: pendingDeploy.branch,
        accessToken: pendingDeploy.accessToken,
        onlyShowProductionDeploys: pendingDeploy.onlyShowProductionDeploys,
        disableDeleteAction: pendingDeploy.disableDeleteAction,
      })
      .then(() => {
        toast.push({
          status: 'success',
          title: 'Success!',
          description: `Created Deployment: ${pendingDeploy.name}`,
        })
        setIsFormOpen(false)
        setIsSubmitting(false)
        setpendingDeploy(initialDeploy) // Reset the pending webhook state
      })
  }

  // Fetch all existing webhooks and listen for newly created
  useEffect(() => {
    let webhookSubscription: Subscription

    client.fetch(WEBHOOK_QUERY).then((w) => {
      setDeploys(w)
      setIsLoading(false)

      webhookSubscription = client
        .listen<SanityDeploySchema>(WEBHOOK_QUERY, {}, { includeResult: true })
        .subscribe({
          next: (res) => {
            if (res.type === 'mutation') {
              const wasCreated = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'create')
              )

              const wasPatched = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'patch')
              )

              const wasDeleted = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'delete')
              )

              const filterDeploy = (deploy: SanityDeploySchema) =>
                deploy._id !== res.documentId

              const updateDeploy = (deploy: SanityDeploySchema) =>
                deploy._id === res.documentId
                  ? (res.result as SanityDeploySchema)
                  : deploy

              if (wasCreated) {
                setDeploys((prevState) => {
                  if (res.result) {
                    return [...prevState, res.result]
                  }
                  return prevState
                })
              }
              if (wasPatched) {
                setDeploys((prevState) => {
                  const updatedDeploys = prevState.map(updateDeploy)

                  return updatedDeploys
                })
              }
              if (wasDeleted) {
                setDeploys((prevState) => prevState.filter(filterDeploy))
              }
            }
          },
        })
    })

    return () => {
      if (webhookSubscription) {
        webhookSubscription.unsubscribe()
      }
    }
  }, [WEBHOOK_QUERY, client])

  return (
    <ThemeProvider theme={studioTheme}>
      <ToastProvider>
        <Container display="grid" width={6} style={{ minHeight: '100%' }}>
          <Flex direction="column">
            <Card padding={4} borderBottom>
              <Flex align="center">
                <Flex flex={1} align="center">
                  <Card>
                    {deployIcon()}
                  </Card>
                  <Card marginX={1} style={{ opacity: 0.15 }}>
                    <svg
                      viewBox="0 0 24 24"
                      width="32"
                      height="32"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      shapeRendering="geometricPrecision"
                    >
                      <path d="M16.88 3.549L7.12 20.451" />
                    </svg>
                  </Card>
                  <Card>
                    <Text as="h1" size={2} weight="semibold">
                      Netlify Deployments
                    </Text>
                  </Card>
                </Flex>
                <Box>
                  <Button
                    type="button"
                    fontSize={2}
                    tone="primary"
                    padding={3}
                    radius={3}
                    text="Add Project"
                    onClick={() => setIsFormOpen(true)}
                  />
                </Box>
              </Flex>
            </Card>

            <Card flex={1}>
              <Stack as={'ul'}>
                {isLoading ? (
                  <Card as={'li'} padding={4}>
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      paddingTop={3}
                    >
                      <Spinner size={4} />
                      <Box padding={4}>
                        <Text size={2}>loading your deployments...</Text>
                      </Box>
                    </Flex>
                  </Card>
                ) : deploys.length ? (
                  deploys.map((deploy) => (
                    <Card key={deploy._id} as={'li'} padding={4} borderBottom>
                      <DeployItem
                        _id={deploy._id}
                        key={deploy._id}
                        name={deploy.name}
                        siteId={deploy.siteId}
                        buildHook={deploy.buildHook}
                        branch={deploy.branch}
                        accessToken={deploy.accessToken}
                        onlyShowProductionDeploys={deploy.onlyShowProductionDeploys}
                        disableDeleteAction={deploy.disableDeleteAction}
                      />
                    </Card>
                  ))
                ) : (
                  <Card as={'li'} padding={5} paddingTop={6}>
                    <Flex direction="column" align="center" justify="center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        width="150"
                        viewBox="0 0 260 235"
                      >
                        <path
                          fill={scheme === 'dark' ? 'transparent' : 'white'}
                          fillRule="evenodd"
                          stroke={scheme === 'dark' ? 'white' : 'black'}
                          strokeDasharray="4 4"
                          strokeWidth="2"
                          d="M107.36 2.48l105.7 185.47H2.66L108.35 2.48z"
                          clipRule="evenodd"
                        />
                        <ellipse
                          cx="182.68"
                          cy="156.48"
                          fill="transparent"
                          rx="74.32"
                          ry="74.52"
                        />
                        <path
                          stroke={scheme === 'dark' ? 'white' : 'black'}
                          strokeWidth="2"
                          d="M256.5 156.48c0 40.88-33.05 74.02-73.82 74.02-40.77 0-73.83-33.14-73.83-74.02 0-40.87 33.06-74.01 73.83-74.01 40.77 0 73.82 33.14 73.82 74.01z"
                        />

                        <mask
                          id="a"
                          width="149"
                          height="150"
                          x="108"
                          y="81"
                          maskUnits="userSpaceOnUse"
                        >
                          <ellipse
                            cx="182.68"
                            cy="156.48"
                            fill="white"
                            rx="74.32"
                            ry="74.52"
                          />
                        </mask>
                        <g mask="url(#a)">
                          <path
                            fill={scheme === 'dark' ? 'white' : 'black'}
                            fillRule="evenodd"
                            d="M108.36 2.48l105.7 185.47H2.66L108.35 2.48z"
                            clipRule="evenodd"
                          />
                        </g>
                      </svg>

                      <Flex direction="column" align="center" padding={4}>
                        <Text size={3}>No deployments created yet.</Text>
                        <Box padding={4}>
                          <Button
                            fontSize={3}
                            paddingX={5}
                            paddingY={4}
                            tone="primary"
                            radius={4}
                            text="Add Project"
                            onClick={() => setIsFormOpen(true)}
                          />
                        </Box>

                        <Text size={1} weight="semibold" muted>
                          <a
                            href="https://github.com/jclusso/sanity-plugin-netlify#-your-first-netlify-deployment"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit' }}
                          >
                            Need help?
                          </a>
                        </Text>
                      </Flex>
                    </Flex>
                  </Card>
                )}
              </Stack>
            </Card>
          </Flex>
        </Container>

        {isFormOpen && (
          <Dialog
            header="New Project Deployment"
            id="create-webhook"
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
                    text="Create"
                    tone="primary"
                    loading={isSubmitting}
                    onClick={() => onSubmit()}
                    disabled={
                      isSubmitting ||
                      !pendingDeploy.name ||
                      !pendingDeploy.siteId ||
                      !pendingDeploy.buildHook ||
                      !pendingDeploy.accessToken
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
                    User dropdown: User settings → Applications →&nbsp;
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
      </ToastProvider>
    </ThemeProvider>
  )
}

export default NetlifyDeploy
