import axios from 'axios'
import React, { useEffect, useState } from 'react'
import spacetime from 'spacetime'
import deployIcon from './netlify-icon'

import {
  Button,
  Badge,
  Box,
  Card,
  Flex,
  Inline,
  Label,
  Spinner,
  Text,
} from '@sanity/ui'

import DeployStatus from './deploy-status'
import type { Deployments, SanityDeploySchema } from './types'
import { EyeOpenIcon } from '@sanity/icons'

interface DeployHistoryProps
  extends Omit<SanityDeploySchema, '_id' | 'name' | 'buildHook' | 'branch' |
    'disableDeleteAction'> {}
const DeployHistory: React.FC<DeployHistoryProps> = ({
  siteId,
  accessToken,
  onlyShowProductionDeploys
}) => {
  const [deployments, setDeployments] = useState<Deployments[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)

    const params: any = {}
    if (onlyShowProductionDeploys) params.production = true;

    axios
      .get(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
        {
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          params
        }
      )
      .then(({ data }) => {
        setDeployments(data)
        setLoading(false)
        setError(false)
      })
      .catch((e) => {
        setLoading(false)
        setError(true)
        console.warn(e)
      })
  }, [siteId, accessToken])

  const formatDeployTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`
  }

  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" paddingTop={3}>
        <Spinner size={4} />
        <Box padding={4}>
          <Text size={2}>loading deployment history...</Text>
        </Box>
      </Flex>
    )
  }

  if (error) {
    return (
      <Card padding={4} radius={2} shadow={1} tone="critical">
        <Text size={2} align="center">
          Could not load deployments for {siteId}
        </Text>
      </Card>
    )
  }

  return (
    <Box as={'ul'} padding={0}>
      <Card as={'li'} padding={4} borderBottom>
        <Flex>
          <Box flex={1}>
            <Label muted>Branch</Label>
          </Box>
          <Box flex={1}>
            <Label muted>State</Label>
          </Box>
          <Box flex={1}>
            <Label muted>Commit</Label>
          </Box>
          <Box flex={1}>
            <Label muted>Duration</Label>
          </Box>
          <Box flex={1}>
            <Label muted>Deployed At</Label>
          </Box>
          <Box flex={1}></Box>
        </Flex>
      </Card>

      {deployments?.map((deployment) => (
        <Card key={deployment.id} as={'li'} padding={4} borderBottom>
          <Flex align="center">
            <Box flex={1}>
              <Text>
                <Badge
                  tone="primary"
                  paddingX={3}
                  paddingY={2}
                  radius={6}
                  fontSize={0}
                >
                  {deployment.branch}
                </Badge>
              </Text>
            </Box>
            <Box flex={1}>
              <Text>
                <DeployStatus status={deployment.state}
                  errorMessage={deployment.error_message} />
              </Text>
            </Box>
            <Box flex={1}>
              <Text weight="semibold">
                <Box style={{ whiteSpace: 'nowrap' }} >
                  {
                    (deployment.commit_url) && (
                      <a
                        href={deployment.commit_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {deployment.commit_ref?.substring(0, 7)}
                      </a>
                    ) || '–'
                  }
                </Box>
              </Text>
            </Box>
            <Box flex={1}>
              <Inline space={2}>
                <Text muted>
                  {
                    (deployment.deploy_time &&
                      formatDeployTime(deployment.deploy_time)
                    ) || '–'
                  }
                </Text>
              </Inline>
            </Box>
            <Box flex={1}>
              <Inline space={2}>
                <Text style={{ whiteSpace: 'nowrap' }} muted>
                  {spacetime.now().since(spacetime(deployment.created_at)).rounded}
                </Text>
              </Inline>
            </Box>
            <Flex flex={1} justify="flex-end">
              <a href={`${deployment.admin_url}/deploys/${deployment.id}`} target="_blank">
                <Button
                  icon={deployIcon()}
                  mode="bleed"
                  tone="primary"
                  padding={3}
                />
              </a>
              {
                (deployment.state == 'ready') &&
                <a href={deployment.links?.permalink} target="_blank">
                  <Button
                    icon={EyeOpenIcon}
                    mode="bleed"
                    tone="positive"
                    padding={3}
                  />
                </a>
              }
            </Flex>
          </Flex>
        </Card>
      ))}
    </Box>
  )
}

export default DeployHistory
